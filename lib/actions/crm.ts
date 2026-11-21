"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getCrmUserScope, canUserModifyRecord } from "@/lib/auth/crm-scope";
import {
  serviceSchema,
  companySchema,
  clientSchema,
  leadSchema,
  ServiceFormData,
  CompanyFormData,
  ClientFormData,
  LeadFormData,
} from "@/lib/validations/crm";
import { LeadStatus, Prisma } from "@prisma/client";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  count?: number;
}

// ==========================================
// 1. SERVICES CRUD & BULK ACTIONS
// ==========================================

export interface SerializedService {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  category: string | null;
  minimumPrice: number;
  outsourcePrice: number;
  sacCode: string | null;
  defaultGstRate: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getServicesAction(params: {
  search?: string;
  category?: string;
  isActive?: boolean;
} = {}): Promise<ActionResult<{ services: SerializedService[]; categories: string[] }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const { search = "", category = "ALL", isActive } = params;
    const where: Prisma.ServiceWhereInput = {};

    if (category && category !== "ALL") {
      where.category = category;
    }
    if (typeof isActive === "boolean") {
      where.isActive = isActive;
    }
    if (search.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { code: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
        { sacCode: { contains: q, mode: "insensitive" } },
      ];
    }

    const services = await db.service.findMany({
      where,
      orderBy: { name: "asc" },
    });

    // Extract unique categories for filter
    const allCategories = await db.service.findMany({
      select: { category: true },
      distinct: ["category"],
    });
    const categories = allCategories
      .map((c) => c.category)
      .filter((c): c is string => Boolean(c));

    const serialized: SerializedService[] = services.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      description: s.description,
      category: s.category,
      minimumPrice: Number(s.minimumPrice),
      outsourcePrice: Number(s.outsourcePrice),
      sacCode: s.sacCode,
      defaultGstRate: s.defaultGstRate,
      isActive: s.isActive,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));

    return {
      success: true,
      data: { services: serialized, categories },
    };
  } catch (error: any) {
    console.error("[getServicesAction Error]:", error);
    return { success: false, error: error.message || "Failed to fetch services." };
  }
}

export async function createServiceAction(
  raw: ServiceFormData
): Promise<ActionResult<SerializedService>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const parsed = serviceSchema.parse(raw);

    // Check duplicate name or code
    const existing = await db.service.findFirst({
      where: {
        OR: [
          { name: { equals: parsed.name, mode: "insensitive" } },
          ...(parsed.code ? [{ code: { equals: parsed.code, mode: "insensitive" as Prisma.QueryMode } }] : []),
        ],
      },
    });

    if (existing) {
      return { success: false, error: "A service with this name or code already exists." };
    }

    const service = await db.service.create({
      data: {
        name: parsed.name,
        code: parsed.code || null,
        description: parsed.description || null,
        category: parsed.category,
        minimumPrice: new Prisma.Decimal(parsed.minimumPrice),
        outsourcePrice: new Prisma.Decimal(parsed.outsourcePrice),
        sacCode: parsed.sacCode || null,
        defaultGstRate: parsed.defaultGstRate,
        isActive: parsed.isActive,
      },
    });

    revalidatePath("/crm/services");
    return {
      success: true,
      data: {
        ...service,
        minimumPrice: Number(service.minimumPrice),
        outsourcePrice: Number(service.outsourcePrice),
        createdAt: service.createdAt.toISOString(),
        updatedAt: service.updatedAt.toISOString(),
      },
    };
  } catch (error: any) {
    console.error("[createServiceAction Error]:", error);
    return { success: false, error: error.message || "Failed to create service." };
  }
}

export async function updateServiceAction(
  id: string,
  raw: ServiceFormData
): Promise<ActionResult<SerializedService>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const parsed = serviceSchema.parse(raw);

    // Verify name uniqueness excluding current
    const duplicate = await db.service.findFirst({
      where: {
        id: { not: id },
        name: { equals: parsed.name, mode: "insensitive" },
      },
    });
    if (duplicate) {
      return { success: false, error: "Another service already exists with this name." };
    }

    const updated = await db.service.update({
      where: { id },
      data: {
        name: parsed.name,
        code: parsed.code || null,
        description: parsed.description || null,
        category: parsed.category,
        minimumPrice: new Prisma.Decimal(parsed.minimumPrice),
        outsourcePrice: new Prisma.Decimal(parsed.outsourcePrice),
        sacCode: parsed.sacCode || null,
        defaultGstRate: parsed.defaultGstRate,
        isActive: parsed.isActive,
      },
    });

    revalidatePath("/crm/services");
    return {
      success: true,
      data: {
        ...updated,
        minimumPrice: Number(updated.minimumPrice),
        outsourcePrice: Number(updated.outsourcePrice),
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    };
  } catch (error: any) {
    console.error("[updateServiceAction Error]:", error);
    return { success: false, error: error.message || "Failed to update service." };
  }
}

