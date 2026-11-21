"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { CalendarEventType, Role, NotificationType } from "@prisma/client";
import { notifyAllUsers } from "@/lib/actions/notifications";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SerializedCalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  type: CalendarEventType;
  startTime: string | null;
  endTime: string | null;
  description: string | null;
  createdBy: string | null;
}

export interface SerializedEmployeeAttendanceDay {
  date: string; // YYYY-MM-DD
  clockInTime: string | null;
  clockOutTime: string | null;
  totalActiveHours: number;
  currentStatus: string;
}

/**
 * Resolves current employee
 */
async function resolveCurrentEmployee() {
  const user = await getCurrentUser();
  if (!user) return null;

  let employee = await db.employee.findUnique({
    where: { id: user.id },
  });

  if (!employee && user.email) {
    employee = await db.employee.findUnique({
      where: { workEmail: user.email },
    });
  }

  if (!employee) {
    employee = await db.employee.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
    });
  }

  return employee;
}

/**
 * Retrieves monthly calendar data including company events, holidays, and employee attendance
 */
export async function getCalendarDataAction(params: {
  month: number; // 1 - 12
  year: number;
}): Promise<
  ActionResult<{
    events: SerializedCalendarEvent[];
    attendanceDays: SerializedEmployeeAttendanceDay[];
    isHRAdmin: boolean;
  }>
> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const { month, year } = params;

    // Start of the calendar view (pad with days from previous month if needed)
    const startDate = new Date(Date.UTC(year, month - 1, -6));
    const endDate = new Date(Date.UTC(year, month, 14, 23, 59, 59, 999));

    const employee = await resolveCurrentEmployee();
    const isHRAdmin = user.role === Role.Admin || user.role === Role.HRMS;

    const [rawEvents, rawAttendance] = await Promise.all([
      db.calendarEvent.findMany({
        where: {
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
      }),
      employee
        ? db.attendance.findMany({
            where: {
              employeeId: employee.id,
              date: {
                gte: startDate,
                lte: endDate,
              },
            },
          })
        : [],
    ]);

    const events: SerializedCalendarEvent[] = rawEvents.map((e) => ({
      id: e.id,
      title: e.title,
      date: e.date.toISOString().split("T")[0],
      type: e.type,
      startTime: e.startTime,
      endTime: e.endTime,
      description: e.description,
      createdBy: e.createdBy,
    }));

    const attendanceDays: SerializedEmployeeAttendanceDay[] = rawAttendance.map((a) => ({
      date: a.date.toISOString().split("T")[0],
      clockInTime: a.clockInTime ? a.clockInTime.toISOString() : null,
      clockOutTime: a.clockOutTime ? a.clockOutTime.toISOString() : null,
      totalActiveHours: a.totalActiveHours,
      currentStatus: a.currentStatus,
    }));

    return {
      success: true,
      data: {
        events,
        attendanceDays,
        isHRAdmin,
      },
    };
  } catch (error) {
    console.error("Error retrieving calendar data:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load calendar events.",
    };
  }
}

/**
 * HR Admin creates a new company holiday or event
 */
export async function createCalendarEventAction(input: {
  title: string;
  date: string; // YYYY-MM-DD
  type: CalendarEventType;
  startTime?: string;
  endTime?: string;
  description?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== Role.Admin && user.role !== Role.HRMS)) {
      return { success: false, error: "Access Denied: Only HR Admins can create calendar events & holidays." };
    }

    if (!input.title.trim()) {
      return { success: false, error: "Event title is required." };
    }

    const eventDate = new Date(input.date);
    eventDate.setUTCHours(0, 0, 0, 0);

    const event = await db.calendarEvent.create({
      data: {
        title: input.title.trim(),
        date: eventDate,
        type: input.type,
        startTime: input.startTime?.trim() || null,
        endTime: input.endTime?.trim() || null,
        description: input.description?.trim() || null,
        createdBy: user.name || "HR Admin",
      },
    });

    // Notify all staff if Holiday or Important company event is scheduled
    if (input.type === CalendarEventType.HOLIDAY || input.type === CalendarEventType.IMPORTANT) {
      await notifyAllUsers({
        title: input.type === CalendarEventType.HOLIDAY ? `Upcoming Holiday: ${input.title.trim()}` : `Company Event: ${input.title.trim()}`,
        message: `${input.title.trim()} has been scheduled on ${input.date}${input.description ? ` (${input.description.trim()})` : ""}.`,
        type: NotificationType.INFO,
        actionUrl: "/hrms/calendar",
      });
    }

    revalidatePath("/hrms/calendar");
    return { success: true, data: { id: event.id } };
  } catch (error) {
    console.error("Error creating calendar event:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create event.",
    };
  }
}

/**
 * HR Admin updates an existing calendar event or holiday
 */
export async function updateCalendarEventAction(input: {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  type: CalendarEventType;
  startTime?: string;
  endTime?: string;
  description?: string;
}): Promise<ActionResult<{ success: boolean }>> {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== Role.Admin && user.role !== Role.HRMS)) {
      return { success: false, error: "Access Denied: Only HR Admins can modify calendar events." };
    }

    if (!input.title.trim()) {
      return { success: false, error: "Event title is required." };
    }

    const eventDate = new Date(input.date);
    eventDate.setUTCHours(0, 0, 0, 0);

    await db.calendarEvent.update({
      where: { id: input.id },
      data: {
        title: input.title.trim(),
        date: eventDate,
        type: input.type,
        startTime: input.startTime?.trim() || null,
        endTime: input.endTime?.trim() || null,
        description: input.description?.trim() || null,
      },
    });

    revalidatePath("/hrms/calendar");
    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Error updating calendar event:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update event.",
    };
  }
}

/**
 * HR Admin deletes a calendar event
 */
export async function deleteCalendarEventAction(id: string): Promise<ActionResult<{ success: boolean }>> {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== Role.Admin && user.role !== Role.HRMS)) {
      return { success: false, error: "Access Denied." };
    }

    await db.calendarEvent.delete({
      where: { id },
    });

    revalidatePath("/hrms/calendar");
    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Error deleting calendar event:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete event.",
    };
  }
}
