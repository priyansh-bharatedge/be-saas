"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getScopeFilter } from "@/lib/auth/rbac";
import { TrackerStatus, Role, NotificationType } from "@prisma/client";
import { createNotification, notifyHRAdmins } from "@/lib/actions/notifications";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SessionData {
  id: string;
  startTime: string;
  endTime: string | null;
  status: "ACTIVE" | "IDLE" | "CLOCKED_OUT" | "MEETING_MODE";
  durationMinutes: number | null;
}

export interface TodayAttendanceState {
  employeeId: string;
  employeeName: string;
  department: string;
  designation: string;
  date: string;
  clockInTime: string | null;
  clockOutTime: string | null;
  currentStatus: "ACTIVE" | "IDLE" | "CLOCKED_OUT" | "MEETING_MODE";
  totalActiveHours: number;
  totalActiveSeconds: number;
  sessions: SessionData[];
  lastSessionStartTime: string | null;
}

/**
 * Normalizes a date to UTC midnight for consistent daily attendance indexing
 */
function getNormalizedDate(date = new Date()): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Resolves the employee record for the current user or by explicit employeeId
 */
async function resolveEmployee(employeeId?: string) {
  if (employeeId) {
    return await db.employee.findUnique({
      where: { id: employeeId },
    });
  }

  const user = await getCurrentUser();
  if (!user) return null;

  // 1. Try by user.id (which is employee.id in unified model)
  let employee = await db.employee.findUnique({
    where: { id: user.id },
  });

  // 2. Try by workEmail
  if (!employee && user.email) {
    employee = await db.employee.findUnique({
      where: { workEmail: user.email },
    });
  }

  // 3. Fallback: If still not linked, grab the first active employee
  if (!employee) {
    employee = await db.employee.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
    });
  }

  return employee;
}

/**
 * Calculates total active minutes from a list of sessions
 */
function calculateTotalActiveMinutes(
  sessions: { status: TrackerStatus; startTime: Date; endTime: Date | null }[]
): number {
  let totalMinutes = 0;
  const now = new Date();

  for (const session of sessions) {
    if (session.status === TrackerStatus.ACTIVE || session.status === TrackerStatus.MEETING_MODE) {
      const end = session.endTime || now;
      const diffMs = Math.max(0, end.getTime() - session.startTime.getTime());
      totalMinutes += diffMs / (1000 * 60);
    }
  }

  return totalMinutes;
}

/**
 * Retrieves today's attendance status and sessions for the current logged-in employee
 */
export async function getTodayAttendanceAction(
  employeeId?: string
): Promise<ActionResult<TodayAttendanceState>> {
  try {
    const employee = await resolveEmployee(employeeId);
    if (!employee) {
      return { success: false, error: "No associated employee record found." };
    }

    const todayDate = getNormalizedDate();

    let attendance = await db.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: todayDate,
        },
      },
      include: {
        sessions: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!attendance) {
      return {
        success: true,
        data: {
          employeeId: employee.id,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          department: employee.department,
          designation: employee.designation,
          date: todayDate.toISOString(),
          clockInTime: null,
          clockOutTime: null,
          currentStatus: "CLOCKED_OUT",
          totalActiveHours: 0,
          totalActiveSeconds: 0,
          sessions: [],
          lastSessionStartTime: null,
        },
      };
    }

    const totalActiveMinutes = calculateTotalActiveMinutes(attendance.sessions);
    const totalActiveHours = Number((totalActiveMinutes / 60).toFixed(2));
    const totalActiveSeconds = Math.round(totalActiveMinutes * 60);

    const openSession = attendance.sessions.find((s) => s.endTime === null);

    return {
      success: true,
      data: {
        employeeId: employee.id,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        department: employee.department,
        designation: employee.designation,
        date: attendance.date.toISOString(),
        clockInTime: attendance.clockInTime ? attendance.clockInTime.toISOString() : null,
        clockOutTime: attendance.clockOutTime ? attendance.clockOutTime.toISOString() : null,
        currentStatus: attendance.currentStatus as "ACTIVE" | "IDLE" | "CLOCKED_OUT" | "MEETING_MODE",
        totalActiveHours,
        totalActiveSeconds,
        sessions: attendance.sessions.map((s) => ({
          id: s.id,
          startTime: s.startTime.toISOString(),
          endTime: s.endTime ? s.endTime.toISOString() : null,
          status: s.status as "ACTIVE" | "IDLE" | "CLOCKED_OUT" | "MEETING_MODE",
          durationMinutes: s.durationMinutes != null ? Number(s.durationMinutes) : null,
        })),
        lastSessionStartTime: openSession ? openSession.startTime.toISOString() : null,
      },
    };
  } catch (error) {
    console.error("Error retrieving today attendance:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch attendance state.",
    };
  }
}