export async function deleteServiceAction(id: string): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    // Check if referenced in deals or quotations
    const linkedDeals = await db.dealService.count({ where: { serviceId: id } });
    if (linkedDeals > 0) {
      return {
        success: false,
        error: `Cannot delete: this service is referenced in ${linkedDeals} active deal(s). Deactivate it instead.`,
      };
    }

    await db.service.delete({ where: { id } });
    revalidatePath("/crm/services");
    return { success: true };
  } catch (error: any) {
    console.error("[deleteServiceAction Error]:", error);
    return { success: false, error: error.message || "Failed to delete service." };
  }
}

export async function bulkUploadServicesAction(
  records: ServiceFormData[]
): Promise<ActionResult<{ insertedCount: number; errors?: string[] }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    let insertedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < records.length; i++) {
      try {
        const parsed = serviceSchema.parse(records[i]);
        const exists = await db.service.findFirst({
          where: { name: { equals: parsed.name, mode: "insensitive" } },
        });

        if (exists) {
          // Update existing
          await db.service.update({
            where: { id: exists.id },
            data: {
              code: parsed.code || exists.code,
              category: parsed.category,
              description: parsed.description || exists.description,
              minimumPrice: new Prisma.Decimal(parsed.minimumPrice),
              outsourcePrice: new Prisma.Decimal(parsed.outsourcePrice),
              defaultGstRate: parsed.defaultGstRate,
              isActive: parsed.isActive,
            },
          });
        } else {
          // Insert new
          await db.service.create({
            data: {
              name: parsed.name,
              code: parsed.code || null,
              category: parsed.category,
              description: parsed.description || null,
              minimumPrice: new Prisma.Decimal(parsed.minimumPrice),
              outsourcePrice: new Prisma.Decimal(parsed.outsourcePrice),
              sacCode: parsed.sacCode || null,
              defaultGstRate: parsed.defaultGstRate,
              isActive: parsed.isActive,
            },
          });
        }
        insertedCount++;
      } catch (err: any) {
        errors.push(`Row ${i + 1}: ${err.message || "Failed to save record"}`);
      }
    }

    revalidatePath("/crm/services");
    return {
      success: true,
      data: { insertedCount, errors: errors.length > 0 ? errors : undefined },
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Bulk upload failed." };
  }
}

// ==========================================
// 2. COMPANIES CRUD & BULK ACTIONS
// ==========================================

export interface SerializedCompany {
  id: string;
  name: string;
  industry: string | null;
  companyType: string | null;
  incorporatedDate: string | null;
  website: string | null;
  gstNumber: string | null;
  panNumber: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  createdById: string | null;
  creatorName?: string;
  clientsCount: number;
  dealsCount: number;
  createdAt: string;
  updatedAt: string;
}

