"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getScopeFilter } from "@/lib/auth/rbac";
import {
  ApprovalStatus,
  ReimbursementStatus,
  ResignationStatus,
  HelpdeskStatus,
  PayrollPaymentStatus,
  AppraisalStatus,
} from "@prisma/client";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface HrInboxData {
  totalPendingCount: number;
  aiDailyBrief: {
    greeting: string;
    headline: string;
    urgentAlerts: string[];
    summaryPoints: string[];
    readinessScore: number;
  };
  categories: {
    pendingLeaves: any[];
    workflowApprovals: any[];
    attendanceRegularizations: any[];
    reimbursements: any[];
    resignations: any[];
    helpdeskTickets: any[];
    appraisals: any[];
    upcomingHolidays: any[];
    lifecycleChecklists: any[];
    priorMonthSalaries: {
      count: number;
      totalPending: number;
      records: any[];
    };
  };
}

export async function getHrInboxDataAction(): Promise<ActionResult<HrInboxData>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const scope = await getScopeFilter(user, "hrms");
    if (!scope.isHrAdmin && !scope.isSuperAdmin) {
      return { success: false, error: "Access Denied: Only HR Admin and Super Admin can access the HR Inbox." };
    }

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Prior month calculation for salaries
    const priorMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const priorYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

    // 10 Parallel Queries
    const [
      pendingLeavesRaw,
      regularizationsRaw,
      reimbursementsRaw,
      resignationsRaw,
      helpdeskRaw,
      appraisalsRaw,
      holidaysRaw,
      checklistsRaw,
      priorSalariesRaw,
      workflowLogsRaw,
    ] = await Promise.all([
      // 1. Pending Leaves (Tier-2 HR sign-off queue or pending final)
      db.leaveRequest.findMany({
        where: {
          finalStatus: ApprovalStatus.PENDING,
          tlStatus: ApprovalStatus.APPROVED,
        },
        orderBy: { createdAt: "desc" },
        include: {
          employee: {
            select: { firstName: true, lastName: true, employeeId: true, department: true, designation: true },
          },
          teamLeader: { select: { firstName: true, lastName: true } },
        },
      }),

      // 2. Attendance Regularizations
      db.attendanceRegularization.findMany({
        where: { status: ApprovalStatus.PENDING },
        orderBy: { createdAt: "desc" },
        include: {
          employee: {
            select: { firstName: true, lastName: true, employeeId: true, department: true, designation: true },
          },
        },
      }),

      // 3. Pending Reimbursements
      db.reimbursement.findMany({
        where: { status: ReimbursementStatus.PENDING },
        orderBy: { createdAt: "desc" },
        include: {
          employee: {
            select: { firstName: true, lastName: true, employeeId: true, department: true, designation: true },
          },
        },
      }),

      // 4. Pending / Under Review Resignations
      db.resignation.findMany({
        where: {
          status: { in: [ResignationStatus.PENDING, ResignationStatus.UNDER_REVIEW] },
        },
        orderBy: { resignationDate: "desc" },
        include: {
          employee: {
            select: { firstName: true, lastName: true, employeeId: true, department: true, designation: true },
          },
        },
      }),

      // 5. Open & In Progress Helpdesk Tickets
      db.hrmsHelpdesk.findMany({
        where: {
          status: { in: [HelpdeskStatus.OPEN, HelpdeskStatus.IN_PROGRESS] },
        },
        orderBy: { createdAt: "desc" },
        include: {
          employee: {
            select: { firstName: true, lastName: true, employeeId: true, department: true },
          },
        },
      }),

      // 6. Upcoming & Due Appraisals
      db.performanceAppraisal.findMany({
        where: {
          status: { in: [AppraisalStatus.UPCOMING, AppraisalStatus.DUE, AppraisalStatus.IN_REVIEW] },
        },
        orderBy: { dueDate: "asc" },
        include: {
          employee: {
            select: { firstName: true, lastName: true, employeeId: true, department: true, designation: true },
          },
        },
      }),

      // 7. Upcoming Holidays (Next 30 days)
      db.calendarEvent.findMany({
        where: {
          date: { gte: now, lte: thirtyDaysLater },
        },
        orderBy: { date: "asc" },
      }),

      // 8. Incomplete Lifecycle Checklists
      db.employeeChecklist.findMany({
        where: { isCompleted: false },
        orderBy: { createdAt: "desc" },
        include: {
          employee: {
            select: { firstName: true, lastName: true, employeeId: true, department: true },
          },
          tasks: true,
        },
      }),

      // 9. Prior Month Pending Salaries
      db.payrollRecord.findMany({
        where: {
          month: priorMonth,
          year: priorYear,
          paymentStatus: PayrollPaymentStatus.PENDING,
        },
        include: {
          employee: {
            select: { firstName: true, lastName: true, employeeId: true, department: true },
          },
        },
      }),

      // 10. Active Workflow Approvals / Logs
      db.hrmsWorkflowLog.findMany({
        where: { action: "APPROVAL_REQUESTED" },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          actor: { select: { firstName: true, lastName: true, department: true } },
          workflow: { select: { name: true, module: true } },
        },
      }),
    ]);

    // Format Data
    const pendingLeaves = pendingLeavesRaw.map((r) => ({
      id: r.id,
      employeeName: `${r.employee.firstName} ${r.employee.lastName}`,
      employeeId: r.employee.employeeId,
      department: r.employee.department,
      designation: r.employee.designation,
      leaveType: r.leaveType,
      startDate: r.startDate.toISOString().split("T")[0],
      endDate: r.endDate.toISOString().split("T")[0],
      startTime: r.startTime,
      endTime: r.endTime,
      durationHours: r.durationHours,
      totalDays: r.totalDays,
      reason: r.reason,
      tlApprovedBy: r.teamLeader ? `${r.teamLeader.firstName} ${r.teamLeader.lastName}` : null,
      tlComments: r.tlComments,
      createdAt: r.createdAt.toISOString(),
    }));

    const attendanceRegularizations = regularizationsRaw.map((r) => ({
      id: r.id,
      employeeName: `${r.employee.firstName} ${r.employee.lastName}`,
      employeeId: r.employee.employeeId,
      department: r.employee.department,
      designation: r.employee.designation,
      date: r.date.toISOString().split("T")[0],
      regularizationType: r.regularizationType,
      requestedIn: r.requestedClockIn.toISOString(),
      requestedOut: r.requestedClockOut.toISOString(),
      reason: r.reason,
      attachmentUrl: r.attachmentUrl,
      createdAt: r.createdAt.toISOString(),
    }));

    const reimbursements = reimbursementsRaw.map((r) => ({
      id: r.id,
      employeeName: `${r.employee.firstName} ${r.employee.lastName}`,
      employeeId: r.employee.employeeId,
      department: r.employee.department,
      title: r.title,
      category: r.category,
      expenseDate: r.expenseDate.toISOString().split("T")[0],
      amount: r.amount,
      description: r.description,
      receiptUrls: Array.isArray(r.receiptUrls) ? r.receiptUrls : [],
      createdAt: r.createdAt.toISOString(),
    }));

    const resignations = resignationsRaw.map((r) => ({
      id: r.id,
      employeeName: `${r.employee.firstName} ${r.employee.lastName}`,
      employeeId: r.employee.employeeId,
      department: r.employee.department,
      designation: r.employee.designation,
      resignationDate: r.resignationDate.toISOString().split("T")[0],
      proposedLWD: r.proposedLastWorkingDay.toISOString().split("T")[0],
      reason: r.reason,
      status: r.status,
    }));

    const helpdeskTickets = helpdeskRaw.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      employeeName: `${t.employee.firstName} ${t.employee.lastName}`,
      department: t.employee.department,
      targetDepartment: t.targetDepartment,
      category: t.category,
      priority: t.priority,
      subject: t.subject,
      description: t.description,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
    }));

    const appraisals = appraisalsRaw.map((a) => ({
      id: a.id,
      employeeName: `${a.employee.firstName} ${a.employee.lastName}`,
      department: a.employee.department,
      designation: a.employee.designation,
      cycle: a.appraisalCycle,
      dueDate: a.dueDate.toISOString().split("T")[0],
      status: a.status,
      selfReview: a.selfReview,
      managerRating: a.managerRating,
    }));

    const upcomingHolidays = holidaysRaw.map((h) => ({
      id: h.id,
      name: h.title,
      date: h.date.toISOString().split("T")[0],
      type: h.type,
    }));

    const lifecycleChecklists = checklistsRaw.map((c) => ({
      id: c.id,
      employeeName: `${c.employee.firstName} ${c.employee.lastName}`,
      department: c.employee.department,
      type: c.type,
      title: c.title,
      progressPercent: c.progressPercent,
      pendingTasksCount: c.tasks.filter((t) => !t.isCompleted).length,
    }));

    const priorMonthTotalPending = priorSalariesRaw.reduce((sum, p) => sum + p.netPayable, 0);
    const priorMonthSalaries = {
      count: priorSalariesRaw.length,
      totalPending: priorMonthTotalPending,
      records: priorSalariesRaw.map((p) => ({
        id: p.id,
        employeeName: `${p.employee.firstName} ${p.employee.lastName}`,
        department: p.employee.department,
        netPayable: p.netPayable,
        month: p.month,
        year: p.year,
      })),
    };

    const workflowApprovals = workflowLogsRaw.map((w) => ({
      id: w.id,
      workflowName: w.workflow?.name || "Workflow Pipeline",
      module: w.module,
      actorName: w.actor ? `${w.actor.firstName} ${w.actor.lastName}` : "System",
      department: w.actor?.department || "General",
      details: w.details,
      createdAt: w.createdAt.toISOString(),
    }));

    // Total pending count across actionable operational items
    const totalPendingCount =
      pendingLeaves.length +
      attendanceRegularizations.length +
      reimbursements.length +
      resignations.length +
      helpdeskTickets.filter((t) => t.status === HelpdeskStatus.OPEN).length +
      priorMonthSalaries.count;

    // Deterministic AI Daily HR Brief Computation
    const currentHour = now.getHours();
    const timeGreeting = currentHour < 12 ? "Good morning" : currentHour < 17 ? "Good afternoon" : "Good evening";

    const urgentAlerts: string[] = [];
    if (priorMonthSalaries.count > 0) {
      urgentAlerts.push(
        `Critical: ${priorMonthSalaries.count} unpaid salaries detected from ${priorMonth}/${priorYear} totalling ₹${priorMonthTotalPending.toLocaleString("en-IN")}.`
      );
    }
    const urgentTickets = helpdeskTickets.filter((t) => t.priority === "URGENT" || t.priority === "HIGH");
    if (urgentTickets.length > 0) {
      urgentAlerts.push(`${urgentTickets.length} urgent helpdesk ticket(s) requiring rapid IT/HR intervention.`);
    }

    const summaryPoints: string[] = [];
    summaryPoints.push(
      `${pendingLeaves.length} pending leave application(s) awaiting Tier-2 HR sign-off.`
    );
    summaryPoints.push(
      `${attendanceRegularizations.length} attendance punch regularization request(s) queued.`
    );
    const totalReimbursementAmount = reimbursements.reduce((sum, r) => sum + r.amount, 0);
    summaryPoints.push(
      `${reimbursements.length} expense reimbursement claim(s) pending approval (₹${totalReimbursementAmount.toLocaleString("en-IN")}).`
    );
    if (resignations.length > 0) {
      summaryPoints.push(`${resignations.length} employee resignation filing(s) under review.`);
    }
    if (lifecycleChecklists.length > 0) {
      summaryPoints.push(`${lifecycleChecklists.length} onboarding/exit lifecycle checklist(s) active in progress.`);
    }
    if (upcomingHolidays.length > 0) {
      summaryPoints.push(
        `Next upcoming holiday: ${upcomingHolidays[0].name} on ${upcomingHolidays[0].date}.`
      );
    }

    // Enterprise readiness score (100 - penalties for pending backlog)
    const penalty = Math.min(60, totalPendingCount * 5);
    const readinessScore = Math.max(40, 100 - penalty);

    const headline =
      totalPendingCount === 0
        ? "All HR operations are clear and synchronized!"
        : `${totalPendingCount} pending administrative action(s) require your attention today.`;

    return {
      success: true,
      data: {
        totalPendingCount,
        aiDailyBrief: {
          greeting: `${timeGreeting}, HR Operations!`,
          headline,
          urgentAlerts,
          summaryPoints,
          readinessScore,
        },
        categories: {
          pendingLeaves,
          workflowApprovals,
          attendanceRegularizations,
          reimbursements,
          resignations,
          helpdeskTickets,
          appraisals,
          upcomingHolidays,
          lifecycleChecklists,
          priorMonthSalaries,
        },
      },
    };
  } catch (error) {
    console.error("Error fetching HR Inbox data:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load HR Inbox.",
    };
  }
}
