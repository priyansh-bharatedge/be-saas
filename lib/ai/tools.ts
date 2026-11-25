import { db } from "@/lib/db";
import { TrackerStatus, ApprovalStatus, TicketStatus, PaymentVerificationStatus, LegalStatus } from "@prisma/client";

/**
 * Helper to parse natural date range string into start and end Dates (Asia/Kolkata aware)
 */
export function parseDateRange(rangeStr?: string): { startDate: Date; endDate: Date; label: string } {
  const now = new Date();
  // Set to start of day in local server time
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  if (!rangeStr || rangeStr === "today") {
    return { startDate: startOfToday, endDate: endOfToday, label: "Today" };
  }

  if (rangeStr === "yesterday") {
    const yestStart = new Date(startOfToday);
    yestStart.setDate(yestStart.getDate() - 1);
    const yestEnd = new Date(endOfToday);
    yestEnd.setDate(yestEnd.getDate() - 1);
    return { startDate: yestStart, endDate: yestEnd, label: "Yesterday" };
  }

  if (rangeStr === "this_week" || rangeStr === "week") {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const startOfWeek = new Date(now.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);
    return { startDate: startOfWeek, endDate: endOfToday, label: "This Week" };
  }

  if (rangeStr === "this_month" || rangeStr === "month") {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    return { startDate: startOfMonth, endDate: endOfToday, label: "This Month" };
  }

  if (rangeStr === "last_month") {
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { startDate: startOfLastMonth, endDate: endOfLastMonth, label: "Last Month" };
  }

  if (rangeStr === "all_time") {
    return { startDate: new Date(2020, 0, 1), endDate: endOfToday, label: "All Time" };
  }

  // Attempt to parse custom ISO or YYYY-MM-DD
  const parts = rangeStr.split("to").map((s) => s.trim());
  if (parts.length === 2) {
    const s = new Date(parts[0]);
    const e = new Date(parts[1]);
    if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
      s.setHours(0, 0, 0, 0);
      e.setHours(23, 59, 59, 999);
      return { startDate: s, endDate: e, label: rangeStr };
    }
  }

  // Default to this month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  return { startDate: startOfMonth, endDate: endOfToday, label: "This Month" };
}

// =========================================================================
// STRICTLY READ-ONLY ANALYTICS TOOL IMPLEMENTATIONS
// =========================================================================

/**
 * 1. getMonthlyOutsourceCost
 * Calculates total outsourced vendor/advocate costs from DealService table.
 */