/**
 * Clocks in the employee for the day, initiating an ACTIVE session
 */
export async function clockInAction(
  employeeId?: string
): Promise<ActionResult<TodayAttendanceState>> {
  try {
    const employee = await resolveEmployee(employeeId);
    if (!employee) {
      return { success: false, error: "Employee record not found." };
    }

    const todayDate = getNormalizedDate();
    const now = new Date();

    // Find or create today's attendance record
    let attendance = await db.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: todayDate,
        },
      },
      include: { sessions: true },
    });

    if (!attendance) {
      attendance = await db.attendance.create({
        data: {
          employeeId: employee.id,
          date: todayDate,
          clockInTime: now,
          clockOutTime: null,
          currentStatus: TrackerStatus.ACTIVE,
          totalActiveHours: 0,
        },
        include: { sessions: true },
      });
    } else {
      // If already clocked in and not clocked out, check currentStatus
      if (attendance.currentStatus === TrackerStatus.CLOCKED_OUT) {
        attendance = await db.attendance.update({
          where: { id: attendance.id },
          data: {
            clockOutTime: null, // Re-opened shift
            currentStatus: TrackerStatus.ACTIVE,
          },
          include: { sessions: true },
        });
      }
    }

    // Close any previous open session
    await db.attendanceSession.updateMany({
      where: {
        attendanceId: attendance.id,
        endTime: null,
      },
      data: {
        endTime: now,
      },
    });

    // Create a new ACTIVE session
    await db.attendanceSession.create({
      data: {
        attendanceId: attendance.id,
        startTime: now,
        status: TrackerStatus.ACTIVE,
      },
    });

    revalidatePath("/hrms");
    revalidatePath("/hrms/attendance");

    return await getTodayAttendanceAction(employee.id);
  } catch (error) {
    console.error("Error clocking in:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to clock in.",
    };
  }
}

/**
 * Clocks out the employee, closing any active/idle session and finalizing total hours
 */
export async function clockOutAction(
  employeeId?: string
): Promise<ActionResult<TodayAttendanceState>> {
  try {
    const employee = await resolveEmployee(employeeId);
    if (!employee) {
      return { success: false, error: "Employee record not found." };
    }

    const todayDate = getNormalizedDate();
    const now = new Date();

    const attendance = await db.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: todayDate,
        },
      },
      include: { sessions: true },
    });

    if (!attendance) {
      return { success: false, error: "No active attendance record found for today." };
    }

    // If currently in MEETING_MODE, automatically finalize meeting mode first
    if (attendance.currentStatus === TrackerStatus.MEETING_MODE) {
      const meetingSession = attendance.sessions.find(
        (s) => s.status === TrackerStatus.MEETING_MODE && s.endTime === null
      );
      const meetingDurationMin = meetingSession
        ? Math.max(1, Math.round((now.getTime() - meetingSession.startTime.getTime()) / (1000 * 60)))
        : 0;
      const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const empName = `${employee.firstName} ${employee.lastName}`;
      const durationText = meetingDurationMin > 0 ? `${meetingDurationMin} min` : "< 1 min";

      await notifyHRAdmins({
        title: "Meeting Mode Completed (Shift Closed)",
        message: `${empName} clocked out and completed meeting at ${timeStr} (Duration: ${durationText}).`,
        actionUrl: "/hrms/attendance",
      });

      if (employee.teamLeaderId) {
        await createNotification({
          recipientUserId: employee.teamLeaderId,
          title: "Team Member Meeting Finished",
          message: `${empName} completed meeting upon clock-out at ${timeStr} (Duration: ${durationText}).`,
          actionUrl: "/hrms/attendance",
          type: NotificationType.INFO,
        });
      }
    }

    // Close any open session and compute duration
    const openSessions = attendance.sessions.filter((s) => s.endTime === null);
    for (const openSession of openSessions) {
      const durationMin = Math.max(
        0,
        (now.getTime() - openSession.startTime.getTime()) / (1000 * 60)
      );
      await db.attendanceSession.update({
        where: { id: openSession.id },
        data: {
          endTime: now,
          durationMinutes: Number(durationMin.toFixed(2)),
        },
      });
    }

    // Re-fetch all sessions to calculate exact net working hours
    const allSessions = await db.attendanceSession.findMany({
      where: { attendanceId: attendance.id },
    });

    const totalActiveMinutes = calculateTotalActiveMinutes(allSessions);
    const totalActiveHours = Number((totalActiveMinutes / 60).toFixed(2));

    await db.attendance.update({
      where: { id: attendance.id },
      data: {
        clockOutTime: now,
        currentStatus: TrackerStatus.CLOCKED_OUT,
        totalActiveHours,
      },
    });

    revalidatePath("/hrms");
    revalidatePath("/hrms/attendance");

    return await getTodayAttendanceAction(employee.id);
  } catch (error) {
    console.error("Error clocking out:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to clock out.",
    };
  }
}