export async function getCompaniesAction(params: {
  search?: string;
  companyType?: string;
} = {}): Promise<ActionResult<{ companies: SerializedCompany[]; canManageAll: boolean }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const scope = await getCrmUserScope(user);
    const { search = "", companyType = "ALL" } = params;

    const andConditions: Prisma.CompanyWhereInput[] = [];

    // RBAC Scoping: Sales TMs only see companies they created or linked to their deals/clients; TLs see team's; Admins/Accounts/Quality see all
    if (!scope.canViewAll && scope.allowedUserIds) {
      andConditions.push({
        OR: [
          { createdById: { in: scope.allowedUserIds } },
          { deals: { some: { assignedEmployeeId: { in: scope.allowedUserIds } } } },
          { clients: { some: { OR: [{ createdById: { in: scope.allowedUserIds } }, { assignedEmployeeId: { in: scope.allowedUserIds } }] } } },
        ],
      });
    }

    if (companyType && companyType !== "ALL") {
      andConditions.push({ companyType });
    }

    if (search.trim()) {
      const q = search.trim();
      andConditions.push({
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { industry: { contains: q, mode: "insensitive" } },
          { gstNumber: { contains: q, mode: "insensitive" } },
          { panNumber: { contains: q, mode: "insensitive" } },
          { city: { contains: q, mode: "insensitive" } },
          { state: { contains: q, mode: "insensitive" } },
        ],
      });
    }

    const where: Prisma.CompanyWhereInput = andConditions.length > 0 ? { AND: andConditions } : {};

    const companies = await db.company.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: {
          select: { firstName: true, lastName: true },
        },
        _count: {
          select: { clients: true, deals: true },
        },
      },
    });

    const serialized: SerializedCompany[] = companies.map((c) => ({
      id: c.id,
      name: c.name,
      industry: c.industry,
      companyType: c.companyType,
      incorporatedDate: c.incorporatedDate ? c.incorporatedDate.toISOString().split("T")[0] : null,
      website: c.website,
      gstNumber: c.gstNumber,
      panNumber: c.panNumber,
      address: c.address,
      city: c.city,
      state: c.state,
      country: c.country,
      createdById: c.createdById,
      creatorName: c.createdBy
        ? `${c.createdBy.firstName} ${c.createdBy.lastName}`.trim()
        : "System",
      clientsCount: c._count.clients,
      dealsCount: c._count.deals,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));

    return {
      success: true,
      data: { companies: serialized, canManageAll: scope.canManageAll },
    };
  } catch (error: any) {
    console.error("[getCompaniesAction Error]:", error);
    return { success: false, error: error.message || "Failed to fetch companies." };
  }
}

export async function createCompanyAction(
  raw: CompanyFormData
): Promise<ActionResult<SerializedCompany>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const parsed = companySchema.parse(raw);

    const company = await db.company.create({
      data: {
        name: parsed.name,
        companyType: parsed.companyType || null,
        incorporatedDate: parsed.incorporatedDate ? new Date(parsed.incorporatedDate) : null,
        industry: parsed.industry || null,
        website: parsed.website || null,
        gstNumber: parsed.gstNumber || null,
        panNumber: parsed.panNumber || null,
        address: parsed.address || null,
        city: parsed.city || null,
        state: parsed.state || null,
        country: parsed.country || "India",
        createdById: user.id,
      },
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });

    revalidatePath("/crm/companies");
    return {
      success: true,
      data: {
        ...company,
        incorporatedDate: company.incorporatedDate
          ? company.incorporatedDate.toISOString().split("T")[0]
          : null,
        creatorName: company.createdBy
          ? `${company.createdBy.firstName} ${company.createdBy.lastName}`.trim()
          : "You",
        clientsCount: 0,
        dealsCount: 0,
        createdAt: company.createdAt.toISOString(),
        updatedAt: company.updatedAt.toISOString(),
      },
    };
  } catch (error: any) {
    console.error("[createCompanyAction Error]:", error);
    return { success: false, error: error.message || "Failed to create company." };
  }
}

export async function updateCompanyAction(
  id: string,
  raw: CompanyFormData
): Promise<ActionResult<SerializedCompany>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const existing = await db.company.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "Company not found." };

    const scope = await getCrmUserScope(user);
    if (!canUserModifyRecord(scope, existing.createdById)) {
      return { success: false, error: "You do not have permission to edit this company record." };
    }

    const parsed = companySchema.parse(raw);

    const updated = await db.company.update({
      where: { id },
      data: {
        name: parsed.name,
        companyType: parsed.companyType || null,
        incorporatedDate: parsed.incorporatedDate ? new Date(parsed.incorporatedDate) : null,
        industry: parsed.industry || null,
        website: parsed.website || null,
        gstNumber: parsed.gstNumber || null,
        panNumber: parsed.panNumber || null,
        address: parsed.address || null,
        city: parsed.city || null,
        state: parsed.state || null,
        country: parsed.country || "India",
      },
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
        _count: { select: { clients: true, deals: true } },
      },
    });

    revalidatePath("/crm/companies");
    return {
      success: true,
      data: {
        ...updated,
        incorporatedDate: updated.incorporatedDate
          ? updated.incorporatedDate.toISOString().split("T")[0]
          : null,
        creatorName: updated.createdBy
          ? `${updated.createdBy.firstName} ${updated.createdBy.lastName}`.trim()
          : "System",
        clientsCount: updated._count.clients,
        dealsCount: updated._count.deals,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    };
  } catch (error: any) {
    console.error("[updateCompanyAction Error]:", error);
    return { success: false, error: error.message || "Failed to update company." };
  }
}