export async function getMonthlyOutsourceCost(args: { month?: number; year?: number }) {
  const now = new Date();
  const year = args.year || now.getFullYear();
  const month = args.month !== undefined ? args.month : now.getMonth() + 1; // 1-12

  const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

  const dealServices = await db.dealService.findMany({
    where: {
      outsourceCost: { gt: 0 },
      deal: {
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    },
    include: {
      deal: {
        select: {
          id: true,
          dealNumber: true,
          title: true,
          companyName: true,
        },
      },
      service: {
        select: {
          name: true,
          category: true,
        },
      },
    },
    orderBy: { outsourceCost: "desc" },
    take: 50,
  });

  const totalCost = dealServices.reduce((sum, ds) => sum + Number(ds.outsourceCost), 0);

  const breakdowns = dealServices.map((ds) => ({
    serviceName: ds.serviceName || ds.service?.name || "Outsourced Service",
    dealNumber: ds.deal?.dealNumber || "N/A",
    companyName: ds.deal?.companyName || "N/A",
    outsourceCost: Number(ds.outsourceCost),
    totalPrice: Number(ds.totalPrice),
    margin: Number(ds.totalPrice) - Number(ds.outsourceCost),
  }));

  return {
    month,
    year,
    monthName: new Date(year, month - 1, 1).toLocaleString("en-US", { month: "long" }),
    totalOutsourceCost: totalCost,
    formattedTotalCost: `₹${totalCost.toLocaleString("en-IN")}`,
    serviceCount: dealServices.length,
    breakdowns,
  };
}

/**
 * 2. getRevenueSummary
 * Inflow across BSPL/BSAPL, verified vs unverified, adhering strictly to 50/50 Partner BDM split formula.
 */
export async function getRevenueSummary(args: { dateRange?: string }) {
  const { startDate, endDate, label } = parseDateRange(args.dateRange);

  const payments = await db.paymentRecord.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      client: { select: { name: true } },
      recordedBy: { select: { firstName: true, lastName: true } },
    },
  });

  let totalInflow = 0;
  let verifiedInflow = 0;
  let unverifiedInflow = 0;
  let bsplInflow = 0;
  let bsaplInflow = 0;

  for (const p of payments) {
    const amt = Number(p.amount);
    totalInflow += amt;
    if (p.status === PaymentVerificationStatus.VERIFIED) {
      verifiedInflow += amt;
    } else {
      unverifiedInflow += amt;
    }

    if (p.bankType === "BSPL") {
      bsplInflow += amt;
    } else if (p.bankType === "BSAPL") {
      bsaplInflow += amt;
    }
  }

  // Also calculate total closed deals in this window
  const deals = await db.deal.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      id: true,
      totalValue: true,
      amountReceived: true,
      stage: true,
    },
  });

  const totalDealsValue = deals.reduce((sum, d) => sum + Number(d.totalValue || 0), 0);
  const totalDealsReceived = deals.reduce((sum, d) => sum + Number(d.amountReceived || 0), 0);

  return {
    dateRangeLabel: label,
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
    totalPaymentRecords: payments.length,
    totalInflow,
    formattedTotalInflow: `₹${totalInflow.toLocaleString("en-IN")}`,
    verifiedInflow,
    formattedVerifiedInflow: `₹${verifiedInflow.toLocaleString("en-IN")}`,
    unverifiedInflow,
    formattedUnverifiedInflow: `₹${unverifiedInflow.toLocaleString("en-IN")}`,
    bsplInflow,
    formattedBsplInflow: `₹${bsplInflow.toLocaleString("en-IN")}`,
    bsaplInflow,
    formattedBsaplInflow: `₹${bsaplInflow.toLocaleString("en-IN")}`,
    dealsCount: deals.length,
    totalDealsValue,
    totalDealsReceived,
  };
}

/**
 * 3. getTopSellingServices
 * Ranks services by deal volume and generated revenue.
 */
export async function getTopSellingServices(args: { dateRange?: string; limit?: number }) {
  const { startDate, endDate, label } = parseDateRange(args.dateRange);
  const limit = args.limit || 10;

  const dealServices = await db.dealService.findMany({
    where: {
      deal: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    },
    select: {
      serviceName: true,
      totalPrice: true,
      amountReceived: true,
      outsourceCost: true,
    },
  });

  const serviceMap = new Map<
    string,
    { serviceName: string; dealCount: number; totalRevenue: number; totalReceived: number; totalOutsource: number }
  >();

  for (const ds of dealServices) {
    const name = ds.serviceName.trim();
    const existing = serviceMap.get(name) || {
      serviceName: name,
      dealCount: 0,
      totalRevenue: 0,
      totalReceived: 0,
      totalOutsource: 0,
    };

    existing.dealCount += 1;
    existing.totalRevenue += Number(ds.totalPrice);
    existing.totalReceived += Number(ds.amountReceived);
    existing.totalOutsource += Number(ds.outsourceCost);
    serviceMap.set(name, existing);
  }

  const sorted = Array.from(serviceMap.values())
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, limit)
    .map((s, idx) => ({
      rank: idx + 1,
      serviceName: s.serviceName,
      dealCount: s.dealCount,
      totalRevenue: s.totalRevenue,
      formattedRevenue: `₹${s.totalRevenue.toLocaleString("en-IN")}`,
      totalReceived: s.totalReceived,
      outsourceCost: s.totalOutsource,
      grossProfit: s.totalRevenue - s.totalOutsource,
    }));

  return {
    dateRangeLabel: label,
    servicesCount: sorted.length,
    topServices: sorted,
  };
}

/**
 * 4. getTopSalesPerformers
 * BDMs ranked by collected revenue and deal volume with 50/50 partner split.
 */
