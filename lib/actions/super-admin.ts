"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import {
  Role,
  SystemRole,
  PaymentVerificationStatus,
  SalaryEntity,
  TrackerStatus,
  OperationStage,
  EmployeeStatus,
} from "@prisma/client";
import { DEPARTMENTS } from "@/lib/constants/departments";

export interface SuperAdminDashboardParams {
  range?: "daily" | "weekly" | "monthly" | "quarterly" | "yearly" | "custom";
  from?: string;
  to?: string;
}

export interface SuperAdminDashboardData {
  filter: {
    range: string;
    startDate: string;
    endDate: string;
    label: string;
  };
  financials: {
    totalBookedRevenue: number;
    totalReceivedRevenue: number;
    totalPendingReceivables: number;
    bookedGstAmount: number;
    bookedWithoutGst: number;
    receivedGstAmount: number;
    receivedWithoutGst: number;
    totalOutsourceCost: number;
    verifiedPaymentsCount: number;
    unverifiedPaymentsCount: number;
    unverifiedAmount: number;
    totalDealsCount: number;
    bspl: {
      receivedAmount: number;
      pendingAmount: number;
      count: number;
      percentage: number;
    };
    bsapl: {
      receivedAmount: number;
      pendingAmount: number;
      count: number;
      percentage: number;
    };
    revenueTimeline: Array<{
      date: string;
      label: string;
      booked: number;
      received: number;
    }>;
  };
  salesFunnel: {
    stages: Array<{
      stage: string;
      label: string;
      count: number;
      value?: number;
      conversionRate: number;
    }>;
    topServices: Array<{
      name: string;
      dealCount: number;
      totalRevenue: number;
      avgDealSize: number;
    }>;
    bdmLeaderboard: Array<{
      bdmId: string;
      name: string;
      email: string;
      avatarUrl?: string | null;
      teamLeaderName: string;
      targetAmount: number;
      achievedAmount: number;
      attainmentRate: number;
      dealsWon: number;
      quotationsCount: number;
    }>;
    zeroRevenueToday: Array<{
      bdmId: string;
      name: string;
      email: string;
      avatarUrl?: string | null;
      teamLeaderName: string;
      attendanceStatus: "ACTIVE" | "IDLE" | "CLOCKED_OUT" | "ON_LEAVE" | "ABSENT";
      quotationsTodayCount: number;
      leadsTodayCount: number;
      dealsTodayCount: number;
    }>;
  };
  departmentActivity: {
    departments: Array<{
      name: string;
      headcount: number;
      activeThroughput: number;
      completedTasks: number;
      attendanceRate: number;
    }>;
    userActivityFeed: Array<{
      id: string;
      userName: string;
      userEmail: string;
      userAvatar?: string | null;
      department: string;
      module: "CRM" | "HRMS" | "Support";
      action: string;
      targetId: string;
      targetTitle: string;
      targetLink: string;
      timestamp: string;
    }>;
  };
  workforceAttendance: {
    snapshot: {
      totalWorkforce: number;
      currentlyActive: number;
      idle: number;
      clockedOut: number;
      onLeave: number;
      absentToday: number;
      averageDailyHours: number;
    };
    employeeAttendanceList: Array<{
      id: string;
      employeeId: string;
      name: string;
      email: string;
      avatarUrl?: string | null;
      department: string;
      designation: string;
      date: string;
      clockInTime: string | null;
      clockOutTime: string | null;
      totalActiveHours: number;
      totalIdleHours: number;
      status: "ACTIVE" | "IDLE" | "CLOCKED_OUT" | "ON_LEAVE" | "ABSENT";
    }>;
  };
}

/**
 * Parses dynamic date filter range
 */