export async function deleteCompanyAction(id: string): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const existing = await db.company.findUnique({
      where: { id },
      include: { _count: { select: { clients: true, deals: true } } },
    });
    if (!existing) return { success: false, error: "Company not found." };

    const scope = await getCrmUserScope(user);
    if (!canUserModifyRecord(scope, existing.createdById)) {
      return { success: false, error: "You do not have permission to delete this company record." };
    }

    if (existing._count.clients > 0 || existing._count.deals > 0) {
      return {
        success: false,
        error: `Cannot delete: this company is linked to ${existing._count.clients} client(s) and ${existing._count.deals} deal(s).`,
      };
    }

    await db.company.delete({ where: { id } });
    revalidatePath("/crm/companies");
    return { success: true };
  } catch (error: any) {
    console.error("[deleteCompanyAction Error]:", error);
    return { success: false, error: error.message || "Failed to delete company." };
  }
}

export async function bulkUploadCompaniesAction(
  records: CompanyFormData[]
): Promise<ActionResult<{ insertedCount: number; errors?: string[] }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    let insertedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < records.length; i++) {
      try {
        const parsed = companySchema.parse(records[i]);
        await db.company.create({
          data: {
            name: parsed.name,
            companyType: parsed.companyType || null,
            incorporatedDate: parsed.incorporatedDate ? new Date(parsed.incorporatedDate) : null,
            industry: parsed.industry || null,
            website: parsed.website || null,
            gstNumber: parsed.gstNumber || null,
            panNumber: parsed.panNumber || null,
            address: parsed.address || null,
            city: parsed.city || null,
            state: parsed.state || null,
            country: parsed.country || "India",
            createdById: user.id,
          },
        });
        insertedCount++;
      } catch (err: any) {
        errors.push(`Row ${i + 1} (${records[i].name}): ${err.message || "Failed to import"}`);
      }
    }

    revalidatePath("/crm/companies");
    return {
      success: true,
      data: { insertedCount, errors: errors.length > 0 ? errors : undefined },
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Bulk upload failed." };
  }
}

// ==========================================
// 3. CLIENTS CRUD & BULK ACTIONS
// ==========================================

export interface SerializedClient {
  id: string;
  clientNumber: string;
  name: string;
  phone: string;
  alternatePhone: string | null;
  email: string | null;
  gender: string | null;
  companyName: string | null;
  companyId: string | null;
  company?: { id: string; name: string } | null;
  gstNumber: string | null;
  panNumber: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  assignedEmployeeId: string | null;
  assignedEmployeeName?: string;
  createdById: string | null;
  dealsCount: number;
  createdAt: string;
  updatedAt: string;
}

export async function getClientsAction(params: {
  search?: string;
  companyId?: string;
} = {}): Promise<ActionResult<{ clients: SerializedClient[]; canManageAll: boolean }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const scope = await getCrmUserScope(user);
    const { search = "", companyId = "ALL" } = params;

    const where: Prisma.ClientWhereInput = {};

    // RBAC Scoping: Sales TMs only see clients they created; TLs see team's; Admins/Accounts/Quality see all
    if (!scope.canViewAll && scope.allowedUserIds) {
      where.OR = [
        { createdById: { in: scope.allowedUserIds } },
        { assignedEmployeeId: { in: scope.allowedUserIds } },
      ];
    }

    if (companyId && companyId !== "ALL") {
      where.companyId = companyId;
    }

    if (search.trim()) {
      const q = search.trim();
      const searchConditions: Prisma.ClientWhereInput[] = [
        { phone: { contains: q } },
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { clientNumber: { contains: q, mode: "insensitive" } },
        { companyName: { contains: q, mode: "insensitive" } },
        { city: { contains: q, mode: "insensitive" } },
        { state: { contains: q, mode: "insensitive" } },
      ];

      if (where.OR) {
        where.AND = [{ OR: searchConditions }];
      } else {
        where.OR = searchConditions;
      }
    }

    const clients = await db.client.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        company: { select: { id: true, name: true } },
        assignedEmployee: { select: { firstName: true, lastName: true } },
        _count: { select: { deals: true } },
      },
    });

    const serialized: SerializedClient[] = clients.map((c) => ({
      id: c.id,
      clientNumber: c.clientNumber,
      name: c.name,
      phone: c.phone,
      alternatePhone: c.alternatePhone,
      email: c.email,
      gender: c.gender,
      companyName: c.companyName || c.company?.name || null,
      companyId: c.companyId,
      company: c.company,
      gstNumber: c.gstNumber,
      panNumber: c.panNumber,
      address: c.address,
      city: c.city,
      state: c.state,
      country: c.country,
      assignedEmployeeId: c.assignedEmployeeId,
      assignedEmployeeName: c.assignedEmployee
        ? `${c.assignedEmployee.firstName} ${c.assignedEmployee.lastName}`.trim()
        : undefined,
      createdById: c.createdById,
      dealsCount: c._count.deals,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));

    return {
      success: true,
      data: { clients: serialized, canManageAll: scope.canManageAll },
    };
  } catch (error: any) {
    console.error("[getClientsAction Error]:", error);
    return { success: false, error: error.message || "Failed to fetch clients." };
  }
}

