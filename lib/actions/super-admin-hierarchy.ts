"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import {
  Role,
  SystemRole,
  PaymentVerificationStatus,
  TrackerStatus,
} from "@prisma/client";
import { resolveDateFilter } from "./super-admin";

export interface HierarchyNodeMetrics {
  targetAmount: number;
  achievedAmount: number;
  attainmentRate: number;
  shortfallAmount: number;
  verifiedReceived: number;
  pendingAmount: number;
  dealsBookedCount: number;
  quotationsCount: number;
  unconvertedPaymentsCount: number;
  // 1-on-1 Review attendance & activity context
  attendanceStatus: "ACTIVE" | "MEETING_MODE" | "IDLE" | "CLOCKED_OUT" | "ON_LEAVE" | "ABSENT";
  isOnline: boolean;
  activeHoursToday: number;
  recentDeals: Array<{
    id: string;
    dealNumber: string;
    title: string;
    value: number;
    stage: string;
    isPartnerSplit: boolean;
    date: string;
  }>;
  recentPayments: Array<{
    id: string;
    receiptNumber: string;
    amount: number;
    status: string;
    date: string;
  }>;
}

export interface HierarchyTMNode {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  designation: string;
  branch: string;
  systemRole: string;
  tlId: string;
  metrics: HierarchyNodeMetrics;
}

export interface HierarchyTLNode {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  designation: string;
  branch: string;
  systemRole: string;
  metrics: HierarchyNodeMetrics;
  teamMembers: HierarchyTMNode[];
}

export interface HierarchyBranchNode {
  id: string;
  name: string;
  code: string;
  metrics: HierarchyNodeMetrics;
  teamLeaders: HierarchyTLNode[];
}

export interface HierarchyHODNode {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  designation: string;
  systemRole: string;
  metrics: HierarchyNodeMetrics;
  branches: HierarchyBranchNode[];
}

export interface SuperAdminHierarchyData {
  filter: {
    range: string;
    startDate: string;
    endDate: string;
    label: string;
  };
  hod: HierarchyHODNode;
  summary: {
    totalEmployees: number;
    totalBranches: number;
    totalTLs: number;
    totalTMs: number;
    totalRevenueTarget: number;
    totalAchievedRevenue: number;
    overallAttainment: number;
    activeTodayCount: number;
  };
}

/**
 * Calculates empty default metrics
 */
function createDefaultMetrics(): HierarchyNodeMetrics {
  return {
    targetAmount: 0,
    achievedAmount: 0,
    attainmentRate: 0,
    shortfallAmount: 0,
    verifiedReceived: 0,
    pendingAmount: 0,
    dealsBookedCount: 0,
    quotationsCount: 0,
    unconvertedPaymentsCount: 0,
    attendanceStatus: "CLOCKED_OUT",
    isOnline: false,
    activeHoursToday: 0,
    recentDeals: [],
    recentPayments: [],
  };
}

/**
 * Aggregates a child metric object into a parent metric object
 */
function aggregateMetrics(parent: HierarchyNodeMetrics, child: HierarchyNodeMetrics) {
  parent.targetAmount += child.targetAmount;
  parent.achievedAmount += child.achievedAmount;
  parent.verifiedReceived += child.verifiedReceived;
  parent.pendingAmount += child.pendingAmount;
  parent.dealsBookedCount += child.dealsBookedCount;
  parent.quotationsCount += child.quotationsCount;
  parent.unconvertedPaymentsCount += child.unconvertedPaymentsCount;

  // Recalculate attainment & shortfall
  parent.attainmentRate =
    parent.targetAmount > 0
      ? Math.min(999, Math.round((parent.achievedAmount / parent.targetAmount) * 100))
      : parent.achievedAmount > 0
      ? 100
      : 0;
  parent.shortfallAmount = Math.max(0, parent.targetAmount - parent.achievedAmount);

  // Merge recent deals/payments without duplicates
  const existingDealIds = new Set(parent.recentDeals.map((d) => d.id));
  for (const deal of child.recentDeals) {
    if (!existingDealIds.has(deal.id) && parent.recentDeals.length < 5) {
      parent.recentDeals.push(deal);
      existingDealIds.add(deal.id);
    }
  }

  const existingPaymentIds = new Set(parent.recentPayments.map((p) => p.id));
  for (const pay of child.recentPayments) {
    if (!existingPaymentIds.has(pay.id) && parent.recentPayments.length < 5) {
      parent.recentPayments.push(pay);
      existingPaymentIds.add(pay.id);
    }
  }
}