/**
 * Transitions tracker status between ACTIVE and IDLE (used by Idle Detection & Auto-Resume)
 */
export async function updateTrackerStatusAction(
  employeeId: string,
  newStatus: "ACTIVE" | "IDLE"
): Promise<ActionResult<TodayAttendanceState>> {
  try {
    const employee = await resolveEmployee(employeeId);
    if (!employee) {
      return { success: false, error: "Employee not found." };
    }

    const todayDate = getNormalizedDate();
    const now = new Date();

    const attendance = await db.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: todayDate,
        },
      },
      include: { sessions: true },
    });

    if (!attendance) {
      return { success: false, error: "No clock-in record found for today." };
    }

    // If currently clocked out, do not allow idle transitions
    if (attendance.currentStatus === TrackerStatus.CLOCKED_OUT) {
      return { success: false, error: "Cannot toggle tracker status while clocked out." };
    }

    // If currently in MEETING_MODE, explicitly bypass idle pause so meeting hours continue uninterrupted
    if (attendance.currentStatus === TrackerStatus.MEETING_MODE) {
      return await getTodayAttendanceAction(employee.id);
    }

    // If already in target status, return current state
    if (attendance.currentStatus === (newStatus as TrackerStatus)) {
      return await getTodayAttendanceAction(employee.id);
    }

    // Close any currently open session
    const openSessions = attendance.sessions.filter((s) => s.endTime === null);
    for (const openSession of openSessions) {
      const durationMin = Math.max(
        0,
        (now.getTime() - openSession.startTime.getTime()) / (1000 * 60)
      );
      await db.attendanceSession.update({
        where: { id: openSession.id },
        data: {
          endTime: now,
          durationMinutes: Number(durationMin.toFixed(2)),
        },
      });
    }

    // Start a new session with target status
    await db.attendanceSession.create({
      data: {
        attendanceId: attendance.id,
        startTime: now,
        status: newStatus as TrackerStatus,
      },
    });

    // Recalculate total active hours so far
    const allSessions = await db.attendanceSession.findMany({
      where: { attendanceId: attendance.id },
    });
    const totalActiveMinutes = calculateTotalActiveMinutes(allSessions);
    const totalActiveHours = Number((totalActiveMinutes / 60).toFixed(2));

    await db.attendance.update({
      where: { id: attendance.id },
      data: {
        currentStatus: newStatus as TrackerStatus,
        totalActiveHours,
      },
    });

    revalidatePath("/hrms");
    revalidatePath("/hrms/attendance");

    return await getTodayAttendanceAction(employee.id);
  } catch (error) {
    console.error("Error updating tracker status:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update tracker status.",
    };
  }
}

/**
 * Starts Meeting Mode for the employee (bypasses 5m idle auto-pause and notifies HR Admins + Team Leader)
 */