export async function createClientAction(
  raw: ClientFormData
): Promise<ActionResult<SerializedClient>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const parsed = clientSchema.parse(raw);

    // Primary unique check by phone
    const existingPhone = await db.client.findUnique({
      where: { phone: parsed.phone },
    });
    if (existingPhone) {
      return {
        success: false,
        error: `Client with phone number ${parsed.phone} already exists (${existingPhone.name} - ${existingPhone.clientNumber}). Duplicate records are prohibited.`,
      };
    }

    // Generate unique sequential Client Number (e.g. CLI-001)
    const count = await db.client.count();
    const clientNumber = `CLI-${String(count + 1).padStart(4, "0")}`;

    // If companyId provided, resolve company name
    let companyName = parsed.companyName;
    if (parsed.companyId && !companyName) {
      const co = await db.company.findUnique({ where: { id: parsed.companyId } });
      companyName = co?.name;
    }

    const client = await db.client.create({
      data: {
        clientNumber,
        name: parsed.name,
        phone: parsed.phone,
        alternatePhone: parsed.alternatePhone || null,
        email: parsed.email || null,
        gender: parsed.gender || null,
        companyName: companyName || null,
        companyId: parsed.companyId || null,
        gstNumber: parsed.gstNumber || null,
        panNumber: parsed.panNumber || null,
        address: parsed.address || null,
        city: parsed.city || null,
        state: parsed.state || null,
        country: parsed.country || "India",
        assignedEmployeeId: parsed.assignedEmployeeId || user.id,
        createdById: user.id,
      },
      include: {
        company: { select: { id: true, name: true } },
        assignedEmployee: { select: { firstName: true, lastName: true } },
      },
    });

    revalidatePath("/crm/clients");
    return {
      success: true,
      data: {
        id: client.id,
        clientNumber: client.clientNumber,
        name: client.name,
        phone: client.phone,
        alternatePhone: client.alternatePhone,
        email: client.email,
        gender: client.gender,
        companyName: client.companyName,
        companyId: client.companyId,
        company: client.company,
        gstNumber: client.gstNumber,
        panNumber: client.panNumber,
        address: client.address,
        city: client.city,
        state: client.state,
        country: client.country,
        assignedEmployeeId: client.assignedEmployeeId,
        assignedEmployeeName: client.assignedEmployee
          ? `${client.assignedEmployee.firstName} ${client.assignedEmployee.lastName}`.trim()
          : undefined,
        createdById: client.createdById,
        dealsCount: 0,
        createdAt: client.createdAt.toISOString(),
        updatedAt: client.updatedAt.toISOString(),
      },
    };
  } catch (error: any) {
    console.error("[createClientAction Error]:", error);
    return { success: false, error: error.message || "Failed to create client." };
  }
}