/**
 * Fetches the 4-tier Sales Hierarchy tree strictly for SUPER_ADMIN
 */
export async function getSuperAdminHierarchyData(params?: {
  range?: string;
  from?: string;
  to?: string;
}): Promise<SuperAdminHierarchyData> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error("Unauthorized: Authentication required.");
  }

  const isSuperAdmin =
    currentUser.role === Role.Admin ||
    currentUser.systemRole === SystemRole.SUPER_ADMIN;

  if (!isSuperAdmin) {
    throw new Error("Forbidden: Strict Super Admin access required.");
  }

  const { startDate, endDate, label, effectiveRange } = await resolveDateFilter(
    params?.range || "monthly",
    params?.from,
    params?.to
  );

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // Parallel Database Queries for maximum speed
  const [
    salesEmployees,
    dealsInPeriod,
    quotationsInPeriod,
    paymentsInPeriod,
    attendancesToday,
  ] = await Promise.all([
    // 1. All Sales department / BDM employees
    db.employee.findMany({
      where: {
        OR: [
          { department: { contains: "Sales", mode: "insensitive" } },
          { designation: { contains: "Sales", mode: "insensitive" } },
          { designation: { contains: "BDM", mode: "insensitive" } },
          { designation: { contains: "Business Development", mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        middleName: true,
        lastName: true,
        workEmail: true,
        avatarUrl: true,
        designation: true,
        department: true,
        branch: true,
        systemRole: true,
        monthlyTarget: true,
        teamLeaderId: true,
        isOnline: true,
        lastSeen: true,
      },
      orderBy: [{ systemRole: "asc" }, { firstName: "asc" }],
    }),

    // 2. Deals in period with partner info and payments
    db.deal.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        dealNumber: true,
        title: true,
        value: true,
        stage: true,
        assignedEmployeeId: true,
        partnerBdmId: true,
        amountReceived: true,
        amountPending: true,
        totalValue: true,
        createdAt: true,
        payments: {
          select: {
            id: true,
            receiptNumber: true,
            amount: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),

    // 3. Quotations prepared in period
    db.quotation.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        preparedById: true,
      },
    }),

    // 4. Payment records in period
    db.paymentRecord.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        receiptNumber: true,
        amount: true,
        status: true,
        paymentType: true,
        isConvertedToDeal: true,
        recordedById: true,
        dealId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),

    // 5. Today's attendance records
    db.attendance.findMany({
      where: {
        date: { gte: todayStart, lte: todayEnd },
      },
      select: {
        employeeId: true,
        currentStatus: true,
        totalActiveHours: true,
      },
    }),
  ]);

  // Map today's attendance by employeeId
  const attendanceMap = new Map<
    string,
    { status: "ACTIVE" | "MEETING_MODE" | "IDLE" | "CLOCKED_OUT" | "ON_LEAVE" | "ABSENT"; hours: number }
  >();

  for (const att of attendancesToday) {
    let status: "ACTIVE" | "MEETING_MODE" | "IDLE" | "CLOCKED_OUT" | "ON_LEAVE" | "ABSENT" = "CLOCKED_OUT";

    if (att.currentStatus === TrackerStatus.ACTIVE) status = "ACTIVE";
    else if (att.currentStatus === TrackerStatus.MEETING_MODE) status = "MEETING_MODE";
    else if (att.currentStatus === TrackerStatus.IDLE) status = "IDLE";
    else status = "CLOCKED_OUT";

    attendanceMap.set(att.employeeId, {
      status,
      hours: Number(att.totalActiveHours || 0),
    });
  }

  // Pre-calculate per-employee sales metrics (respecting 50%-50% partner split)
  const employeeMetricsMap = new Map<string, HierarchyNodeMetrics>();

  // Initialize metrics for all sales employees
  for (const emp of salesEmployees) {
    const target = Number(emp.monthlyTarget || 100000);
    const att = attendanceMap.get(emp.id) || { status: "CLOCKED_OUT", hours: 0 };

    employeeMetricsMap.set(emp.id, {
      targetAmount: target,
      achievedAmount: 0,
      attainmentRate: 0,
      shortfallAmount: target,
      verifiedReceived: 0,
      pendingAmount: 0,
      dealsBookedCount: 0,
      quotationsCount: 0,
      unconvertedPaymentsCount: 0,
      attendanceStatus: att.status,
      isOnline: emp.isOnline,
      activeHoursToday: att.hours,
      recentDeals: [],
      recentPayments: [],
    });
  }

  // Attribute deals to employees (with 50%-50% partner split)
  for (const deal of dealsInPeriod) {
    const totalVal = Number(deal.totalValue || deal.value || 0);
    const dealDate = deal.createdAt.toISOString();

    // Check if partner split applies
    if (deal.partnerBdmId && deal.partnerBdmId !== deal.assignedEmployeeId) {
      // Split 50% to assigned employee
      if (deal.assignedEmployeeId && employeeMetricsMap.has(deal.assignedEmployeeId)) {
        const m = employeeMetricsMap.get(deal.assignedEmployeeId)!;
        m.achievedAmount += totalVal * 0.5;
        m.dealsBookedCount += 1;
        m.pendingAmount += Number(deal.amountPending || 0) * 0.5;
        if (m.recentDeals.length < 5) {
          m.recentDeals.push({
            id: deal.id,
            dealNumber: deal.dealNumber || "DL",
            title: deal.title,
            value: totalVal * 0.5,
            stage: deal.stage,
            isPartnerSplit: true,
            date: dealDate,
          });
        }
      }

      // Split 50% to partner BDM
      if (deal.partnerBdmId && employeeMetricsMap.has(deal.partnerBdmId)) {
        const m = employeeMetricsMap.get(deal.partnerBdmId)!;
        m.achievedAmount += totalVal * 0.5;
        m.dealsBookedCount += 1;
        m.pendingAmount += Number(deal.amountPending || 0) * 0.5;
        if (m.recentDeals.length < 5) {
          m.recentDeals.push({
            id: deal.id,
            dealNumber: deal.dealNumber || "DL",
            title: deal.title,
            value: totalVal * 0.5,
            stage: deal.stage,
            isPartnerSplit: true,
            date: dealDate,
          });
        }
      }
    } else {
      // 100% to assigned employee
      if (deal.assignedEmployeeId && employeeMetricsMap.has(deal.assignedEmployeeId)) {
        const m = employeeMetricsMap.get(deal.assignedEmployeeId)!;
        m.achievedAmount += totalVal;
        m.dealsBookedCount += 1;
        m.pendingAmount += Number(deal.amountPending || 0);
        if (m.recentDeals.length < 5) {
          m.recentDeals.push({
            id: deal.id,
            dealNumber: deal.dealNumber || "DL",
            title: deal.title,
            value: totalVal,
            stage: deal.stage,
            isPartnerSplit: false,
            date: dealDate,
          });
        }
      }
    }

    // Process deal payments for verified received amounts
    for (const p of deal.payments) {
      if (p.status === PaymentVerificationStatus.VERIFIED) {
        const pAmount = Number(p.amount || 0);
        if (deal.partnerBdmId && deal.partnerBdmId !== deal.assignedEmployeeId) {
          if (deal.assignedEmployeeId && employeeMetricsMap.has(deal.assignedEmployeeId)) {
            employeeMetricsMap.get(deal.assignedEmployeeId)!.verifiedReceived += pAmount * 0.5;
          }
          if (deal.partnerBdmId && employeeMetricsMap.has(deal.partnerBdmId)) {
            employeeMetricsMap.get(deal.partnerBdmId)!.verifiedReceived += pAmount * 0.5;
          }
        } else if (deal.assignedEmployeeId && employeeMetricsMap.has(deal.assignedEmployeeId)) {
          employeeMetricsMap.get(deal.assignedEmployeeId)!.verifiedReceived += pAmount;
        }
      }
    }
  }

  // Attribute quotations count
  for (const q of quotationsInPeriod) {
    if (q.preparedById && employeeMetricsMap.has(q.preparedById)) {
      employeeMetricsMap.get(q.preparedById)!.quotationsCount += 1;
    }
  }

  // Attribute payments
  for (const pay of paymentsInPeriod) {
    if (pay.recordedById && employeeMetricsMap.has(pay.recordedById)) {
      const m = employeeMetricsMap.get(pay.recordedById)!;
      if (!pay.isConvertedToDeal && pay.paymentType === "FIRST_PAYMENT") {
        m.unconvertedPaymentsCount += 1;
      }
      if (m.recentPayments.length < 5) {
        m.recentPayments.push({
          id: pay.id,
          receiptNumber: pay.receiptNumber || "RCP",
          amount: Number(pay.amount || 0),
          status: pay.status,
          date: pay.createdAt.toISOString(),
        });
      }
    }
  }

  // Re-calculate attainment rate and shortfall for each employee
  for (const [, metrics] of employeeMetricsMap) {
    metrics.attainmentRate =
      metrics.targetAmount > 0
        ? Math.min(999, Math.round((metrics.achievedAmount / metrics.targetAmount) * 100))
        : metrics.achievedAmount > 0
        ? 100
        : 0;
    metrics.shortfallAmount = Math.max(0, metrics.targetAmount - metrics.achievedAmount);
  }

  // ----------------------------------------------------
  // BUILD 4-TIER HIERARCHY TREE
  // ----------------------------------------------------

  // Find Sales HOD (Tier 1)
  const hodEmployee =
    salesEmployees.find((e) => e.systemRole === SystemRole.ADMIN_HOD) ||
    salesEmployees.find((e) => e.systemRole === SystemRole.SUPER_ADMIN) ||
    salesEmployees[0] || {
      id: "sales-hod-default",
      employeeId: "EMP-HOD",
      firstName: "Head",
      middleName: null,
      lastName: "of Sales",
      workEmail: "sales.hod@bharatedge.com",
      avatarUrl: null,
      designation: "Head of Sales & Enterprise Director",
      department: "Sales",
      branch: "Headquarters - Ahmedabad",
      systemRole: SystemRole.ADMIN_HOD,
      monthlyTarget: 500000,
      teamLeaderId: null,
      isOnline: true,
      lastSeen: new Date(),
    };

  // Group other employees by branch
  // Available branches: Group dynamically, defaulting to "Headquarters - Ahmedabad"
  const branchMap = new Map<string, typeof salesEmployees>();

  for (const emp of salesEmployees) {
    // Skip HOD on lower tiers if they are the apex
    if (emp.id === hodEmployee.id) continue;

    const branchName = emp.branch?.trim() || "Headquarters - Ahmedabad";
    if (!branchMap.has(branchName)) {
      branchMap.set(branchName, []);
    }
    branchMap.get(branchName)!.push(emp);
  }

  // Ensure at least "Headquarters - Ahmedabad" branch exists
  if (branchMap.size === 0) {
    branchMap.set("Headquarters - Ahmedabad", []);
  }

  const branchNodes: HierarchyBranchNode[] = [];

  let totalBranches = 0;
  let totalTLs = 0;
  let totalTMs = 0;
  let activeTodayCount = 0;

  for (const [branchName, branchEmps] of branchMap.entries()) {
    totalBranches++;
    const branchCode = branchName
      .replace(/Headquarters\s*-\s*/i, "")
      .replace(/Branch/i, "")
      .trim()
      .substring(0, 3)
      .toUpperCase();

    const branchMetrics = createDefaultMetrics();

    // Group branch employees into TLs and TMs
    const tlEmps = branchEmps.filter((e) => e.systemRole === SystemRole.TEAM_LEADER);
    const otherEmps = branchEmps.filter((e) => e.systemRole !== SystemRole.TEAM_LEADER);

    // Build TL nodes
    const tlNodes: HierarchyTLNode[] = [];

    // Map of TMs assigned to TLs
    const assignedTmIds = new Set<string>();

    for (const tl of tlEmps) {
      totalTLs++;
      const tlMetrics = { ...(employeeMetricsMap.get(tl.id) || createDefaultMetrics()) };

      // Find TMs reporting to this TL
      const tmEmps = otherEmps.filter((e) => e.teamLeaderId === tl.id);
      const tmNodes: HierarchyTMNode[] = [];

      for (const tm of tmEmps) {
        totalTMs++;
        assignedTmIds.add(tm.id);
        const tmMetrics = employeeMetricsMap.get(tm.id) || createDefaultMetrics();
        if (tmMetrics.attendanceStatus === "ACTIVE" || tmMetrics.attendanceStatus === "MEETING_MODE") {
          activeTodayCount++;
        }

        tmNodes.push({
          id: tm.id,
          employeeId: tm.employeeId,
          name: `${tm.firstName} ${tm.lastName}`.trim(),
          email: tm.workEmail,
          avatarUrl: tm.avatarUrl,
          designation: tm.designation || "Business Development Manager",
          branch: branchName,
          systemRole: tm.systemRole,
          tlId: tl.id,
          metrics: tmMetrics,
        });

        // Aggregate TM into TL
        aggregateMetrics(tlMetrics, tmMetrics);
      }

      if (tlMetrics.attendanceStatus === "ACTIVE" || tlMetrics.attendanceStatus === "MEETING_MODE") {
        activeTodayCount++;
      }

      tlNodes.push({
        id: tl.id,
        employeeId: tl.employeeId,
        name: `${tl.firstName} ${tl.lastName}`.trim(),
        email: tl.workEmail,
        avatarUrl: tl.avatarUrl,
        designation: tl.designation || "Sales Team Leader",
        branch: branchName,
        systemRole: tl.systemRole,
        metrics: tlMetrics,
        teamMembers: tmNodes,
      });

      // Aggregate TL into Branch
      aggregateMetrics(branchMetrics, tlMetrics);
    }

    // Handle Unassigned TMs (Edge Case Handling: gracefully group under fallback TL)
    const unassignedTms = otherEmps.filter((e) => !assignedTmIds.has(e.id));
    if (unassignedTms.length > 0) {
      totalTLs++;
      const fallbackTlMetrics = createDefaultMetrics();
      const fallbackTmNodes: HierarchyTMNode[] = [];

      for (const tm of unassignedTms) {
        totalTMs++;
        const tmMetrics = employeeMetricsMap.get(tm.id) || createDefaultMetrics();
        if (tmMetrics.attendanceStatus === "ACTIVE" || tmMetrics.attendanceStatus === "MEETING_MODE") {
          activeTodayCount++;
        }

        fallbackTmNodes.push({
          id: tm.id,
          employeeId: tm.employeeId,
          name: `${tm.firstName} ${tm.lastName}`.trim(),
          email: tm.workEmail,
          avatarUrl: tm.avatarUrl,
          designation: tm.designation || "Business Development Manager",
          branch: branchName,
          systemRole: tm.systemRole,
          tlId: `unassigned-tl-${branchCode}`,
          metrics: tmMetrics,
        });

        aggregateMetrics(fallbackTlMetrics, tmMetrics);
      }

      tlNodes.push({
        id: `unassigned-tl-${branchCode}`,
        employeeId: `TL-${branchCode}-POOL`,
        name: `${branchCode} Direct / Pool`,
        email: `direct.${branchCode.toLowerCase()}@bharatedge.com`,
        avatarUrl: null,
        designation: "Direct Sales Pool",
        branch: branchName,
        systemRole: SystemRole.TEAM_LEADER,
        metrics: fallbackTlMetrics,
        teamMembers: fallbackTmNodes,
      });

      aggregateMetrics(branchMetrics, fallbackTlMetrics);
    }

    branchNodes.push({
      id: `branch-${branchCode.toLowerCase()}`,
      name: branchName,
      code: branchCode,
      metrics: branchMetrics,
      teamLeaders: tlNodes,
    });
  }

  // Aggregate HOD (Tier 1) from all Branches
  const hodMetrics = { ...(employeeMetricsMap.get(hodEmployee.id) || createDefaultMetrics()) };
  for (const b of branchNodes) {
    aggregateMetrics(hodMetrics, b.metrics);
  }

  if (hodMetrics.attendanceStatus === "ACTIVE" || hodMetrics.attendanceStatus === "MEETING_MODE") {
    activeTodayCount++;
  }

  const hodNode: HierarchyHODNode = {
    id: hodEmployee.id,
    employeeId: hodEmployee.employeeId,
    name: `${hodEmployee.firstName} ${hodEmployee.lastName}`.trim(),
    email: hodEmployee.workEmail,
    avatarUrl: hodEmployee.avatarUrl,
    designation: hodEmployee.designation || "Head of Sales & Enterprise Director",
    systemRole: hodEmployee.systemRole,
    metrics: hodMetrics,
    branches: branchNodes,
  };

  return {
    filter: {
      range: effectiveRange,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      label,
    },
    hod: hodNode,
    summary: {
      totalEmployees: salesEmployees.length,
      totalBranches,
      totalTLs,
      totalTMs,
      totalRevenueTarget: hodMetrics.targetAmount,
      totalAchievedRevenue: hodMetrics.achievedAmount,
      overallAttainment: hodMetrics.attainmentRate,
      activeTodayCount,
    },
  };
}
