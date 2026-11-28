"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getScopeFilter } from "@/lib/auth/rbac";
import { NotificationType } from "@prisma/client";
import { createNotification } from "@/lib/actions/notifications";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SurveyQuestion {
  id: string;
  question: string;
  type: "rating" | "text" | "choice";
  options?: string[];
}

export interface CreateSurveyInput {
  title: string;
  description?: string;
  targetDepartment?: string;
  startDate: string;
  endDate: string;
  questions: SurveyQuestion[];
}

/**
 * Fetches active surveys for logged-in employee to take
 */
export async function getActiveSurveysAction(): Promise<ActionResult<any[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const employee = await db.employee.findUnique({
      where: { id: user.id },
      select: { id: true, department: true },
    });

    if (!employee) return { success: false, error: "Employee record not found." };

    const surveys = await db.hrmsSurvey.findMany({
      where: {
        isActive: true,
        OR: [
          { targetDepartment: "ALL" },
          { targetDepartment: employee.department },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: {
        responses: {
          where: { employeeId: employee.id },
          select: { id: true, submittedAt: true },
        },
      },
    });

    return {
      success: true,
      data: surveys.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        questions: Array.isArray(s.questions) ? s.questions : [],
        startDate: s.startDate.toISOString().split("T")[0],
        endDate: s.endDate.toISOString().split("T")[0],
        hasResponded: s.responses.length > 0,
        submittedAt: s.responses[0]?.submittedAt?.toISOString() || null,
      })),
    };
  } catch (error) {
    console.error("Error fetching surveys:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load surveys.",
    };
  }
}

/**
 * Submits employee survey responses
 */
export async function submitSurveyResponseAction(input: {
  surveyId: string;
  answers: Record<string, any>;
}): Promise<ActionResult<{ success: boolean }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    await db.hrmsSurveyResponse.upsert({
      where: {
        surveyId_employeeId: {
          surveyId: input.surveyId,
          employeeId: user.id,
        },
      },
      update: {
        answers: input.answers,
        submittedAt: new Date(),
      },
      create: {
        surveyId: input.surveyId,
        employeeId: user.id,
        answers: input.answers,
      },
    });

    revalidatePath("/hrms/surveys");
    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Error submitting survey response:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to submit survey.",
    };
  }
}

/**
 * Fetches all surveys and response analytics for HR Admin
 */
export async function getAllSurveysAction(): Promise<ActionResult<any[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const scope = await getScopeFilter(user, "hrms");
    if (!scope.isHrAdmin && !scope.isSuperAdmin) {
      return { success: false, error: "Access Denied." };
    }

    const surveys = await db.hrmsSurvey.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { responses: true },
        },
        responses: {
          take: 20,
          select: {
            id: true,
            answers: true,
            submittedAt: true,
            employee: { select: { firstName: true, lastName: true, department: true } },
          },
        },
      },
    });

    return {
      success: true,
      data: surveys.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        targetDepartment: s.targetDepartment,
        questions: Array.isArray(s.questions) ? s.questions : [],
        startDate: s.startDate.toISOString().split("T")[0],
        endDate: s.endDate.toISOString().split("T")[0],
        isActive: s.isActive,
        responseCount: s._count.responses,
        recentResponses: s.responses.map((r) => ({
          id: r.id,
          employeeName: `${r.employee.firstName} ${r.employee.lastName}`,
          department: r.employee.department,
          answers: r.answers,
          submittedAt: r.submittedAt.toISOString(),
        })),
      })),
    };
  } catch (error) {
    console.error("Error fetching all surveys:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load surveys.",
    };
  }
}

/**
 * Creates a new company pulse survey
 */
export async function createSurveyAction(
  input: CreateSurveyInput
): Promise<ActionResult<{ surveyId: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const scope = await getScopeFilter(user, "hrms");
    if (!scope.isHrAdmin && !scope.isSuperAdmin) {
      return { success: false, error: "Access Denied." };
    }

    const survey = await db.hrmsSurvey.create({
      data: {
        title: input.title.trim(),
        description: input.description?.trim() || null,
        targetDepartment: input.targetDepartment || "ALL",
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        questions: input.questions as any,
        createdById: user.id,
        isActive: true,
      },
    });

    revalidatePath("/hrms/surveys");
    return { success: true, data: { surveyId: survey.id } };
  } catch (error) {
    console.error("Error creating survey:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create survey.",
    };
  }
}