export async function resolveDateFilter(range?: string, from?: string, to?: string) {
  const now = new Date();
  let startDate: Date;
  let endDate: Date;
  let label = "Monthly (Current Month)";

  switch (range) {
    case "daily": {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      label = `Today (${now.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })})`;
      break;
    }
    case "weekly": {
      const day = now.getDay();
      const diffToMonday = (day + 6) % 7; // Monday = 0
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      label = "Current Week (7 Days)";
      break;
    }
    case "quarterly": {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), currentQuarter * 3, 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0, 23, 59, 59, 999);
      label = `Quarter ${currentQuarter + 1} (${now.getFullYear()})`;
      break;
    }
    case "yearly": {
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      label = `Year ${now.getFullYear()}`;
      break;
    }
    case "custom": {
      if (from && to) {
        const parsedFrom = new Date(from);
        const parsedTo = new Date(to);
        startDate = isNaN(parsedFrom.getTime())
          ? new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
          : new Date(parsedFrom.setHours(0, 0, 0, 0));
        endDate = isNaN(parsedTo.getTime())
          ? new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
          : new Date(parsedTo.setHours(23, 59, 59, 999));
        label = `Custom (${startDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} - ${endDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })})`;
        break;
      }
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      label = `${now.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}`;
      break;
    }
    case "monthly":
    default: {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      label = `${now.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}`;
      break;
    }
  }

  return { startDate, endDate, label, effectiveRange: range || "monthly" };
}

/**
 * Validates Super Admin authorization
 */
export async function assertSuperAdmin() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }

  const isSuperAdmin =
    user.role === Role.Admin ||
    user.systemRole === SystemRole.SUPER_ADMIN ||
    (user as any).isSuperAdmin === true;

  if (!isSuperAdmin) {
    throw new Error("FORBIDDEN");
  }

  return user;
}

/**
 * Core Data Engine: Fetches aggregated Super Admin Dashboard data
 */