export async function startMeetingModeAction(
  employeeId?: string
): Promise<ActionResult<TodayAttendanceState>> {
  try {
    const employee = await resolveEmployee(employeeId);
    if (!employee) {
      return { success: false, error: "Employee record not found." };
    }

    const todayDate = getNormalizedDate();
    const now = new Date();

    const attendance = await db.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: todayDate,
        },
      },
      include: { sessions: true },
    });

    if (!attendance || attendance.currentStatus === TrackerStatus.CLOCKED_OUT) {
      return {
        success: false,
        error: "Cannot enable Meeting Mode while clocked out. Please clock in first.",
      };
    }

    if (attendance.currentStatus === TrackerStatus.MEETING_MODE) {
      return await getTodayAttendanceAction(employee.id);
    }

    // Close any previous open session
    const openSessions = attendance.sessions.filter((s) => s.endTime === null);
    for (const openSession of openSessions) {
      const durationMin = Math.max(
        0,
        (now.getTime() - openSession.startTime.getTime()) / (1000 * 60)
      );
      await db.attendanceSession.update({
        where: { id: openSession.id },
        data: {
          endTime: now,
          durationMinutes: Number(durationMin.toFixed(2)),
        },
      });
    }

    // Start a new session with MEETING_MODE
    await db.attendanceSession.create({
      data: {
        attendanceId: attendance.id,
        startTime: now,
        status: TrackerStatus.MEETING_MODE,
      },
    });

    // Update attendance record status
    await db.attendance.update({
      where: { id: attendance.id },
      data: {
        currentStatus: TrackerStatus.MEETING_MODE,
      },
    });

    // Targeted notifications
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const empName = `${employee.firstName} ${employee.lastName}`;

    await notifyHRAdmins({
      title: "Meeting Mode Enabled",
      message: `${empName} (${employee.department}) enabled Meeting Mode for a client meeting at ${timeStr}.`,
      actionUrl: "/hrms/attendance",
    });

    if (employee.teamLeaderId) {
      await createNotification({
        recipientUserId: employee.teamLeaderId,
        title: "Team Member In Client Meeting",
        message: `${empName} has enabled Meeting Mode at ${timeStr}.`,
        actionUrl: "/hrms/attendance",
        type: NotificationType.INFO,
      });
    }

    revalidatePath("/hrms");
    revalidatePath("/hrms/attendance");

    return await getTodayAttendanceAction(employee.id);
  } catch (error) {
    console.error("Error starting meeting mode:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to start meeting mode.",
    };
  }
}

/**
 * Stops Meeting Mode for the employee, closes the meeting session with recorded duration, resumes ACTIVE session, and notifies HR/TL
 */
export async function stopMeetingModeAction(
  employeeId?: string
): Promise<ActionResult<TodayAttendanceState>> {
  try {
    const employee = await resolveEmployee(employeeId);
    if (!employee) {
      return { success: false, error: "Employee record not found." };
    }

    const todayDate = getNormalizedDate();
    const now = new Date();

    const attendance = await db.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: todayDate,
        },
      },
      include: { sessions: true },
    });

    if (!attendance || attendance.currentStatus === TrackerStatus.CLOCKED_OUT) {
      return { success: false, error: "Cannot stop Meeting Mode while clocked out." };
    }

    let meetingDurationMin = 0;

    // Close open session(s)
    const openSessions = attendance.sessions.filter((s) => s.endTime === null);
    for (const openSession of openSessions) {
      const durationMin = Math.max(
        0,
        (now.getTime() - openSession.startTime.getTime()) / (1000 * 60)
      );
      if (openSession.status === TrackerStatus.MEETING_MODE) {
        meetingDurationMin = Math.round(durationMin);
      }
      await db.attendanceSession.update({
        where: { id: openSession.id },
        data: {
          endTime: now,
          durationMinutes: Number(durationMin.toFixed(2)),
        },
      });
    }

    // Start a new ACTIVE session
    await db.attendanceSession.create({
      data: {
        attendanceId: attendance.id,
        startTime: now,
        status: TrackerStatus.ACTIVE,
      },
    });

    // Recalculate total active hours
    const allSessions = await db.attendanceSession.findMany({
      where: { attendanceId: attendance.id },
    });
    const totalActiveMinutes = calculateTotalActiveMinutes(allSessions);
    const totalActiveHours = Number((totalActiveMinutes / 60).toFixed(2));

    await db.attendance.update({
      where: { id: attendance.id },
      data: {
        currentStatus: TrackerStatus.ACTIVE,
        totalActiveHours,
      },
    });

    // Targeted notifications
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const empName = `${employee.firstName} ${employee.lastName}`;
    const durationText = meetingDurationMin > 0 ? `${meetingDurationMin} min` : "< 1 min";

    await notifyHRAdmins({
      title: "Meeting Mode Completed",
      message: `${empName} completed meeting and disabled Meeting Mode at ${timeStr} (Duration: ${durationText}).`,
      actionUrl: "/hrms/attendance",
    });

    if (employee.teamLeaderId) {
      await createNotification({
        recipientUserId: employee.teamLeaderId,
        title: "Team Member Meeting Finished",
        message: `${empName} completed meeting at ${timeStr} (Duration: ${durationText}).`,
        actionUrl: "/hrms/attendance",
        type: NotificationType.INFO,
      });
    }

    revalidatePath("/hrms");
    revalidatePath("/hrms/attendance");

    return await getTodayAttendanceAction(employee.id);
  } catch (error) {
    console.error("Error stopping meeting mode:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to stop meeting mode.",
    };
  }
}

