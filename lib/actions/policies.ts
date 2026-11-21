"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { PolicyStatus, Role, NotificationType } from "@prisma/client";
import { notifyAllUsers } from "@/lib/actions/notifications";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SerializedPolicy {
  id: string;
  title: string;
  category: string;
  content: string;
  documentUrl: string | null;
  effectiveDate: string; // YYYY-MM-DD
  status: PolicyStatus;
  createdBy: string | null;
  updatedAt: string;
}

/**
 * Retrieves all published company policies (with optional search and category filters)
 */
export async function getCompanyPoliciesAction(params: {
  category?: string;
  search?: string;
} = {}): Promise<
  ActionResult<{
    policies: SerializedPolicy[];
    categories: string[];
    isHRAdmin: boolean;
  }>
> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const isHRAdmin = user.role === Role.Admin || user.role === Role.HRMS;
    const { category = "ALL", search = "" } = params;

    const where: any = {};

    // Normal staff only see PUBLISHED policies; HR Admin can see DRAFT/ARCHIVED too
    if (!isHRAdmin) {
      where.status = PolicyStatus.PUBLISHED;
    }

    if (category && category !== "ALL") {
      where.category = category;
    }

    if (search.trim()) {
      const q = search.trim();
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { content: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
      ];
    }

    const [rawPolicies, allDistinctCategories] = await Promise.all([
      db.companyPolicy.findMany({
        where,
        orderBy: [{ effectiveDate: "desc" }, { createdAt: "desc" }],
      }),
      db.companyPolicy.findMany({
        select: { category: true },
        distinct: ["category"],
      }),
    ]);

    const policies: SerializedPolicy[] = rawPolicies.map((p) => ({
      id: p.id,
      title: p.title,
      category: p.category,
      content: p.content,
      documentUrl: p.documentUrl,
      effectiveDate: p.effectiveDate.toISOString().split("T")[0],
      status: p.status,
      createdBy: p.createdBy,
      updatedAt: p.updatedAt.toISOString().split("T")[0],
    }));

    const categories = allDistinctCategories.map((c) => c.category);

    return {
      success: true,
      data: {
        policies,
        categories,
        isHRAdmin,
      },
    };
  } catch (error) {
    console.error("Error fetching company policies:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load company policies.",
    };
  }
}

/**
 * HR Admin creates a new company policy
 */
export async function createPolicyAction(input: {
  title: string;
  category: string;
  content: string;
  documentUrl?: string;
  effectiveDate: string; // YYYY-MM-DD
}): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== Role.Admin && user.role !== Role.HRMS)) {
      return { success: false, error: "Access Denied: Only HR Admins can create company policies." };
    }

    if (!input.title.trim() || !input.content.trim()) {
      return { success: false, error: "Policy title and content are required." };
    }

    const date = new Date(input.effectiveDate);
    date.setUTCHours(0, 0, 0, 0);

    const policy = await db.companyPolicy.create({
      data: {
        title: input.title.trim(),
        category: input.category.trim() || "General",
        content: input.content.trim(),
        documentUrl: input.documentUrl?.trim() || null,
        effectiveDate: date,
        status: PolicyStatus.PUBLISHED,
        createdBy: user.name || "HR Admin",
      },
    });

    // Notify all staff across organization of new official policy
    await notifyAllUsers({
      title: "New Company Policy Published",
      message: `"${policy.title}" has been published under category "${policy.category}". Please review for enterprise compliance.`,
      type: NotificationType.INFO,
      actionUrl: "/hrms/policies",
    });

    revalidatePath("/hrms/policies");
    return { success: true, data: { id: policy.id } };
  } catch (error) {
    console.error("Error creating company policy:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to publish policy.",
    };
  }
}

/**
 * HR Admin updates an existing company policy
 */
export async function updatePolicyAction(input: {
  id: string;
  title: string;
  category: string;
  content: string;
  documentUrl?: string;
  effectiveDate: string;
  status: PolicyStatus;
}): Promise<ActionResult<{ success: boolean }>> {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== Role.Admin && user.role !== Role.HRMS)) {
      return { success: false, error: "Access Denied." };
    }

    const date = new Date(input.effectiveDate);
    date.setUTCHours(0, 0, 0, 0);

    await db.companyPolicy.update({
      where: { id: input.id },
      data: {
        title: input.title.trim(),
        category: input.category.trim(),
        content: input.content.trim(),
        documentUrl: input.documentUrl?.trim() || null,
        effectiveDate: date,
        status: input.status,
      },
    });

    revalidatePath("/hrms/policies");
    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Error updating policy:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update policy.",
    };
  }
}

/**
 * HR Admin archives a company policy
 */
export async function archivePolicyAction(id: string): Promise<ActionResult<{ success: boolean }>> {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== Role.Admin && user.role !== Role.HRMS)) {
      return { success: false, error: "Access Denied." };
    }

    await db.companyPolicy.update({
      where: { id },
      data: { status: PolicyStatus.ARCHIVED },
    });

    revalidatePath("/hrms/policies");
    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Error archiving policy:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to archive policy.",
    };
  }
}

/**
 * HR Admin permanently deletes a company policy
 */
export async function deletePolicyAction(id: string): Promise<ActionResult<{ success: boolean }>> {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== Role.Admin && user.role !== Role.HRMS)) {
      return { success: false, error: "Access Denied: Only HR Admins can delete policies." };
    }

    await db.companyPolicy.delete({
      where: { id },
    });

    revalidatePath("/hrms/policies");
    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Error deleting policy:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete policy.",
    };
  }
}
