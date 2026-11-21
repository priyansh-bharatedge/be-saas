"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getCrmUserScope } from "@/lib/auth/crm-scope";
import {
  salesTargetSchema,
  SalesTargetFormData,
  SalesKpiMetrics,
  BdmPerformanceSummary,
  TlTeamPerformance,
  AccountsDashboardMetrics,
  LegalDashboardMetrics,
  OperationsDashboardMetrics,
  QualityDashboardMetrics,
  DashboardData,
} from "@/lib/validations/dashboard";
import {
  OperationStage,
  PaymentVerificationStatus,
  SalaryEntity,
  PaymentType,
  LegalStatus,
  Role,
} from "@prisma/client";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Sets or updates monthly sales target for a BDM/CDM (Sales Head / HOD / Super Admin action)
 */
export async function upsertSalesTargetAction(
  raw: SalesTargetFormData
): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const scope = await getCrmUserScope(user);
    const userDept = (user.department || "").toLowerCase();
    const canSetTargets =
      scope.canManageAll ||
      user.role === Role.Admin ||
      (user.systemRole as any) === "SUPER_ADMIN" ||
      (user.systemRole as any) === "ADMIN_HOD" ||
      (userDept.includes("sales") && (user.systemRole as any) === "ADMIN_HOD");

    if (!canSetTargets) {
      return {
        success: false,
        error: "Permission denied. Only Sales Head / HOD or Super Admin can set targets.",
      };
    }

    const parsed = salesTargetSchema.parse(raw);

    await db.salesTarget.upsert({
      where: {
        bdmId_month_year: {
          bdmId: parsed.bdmId,
          month: parsed.month,
          year: parsed.year,
        },
      },
      update: {
        targetAmount: parsed.targetAmount,
        targetDealsCount: parsed.targetDealsCount ?? 0,
        remarks: parsed.remarks || null,
        setById: user.id,
      },
      create: {
        bdmId: parsed.bdmId,
        month: parsed.month,
        year: parsed.year,
        targetAmount: parsed.targetAmount,
        targetDealsCount: parsed.targetDealsCount ?? 0,
        remarks: parsed.remarks || null,
        setById: user.id,
      },
    });

    // Synchronize baseline employees.monthlyTarget in PostgreSQL so public.employees in pgAdmin stays in sync
    const currentNow = new Date();
    if (parsed.month === currentNow.getMonth() + 1 && parsed.year === currentNow.getFullYear()) {
      await db.employee.update({
        where: { id: parsed.bdmId },
        data: { monthlyTarget: parsed.targetAmount },
      });
    }

    revalidatePath("/crm");
    return { success: true };
  } catch (error: any) {
    console.error("[upsertSalesTargetAction Error]:", error);
    return { success: false, error: error.message || "Failed to set sales target." };
  }
}

/**
 * Retrieves dynamic department and role-tailored dashboard metrics
 */