export async function updateClientAction(
  id: string,
  raw: ClientFormData
): Promise<ActionResult<SerializedClient>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const existing = await db.client.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "Client not found." };

    const scope = await getCrmUserScope(user);
    if (!canUserModifyRecord(scope, existing.createdById, existing.assignedEmployeeId)) {
      return { success: false, error: "You do not have permission to edit this client record." };
    }

    const parsed = clientSchema.parse(raw);

    // Verify phone uniqueness if changed
    if (parsed.phone !== existing.phone) {
      const duplicatePhone = await db.client.findUnique({ where: { phone: parsed.phone } });
      if (duplicatePhone) {
        return {
          success: false,
          error: `Phone ${parsed.phone} is already assigned to ${duplicatePhone.name} (${duplicatePhone.clientNumber}).`,
        };
      }
    }

    const updated = await db.client.update({
      where: { id },
      data: {
        name: parsed.name,
        phone: parsed.phone,
        alternatePhone: parsed.alternatePhone || null,
        email: parsed.email || null,
        gender: parsed.gender || null,
        companyName: parsed.companyName || null,
        companyId: parsed.companyId || null,
        gstNumber: parsed.gstNumber || null,
        panNumber: parsed.panNumber || null,
        address: parsed.address || null,
        city: parsed.city || null,
        state: parsed.state || null,
        country: parsed.country || "India",
        assignedEmployeeId: parsed.assignedEmployeeId || existing.assignedEmployeeId,
      },
      include: {
        company: { select: { id: true, name: true } },
        assignedEmployee: { select: { firstName: true, lastName: true } },
        _count: { select: { deals: true } },
      },
    });

    revalidatePath("/crm/clients");
    return {
      success: true,
      data: {
        id: updated.id,
        clientNumber: updated.clientNumber,
        name: updated.name,
        phone: updated.phone,
        alternatePhone: updated.alternatePhone,
        email: updated.email,
        gender: updated.gender,
        companyName: updated.companyName,
        companyId: updated.companyId,
        company: updated.company,
        gstNumber: updated.gstNumber,
        panNumber: updated.panNumber,
        address: updated.address,
        city: updated.city,
        state: updated.state,
        country: updated.country,
        assignedEmployeeId: updated.assignedEmployeeId,
        assignedEmployeeName: updated.assignedEmployee
          ? `${updated.assignedEmployee.firstName} ${updated.assignedEmployee.lastName}`.trim()
          : undefined,
        createdById: updated.createdById,
        dealsCount: updated._count.deals,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    };
  } catch (error: any) {
    console.error("[updateClientAction Error]:", error);
    return { success: false, error: error.message || "Failed to update client." };
  }
}

export async function deleteClientAction(id: string): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const existing = await db.client.findUnique({
      where: { id },
      include: {
        _count: { select: { deals: true, quotations: true, payments: true } },
      },
    });
    if (!existing) return { success: false, error: "Client not found." };

    const scope = await getCrmUserScope(user);
    if (!canUserModifyRecord(scope, existing.createdById, existing.assignedEmployeeId)) {
      return { success: false, error: "You do not have permission to delete this client record." };
    }

    if (
      existing._count.deals > 0 ||
      existing._count.quotations > 0 ||
      existing._count.payments > 0
    ) {
      return {
        success: false,
        error: `Cannot delete: client has ${existing._count.deals} deal(s), ${existing._count.quotations} quotation(s), or ${existing._count.payments} payment record(s).`,
      };
    }

    await db.client.delete({ where: { id } });
    revalidatePath("/crm/clients");
    return { success: true };
  } catch (error: any) {
    console.error("[deleteClientAction Error]:", error);
    return { success: false, error: error.message || "Failed to delete client." };
  }
}

export async function bulkUploadClientsAction(
  records: ClientFormData[]
): Promise<ActionResult<{ insertedCount: number; errors?: string[] }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    let insertedCount = 0;
    const errors: string[] = [];

    let currentTotal = await db.client.count();

    for (let i = 0; i < records.length; i++) {
      try {
        const parsed = clientSchema.parse(records[i]);

        // Check duplicate phone
        const duplicate = await db.client.findUnique({ where: { phone: parsed.phone } });
        if (duplicate) {
          errors.push(
            `Row ${i + 1} (${parsed.name}): Phone ${parsed.phone} already belongs to ${duplicate.name} (${duplicate.clientNumber})`
          );
          continue;
        }

        currentTotal++;
        const clientNumber = `CLI-${String(currentTotal).padStart(4, "0")}`;

        await db.client.create({
          data: {
            clientNumber,
            name: parsed.name,
            phone: parsed.phone,
            alternatePhone: parsed.alternatePhone || null,
            email: parsed.email || null,
            gender: parsed.gender || null,
            companyName: parsed.companyName || null,
            gstNumber: parsed.gstNumber || null,
            panNumber: parsed.panNumber || null,
            address: parsed.address || null,
            city: parsed.city || null,
            state: parsed.state || null,
            country: parsed.country || "India",
            assignedEmployeeId: user.id,
            createdById: user.id,
          },
        });
        insertedCount++;
      } catch (err: any) {
        errors.push(`Row ${i + 1}: ${err.message || "Failed to process record"}`);
      }
    }

    revalidatePath("/crm/clients");
    return {
      success: true,
      data: { insertedCount, errors: errors.length > 0 ? errors : undefined },
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Bulk upload failed." };
  }
}