export async function getSuperAdminDashboardData(
  params?: SuperAdminDashboardParams
): Promise<SuperAdminDashboardData> {
  await assertSuperAdmin();

  const { startDate, endDate, label, effectiveRange } = await resolveDateFilter(
    params?.range,
    params?.from,
    params?.to
  );

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // Group 1: Core Business Transactions (Deals, Payments, Targets, Staff)
  const [
    allEmployees,
    salesTargets,
    dealsInPeriod,
    allDealsForTimeline,
    paymentsInPeriod,
    quotationsInPeriod,
    operationsInPeriod,
  ] = await Promise.all([
    db.employee.findMany({
      where: { status: EmployeeStatus.ACTIVE },
      include: {
        teamLeader: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { firstName: "asc" },
    }),
    db.salesTarget.findMany({
      where: {
        month: startDate.getMonth() + 1,
        year: startDate.getFullYear(),
      },
    }),
    db.deal.findMany({
      where: {
        OR: [
          { bookingDate: { gte: startDate, lte: endDate } },
          { createdAt: { gte: startDate, lte: endDate } },
        ],
      },
      include: {
        services: true,
        assignedEmployee: {
          select: { id: true, firstName: true, lastName: true, workEmail: true, avatarUrl: true },
        },
        partnerBdm: {
          select: { id: true, firstName: true, lastName: true, workEmail: true, avatarUrl: true },
        },
        client: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.deal.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        totalValue: true,
        value: true,
        createdAt: true,
        bookingDate: true,
      },
    }),
    db.paymentRecord.findMany({
      where: {
        OR: [
          { paymentDate: { gte: startDate, lte: endDate } },
          { createdAt: { gte: startDate, lte: endDate } },
        ],
      },
      include: {
        client: { select: { id: true, name: true } },
        deal: { select: { id: true, dealNumber: true, title: true } },
        recordedBy: {
          select: { id: true, firstName: true, lastName: true, workEmail: true, department: true },
        },
        verifiedBy: {
          select: { id: true, firstName: true, lastName: true, workEmail: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.quotation.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      include: {
        services: true,
        preparedBy: {
          select: { id: true, firstName: true, lastName: true, workEmail: true, department: true },
        },
        client: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.internalOperation.findMany({
      where: {
        OR: [
          { createdAt: { gte: startDate, lte: endDate } },
          { updatedAt: { gte: startDate, lte: endDate } },
        ],
      },
      include: {
        dealService: { select: { serviceName: true } },
        assignedTl: {
          select: { id: true, firstName: true, lastName: true, workEmail: true, department: true },
        },
        assignedTm: {
          select: { id: true, firstName: true, lastName: true, workEmail: true, department: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  // Group 2: Funnel Inflow, Support & Workforce Attendance
  const [
    leadsInPeriod,
    prospectRowsInPeriod,
    ticketsInPeriod,
    auditLogsInPeriod,
    todayAttendance,
    periodAttendance,
    todayLeaves,
    todayDeals,
    todayQuotations,
    todayLeads,
  ] = await Promise.all([
    db.lead.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, workEmail: true, department: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.prospectRow.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      select: { id: true, assignedBdmId: true, createdAt: true },
    }),
    db.ticket.findMany({
      where: {
        OR: [
          { createdAt: { gte: startDate, lte: endDate } },
          { updatedAt: { gte: startDate, lte: endDate } },
        ],
      },
      include: {
        assignedEmployee: {
          select: { id: true, firstName: true, lastName: true, workEmail: true, department: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.auditLog.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      include: {
        auditor: {
          select: { id: true, firstName: true, lastName: true, workEmail: true, department: true },
        },
        ticket: { select: { id: true, ticketNumber: true, subject: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.attendance.findMany({
      where: { date: todayStart },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            workEmail: true,
            avatarUrl: true,
            department: true,
            designation: true,
            employeeId: true,
          },
        },
      },
    }),
    db.attendance.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            workEmail: true,
            avatarUrl: true,
            department: true,
            designation: true,
            employeeId: true,
          },
        },
      },
      orderBy: { date: "desc" },
      take: 200,
    }),
    db.leaveRequest.findMany({
      where: {
        finalStatus: "APPROVED",
        startDate: { lte: todayEnd },
        endDate: { gte: todayStart },
      },
      select: { employeeId: true },
    }),
    db.deal.findMany({
      where: {
        OR: [
          { bookingDate: { gte: todayStart, lte: todayEnd } },
          { createdAt: { gte: todayStart, lte: todayEnd } },
        ],
      },
      select: {
        id: true,
        totalValue: true,
        value: true,
        assignedEmployeeId: true,
        partnerBdmId: true,
      },
    }),
    db.quotation.findMany({
      where: { createdAt: { gte: todayStart, lte: todayEnd } },
      select: { id: true, preparedById: true },
    }),
    db.lead.findMany({
      where: { createdAt: { gte: todayStart, lte: todayEnd } },
      select: { id: true, createdById: true },
    }),
  ]);

  // =========================================================================
  // 1. FINANCIALS & REVENUE CALCULATIONS
  // =========================================================================
  let totalBookedRevenue = 0;
  let bookedGstAmount = 0;
  let bookedWithoutGst = 0;
  let receivedGstAmount = 0;
  let receivedWithoutGst = 0;
  let totalOutsourceCost = 0;

  for (const deal of dealsInPeriod) {
    const val = Number(deal.totalValue || deal.value || 0);
    totalBookedRevenue += val;
    bookedGstAmount += Number(deal.gstAmount || 0);
    bookedWithoutGst += Number(deal.subTotal || 0);

    for (const s of deal.services) {
      receivedGstAmount += Number(s.receivedGst || 0);
      receivedWithoutGst += Number(s.receivedWithoutGst || 0);
      totalOutsourceCost += Number(s.outsourceCost || 0);
    }
  }

  const verifiedPayments = paymentsInPeriod.filter(
    (p) => p.status === PaymentVerificationStatus.VERIFIED
  );
  const unverifiedPayments = paymentsInPeriod.filter(
    (p) => p.status === PaymentVerificationStatus.UNVERIFIED
  );

  const totalReceivedRevenue = verifiedPayments.reduce(
    (acc, p) => acc + Number(p.amount || 0),
    0
  );
  const unverifiedAmount = unverifiedPayments.reduce(
    (acc, p) => acc + Number(p.amount || 0),
    0
  );

  const totalPendingReceivables = Math.max(0, totalBookedRevenue - totalReceivedRevenue);

  const bsplVerified = verifiedPayments.filter((p) => p.bankType === SalaryEntity.BSPL);
  const bsaplVerified = verifiedPayments.filter((p) => p.bankType === SalaryEntity.BSAPL);

  const bsplReceivedSum = bsplVerified.reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const bsaplReceivedSum = bsaplVerified.reduce((acc, p) => acc + Number(p.amount || 0), 0);

  const bsplPendingSum = unverifiedPayments
    .filter((p) => p.bankType === SalaryEntity.BSPL)
    .reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const bsaplPendingSum = unverifiedPayments
    .filter((p) => p.bankType === SalaryEntity.BSAPL)
    .reduce((acc, p) => acc + Number(p.amount || 0), 0);

  const totalVerifiedSum = totalReceivedRevenue > 0 ? totalReceivedRevenue : 1;
  const bsplPercentage = Math.round((bsplReceivedSum / totalVerifiedSum) * 100);
  const bsaplPercentage = 100 - bsplPercentage;

  // Timeline Trend Generation
  const timelineMap: Record<string, { label: string; booked: number; received: number }> = {};
  const daysDiff = Math.max(
    1,
    Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  );

  if (daysDiff <= 31) {
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      const dayLabel = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      timelineMap[key] = { label: dayLabel, booked: 0, received: 0 };
    }
  } else {
    for (let d = new Date(startDate); d <= endDate; d.setMonth(d.getMonth() + 1)) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthLabel = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
      timelineMap[key] = { label: monthLabel, booked: 0, received: 0 };
    }
  }

  for (const deal of allDealsForTimeline) {
    const d = new Date(deal.bookingDate || deal.createdAt);
    const key =
      daysDiff <= 31
        ? d.toISOString().slice(0, 10)
        : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

    if (timelineMap[key]) {
      timelineMap[key].booked += Number(deal.totalValue || deal.value || 0);
    }
  }

  for (const payment of verifiedPayments) {
    const d = new Date(payment.paymentDate || payment.createdAt);
    const key =
      daysDiff <= 31
        ? d.toISOString().slice(0, 10)
        : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

    if (timelineMap[key]) {
      timelineMap[key].received += Number(payment.amount || 0);
    }
  }

  const revenueTimeline = Object.entries(timelineMap).map(([date, val]) => ({
    date,
    label: val.label,
    booked: Math.round(val.booked),
    received: Math.round(val.received),
  }));

  // =========================================================================
  // 2. SALES FUNNEL, TOP SERVICES & LEADERBOARD
  // =========================================================================
  const leadsCount = leadsInPeriod.length;
  const prospectsCount = prospectRowsInPeriod.length;
  const quotationsCount = quotationsInPeriod.length;
  const quotationsTotalValue = quotationsInPeriod.reduce((acc, q) => {
    const qVal = q.services.reduce((sAcc: number, s: any) => sAcc + Number(s.totalPrice || 0), 0);
    return acc + qVal;
  }, 0);
  const paymentsCount = paymentsInPeriod.length;
  const paymentsTotalValue = paymentsInPeriod.reduce(
    (acc, p) => acc + Number(p.amount || 0),
    0
  );
  const dealsCount = dealsInPeriod.length;
  const operationsCount = operationsInPeriod.length;
  const qualityPassedCount = operationsInPeriod.filter(
    (op) => op.stage === OperationStage.QUALITY
  ).length;

  const baseCount = Math.max(1, leadsCount);
  const funnelStages = [
    {
      stage: "LEADS",
      label: "Leads Inflow",
      count: leadsCount,
      conversionRate: 100,
    },
    {
      stage: "PROSPECTS",
      label: "Master Prospects",
      count: prospectsCount,
      conversionRate: Math.round((prospectsCount / baseCount) * 100),
    },
    {
      stage: "QUOTATIONS",
      label: "Quotations Issued",
      count: quotationsCount,
      value: Math.round(quotationsTotalValue),
      conversionRate: Math.round((quotationsCount / baseCount) * 100),
    },
    {
      stage: "PAYMENTS",
      label: "Payments Collected",
      count: paymentsCount,
      value: Math.round(paymentsTotalValue),
      conversionRate: Math.round((paymentsCount / baseCount) * 100),
    },
    {
      stage: "DEALS",
      label: "Booked Deals",
      count: dealsCount,
      value: Math.round(totalBookedRevenue),
      conversionRate: Math.round((dealsCount / baseCount) * 100),
    },
    {
      stage: "OPERATIONS",
      label: "Operations Executed",
      count: operationsCount,
      conversionRate: Math.round((operationsCount / baseCount) * 100),
    },
    {
      stage: "QUALITY",
      label: "Quality Audit Passed",
      count: qualityPassedCount,
      conversionRate: Math.round((qualityPassedCount / baseCount) * 100),
    },
  ];

  const serviceStatsMap: Record<
    string,
    { name: string; dealCount: number; totalRevenue: number }
  > = {};

  for (const deal of dealsInPeriod) {
    for (const service of deal.services) {
      const sName = service.serviceName.trim();
      if (!serviceStatsMap[sName]) {
        serviceStatsMap[sName] = { name: sName, dealCount: 0, totalRevenue: 0 };
      }
      serviceStatsMap[sName].dealCount += 1;
      serviceStatsMap[sName].totalRevenue += Number(service.totalPrice || 0);
    }
  }

  const topServices = Object.values(serviceStatsMap)
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 8)
    .map((s) => ({
      name: s.name,
      dealCount: s.dealCount,
      totalRevenue: Math.round(s.totalRevenue),
      avgDealSize: s.dealCount > 0 ? Math.round(s.totalRevenue / s.dealCount) : 0,
    }));

  // BDM Leaderboard with STRICT 50%-50% Partner Split
  const salesStaff = allEmployees.filter((emp) => {
    const dept = (emp.department || "").toLowerCase();
    return (
      dept.includes("sales") ||
      emp.role === Role.CRM ||
      emp.systemRole === SystemRole.TEAM_MEMBER ||
      emp.systemRole === SystemRole.TEAM_LEADER ||
      emp.systemRole === SystemRole.ADMIN_HOD
    );
  });

  const bdmLeaderboard = salesStaff.map((bdm) => {
    let achievedAmount = 0;
    let dealsWon = 0;

    for (const deal of dealsInPeriod) {
      let factor = 0;
      if (deal.partnerBdmId) {
        if (deal.assignedEmployeeId === bdm.id) factor = 0.5;
        else if (deal.partnerBdmId === bdm.id) factor = 0.5;
      } else {
        if (deal.assignedEmployeeId === bdm.id) factor = 1.0;
      }

      if (factor > 0) {
        achievedAmount += Number(deal.totalValue || deal.value || 0) * factor;
        dealsWon += factor;
      }
    }

    const targetRecord = salesTargets.find((t) => t.bdmId === bdm.id);
    const targetAmount = targetRecord
      ? Number(targetRecord.targetAmount)
      : Number(bdm.monthlyTarget || 0);

    const attainmentRate =
      targetAmount > 0
        ? Math.round((achievedAmount / targetAmount) * 100)
        : achievedAmount > 0
        ? 100
        : 0;

    const quotationsCountForBdm = quotationsInPeriod.filter(
      (q) => q.preparedById === bdm.id
    ).length;

    const fullName = `${bdm.firstName} ${bdm.lastName}`.trim();
    const teamLeaderName = bdm.teamLeader
      ? `${bdm.teamLeader.firstName} ${bdm.teamLeader.lastName}`.trim()
      : "Direct / HOD";

    return {
      bdmId: bdm.id,
      name: fullName,
      email: bdm.workEmail,
      avatarUrl: bdm.avatarUrl,
      teamLeaderName,
      targetAmount: Math.round(targetAmount),
      achievedAmount: Math.round(achievedAmount),
      attainmentRate,
      dealsWon: Math.round(dealsWon * 10) / 10,
      quotationsCount: quotationsCountForBdm,
    };
  }).sort((a, b) => b.achievedAmount - a.achievedAmount);

  // Real-Time Zero-Revenue Today Watchlist
  const approvedLeaveEmployeeIds = new Set(todayLeaves.map((l) => l.employeeId));
  const todayAttendanceMap = new Map<string, TrackerStatus>();
  for (const att of todayAttendance) {
    todayAttendanceMap.set(att.employeeId, att.currentStatus);
  }

  const zeroRevenueToday = salesStaff
    .map((bdm) => {
      let todayRevenue = 0;
      let dealsTodayCount = 0;

      for (const deal of todayDeals) {
        let factor = 0;
        if (deal.partnerBdmId) {
          if (deal.assignedEmployeeId === bdm.id) factor = 0.5;
          else if (deal.partnerBdmId === bdm.id) factor = 0.5;
        } else {
          if (deal.assignedEmployeeId === bdm.id) factor = 1.0;
        }

        if (factor > 0) {
          todayRevenue += Number(deal.totalValue || deal.value || 0) * factor;
          dealsTodayCount += 1;
        }
      }

      let attendanceStatus: "ACTIVE" | "IDLE" | "CLOCKED_OUT" | "ON_LEAVE" | "ABSENT";
      const liveStatus = todayAttendanceMap.get(bdm.id);

      if (approvedLeaveEmployeeIds.has(bdm.id)) {
        attendanceStatus = "ON_LEAVE";
      } else if (liveStatus) {
        attendanceStatus = liveStatus as "ACTIVE" | "IDLE" | "CLOCKED_OUT";
      } else {
        attendanceStatus = "ABSENT";
      }

      const quotationsTodayCount = todayQuotations.filter((q) => q.preparedById === bdm.id).length;
      const leadsTodayCount = todayLeads.filter((l) => l.createdById === bdm.id).length;

      const fullName = `${bdm.firstName} ${bdm.lastName}`.trim();
      const teamLeaderName = bdm.teamLeader
        ? `${bdm.teamLeader.firstName} ${bdm.teamLeader.lastName}`.trim()
        : "Direct / HOD";

      return {
        bdmId: bdm.id,
        name: fullName,
        email: bdm.workEmail,
        avatarUrl: bdm.avatarUrl,
        teamLeaderName,
        attendanceStatus,
        quotationsTodayCount,
        leadsTodayCount,
        dealsTodayCount,
        todayRevenue,
      };
    })
    .filter((bdm) => bdm.todayRevenue === 0)
    .sort((a, b) => {
      const rank: Record<string, number> = { ACTIVE: 0, IDLE: 1, CLOCKED_OUT: 2, ABSENT: 3, ON_LEAVE: 4 };
      return (rank[a.attendanceStatus] ?? 5) - (rank[b.attendanceStatus] ?? 5);
    });

  // =========================================================================
  // 3. DEPARTMENT-WISE & USER-WISE ACTIVITY REPORTS
  // =========================================================================
  const departmentStats = DEPARTMENTS.map((deptName) => {
    const deptEmployees = allEmployees.filter(
      (e) => (e.department || "").trim().toLowerCase() === deptName.toLowerCase()
    );
    const deptEmpIds = new Set(deptEmployees.map((e) => e.id));

    let activeThroughput = 0;
    let completedTasks = 0;

    const lower = deptName.toLowerCase();
    if (lower.includes("sales")) {
      activeThroughput = leadsInPeriod.length + quotationsInPeriod.length;
      completedTasks = dealsInPeriod.length;
    } else if (lower.includes("account")) {
      activeThroughput = unverifiedPayments.length;
      completedTasks = verifiedPayments.length;
    } else if (lower.includes("operation")) {
      activeThroughput = operationsInPeriod.filter((op) => op.stage !== OperationStage.QUALITY).length;
      completedTasks = operationsInPeriod.filter((op) => op.stage === OperationStage.QUALITY).length;
    } else if (lower.includes("quality")) {
      activeThroughput = ticketsInPeriod.filter((t) => t.status !== "RESOLVED" && t.status !== "CLOSED").length;
      completedTasks = auditLogsInPeriod.length;
    } else if (lower.includes("legal")) {
      activeThroughput = dealsInPeriod.filter((d) => d.internalLegalStatus === "PENDING").length;
      completedTasks = dealsInPeriod.filter((d) => d.internalLegalStatus === "EXECUTED").length;
    } else if (lower.includes("hr")) {
      activeThroughput = periodAttendance.length;
      completedTasks = todayLeaves.length;
    } else if (lower.includes("it")) {
      activeThroughput = ticketsInPeriod.filter((t) => t.status === "OPEN" || t.status === "IN_PROGRESS").length;
      completedTasks = ticketsInPeriod.filter((t) => t.status === "RESOLVED").length;
    } else {
      activeThroughput = deptEmployees.length;
      completedTasks = 0;
    }

    const deptPeriodAtt = periodAttendance.filter((a) => deptEmpIds.has(a.employeeId));
    const attendanceRate =
      deptEmployees.length > 0
        ? Math.min(100, Math.round((deptPeriodAtt.length / (deptEmployees.length * Math.max(1, daysDiff))) * 100))
        : 100;

    return {
      name: deptName,
      headcount: deptEmployees.length,
      activeThroughput,
      completedTasks,
      attendanceRate: Math.max(0, attendanceRate),
    };
  });

  // User Activity Audit Feed
  const activityLogs: SuperAdminDashboardData["departmentActivity"]["userActivityFeed"] = [];

  for (const deal of dealsInPeriod.slice(0, 40)) {
    const creator = deal.assignedEmployee;
    activityLogs.push({
      id: `deal-${deal.id}`,
      userName: creator ? `${creator.firstName} ${creator.lastName}`.trim() : "System Sales",
      userEmail: creator?.workEmail || "sales@bharatedge.com",
      userAvatar: creator?.avatarUrl,
      department: "Sales",
      module: "CRM",
      action: `Created Deal (${deal.dealNumber || deal.title})`,
      targetId: deal.id,
      targetTitle: deal.title || deal.companyName,
      targetLink: `/crm/deals?openDealId=${deal.id}`,
      timestamp: deal.createdAt.toISOString(),
    });
  }

  for (const payment of paymentsInPeriod.slice(0, 30)) {
    const user = payment.verifiedBy || payment.recordedBy;
    const isVerified = payment.status === PaymentVerificationStatus.VERIFIED;
    activityLogs.push({
      id: `pay-${payment.id}`,
      userName: user ? `${user.firstName} ${user.lastName}`.trim() : "Finance Desk",
      userEmail: user?.workEmail || "accounts@bharatedge.com",
      userAvatar: null,
      department: "Account",
      module: "CRM",
      action: isVerified ? `Verified Payment ₹${payment.amount}` : `Recorded Payment ₹${payment.amount}`,
      targetId: payment.id,
      targetTitle: `Receipt #${payment.receiptNumber} (${payment.client?.name || "Client"})`,
      targetLink: `/crm/payments`,
      timestamp: payment.createdAt.toISOString(),
    });
  }

  for (const quote of quotationsInPeriod.slice(0, 25)) {
    const prep = quote.preparedBy;
    activityLogs.push({
      id: `quote-${quote.id}`,
      userName: prep ? `${prep.firstName} ${prep.lastName}`.trim() : "Sales Exec",
      userEmail: prep?.workEmail || "sales@bharatedge.com",
      userAvatar: null,
      department: prep?.department || "Sales",
      module: "CRM",
      action: `Prepared Quotation #${quote.quotationNumber}`,
      targetId: quote.id,
      targetTitle: `Quotation for ${quote.client?.name || "Client"}`,
      targetLink: `/crm/quotations`,
      timestamp: quote.createdAt.toISOString(),
    });
  }

  for (const op of operationsInPeriod.slice(0, 25)) {
    const user = op.assignedTm || op.assignedTl;
    activityLogs.push({
      id: `op-${op.id}`,
      userName: user ? `${user.firstName} ${user.lastName}`.trim() : "Operations Team",
      userEmail: user?.workEmail || "ops@bharatedge.com",
      userAvatar: null,
      department: "Operation",
      module: "CRM",
      action: `Updated Operation Stage: ${op.stage}`,
      targetId: op.id,
      targetTitle: `${op.dealService?.serviceName || "Service Operation"} (${op.stage})`,
      targetLink: `/crm/operations`,
      timestamp: op.updatedAt.toISOString(),
    });
  }

  for (const att of periodAttendance.slice(0, 30)) {
    const emp = att.employee;
    activityLogs.push({
      id: `att-${att.id}`,
      userName: `${emp.firstName} ${emp.lastName}`.trim(),
      userEmail: emp.workEmail,
      userAvatar: emp.avatarUrl,
      department: emp.department,
      module: "HRMS",
      action: `Attendance Logged: ${att.currentStatus} (${att.totalActiveHours.toFixed(1)} hrs)`,
      targetId: att.id,
      targetTitle: `${emp.designation} - ${new Date(att.date).toLocaleDateString("en-IN")}`,
      targetLink: `/hrms/attendance`,
      timestamp: att.updatedAt.toISOString(),
    });
  }

  for (const audit of auditLogsInPeriod.slice(0, 20)) {
    const auditor = audit.auditor;
    activityLogs.push({
      id: `audit-${audit.id}`,
      userName: `${auditor.firstName} ${auditor.lastName}`.trim(),
      userEmail: auditor.workEmail,
      userAvatar: null,
      department: "Quality",
      module: "Support",
      action: `Quality Audit Logged: Score ${audit.qualityScore}/100`,
      targetId: audit.ticketId,
      targetTitle: `Ticket #${audit.ticket.ticketNumber} - ${audit.complianceStatus}`,
      targetLink: `/support/quality`,
      timestamp: audit.createdAt.toISOString(),
    });
  }

  activityLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // =========================================================================
  // 4. ORGANIZATION ATTENDANCE DATA & SNAPSHOT
  // =========================================================================
  const totalWorkforce = allEmployees.length;
  let currentlyActive = 0;
  let idle = 0;
  let clockedOut = 0;
  let onLeave = todayLeaves.length;

  for (const att of todayAttendance) {
    if (att.currentStatus === TrackerStatus.ACTIVE) currentlyActive += 1;
    else if (att.currentStatus === TrackerStatus.IDLE) idle += 1;
    else clockedOut += 1;
  }

  const absentToday = Math.max(0, totalWorkforce - (todayAttendance.length + onLeave));

  const completedAttendance = periodAttendance.filter((a) => a.totalActiveHours > 0);
  const averageDailyHours =
    completedAttendance.length > 0
      ? Math.round(
          (completedAttendance.reduce((acc, a) => acc + a.totalActiveHours, 0) /
            completedAttendance.length) *
            10
        ) / 10
      : 8.0;

  const attendanceSnapshot = {
    totalWorkforce,
    currentlyActive,
    idle,
    clockedOut,
    onLeave,
    absentToday,
    averageDailyHours,
  };

  const employeeAttendanceList = periodAttendance.map((att) => {
    const emp = att.employee;
    return {
      id: att.id,
      employeeId: emp.employeeId || emp.id.slice(0, 8),
      name: `${emp.firstName} ${emp.lastName}`.trim(),
      email: emp.workEmail,
      avatarUrl: emp.avatarUrl,
      department: emp.department,
      designation: emp.designation,
      date: new Date(att.date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      clockInTime: att.clockInTime
        ? new Date(att.clockInTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
        : null,
      clockOutTime: att.clockOutTime
        ? new Date(att.clockOutTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
        : null,
      totalActiveHours: Math.round(att.totalActiveHours * 10) / 10,
      totalIdleHours: 0,
      status: att.currentStatus as "ACTIVE" | "IDLE" | "CLOCKED_OUT",
    };
  });

  return {
    filter: {
      range: effectiveRange,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      label,
    },
    financials: {
      totalBookedRevenue: Math.round(totalBookedRevenue),
      totalReceivedRevenue: Math.round(totalReceivedRevenue),
      totalPendingReceivables: Math.round(totalPendingReceivables),
      bookedGstAmount: Math.round(bookedGstAmount),
      bookedWithoutGst: Math.round(bookedWithoutGst),
      receivedGstAmount: Math.round(receivedGstAmount),
      receivedWithoutGst: Math.round(receivedWithoutGst),
      totalOutsourceCost: Math.round(totalOutsourceCost),
      verifiedPaymentsCount: verifiedPayments.length,
      unverifiedPaymentsCount: unverifiedPayments.length,
      unverifiedAmount: Math.round(unverifiedAmount),
      totalDealsCount: dealsInPeriod.length,
      bspl: {
        receivedAmount: Math.round(bsplReceivedSum),
        pendingAmount: Math.round(bsplPendingSum),
        count: bsplVerified.length,
        percentage: bsplPercentage,
      },
      bsapl: {
        receivedAmount: Math.round(bsaplReceivedSum),
        pendingAmount: Math.round(bsaplPendingSum),
        count: bsaplVerified.length,
        percentage: bsaplPercentage,
      },
      revenueTimeline,
    },
    salesFunnel: {
      stages: funnelStages,
      topServices,
      bdmLeaderboard,
      zeroRevenueToday,
    },
    departmentActivity: {
      departments: departmentStats,
      userActivityFeed: activityLogs,
    },
    workforceAttendance: {
      snapshot: attendanceSnapshot,
      employeeAttendanceList,
    },
  };
}