export async function getDashboardDataAction(params?: {
  month?: number;
  year?: number;
}): Promise<ActionResult<DashboardData>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const scope = await getCrmUserScope(user);
    const userDept = (user.department || "").toLowerCase();
    const systemRole = user.systemRole || "TEAM_MEMBER";

    const isSuperAdmin =
      user.role === Role.Admin || systemRole === "SUPER_ADMIN" || scope.canManageAll;
    const isSalesDept = userDept.includes("sales");
    const isSalesHod = isSuperAdmin || (isSalesDept && systemRole === "ADMIN_HOD");
    const isSalesTl = isSalesDept && systemRole === "TEAM_LEADER";
    const isSalesTm = isSalesDept && !isSalesHod && !isSalesTl;

    // Timeframe
    const now = new Date();
    const selectedMonth = params?.month || now.getMonth() + 1;
    const selectedYear = params?.year || now.getFullYear();

    // Month boundary for date-specific calculations
    const monthStart = new Date(selectedYear, selectedMonth - 1, 1);
    const monthEnd = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999);

    // Concurrent DB Data Ingestion
    const [
      salesStaff,
      allDeals,
      allPayments,
      allQuotations,
      salesTargets,
      allOperations,
    ] = await Promise.all([
      db.employee.findMany({
        where: { department: "Sales", status: "ACTIVE" },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          workEmail: true,
          department: true,
          systemRole: true,
          reportingManagerId: true,
          teamLeaderId: true,
          monthlyTarget: true,
        },
        orderBy: { firstName: "asc" },
      }),
      db.deal.findMany({
        include: {
          services: true,
          assignedEmployee: { select: { id: true, firstName: true, lastName: true } },
          partnerBdm: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.paymentRecord.findMany({
        include: {
          client: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.quotation.findMany({
        select: {
          id: true,
          preparedById: true,
          grandTotal: true,
          createdAt: true,
        },
      }),
      db.salesTarget.findMany({
        where: { month: selectedMonth, year: selectedYear },
      }),
      db.internalOperation.findMany({
        include: {
          deal: { select: { dealNumber: true, companyName: true } },
          assignedTl: { select: { firstName: true, lastName: true } },
          assignedTm: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Active BDMs list for Target Setting modal
    const activeBdmsList = salesStaff.map((s) => ({
      id: s.id,
      name: `${s.firstName} ${s.lastName}`.trim(),
      department: s.department,
    }));

    // =========================================================================
    // 1. SALES METRICS COMPUTATION (Strict 50%-50% Partner BDM Split Engine)
    // =========================================================================

    // Helper: Computes exact KPIs for a single BDM strictly accounting for 50%-50% split
    const computeSingleBdmKpis = (bdmId: string): SalesKpiMetrics => {
      // 1. Quotations
      const bdmQuotations = allQuotations.filter((q) => q.preparedById === bdmId);
      const totalQuotations = bdmQuotations.length;

      // 2. Payment Records
      const bdmPayments = allPayments.filter((p) => p.recordedById === bdmId);
      const totalPaymentRecords = bdmPayments.length;
      const totalRevenue = bdmPayments.reduce(
        (acc, p) => acc + Number(p.amount || 0),
        0
      );
      const verifiedRevenue = bdmPayments
        .filter((p) => p.status === PaymentVerificationStatus.VERIFIED)
        .reduce((acc, p) => acc + Number(p.amount || 0), 0);
      const unverifiedRevenue = bdmPayments
        .filter((p) => p.status === PaymentVerificationStatus.UNVERIFIED)
        .reduce((acc, p) => acc + Number(p.amount || 0), 0);

      // CRM Pending Count: First Payments not yet converted to Deal
      const crmPendingCount = bdmPayments.filter(
        (p) => p.paymentType === PaymentType.FIRST_PAYMENT && !p.dealId
      ).length;

      // 3. Booked Deals with Strict 50%-50% Partner BDM Split
      let bookedDealAmount = 0;
      let totalGst = 0;
      let totalWithoutGst = 0;
      let receivedGst = 0;
      let receivedWithoutGst = 0;
      let totalOutsourceCost = 0;
      let achievedDealsCount = 0;

      for (const d of allDeals) {
        let factor = 0;
        if (d.partnerBdmId) {
          if (d.assignedEmployeeId === bdmId) factor = 0.5;
          else if (d.partnerBdmId === bdmId) factor = 0.5;
        } else {
          if (d.assignedEmployeeId === bdmId) factor = 1.0;
        }

        if (factor > 0) {
          // Check if deal is in selected month/year
          const bookingDate = new Date(d.bookingDate || d.createdAt);
          const isCurrentPeriod =
            bookingDate >= monthStart && bookingDate <= monthEnd;

          // Full deal amounts scaled by 50% or 100% factor
          const dealTotal = Number(d.totalValue || d.value || 0) * factor;
          const dealGst = Number(d.gstAmount || 0) * factor;
          const dealWithoutGst = Number(d.subTotal || 0) * factor;

          const dealReceivedGst =
            d.services.reduce(
              (acc, s) => acc + Number(s.receivedGst || 0),
              0
            ) * factor;
          const dealReceivedWithoutGst =
            d.services.reduce(
              (acc, s) => acc + Number(s.receivedWithoutGst || 0),
              0
            ) * factor;
          const dealOutsource =
            d.services.reduce(
              (acc, s) => acc + Number(s.outsourceCost || 0),
              0
            ) * factor;

          bookedDealAmount += dealTotal;
          totalGst += dealGst;
          totalWithoutGst += dealWithoutGst;
          receivedGst += dealReceivedGst;
          receivedWithoutGst += dealReceivedWithoutGst;
          totalOutsourceCost += dealOutsource;

          if (isCurrentPeriod) {
            achievedDealsCount += 1;
          }
        }
      }

      // 4. Target vs Achieved
      const staffMember = salesStaff.find((s) => s.id === bdmId);
      const targetRecord = salesTargets.find((t) => t.bdmId === bdmId);
      const targetAmount = targetRecord
        ? Number(targetRecord.targetAmount)
        : Number(staffMember?.monthlyTarget || 0);
      const targetDealsCount = targetRecord?.targetDealsCount ?? 0;

      // Achieved amount is attributed booked deal revenue
      const achievedAmount = bookedDealAmount;
      const shortfallAmount = Math.max(0, targetAmount - achievedAmount);
      const achievementRate =
        targetAmount > 0
          ? Math.min(200, (achievedAmount / targetAmount) * 100)
          : achievedAmount > 0
          ? 100
          : 0;

      return {
        totalQuotations,
        totalPaymentRecords,
        totalRevenue,
        verifiedRevenue,
        unverifiedRevenue,
        crmPendingCount,
        bookedDealAmount,
        totalGst,
        totalWithoutGst,
        receivedGst,
        receivedWithoutGst,
        totalOutsourceCost,
        targetAmount,
        targetDealsCount,
        achievedAmount,
        achievedDealsCount,
        shortfallAmount,
        achievementRate: Math.round(achievementRate * 10) / 10,
      };
    };

    // Helper: Aggregates multiple BDM metrics into combined totals
    const aggregateKpis = (kpisList: SalesKpiMetrics[]): SalesKpiMetrics => {
      const initial: SalesKpiMetrics = {
        totalQuotations: 0,
        totalPaymentRecords: 0,
        totalRevenue: 0,
        verifiedRevenue: 0,
        unverifiedRevenue: 0,
        crmPendingCount: 0,
        bookedDealAmount: 0,
        totalGst: 0,
        totalWithoutGst: 0,
        receivedGst: 0,
        receivedWithoutGst: 0,
        totalOutsourceCost: 0,
        targetAmount: 0,
        targetDealsCount: 0,
        achievedAmount: 0,
        achievedDealsCount: 0,
        shortfallAmount: 0,
        achievementRate: 0,
      };

      const result = kpisList.reduce((acc, curr) => ({
        totalQuotations: acc.totalQuotations + curr.totalQuotations,
        totalPaymentRecords: acc.totalPaymentRecords + curr.totalPaymentRecords,
        totalRevenue: acc.totalRevenue + curr.totalRevenue,
        verifiedRevenue: acc.verifiedRevenue + curr.verifiedRevenue,
        unverifiedRevenue: acc.unverifiedRevenue + curr.unverifiedRevenue,
        crmPendingCount: acc.crmPendingCount + curr.crmPendingCount,
        bookedDealAmount: acc.bookedDealAmount + curr.bookedDealAmount,
        totalGst: acc.totalGst + curr.totalGst,
        totalWithoutGst: acc.totalWithoutGst + curr.totalWithoutGst,
        receivedGst: acc.receivedGst + curr.receivedGst,
        receivedWithoutGst: acc.receivedWithoutGst + curr.receivedWithoutGst,
        totalOutsourceCost: acc.totalOutsourceCost + curr.totalOutsourceCost,
        targetAmount: acc.targetAmount + curr.targetAmount,
        targetDealsCount: (acc.targetDealsCount || 0) + (curr.targetDealsCount || 0),
        achievedAmount: acc.achievedAmount + curr.achievedAmount,
        achievedDealsCount: acc.achievedDealsCount + curr.achievedDealsCount,
        shortfallAmount: acc.shortfallAmount + curr.shortfallAmount,
        achievementRate: 0,
      }), initial);

      result.achievementRate =
        result.targetAmount > 0
          ? Math.round((result.achievedAmount / result.targetAmount) * 1000) / 10
          : result.achievedAmount > 0
          ? 100
          : 0;

      return result;
    };

    // Calculate metrics for all active sales staff
    const allBdmPerformance: BdmPerformanceSummary[] = salesStaff.map((staff) => {
      const manager = staff.reportingManagerId
        ? salesStaff.find((s) => s.id === staff.reportingManagerId)
        : null;

      return {
        bdmId: staff.id,
        bdmName: `${staff.firstName} ${staff.lastName}`.trim(),
        bdmEmail: staff.workEmail,
        tlId: staff.reportingManagerId || staff.teamLeaderId,
        tlName: manager ? `${manager.firstName} ${manager.lastName}`.trim() : null,
        metrics: computeSingleBdmKpis(staff.id),
      };
    });

    // Group into TL Teams
    const tlStaff = salesStaff.filter(
      (s) => s.systemRole === "TEAM_LEADER" || s.systemRole === "ADMIN_HOD"
    );

    const teamsPerformance: TlTeamPerformance[] = tlStaff.map((tl) => {
      const teamMembers = allBdmPerformance.filter(
        (b) => b.tlId === tl.id || b.bdmId === tl.id
      );
      const teamTotals = aggregateKpis(teamMembers.map((m) => m.metrics));

      return {
        tlId: tl.id,
        tlName: `${tl.firstName} ${tl.lastName}`.trim(),
        teamMembers,
        teamTotals,
      };
    });

    const orgSummary = aggregateKpis(allBdmPerformance.map((b) => b.metrics));

    // Determine current user's sales data based on role
    let personalMetrics: SalesKpiMetrics | undefined;
    let teamPerformance: TlTeamPerformance | undefined;

    if (isSalesTm) {
      personalMetrics = computeSingleBdmKpis(user.id);
    } else if (isSalesTl) {
      teamPerformance =
        teamsPerformance.find((t) => t.tlId === user.id) || {
          tlId: user.id,
          tlName: user.name || "My Team",
          teamMembers: allBdmPerformance.filter((b) => b.tlId === user.id || b.bdmId === user.id),
          teamTotals: aggregateKpis(
            allBdmPerformance
              .filter((b) => b.tlId === user.id || b.bdmId === user.id)
              .map((m) => m.metrics)
          ),
        };
      personalMetrics = computeSingleBdmKpis(user.id);
    } else {
      personalMetrics = computeSingleBdmKpis(user.id);
    }

    // =========================================================================
    // 2. ACCOUNTS DASHBOARD COMPUTATION
    // =========================================================================

    const totalDealsRevenue = allDeals.reduce(
      (acc, d) => acc + Number(d.totalValue || d.value || 0),
      0
    );
    const totalDealsReceived = allDeals.reduce(
      (acc, d) => acc + Number(d.amountReceived || 0),
      0
    );
    const totalDealsPending = allDeals.reduce(
      (acc, d) => acc + Number(d.amountPending || 0),
      0
    );
    const totalDealsGst = allDeals.reduce(
      (acc, d) => acc + Number(d.gstAmount || 0),
      0
    );
    const totalDealsWithoutGst = allDeals.reduce(
      (acc, d) => acc + Number(d.subTotal || 0),
      0
    );

    let totalDealsReceivedGst = 0;
    let totalDealsReceivedWithoutGst = 0;
    let totalDealsOutsource = 0;

    for (const d of allDeals) {
      for (const s of d.services) {
        totalDealsReceivedGst += Number(s.receivedGst || 0);
        totalDealsReceivedWithoutGst += Number(s.receivedWithoutGst || 0);
        totalDealsOutsource += Number(s.outsourceCost || 0);
      }
    }

    // Bank entity breakdown (BSPL vs BSAPL)
    const bsplPayments = allPayments.filter(
      (p) => p.bankType === SalaryEntity.BSPL
    );
    const bsaplPayments = allPayments.filter(
      (p) => p.bankType === SalaryEntity.BSAPL
    );

    const bsplReceived = bsplPayments
      .filter((p) => p.status === PaymentVerificationStatus.VERIFIED)
      .reduce((acc, p) => acc + Number(p.amount || 0), 0);
    const bsplPending = bsplPayments
      .filter((p) => p.status === PaymentVerificationStatus.UNVERIFIED)
      .reduce((acc, p) => acc + Number(p.amount || 0), 0);
    const bsplDealsCount = new Set(
      bsplPayments.map((p) => p.dealId).filter(Boolean)
    ).size;

    const bsaplReceived = bsaplPayments
      .filter((p) => p.status === PaymentVerificationStatus.VERIFIED)
      .reduce((acc, p) => acc + Number(p.amount || 0), 0);
    const bsaplPending = bsaplPayments
      .filter((p) => p.status === PaymentVerificationStatus.UNVERIFIED)
      .reduce((acc, p) => acc + Number(p.amount || 0), 0);
    const bsaplDealsCount = new Set(
      bsaplPayments.map((p) => p.dealId).filter(Boolean)
    ).size;

    const unverifiedList = allPayments.filter(
      (p) => p.status === PaymentVerificationStatus.UNVERIFIED
    );
    const verifiedList = allPayments.filter(
      (p) => p.status === PaymentVerificationStatus.VERIFIED
    );
    const rejectedList = allPayments.filter(
      (p) => p.status === PaymentVerificationStatus.REJECTED
    );

    const recentPayments = allPayments.slice(0, 10).map((p) => ({
      id: p.id,
      receiptNumber: p.receiptNumber,
      amount: Number(p.amount),
      bankType: p.bankType,
      paymentType: p.paymentType,
      status: p.status,
      clientName: p.client?.name || "Client",
      date: p.paymentDate.toISOString().split("T")[0],
    }));

    const accountsData: AccountsDashboardMetrics = {
      totalRevenue: totalDealsRevenue,
      receivedAmount: totalDealsReceived,
      pendingAmount: totalDealsPending,
      totalGst: totalDealsGst,
      withoutGst: totalDealsWithoutGst,
      receivedGst: totalDealsReceivedGst,
      receivedWithoutGst: totalDealsReceivedWithoutGst,
      totalOutsourceCost: totalDealsOutsource,
      bsplReceived,
      bsplPending,
      bsplDealsCount,
      bsaplReceived,
      bsaplPending,
      bsaplDealsCount,
      unverifiedPaymentsCount: unverifiedList.length,
      unverifiedPaymentsAmount: unverifiedList.reduce(
        (acc, p) => acc + Number(p.amount),
        0
      ),
      verifiedPaymentsCount: verifiedList.length,
      verifiedPaymentsAmount: verifiedList.reduce(
        (acc, p) => acc + Number(p.amount),
        0
      ),
      rejectedPaymentsCount: rejectedList.length,
      rejectedPaymentsAmount: rejectedList.reduce(
        (acc, p) => acc + Number(p.amount),
        0
      ),
      recentPayments,
    };

    // =========================================================================
    // 3. LEGAL DASHBOARD COMPUTATION
    // =========================================================================

    const dealsPendingReview = allDeals.filter(
      (d) =>
        d.accountsStatus === "SENT_TO_LEGAL" ||
        d.internalLegalStatus === LegalStatus.UNDER_REVIEW
    );
    const legalDocsSentCount = allDeals.filter(
      (d) => d.legalDocSenderName && d.legalDocSenderName.trim() !== ""
    ).length;
    const legalDocsReceivedCount = allDeals.filter(
      (d) => d.legalDocReceiverName && d.legalDocReceiverName.trim() !== ""
    ).length;
    const dealsForwardedToOperations = allDeals.filter(
      (d) =>
        d.accountsStatus === "SENT_TO_OPERATION" ||
        d.internalLegalStatus === LegalStatus.EXECUTED
    ).length;

    const recentLegalDeals = allDeals.slice(0, 10).map((d) => ({
      id: d.id,
      dealNumber: d.dealNumber || "DEAL",
      title: d.title,
      clientName: d.contactName || "Client",
      companyName: d.companyName || "Company",
      totalValue: Number(d.totalValue || d.value || 0),
      internalLegalStatus: d.internalLegalStatus,
      accountsStatus: d.accountsStatus,
      bookingDate: new Date(d.bookingDate || d.createdAt || Date.now()).toISOString().split("T")[0],
    }));

    const legalData: LegalDashboardMetrics = {
      dealsPendingReviewCount: dealsPendingReview.length,
      legalDocsSentCount,
      legalDocsReceivedCount,
      dealsForwardedToOperationsCount: dealsForwardedToOperations,
      recentLegalDeals,
    };

    // =========================================================================
    // 4. OPERATIONS DASHBOARD COMPUTATION
    // =========================================================================

    const workloadByTeam: Record<
      string,
      { total: number; active: number; quality: number; completed: number }
    > = {
      "Team Incorporation": { total: 0, active: 0, quality: 0, completed: 0 },
      "Team Funding": { total: 0, active: 0, quality: 0, completed: 0 },
      "Team Compliance": { total: 0, active: 0, quality: 0, completed: 0 },
      "Team Digital Marketing": { total: 0, active: 0, quality: 0, completed: 0 },
    };

    for (const op of allOperations) {
      const t = op.teamType || "Team Incorporation";
      if (!workloadByTeam[t]) {
        workloadByTeam[t] = { total: 0, active: 0, quality: 0, completed: 0 };
      }
      workloadByTeam[t].total += 1;
      if (op.stage === OperationStage.OPERATION) workloadByTeam[t].active += 1;
      if (op.stage === OperationStage.QUALITY) workloadByTeam[t].quality += 1;
      if (op.status === "COMPLETED") workloadByTeam[t].completed += 1;
    }

    const activeFilesCount = allOperations.filter(
      (op) => op.stage === OperationStage.OPERATION
    ).length;
    const completedFilesCount = allOperations.filter(
      (op) => op.status === "COMPLETED"
    ).length;
    const unassignedQueueCount = allOperations.filter(
      (op) => !op.assignedTlId || !op.assignedTmId
    ).length;

    const recentOperations = allOperations.slice(0, 10).map((op) => ({
      id: op.id,
      operationNumber: op.operationNumber,
      dealNumber: op.deal.dealNumber || "DEAL",
      serviceName: op.serviceName,
      teamType: op.teamType,
      stage: op.stage,
      internalStage: op.internalStage,
      status: op.status,
      assignedTlName: op.assignedTl
        ? `${op.assignedTl.firstName} ${op.assignedTl.lastName}`.trim()
        : null,
      assignedTmName: op.assignedTm
        ? `${op.assignedTm.firstName} ${op.assignedTm.lastName}`.trim()
        : null,
    }));

    const operationsData: OperationsDashboardMetrics = {
      workloadByTeam,
      activeFilesCount,
      completedFilesCount,
      unassignedQueueCount,
      recentOperations,
    };

    // =========================================================================
    // 5. QUALITY DASHBOARD COMPUTATION
    // =========================================================================

    const pendingQualityAudit = allOperations.filter(
      (op) => op.stage === OperationStage.QUALITY && op.status !== "COMPLETED"
    );
    const completedQualityAudit = allOperations.filter(
      (op) => op.status === "COMPLETED"
    );
    const dealsInQuality = allDeals.filter(
      (d) => d.accountsStatus === "QUALITY"
    );

    const scoredOperations = allOperations.filter(
      (op) => op.qualityScore !== null
    );
    const averageScore =
      scoredOperations.length > 0
        ? Math.round(
            (scoredOperations.reduce(
              (acc, op) => acc + (op.qualityScore || 0),
              0
            ) /
              scoredOperations.length) *
              10
          ) / 10
        : 0;

    const highQualityCount = allOperations.filter(
      (op) => (op.qualityScore || 0) >= 80
    ).length;
    const returnedForRevisionCount = allOperations.filter(
      (op) => op.status === "REJECTED"
    ).length;

    const recentQualityDeals = allDeals
      .filter((d) => d.accountsStatus === "QUALITY" || d.isQualityPassed)
      .slice(0, 10)
      .map((d) => ({
        id: d.id,
        dealNumber: d.dealNumber || "DEAL",
        companyName: d.companyName || "Company",
        totalValue: Number(d.totalValue || d.value || 0),
        isQualityPassed: d.isQualityPassed,
        qualityRemarks: d.qualityRemarks,
        updatedAt: d.updatedAt.toISOString().split("T")[0],
      }));

    const qualityData: QualityDashboardMetrics = {
      allFilesCount: allOperations.length,
      pendingAuditCount: pendingQualityAudit.length,
      completedAuditCount: completedQualityAudit.length,
      dealsInQualityCount: dealsInQuality.length,
      averageScore,
      highQualityCount,
      returnedForRevisionCount,
      recentQualityDeals,
    };

    return {
      success: true,
      data: {
        userDepartment: user.department || "Sales",
        userSystemRole: systemRole,
        userName: user.name || "Employee",
        isSuperAdmin,
        isSalesHod,
        isSalesTl,
        isSalesTm,
        selectedMonth,
        selectedYear,
        salesData: {
          personalMetrics,
          teamPerformance,
          orgPerformance: {
            summary: orgSummary,
            teams: teamsPerformance,
            allBdms: allBdmPerformance,
          },
          activeBdmsList,
        },
        accountsData,
        legalData,
        operationsData,
        qualityData,
      },
    };
  } catch (error: any) {
    console.error("[getDashboardDataAction Error]:", error);
    return {
      success: false,
      error: error.message || "Failed to load CRM dashboard metrics.",
    };
  }
}