// ==========================================
// 4. LEADS CRUD & BULK ACTIONS
// ==========================================

export interface SerializedLead {
  id: string;
  leadNumber: string;
  name: string;
  email: string | null;
  phone: string;
  companyName: string | null;
  source: string;
  status: LeadStatus;
  notes: string | null;
  estimatedBudget: number;
  assignedEmployeeId: string | null;
  assignedEmployeeName?: string;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function getLeadsAction(params: {
  search?: string;
  status?: string;
  source?: string;
} = {}): Promise<ActionResult<{ leads: SerializedLead[]; canManageAll: boolean }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const scope = await getCrmUserScope(user);
    const { search = "", status = "ALL", source = "ALL" } = params;

    const where: Prisma.LeadWhereInput = {};

    // RBAC Scoping: Sales TMs only see leads assigned to or created by them; TLs see team; Admins see all
    if (!scope.canViewAll && scope.allowedUserIds) {
      where.OR = [
        { createdById: { in: scope.allowedUserIds } },
        { assignedEmployeeId: { in: scope.allowedUserIds } },
      ];
    }

    if (status && status !== "ALL") {
      where.status = status as LeadStatus;
    }
    if (source && source !== "ALL") {
      where.source = source;
    }

    if (search.trim()) {
      const q = search.trim();
      const searchConditions: Prisma.LeadWhereInput[] = [
        { name: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
        { email: { contains: q, mode: "insensitive" } },
        { companyName: { contains: q, mode: "insensitive" } },
        { leadNumber: { contains: q, mode: "insensitive" } },
      ];

      if (where.OR) {
        where.AND = [{ OR: searchConditions }];
      } else {
        where.OR = searchConditions;
      }
    }

    const leads = await db.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        assignedEmployee: { select: { firstName: true, lastName: true } },
      },
    });

    const serialized: SerializedLead[] = leads.map((l) => ({
      id: l.id,
      leadNumber: l.leadNumber,
      name: l.name,
      email: l.email,
      phone: l.phone,
      companyName: l.companyName,
      source: l.source,
      status: l.status,
      notes: l.notes,
      estimatedBudget: l.estimatedBudget ? Number(l.estimatedBudget) : 0,
      assignedEmployeeId: l.assignedEmployeeId,
      assignedEmployeeName: l.assignedEmployee
        ? `${l.assignedEmployee.firstName} ${l.assignedEmployee.lastName}`.trim()
        : undefined,
      createdById: l.createdById,
      createdAt: l.createdAt.toISOString(),
      updatedAt: l.updatedAt.toISOString(),
    }));

    return {
      success: true,
      data: { leads: serialized, canManageAll: scope.canManageAll },
    };
  } catch (error: any) {
    console.error("[getLeadsAction Error]:", error);
    return { success: false, error: error.message || "Failed to fetch leads." };
  }
}

export async function createLeadAction(
  raw: LeadFormData
): Promise<ActionResult<SerializedLead>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const parsed = leadSchema.parse(raw);

    const count = await db.lead.count();
    const leadNumber = `LEAD-${String(count + 1).padStart(4, "0")}`;

    const lead = await db.lead.create({
      data: {
        leadNumber,
        name: parsed.name,
        phone: parsed.phone,
        email: parsed.email || null,
        companyName: parsed.companyName || null,
        source: parsed.source,
        status: parsed.status,
        notes: parsed.notes || null,
        estimatedBudget: parsed.estimatedBudget
          ? new Prisma.Decimal(parsed.estimatedBudget)
          : null,
        assignedEmployeeId: parsed.assignedEmployeeId || user.id,
        createdById: user.id,
      },
      include: {
        assignedEmployee: { select: { firstName: true, lastName: true } },
      },
    });

    revalidatePath("/crm/leads");
    return {
      success: true,
      data: {
        ...lead,
        estimatedBudget: lead.estimatedBudget ? Number(lead.estimatedBudget) : 0,
        assignedEmployeeName: lead.assignedEmployee
          ? `${lead.assignedEmployee.firstName} ${lead.assignedEmployee.lastName}`.trim()
          : undefined,
        createdAt: lead.createdAt.toISOString(),
        updatedAt: lead.updatedAt.toISOString(),
      },
    };
  } catch (error: any) {
    console.error("[createLeadAction Error]:", error);
    return { success: false, error: error.message || "Failed to create lead." };
  }
}