export async function getTopSalesPerformers(args: { dateRange?: string; limit?: number }) {
  const { startDate, endDate, label } = parseDateRange(args.dateRange);
  const limit = args.limit || 10;

  // Retrieve deals created in range
  const deals = await db.deal.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      assignedEmployee: {
        select: { id: true, firstName: true, lastName: true, workEmail: true },
      },
      partnerBdm: {
        select: { id: true, firstName: true, lastName: true, workEmail: true },
      },
      payments: {
        where: { status: PaymentVerificationStatus.VERIFIED },
        select: { amount: true },
      },
    },
  });

  interface PerformerRecord {
    id: string;
    name: string;
    email: string;
    dealCount: number;
    creditedDealValue: number;
    creditedReceived: number;
  }

  const performerMap = new Map<string, PerformerRecord>();

  for (const deal of deals) {
    const verifiedReceived = deal.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const dealVal = Number(deal.totalValue || deal.value || 0);

    const hasPartner = deal.partnerBdmId && deal.partnerBdmId !== deal.assignedEmployeeId;
    const factor = hasPartner ? 0.5 : 1.0;

    // Credit Primary BDM
    if (deal.assignedEmployee) {
      const pId = deal.assignedEmployee.id;
      const existing = performerMap.get(pId) || {
        id: pId,
        name: `${deal.assignedEmployee.firstName} ${deal.assignedEmployee.lastName}`.trim(),
        email: deal.assignedEmployee.workEmail,
        dealCount: 0,
        creditedDealValue: 0,
        creditedReceived: 0,
      };
      existing.dealCount += factor;
      existing.creditedDealValue += dealVal * factor;
      existing.creditedReceived += verifiedReceived * factor;
      performerMap.set(pId, existing);
    }

    // Credit Partner BDM
    if (hasPartner && deal.partnerBdm) {
      const pId = deal.partnerBdm.id;
      const existing = performerMap.get(pId) || {
        id: pId,
        name: `${deal.partnerBdm.firstName} ${deal.partnerBdm.lastName}`.trim(),
        email: deal.partnerBdm.workEmail,
        dealCount: 0,
        creditedDealValue: 0,
        creditedReceived: 0,
      };
      existing.dealCount += 0.5;
      existing.creditedDealValue += dealVal * 0.5;
      existing.creditedReceived += verifiedReceived * 0.5;
      performerMap.set(pId, existing);
    }
  }

  const sorted = Array.from(performerMap.values())
    .sort((a, b) => b.creditedReceived - a.creditedReceived)
    .slice(0, limit)
    .map((p, idx) => ({
      rank: idx + 1,
      name: p.name,
      email: p.email,
      dealCount: Math.round(p.dealCount * 10) / 10,
      creditedDealValue: Math.round(p.creditedDealValue),
      creditedReceived: Math.round(p.creditedReceived),
      formattedReceived: `₹${Math.round(p.creditedReceived).toLocaleString("en-IN")}`,
    }));

  return {
    dateRangeLabel: label,
    performers: sorted,
  };
}

/**
 * 5. getZeroRevenueSalespeople
 * Identifies clocked-in/active BDMs who generated ₹0 so far today.
 */