export interface AttendanceReportFilterParams {
  startDate?: string;
  endDate?: string;
  department?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface AttendanceRecordRow {
  id: string;
  employeeId: string;
  employeeDbId: string;
  employeeName: string;
  department: string;
  designation: string;
  workEmail: string;
  date: string;
  clockInTime: string | null;
  clockOutTime: string | null;
  totalActiveHours: number;
  currentStatus: "ACTIVE" | "IDLE" | "CLOCKED_OUT" | "MEETING_MODE";
  sessionsCount: number;
}

/**
 * HRMS Attendance Administration View Data Query
 * Validates RBAC permissions: Admin and HRMS roles only.
 */
export async function getAttendanceReportAction(
  params: AttendanceReportFilterParams = {}
): Promise<
  ActionResult<{
    records: AttendanceRecordRow[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    stats: {
      totalEmployees: number;
      activeNow: number;
      idleNow: number;
      clockedOut: number;
      avgWorkingHours: number;
    };
  }>
> {
  try {
    // 1. RBAC Scoping Validation
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const scope = await getScopeFilter(user, "hrms");

    const {
      startDate,
      endDate,
      department = "ALL",
      status = "ALL",
      search = "",
      page = 1,
      pageSize = 10,
    } = params;

    // Build Prisma where clause
    const where: Record<string, unknown> = {};

    // Enforce Hierarchy Scoping
    if (!scope.canViewAll && scope.allowedEmployeeIds) {
      where.employeeId = { in: scope.allowedEmployeeIds };
    }

    // Date range filter
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setUTCHours(23, 59, 59, 999);
      where.date = {
        gte: start,
        lte: end,
      };
    } else if (startDate) {
      const start = new Date(startDate);
      start.setUTCHours(0, 0, 0, 0);
      where.date = { gte: start };
    }

    // Status filter
    if (status && status !== "ALL") {
      where.currentStatus = status as TrackerStatus;
    }

    // Employee filters (department & search)
    const employeeWhere: Record<string, unknown> = {};

    if (department && department !== "ALL") {
      employeeWhere.department = department;
    }

    if (search.trim()) {
      const q = search.trim();
      employeeWhere.OR = [
        { employeeId: { contains: q, mode: "insensitive" } },
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { workEmail: { contains: q, mode: "insensitive" } },
        { designation: { contains: q, mode: "insensitive" } },
      ];
    }

    if (Object.keys(employeeWhere).length > 0) {
      where.employee = employeeWhere;
    }

    const [total, rawRecords, allTodayRecords, totalStaffCount] = await Promise.all([
      db.attendance.count({ where }),
      db.attendance.findMany({
        where,
        orderBy: [{ date: "desc" }, { clockInTime: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          employee: {
            select: {
              id: true,
              employeeId: true,
              firstName: true,
              lastName: true,
              department: true,
              designation: true,
              workEmail: true,
            },
          },
          sessions: {
            select: { id: true, status: true, startTime: true, endTime: true, durationMinutes: true },
          },
        },
      }),
      // Query today's active/idle distribution for stats
      db.attendance.findMany({
        where: {
          date: getNormalizedDate(),
        },
        select: {
          currentStatus: true,
          totalActiveHours: true,
        },
      }),
      db.employee.count({ where: { status: "ACTIVE" } }),
    ]);

    // Compute live stats
    let activeNow = 0;
    let idleNow = 0;
    let clockedOut = 0;
    let sumHours = 0;

    for (const r of allTodayRecords) {
      if (r.currentStatus === TrackerStatus.ACTIVE) activeNow++;
      else if (r.currentStatus === TrackerStatus.IDLE) idleNow++;
      else clockedOut++;
      sumHours += r.totalActiveHours;
    }

    // Remaining staff who haven't clocked in today count as clocked out / not logged
    const unrecordedToday = Math.max(0, totalStaffCount - allTodayRecords.length);
    clockedOut += unrecordedToday;

    const avgWorkingHours =
      allTodayRecords.length > 0 ? Number((sumHours / allTodayRecords.length).toFixed(1)) : 0;

    // Serialize records for client components
    const records: AttendanceRecordRow[] = rawRecords.map((r) => {
      // Calculate active hours dynamically if session is still open
      const dynamicActiveMinutes = calculateTotalActiveMinutes(r.sessions);
      const computedHours =
        r.currentStatus !== TrackerStatus.CLOCKED_OUT
          ? Number((dynamicActiveMinutes / 60).toFixed(2))
          : r.totalActiveHours;

      return {
        id: r.id,
        employeeId: r.employee.employeeId,
        employeeDbId: r.employee.id,
        employeeName: `${r.employee.firstName} ${r.employee.lastName}`,
        department: r.employee.department,
        designation: r.employee.designation,
        workEmail: r.employee.workEmail,
        date: r.date.toISOString(),
        clockInTime: r.clockInTime ? r.clockInTime.toISOString() : null,
        clockOutTime: r.clockOutTime ? r.clockOutTime.toISOString() : null,
        totalActiveHours: computedHours,
        currentStatus: r.currentStatus as "ACTIVE" | "IDLE" | "CLOCKED_OUT",
        sessionsCount: r.sessions.length,
      };
    });

    return {
      success: true,
      data: {
        records,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
        stats: {
          totalEmployees: totalStaffCount,
          activeNow,
          idleNow,
          clockedOut,
          avgWorkingHours,
        },
      },
    };
  } catch (error) {
    console.error("Error retrieving attendance report:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load attendance report.",
    };
  }
}

/**
 * Generates formatted CSV string for currently filtered attendance records
 */
export async function exportAttendanceCSVAction(
  params: AttendanceReportFilterParams = {}
): Promise<ActionResult<{ csvContent: string; filename: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }
    const scope = await getScopeFilter(user, "hrms");
    if (scope.isTm && !scope.canManageAll && !scope.isHod && !scope.isTl) {
      return { success: false, error: "Unauthorized to export attendance reports." };
    }

    // Get up to 1000 matching records for export
    const result = await getAttendanceReportAction({
      ...params,
      page: 1,
      pageSize: 1000,
    });

    if (!result.success || !result.data) {
      return { success: false, error: result.error || "Failed to retrieve export records." };
    }

    const { records } = result.data;

    // CSV Header
    const headers = [
      "Employee ID",
      "Employee Name",
      "Department",
      "Designation",
      "Work Email",
      "Date",
      "Clock In Time",
      "Clock Out Time",
      "Total Active Hours",
      "Real-Time Status",
      "Sessions Count",
    ];

    const rows = records.map((r) => {
      const dateStr = new Date(r.date).toISOString().split("T")[0];
      const clockIn = r.clockInTime
        ? new Date(r.clockInTime).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })
        : "N/A";
      const clockOut = r.clockOutTime
        ? new Date(r.clockOutTime).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })
        : r.currentStatus !== "CLOCKED_OUT"
        ? "Ongoing"
        : "N/A";

      return [
        `"${r.employeeId}"`,
        `"${r.employeeName}"`,
        `"${r.department}"`,
        `"${r.designation}"`,
        `"${r.workEmail}"`,
        `"${dateStr}"`,
        `"${clockIn}"`,
        `"${clockOut}"`,
        `"${r.totalActiveHours.toFixed(2)}"`,
        `"${r.currentStatus}"`,
        `"${r.sessionsCount}"`,
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\r\n");
    const dateStamp = new Date().toISOString().split("T")[0];
    const filename = `BharatEdge_Attendance_Report_${dateStamp}.csv`;

    return {
      success: true,
      data: {
        csvContent,
        filename,
      },
    };
  } catch (error) {
    console.error("Error generating CSV export:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate CSV.",
    };
  }
}