export async function updateLeadAction(
  id: string,
  raw: LeadFormData
): Promise<ActionResult<SerializedLead>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const existing = await db.lead.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "Lead not found." };

    const scope = await getCrmUserScope(user);
    if (!canUserModifyRecord(scope, existing.createdById, existing.assignedEmployeeId)) {
      return { success: false, error: "You do not have permission to edit this lead." };
    }

    const parsed = leadSchema.parse(raw);

    const updated = await db.lead.update({
      where: { id },
      data: {
        name: parsed.name,
        phone: parsed.phone,
        email: parsed.email || null,
        companyName: parsed.companyName || null,
        source: parsed.source,
        status: parsed.status,
        notes: parsed.notes || null,
        estimatedBudget: parsed.estimatedBudget
          ? new Prisma.Decimal(parsed.estimatedBudget)
          : null,
        assignedEmployeeId: parsed.assignedEmployeeId || existing.assignedEmployeeId,
      },
      include: {
        assignedEmployee: { select: { firstName: true, lastName: true } },
      },
    });

    revalidatePath("/crm/leads");
    return {
      success: true,
      data: {
        ...updated,
        estimatedBudget: updated.estimatedBudget ? Number(updated.estimatedBudget) : 0,
        assignedEmployeeName: updated.assignedEmployee
          ? `${updated.assignedEmployee.firstName} ${updated.assignedEmployee.lastName}`.trim()
          : undefined,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    };
  } catch (error: any) {
    console.error("[updateLeadAction Error]:", error);
    return { success: false, error: error.message || "Failed to update lead." };
  }
}

export async function deleteLeadAction(id: string): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const existing = await db.lead.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "Lead not found." };

    const scope = await getCrmUserScope(user);
    if (!canUserModifyRecord(scope, existing.createdById, existing.assignedEmployeeId)) {
      return { success: false, error: "You do not have permission to delete this lead." };
    }

    await db.lead.delete({ where: { id } });
    revalidatePath("/crm/leads");
    return { success: true };
  } catch (error: any) {
    console.error("[deleteLeadAction Error]:", error);
    return { success: false, error: error.message || "Failed to delete lead." };
  }
}

export async function bulkUploadLeadsAction(
  records: LeadFormData[]
): Promise<ActionResult<{ insertedCount: number; errors?: string[] }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    let insertedCount = 0;
    const errors: string[] = [];
    let currentTotal = await db.lead.count();

    for (let i = 0; i < records.length; i++) {
      try {
        const parsed = leadSchema.parse(records[i]);
        currentTotal++;
        const leadNumber = `LEAD-${String(currentTotal).padStart(4, "0")}`;

        await db.lead.create({
          data: {
            leadNumber,
            name: parsed.name,
            phone: parsed.phone,
            email: parsed.email || null,
            companyName: parsed.companyName || null,
            source: parsed.source,
            status: parsed.status,
            notes: parsed.notes || null,
            estimatedBudget: parsed.estimatedBudget
              ? new Prisma.Decimal(parsed.estimatedBudget)
              : null,
            assignedEmployeeId: user.id,
            createdById: user.id,
          },
        });
        insertedCount++;
      } catch (err: any) {
        errors.push(`Row ${i + 1}: ${err.message || "Failed to import lead"}`);
      }
    }

    revalidatePath("/crm/leads");
    return {
      success: true,
      data: { insertedCount, errors: errors.length > 0 ? errors : undefined },
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Bulk upload failed." };
  }
}

// ==========================================
// 5. HELPER ACTIONS (EMPLOYEES & COMPANIES LIST)
// ==========================================

export async function getCrmOptionsAction(): Promise<
  ActionResult<{
    employees: { id: string; name: string; department: string }[];
    companies: { id: string; name: string }[];
  }>
> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const employees = await db.employee.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true, department: true },
      orderBy: { firstName: "asc" },
    });

    const companies = await db.company.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    return {
      success: true,
      data: {
        employees: employees.map((e) => ({
          id: e.id,
          name: `${e.firstName} ${e.lastName}`.trim(),
          department: e.department,
        })),
        companies,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to load CRM options." };
  }
}