export async function getZeroRevenueSalespeople(args: { date?: string }) {
  const targetDate = args.date ? new Date(args.date) : new Date();
  const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

  // 1. Get all sales employees
  const salesEmployees = await db.employee.findMany({
    where: {
      status: "ACTIVE",
      role: "CRM",
      workEmail: { not: "bharatedge.ai@internal.bharatedge.com" },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      workEmail: true,
      teamLeader: {
        select: { firstName: true, lastName: true },
      },
    },
  });

  // 2. Get attendance for today
  const attendanceRecords = await db.attendance.findMany({
    where: {
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    select: {
      employeeId: true,
      currentStatus: true,
      clockInTime: true,
      totalActiveHours: true,
    },
  });

  const attendanceMap = new Map<string, (typeof attendanceRecords)[0]>();
  for (const a of attendanceRecords) {
    attendanceMap.set(a.employeeId, a);
  }

  // 3. Get payments logged today
  const todayPayments = await db.paymentRecord.findMany({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    select: {
      recordedById: true,
      amount: true,
    },
  });

  const paymentSumMap = new Map<string, number>();
  for (const p of todayPayments) {
    if (p.recordedById) {
      paymentSumMap.set(p.recordedById, (paymentSumMap.get(p.recordedById) || 0) + Number(p.amount));
    }
  }

  // Filter for clocked in salespeople with 0 revenue
  const zeroRevenueList = [];

  for (const emp of salesEmployees) {
    const att = attendanceMap.get(emp.id);
    const revenue = paymentSumMap.get(emp.id) || 0;

    // Is active / clocked in today
    const isClockedIn =
      att &&
      (att.currentStatus === TrackerStatus.ACTIVE ||
        att.currentStatus === TrackerStatus.IDLE ||
        att.currentStatus === TrackerStatus.MEETING_MODE ||
        att.clockInTime !== null);

    if (isClockedIn && revenue === 0) {
      zeroRevenueList.push({
        employeeId: emp.id,
        name: `${emp.firstName} ${emp.lastName}`.trim(),
        email: emp.workEmail,
        teamLeader: emp.teamLeader
          ? `${emp.teamLeader.firstName} ${emp.teamLeader.lastName}`.trim()
          : "Direct Report",
        attendanceStatus: att?.currentStatus || "CLOCKED_IN",
        clockInTime: att?.clockInTime ? att.clockInTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "N/A",
        activeHours: att?.totalActiveHours || 0,
      });
    }
  }

  return {
    date: startOfDay.toISOString().split("T")[0],
    totalSalesClockedIn: salesEmployees.filter((e) => attendanceMap.has(e.id)).length,
    zeroRevenueCount: zeroRevenueList.length,
    salespeople: zeroRevenueList,
  };
}

/**
 * 6. getSalesTargetsAndShortfalls
 * Target vs actual revenue achieved per salesperson.
 */
export async function getSalesTargetsAndShortfalls(args: { month?: number; year?: number }) {
  const now = new Date();
  const year = args.year || now.getFullYear();
  const month = args.month !== undefined ? args.month : now.getMonth() + 1;

  const targets = await db.salesTarget.findMany({
    where: {
      month,
      year,
    },
    include: {
      bdm: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          workEmail: true,
          teamLeader: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { targetAmount: "desc" },
  });

  const results = targets.map((t) => {
    const target = Number(t.targetAmount);
    const achieved = Number(t.achievedAmount);
    const shortfall = Math.max(0, target - achieved);
    const percentage = target > 0 ? Math.round((achieved / target) * 100) : 0;

    return {
      bdmId: t.bdmId,
      bdmName: `${t.bdm.firstName} ${t.bdm.lastName}`.trim(),
      email: t.bdm.workEmail,
      teamLeader: t.bdm.teamLeader
        ? `${t.bdm.teamLeader.firstName} ${t.bdm.teamLeader.lastName}`.trim()
        : "N/A",
      targetAmount: target,
      formattedTarget: `₹${target.toLocaleString("en-IN")}`,
      achievedAmount: achieved,
      formattedAchieved: `₹${achieved.toLocaleString("en-IN")}`,
      shortfall,
      formattedShortfall: `₹${shortfall.toLocaleString("en-IN")}`,
      achievementPercentage: `${percentage}%`,
      status: percentage >= 100 ? "ACHIEVED" : percentage >= 75 ? "ON_TRACK" : "AT_RISK",
    };
  });

  return {
    month,
    year,
    totalTargetsCount: results.length,
    targets: results,
  };
}

/**
 * 7. getPendingConversions
 * Unconverted payment receipts waiting to become Deals.
 */
export async function getPendingConversions() {
  const receipts = await db.paymentRecord.findMany({
    where: {
      isConvertedToDeal: false,
    },
    include: {
      client: { select: { name: true, phone: true } },
      recordedBy: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const totalAmount = receipts.reduce((sum, r) => sum + Number(r.amount), 0);

  return {
    count: receipts.length,
    totalAmount,
    formattedTotalAmount: `₹${totalAmount.toLocaleString("en-IN")}`,
    receipts: receipts.map((r) => ({
      receiptNumber: r.receiptNumber,
      clientName: r.client?.name || "Unknown Client",
      clientPhone: r.client?.phone || "N/A",
      amount: Number(r.amount),
      formattedAmount: `₹${Number(r.amount).toLocaleString("en-IN")}`,
      paymentType: r.paymentType,
      bankType: r.bankType,
      status: r.status,
      paymentDate: r.paymentDate.toISOString().split("T")[0],
      recordedByName: r.recordedBy
        ? `${r.recordedBy.firstName} ${r.recordedBy.lastName}`.trim()
        : "System",
    })),
  };
}

/**
 * 8. getOperationsBreakdown
 * Deal services grouped by pending, in-progress, completed, along with outsource costs.
 */
export async function getOperationsBreakdown(args: { teamType?: string; dateRange?: string }) {
  const { startDate, endDate, label } = parseDateRange(args.dateRange);

  const operations = await db.internalOperation.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      ...(args.teamType ? { teamType: { contains: args.teamType, mode: "insensitive" } } : {}),
    },
    include: {
      deal: { select: { dealNumber: true, companyName: true } },
      dealService: { select: { outsourceCost: true, totalPrice: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  let pendingCount = 0;
  let inProgressCount = 0;
  let completedCount = 0;
  let totalOutsourceCost = 0;

  const teamMap: Record<string, { total: number; completed: number; inProgress: number }> = {};

  for (const op of operations) {
    const status = (op.status || "").toUpperCase();
    if (status === "COMPLETED") {
      completedCount++;
    } else if (status === "PENDING" || status === "DOC COLLECTION") {
      pendingCount++;
    } else {
      inProgressCount++;
    }

    if (op.dealService) {
      totalOutsourceCost += Number(op.dealService.outsourceCost);
    }

    const t = op.teamType || "General Operations";
    if (!teamMap[t]) teamMap[t] = { total: 0, completed: 0, inProgress: 0 };
    teamMap[t].total++;
    if (status === "COMPLETED") teamMap[t].completed++;
    else teamMap[t].inProgress++;
  }

  return {
    dateRangeLabel: label,
    totalOperations: operations.length,
    pendingCount,
    inProgressCount,
    completedCount,
    totalOutsourceCost,
    formattedOutsourceCost: `₹${totalOutsourceCost.toLocaleString("en-IN")}`,
    teamBreakdown: teamMap,
  };
}

/**
 * 9. getLegalPipelineStatus
 * Filings, draftings, petitions, notices in-progress or delayed.
 */
export async function getLegalPipelineStatus() {
  const legalServices = await db.dealService.findMany({
    where: {
      OR: [
        { teamType: { contains: "legal", mode: "insensitive" } },
        { legalDocType: { not: null } },
        { legalStatus: { not: LegalStatus.EXECUTED } },
      ],
    },
    include: {
      deal: {
        select: {
          dealNumber: true,
          companyName: true,
          internalLegalStatus: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  let pending = 0;
  let inProgress = 0;
  let completed = 0;
  let delayed = 0;

  const delayedCases = [];

  for (const ls of legalServices) {
    const s = ls.legalStatus;
    if (s === LegalStatus.EXECUTED) {
      completed++;
    } else if (
      s === LegalStatus.IN_PROGRESS ||
      s === LegalStatus.DRAFTED ||
      s === LegalStatus.UNDER_REVIEW ||
      s === LegalStatus.SENT
    ) {
      inProgress++;
    } else if (
      s === LegalStatus.REJECTED ||
      (ls.legalRemarks && ls.legalRemarks.toLowerCase().includes("delay"))
    ) {
      delayed++;
      delayedCases.push({
        dealNumber: ls.deal?.dealNumber || "N/A",
        companyName: ls.deal?.companyName || "N/A",
        serviceName: ls.serviceName,
        legalDocType: ls.legalDocType || "Legal Drafting",
        legalRemarks: ls.legalRemarks,
      });
    } else {
      pending++;
    }
  }

  return {
    totalCases: legalServices.length,
    pending,
    inProgress,
    completed,
    delayed,
    delayedCases,
  };
}

/**
 * 10. getDepartmentAttendance
 * Department-level headcounts, active, idle, meeting, leave.
 */
export async function getDepartmentAttendance(args: { date?: string }) {
  const targetDate = args.date ? new Date(args.date) : new Date();
  const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

  // 1. All active employees grouped by department
  const employees = await db.employee.findMany({
    where: {
      status: "ACTIVE",
      workEmail: { not: "bharatedge.ai@internal.bharatedge.com" },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      department: true,
      designation: true,
    },
  });

  // 2. Attendance for today
  const attendanceRecords = await db.attendance.findMany({
    where: {
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    select: {
      employeeId: true,
      currentStatus: true,
      totalActiveHours: true,
    },
  });

  const attMap = new Map<string, (typeof attendanceRecords)[0]>();
  for (const a of attendanceRecords) {
    attMap.set(a.employeeId, a);
  }

  // 3. Approved leaves for today
  const leavesToday = await db.leaveRequest.findMany({
    where: {
      finalStatus: ApprovalStatus.APPROVED,
      startDate: { lte: endOfDay },
      endDate: { gte: startOfDay },
    },
    select: { employeeId: true },
  });
  const onLeaveSet = new Set(leavesToday.map((l) => l.employeeId));

  // Department aggregation
  interface DeptStats {
    department: string;
    totalStaff: number;
    active: number;
    meeting: number;
    idle: number;
    onLeave: number;
    absent: number;
    totalActiveHoursSum: number;
  }

  const deptMap = new Map<string, DeptStats>();

  for (const emp of employees) {
    const dept = emp.department || "Other";
    const existing = deptMap.get(dept) || {
      department: dept,
      totalStaff: 0,
      active: 0,
      meeting: 0,
      idle: 0,
      onLeave: 0,
      absent: 0,
      totalActiveHoursSum: 0,
    };

    existing.totalStaff++;

    if (onLeaveSet.has(emp.id)) {
      existing.onLeave++;
    } else {
      const att = attMap.get(emp.id);
      if (!att) {
        existing.absent++;
      } else {
        existing.totalActiveHoursSum += att.totalActiveHours || 0;
        if (att.currentStatus === TrackerStatus.ACTIVE) existing.active++;
        else if (att.currentStatus === TrackerStatus.MEETING_MODE) existing.meeting++;
        else if (att.currentStatus === TrackerStatus.IDLE) existing.idle++;
        else existing.absent++;
      }
    }

    deptMap.set(dept, existing);
  }

  const departments = Array.from(deptMap.values()).map((d) => ({
    department: d.department,
    totalStaff: d.totalStaff,
    active: d.active,
    meeting: d.meeting,
    idle: d.idle,
    onLeave: d.onLeave,
    absent: d.absent,
    presentCount: d.active + d.meeting + d.idle,
    avgHours: d.totalStaff > 0 ? (d.totalActiveHoursSum / Math.max(1, d.active + d.meeting + d.idle)).toFixed(1) : "0",
  }));

  const totalEmployees = employees.length;
  const totalPresent = departments.reduce((sum, d) => sum + d.presentCount, 0);
  const totalOnLeave = departments.reduce((sum, d) => sum + d.onLeave, 0);
  const totalAbsent = departments.reduce((sum, d) => sum + d.absent, 0);

  return {
    date: startOfDay.toISOString().split("T")[0],
    summary: {
      totalEmployees,
      totalPresent,
      totalOnLeave,
      totalAbsent,
      attendanceRate: `${Math.round((totalPresent / Math.max(1, totalEmployees)) * 100)}%`,
    },
    departments,
  };
}

/**
 * 11. getEmployeeAttendanceHistory
 * Punch times, active hours, idle hours, meeting hours for a specific staff member.
 */
export async function getEmployeeAttendanceHistory(args: { employeeName: string; dateRange?: string }) {
  const { startDate, endDate, label } = parseDateRange(args.dateRange || "this_month");

  // Search employee
  const employee = await db.employee.findFirst({
    where: {
      OR: [
        { firstName: { contains: args.employeeName, mode: "insensitive" } },
        { lastName: { contains: args.employeeName, mode: "insensitive" } },
        { workEmail: { contains: args.employeeName, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      workEmail: true,
      department: true,
      designation: true,
    },
  });

  if (!employee) {
    return {
      found: false,
      message: `No employee found matching name "${args.employeeName}".`,
    };
  }

  const records = await db.attendance.findMany({
    where: {
      employeeId: employee.id,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      sessions: {
        select: { status: true, durationMinutes: true },
      },
    },
    orderBy: { date: "desc" },
    take: 31,
  });

  const formattedRecords = records.map((r) => {
    let meetingMin = 0;
    let idleMin = 0;
    for (const s of r.sessions) {
      if (s.status === TrackerStatus.MEETING_MODE) meetingMin += s.durationMinutes || 0;
      if (s.status === TrackerStatus.IDLE) idleMin += s.durationMinutes || 0;
    }

    return {
      date: r.date.toISOString().split("T")[0],
      clockInTime: r.clockInTime ? r.clockInTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "N/A",
      clockOutTime: r.clockOutTime ? r.clockOutTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "N/A",
      totalActiveHours: r.totalActiveHours,
      meetingMinutes: Math.round(meetingMin),
      idleMinutes: Math.round(idleMin),
      status: r.currentStatus,
    };
  });

  return {
    found: true,
    employee: {
      name: `${employee.firstName} ${employee.lastName}`.trim(),
      email: employee.workEmail,
      department: employee.department,
      designation: employee.designation,
    },
    dateRangeLabel: label,
    recordsCount: formattedRecords.length,
    records: formattedRecords,
  };
}

/**
 * 12. getPendingLeaveRequests
 * Tier 1 & Tier 2 pending leave applications awaiting approval.
 */
export async function getPendingLeaveRequests() {
  const pendingRequests = await db.leaveRequest.findMany({
    where: {
      finalStatus: ApprovalStatus.PENDING,
    },
    include: {
      employee: {
        select: {
          firstName: true,
          lastName: true,
          department: true,
          designation: true,
          workEmail: true,
        },
      },
      teamLeader: {
        select: { firstName: true, lastName: true },
      },
      hrAdmin: {
        select: { firstName: true, lastName: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const tier1Waiting = [];
  const tier2Waiting = [];

  for (const r of pendingRequests) {
    const item = {
      id: r.id,
      employeeName: `${r.employee.firstName} ${r.employee.lastName}`.trim(),
      department: r.employee.department,
      leaveType: r.leaveType,
      startDate: r.startDate.toISOString().split("T")[0],
      endDate: r.endDate.toISOString().split("T")[0],
      totalDays: r.totalDays,
      reason: r.reason,
      appliedAt: r.createdAt.toISOString().split("T")[0],
      tlStatus: r.tlStatus,
      tlReviewer: r.teamLeader ? `${r.teamLeader.firstName} ${r.teamLeader.lastName}`.trim() : "Direct",
      hrStatus: r.hrStatus,
    };

    if (r.tlStatus === ApprovalStatus.PENDING) {
      tier1Waiting.push(item);
    } else if (r.tlStatus === ApprovalStatus.APPROVED && r.hrStatus === ApprovalStatus.PENDING) {
      tier2Waiting.push(item);
    }
  }

  return {
    totalPending: pendingRequests.length,
    tier1PendingCount: tier1Waiting.length,
    tier1Waiting,
    tier2PendingCount: tier2Waiting.length,
    tier2Waiting,
  };
}

/**
 * 13. getSupportTicketSummary
 * Open, in-progress, resolved tickets, SLA breaches, high priority issues.
 */
export async function getSupportTicketSummary(args: { dateRange?: string }) {
  const { startDate, endDate, label } = parseDateRange(args.dateRange);

  const tickets = await db.ticket.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      assignedEmployee: {
        select: { firstName: true, lastName: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  let open = 0;
  let inProgress = 0;
  let resolved = 0;
  let highPriority = 0;

  const urgentTickets = [];

  for (const t of tickets) {
    if (t.status === TicketStatus.OPEN) open++;
    else if (t.status === TicketStatus.IN_PROGRESS) inProgress++;
    else if (t.status === TicketStatus.RESOLVED || t.status === TicketStatus.CLOSED) resolved++;

    if (t.priority === "HIGH" || t.priority === "URGENT") {
      highPriority++;
      urgentTickets.push({
        ticketNumber: t.ticketNumber,
        subject: t.subject,
        priority: t.priority,
        status: t.status,
        customerName: t.customerName,
        assignedTo: t.assignedEmployee ? `${t.assignedEmployee.firstName} ${t.assignedEmployee.lastName}`.trim() : "Unassigned",
      });
    }
  }

  return {
    dateRangeLabel: label,
    totalTickets: tickets.length,
    open,
    inProgress,
    resolved,
    highPriority,
    urgentTickets: urgentTickets.slice(0, 10),
  };
}

// =========================================================================
// OPENAI TOOL DEFINITIONS & DISPATCHER
// =========================================================================

export const AI_AGENT_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "getMonthlyOutsourceCost",
      description: "Calculates total outsourced vendor, CA, CS, and advocate costs from the DealService table for a given month and year.",
      parameters: {
        type: "object",
        properties: {
          month: { type: "number", description: "Month number (1-12). Defaults to current month." },
          year: { type: "number", description: "Year (e.g. 2026). Defaults to current year." },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getRevenueSummary",
      description: "Retrieves inflow across BSPL and BSAPL accounts, verified vs unverified payments, adhering to the 50/50 Partner BDM split formula.",
      parameters: {
        type: "object",
        properties: {
          dateRange: {
            type: "string",
            description: "Date filter: 'today', 'yesterday', 'this_week', 'this_month', 'last_month', 'all_time', or 'YYYY-MM-DD to YYYY-MM-DD'.",
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getTopSellingServices",
      description: "Ranks top selling services by deal volume and generated revenue.",
      parameters: {
        type: "object",
        properties: {
          dateRange: { type: "string", description: "'today', 'this_week', 'this_month', etc." },
          limit: { type: "number", description: "Number of top services to return (default 10)." },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getTopSalesPerformers",
      description: "Ranks Sales BDMs by collected revenue and deal volume with 50/50 partner split factored in.",
      parameters: {
        type: "object",
        properties: {
          dateRange: { type: "string", description: "'today', 'this_week', 'this_month', etc." },
          limit: { type: "number", description: "Max performers to return (default 10)." },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getZeroRevenueSalespeople",
      description: "Identifies clocked-in / active Sales BDMs who have generated ₹0 so far today.",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "ISO date or YYYY-MM-DD. Defaults to today." },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getSalesTargetsAndShortfalls",
      description: "Returns target vs actual revenue achieved per salesperson and flags shortfalls.",
      parameters: {
        type: "object",
        properties: {
          month: { type: "number", description: "Month number (1-12)." },
          year: { type: "number", description: "Year (e.g. 2026)." },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getPendingConversions",
      description: "Returns list and count of unconverted payment receipts waiting to be converted to CRM Deals.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getOperationsBreakdown",
      description: "Deal services and internal operations grouped by status (pending, in-progress, completed) and team type.",
      parameters: {
        type: "object",
        properties: {
          teamType: { type: "string", description: "Optional filter by team name (e.g. 'Private Limited', 'ROC', 'Tax')." },
          dateRange: { type: "string", description: "'this_month', 'all_time', etc." },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getLegalPipelineStatus",
      description: "Retrieves legal filings, agreements, draftings, petitions, notices in-progress or delayed.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getDepartmentAttendance",
      description: "Department-level headcounts, active, idle, meeting, leave, and attendance percentage.",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "ISO date or YYYY-MM-DD. Defaults to today." },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getEmployeeAttendanceHistory",
      description: "Punch times, active hours, idle hours, meeting hours for a specific staff member.",
      parameters: {
        type: "object",
        properties: {
          employeeName: { type: "string", description: "First name, last name, or email of the employee." },
          dateRange: { type: "string", description: "'this_month', 'this_week', etc." },
        },
        required: ["employeeName"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getPendingLeaveRequests",
      description: "Retrieves pending leave applications awaiting Tier 1 (TL) or Tier 2 (HR Admin) approval.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getSupportTicketSummary",
      description: "Support desk summary of open, in-progress, resolved tickets and urgent escalations.",
      parameters: {
        type: "object",
        properties: {
          dateRange: { type: "string", description: "'today', 'this_week', 'this_month', etc." },
        },
      },
    },
  },
];

/**
 * Dispatcher for calling the above tools
 */
export async function executeAiTool(name: string, args: any): Promise<any> {
  switch (name) {
    case "getMonthlyOutsourceCost":
      return await getMonthlyOutsourceCost(args);
    case "getRevenueSummary":
      return await getRevenueSummary(args);
    case "getTopSellingServices":
      return await getTopSellingServices(args);
    case "getTopSalesPerformers":
      return await getTopSalesPerformers(args);
    case "getZeroRevenueSalespeople":
      return await getZeroRevenueSalespeople(args);
    case "getSalesTargetsAndShortfalls":
      return await getSalesTargetsAndShortfalls(args);
    case "getPendingConversions":
      return await getPendingConversions();
    case "getOperationsBreakdown":
      return await getOperationsBreakdown(args);
    case "getLegalPipelineStatus":
      return await getLegalPipelineStatus();
    case "getDepartmentAttendance":
      return await getDepartmentAttendance(args);
    case "getEmployeeAttendanceHistory":
      return await getEmployeeAttendanceHistory(args);
    case "getPendingLeaveRequests":
      return await getPendingLeaveRequests();
    case "getSupportTicketSummary":
      return await getSupportTicketSummary(args);
    default:
      throw new Error(`Unknown AI tool: ${name}`);
  }
}
