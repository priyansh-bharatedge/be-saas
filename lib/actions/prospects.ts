"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getCrmUserScope } from "@/lib/auth/crm-scope";
import { LeadStatus } from "@prisma/client";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SerializedProspectColumn {
  id: string;
  tabId: string | null;
  sheetId: string | null;
  name: string;
  key: string;
  type: string;
  options: string[] | null;
  order: number;
  isRequired: boolean;
  isSystem: boolean;
  width: number;
}

export interface SerializedProspectRow {
  id: string;
  sheetId: string;
  rowIndex: number;
  data: Record<string, any>;
  assignedBdmId: string | null;
  assignedBdmName?: string;
  updatedAt: string;
}

export interface SerializedProspectSheet {
  id: string;
  tabId: string;
  name: string;
  assignedBdmId: string | null;
  assignedBdmName?: string;
  order: number;
  rowsCount: number;
}

export interface SerializedProspectTab {
  id: string;
  name: string;
  teamLeaderId: string | null;
  teamLeaderName?: string;
  order: number;
  isActive: boolean;
  sheets: SerializedProspectSheet[];
}

const DEFAULT_COLUMNS = [
  { name: "Company Name", key: "company_name", type: "TEXT", width: 170 },
  { name: "Contact Person", key: "contact_person", type: "TEXT", width: 150 },
  { name: "Phone", key: "phone", type: "PHONE", width: 130 },
  { name: "Email", key: "email", type: "EMAIL", width: 160 },
  { name: "City / State", key: "location", type: "TEXT", width: 130 },
  {
    name: "Service Inquired",
    key: "service_inquired",
    type: "SELECT",
    width: 170,
    options: [
      "Company Registration",
      "GST Filing",
      "Trademark Registration",
      "ROC Annual Compliance",
      "Payroll Setup",
      "Legal Drafting",
      "Other",
    ],
  },
  { name: "Est. Budget (₹)", key: "estimated_value", type: "CURRENCY", width: 120 },
  {
    name: "Status",
    key: "status",
    type: "BADGE",
    width: 130,
    options: ["New", "Call Scheduled", "Follow Up", "Interested", "Converted", "Not Interested"],
  },
  { name: "Follow-up Date", key: "followup_date", type: "DATE", width: 130 },
  { name: "Notes & Context", key: "notes", type: "TEXT", width: 220 },
];

/**
 * Initializes or retrieves all prospect tabs, sheets, active columns, and rows with RBAC enforcement
 */
export async function getProspectsDataAction(params: {
  selectedTabId?: string;
  selectedSheetId?: string;
} = {}): Promise<
  ActionResult<{
    tabs: SerializedProspectTab[];
    activeTab: SerializedProspectTab | null;
    activeSheet: SerializedProspectSheet | null;
    columns: SerializedProspectColumn[];
    rows: SerializedProspectRow[];
    canManageSchema: boolean;
    canManageTabs: boolean;
    availableEmployees: { id: string; name: string; department: string }[];
  }>
> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const scope = await getCrmUserScope(user);

    // Ensure at least one default TL tab exists if the database is fresh
    let tabsCount = await db.prospectTab.count();
    if (tabsCount === 0) {
      const adminEmployee = await db.employee.findFirst({
        where: { role: "Admin" },
      });

      const initialTab = await db.prospectTab.create({
        data: {
          name: "Direct Sales Team",
          teamLeaderId: adminEmployee?.id || user.id,
          order: 0,
          isActive: true,
        },
      });

      // Create default columns for this tab
      for (let i = 0; i < DEFAULT_COLUMNS.length; i++) {
        const col = DEFAULT_COLUMNS[i];
        await db.prospectColumn.create({
          data: {
            tabId: initialTab.id,
            name: col.name,
            key: col.key,
            type: col.type,
            options: col.options || undefined,
            order: i,
            width: col.width,
            isSystem: i < 4,
          },
        });
      }

      // Create default sub-sheet
      const initialSheet = await db.prospectSheet.create({
        data: {
          tabId: initialTab.id,
          name: "Sales Master Sheet",
          assignedBdmId: user.id,
          order: 0,
        },
      });

      // Insert 2 demo rows
      await db.prospectRow.createMany({
        data: [
          {
            sheetId: initialSheet.id,
            rowIndex: 0,
            assignedBdmId: user.id,
            data: {
              company_name: "Apex Logistics India",
              contact_person: "Manoj Agrawal",
              phone: "9825091234",
              email: "manoj@apexlogistics.in",
              location: "Ahmedabad, Gujarat",
              service_inquired: "Company Registration",
              estimated_value: "45000",
              status: "Interested",
              followup_date: "2026-11-25",
              notes: "Interested in Private Limited incorporation + Trademark TM-A filing.",
            },
          },
          {
            sheetId: initialSheet.id,
            rowIndex: 1,
            assignedBdmId: user.id,
            data: {
              company_name: "BlueSky Digital Labs",
              contact_person: "Neha Parekh",
              phone: "9876501234",
              email: "neha@blueskylabs.co",
              location: "Surat, Gujarat",
              service_inquired: "ROC Annual Compliance",
              estimated_value: "30000",
              status: "Call Scheduled",
              followup_date: "2026-11-23",
              notes: "Annual ROC compliance due next week. Follow up with quotation.",
            },
          },
        ],
      });
    }

    // Fetch all active tabs with nested sheets
    const tabs = await db.prospectTab.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
      include: {
        teamLeader: { select: { firstName: true, lastName: true } },
        sheets: {
          orderBy: { order: "asc" },
          include: {
            assignedBdm: { select: { firstName: true, lastName: true } },
            _count: { select: { rows: true } },
          },
        },
      },
    });

    // RBAC Filter Tabs and Sheets:
    // HOD/Admins: see all tabs and sheets
    // TLs: see their own tab and their team's sheets
    // TMs: see only tabs where they have an assigned sheet, and within that tab, only their assigned sheet
    const isHodOrAdmin = scope.canViewAll || scope.canManageAll || scope.isHod;
    let filteredTabs = tabs;
    if (!isHodOrAdmin) {
      if (scope.isTeamLeader) {
        filteredTabs = tabs.filter(
          (t) =>
            t.teamLeaderId === user.id ||
            t.sheets.some((s) => scope.allowedUserIds?.includes(s.assignedBdmId || ""))
        );
      } else {
        // TM (BDM/CDM)
        filteredTabs = tabs
          .map((tab) => ({
            ...tab,
            sheets: tab.sheets.filter((s) => s.assignedBdmId === user.id),
          }))
          .filter((tab) => tab.sheets.length > 0);
      }
    }

    const serializedTabs: SerializedProspectTab[] = filteredTabs.map((t) => ({
      id: t.id,
      name: t.name,
      teamLeaderId: t.teamLeaderId,
      teamLeaderName: t.teamLeader
        ? `${t.teamLeader.firstName} ${t.teamLeader.lastName}`.trim()
        : "Unassigned",
      order: t.order,
      isActive: t.isActive,
      sheets: t.sheets.map((s) => ({
        id: s.id,
        tabId: s.tabId,
        name: s.name,
        assignedBdmId: s.assignedBdmId,
        assignedBdmName: s.assignedBdm
          ? `${s.assignedBdm.firstName} ${s.assignedBdm.lastName}`.trim()
          : "Unassigned",
        order: s.order,
        rowsCount: s._count.rows,
      })),
    }));

    // Determine Active Tab and Sheet
    let activeTab: SerializedProspectTab | null = null;
    if (params.selectedTabId) {
      activeTab = serializedTabs.find((t) => t.id === params.selectedTabId) || null;
    }
    if (!activeTab && serializedTabs.length > 0) {
      activeTab = serializedTabs[0];
    }

    let activeSheet: SerializedProspectSheet | null = null;
    if (activeTab && activeTab.sheets.length > 0) {
      if (params.selectedSheetId) {
        activeSheet = activeTab.sheets.find((s) => s.id === params.selectedSheetId) || null;
      }
      if (!activeSheet) {
        activeSheet = activeTab.sheets[0];
      }
    }

    // Fetch Columns for the Active Tab
    let columns: SerializedProspectColumn[] = [];
    if (activeTab) {
      const dbColumns = await db.prospectColumn.findMany({
        where: { tabId: activeTab.id },
        orderBy: { order: "asc" },
      });

      // If tab has no columns yet, seed defaults
      if (dbColumns.length === 0) {
        for (let i = 0; i < DEFAULT_COLUMNS.length; i++) {
          const col = DEFAULT_COLUMNS[i];
          const created = await db.prospectColumn.create({
            data: {
              tabId: activeTab.id,
              name: col.name,
              key: col.key,
              type: col.type,
              options: col.options || undefined,
              order: i,
              width: col.width,
              isSystem: i < 4,
            },
          });
          columns.push({
            id: created.id,
            tabId: created.tabId,
            sheetId: created.sheetId,
            name: created.name,
            key: created.key,
            type: created.type,
            options: (created.options as string[]) || null,
            order: created.order,
            isRequired: created.isRequired,
            isSystem: created.isSystem,
            width: created.width,
          });
        }
      } else {
        columns = dbColumns.map((c) => ({
          id: c.id,
          tabId: c.tabId,
          sheetId: c.sheetId,
          name: c.name,
          key: c.key,
          type: c.type,
          options: (c.options as string[]) || null,
          order: c.order,
          isRequired: c.isRequired,
          isSystem: c.isSystem,
          width: c.width,
        }));
      }
    }

    // Fetch Rows for the Active Sheet
    let rows: SerializedProspectRow[] = [];
    if (activeSheet) {
      const dbRows = await db.prospectRow.findMany({
        where: { sheetId: activeSheet.id },
        orderBy: { rowIndex: "asc" },
        include: {
          assignedBdm: { select: { firstName: true, lastName: true } },
        },
      });

      rows = dbRows.map((r) => ({
        id: r.id,
        sheetId: r.sheetId,
        rowIndex: r.rowIndex,
        data: (r.data as Record<string, any>) || {},
        assignedBdmId: r.assignedBdmId,
        assignedBdmName: r.assignedBdm
          ? `${r.assignedBdm.firstName} ${r.assignedBdm.lastName}`.trim()
          : undefined,
        updatedAt: r.updatedAt.toISOString(),
      }));
    }

    // Fetch available employees for HOD assignment
    const employees = await db.employee.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true, department: true },
      orderBy: { firstName: "asc" },
    });

    return {
      success: true,
      data: {
        tabs: serializedTabs,
        activeTab,
        activeSheet,
        columns,
        rows,
        canManageSchema: isHodOrAdmin,
        canManageTabs: isHodOrAdmin,
        availableEmployees: employees.map((e) => ({
          id: e.id,
          name: `${e.firstName} ${e.lastName}`.trim(),
          department: e.department,
        })),
      },
    };
  } catch (error: any) {
    console.error("[getProspectsDataAction Error]:", error);
    return { success: false, error: error.message || "Failed to load prospects." };
  }
}

// ==========================================
// HOD TAB & SHEET MANAGEMENT
// ==========================================

export async function createProspectTabAction(
  name: string,
  teamLeaderId?: string
): Promise<ActionResult<{ tabId: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const scope = await getCrmUserScope(user);
    if (!scope.canManageAll && !scope.isHod) {
      return { success: false, error: "Only Sales Head / HOD can create Team Leader tabs." };
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      return { success: false, error: "Tab name cannot be empty." };
    }

    const duplicate = await db.prospectTab.findFirst({
      where: {
        name: { equals: trimmedName, mode: "insensitive" },
        isActive: true,
      },
    });

    if (duplicate) {
      return { success: false, error: `A TL tab with the name "${trimmedName}" already exists.` };
    }

    const order = await db.prospectTab.count();
    const tab = await db.prospectTab.create({
      data: {
        name: trimmedName,
        teamLeaderId: teamLeaderId || null,
        order,
      },
    });

    // Clone default columns into the new tab
    for (let i = 0; i < DEFAULT_COLUMNS.length; i++) {
      const col = DEFAULT_COLUMNS[i];
      await db.prospectColumn.create({
        data: {
          tabId: tab.id,
          name: col.name,
          key: col.key,
          type: col.type,
          options: col.options || undefined,
          order: i,
          width: col.width,
        },
      });
    }

    // Create a starter sheet
    await db.prospectSheet.create({
      data: {
        tabId: tab.id,
        name: "General Master Sheet",
        assignedBdmId: teamLeaderId || null,
        order: 0,
      },
    });

    revalidatePath("/crm/prospects");
    return { success: true, data: { tabId: tab.id } };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create tab." };
  }
}

export async function updateProspectTabAction({
  tabId,
  name,
  teamLeaderId,
}: {
  tabId: string;
  name: string;
  teamLeaderId?: string | null;
}): Promise<ActionResult<{ tabId: string; name: string; teamLeaderName: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const scope = await getCrmUserScope(user);
    if (!scope.canManageAll && !scope.isHod) {
      return { success: false, error: "Access Denied: Only Sales Head / HOD can edit Team Leader tabs." };
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      return { success: false, error: "Tab name cannot be empty." };
    }

    // Check for duplicate tab name excluding this tab
    const duplicate = await db.prospectTab.findFirst({
      where: {
        name: { equals: trimmedName, mode: "insensitive" },
        id: { not: tabId },
        isActive: true,
      },
    });

    if (duplicate) {
      return { success: false, error: `A TL tab with the name "${trimmedName}" already exists.` };
    }

    const updated = await db.prospectTab.update({
      where: { id: tabId },
      data: {
        name: trimmedName,
        teamLeaderId: teamLeaderId || null,
      },
      include: {
        teamLeader: { select: { firstName: true, lastName: true } },
      },
    });

    revalidatePath("/crm/prospects");

    const teamLeaderName = updated.teamLeader
      ? `${updated.teamLeader.firstName} ${updated.teamLeader.lastName}`.trim()
      : "Unassigned";

    return {
      success: true,
      data: {
        tabId: updated.id,
        name: updated.name,
        teamLeaderName,
      },
    };
  } catch (error: any) {
    console.error("[updateProspectTabAction Error]:", error);
    return { success: false, error: error.message || "Failed to update TL tab." };
  }
}

export async function deleteProspectTabAction(
  tabId: string
): Promise<ActionResult<{ success: boolean; nextTabId: string | null; nextSheetId: string | null }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const scope = await getCrmUserScope(user);
    if (!scope.canManageAll && !scope.isHod) {
      return { success: false, error: "Access Denied: Only Sales Head / HOD can delete Team Leader tabs." };
    }

    // Find next tab to switch to
    const nextTab = await db.prospectTab.findFirst({
      where: {
        id: { not: tabId },
        isActive: true,
      },
      orderBy: { order: "asc" },
      include: {
        sheets: {
          orderBy: { order: "asc" },
          take: 1,
        },
      },
    });

    // Delete tab (PostgreSQL cascades deletion to sheets, columns, and rows)
    await db.prospectTab.delete({
      where: { id: tabId },
    });

    revalidatePath("/crm/prospects");

    return {
      success: true,
      data: {
        success: true,
        nextTabId: nextTab?.id || null,
        nextSheetId: nextTab?.sheets[0]?.id || null,
      },
    };
  } catch (error: any) {
    console.error("[deleteProspectTabAction Error]:", error);
    return { success: false, error: error.message || "Failed to delete TL tab." };
  }
}

export async function createProspectSheetAction(
  tabId: string,
  name: string,
  assignedBdmId?: string
): Promise<ActionResult<{ sheetId: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const scope = await getCrmUserScope(user);
    if (!scope.canManageAll && !scope.isHod && !scope.isTeamLeader) {
      return { success: false, error: "Only HOD or Team Leaders can add BDM sub-sheets." };
    }

    const order = await db.prospectSheet.count({ where: { tabId } });
    const sheet = await db.prospectSheet.create({
      data: {
        tabId,
        name,
        assignedBdmId: assignedBdmId || null,
        order,
      },
    });

    revalidatePath("/crm/prospects");
    return { success: true, data: { sheetId: sheet.id } };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create sub-sheet." };
  }
}

export async function deleteProspectSheetAction(sheetId: string): Promise<ActionResult<{ success: boolean }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const scope = await getCrmUserScope(user);
    if (!scope.canManageAll && !scope.isHod && !scope.isTeamLeader) {
      return { success: false, error: "Only HOD or Team Leaders can delete BDM sub-sheets." };
    }

    await db.prospectSheet.delete({
      where: { id: sheetId },
    });

    revalidatePath("/crm/prospects");
    return { success: true, data: { success: true } };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete sheet." };
  }
}

// ==========================================
// HOD DYNAMIC COLUMN SCHEMA CONTROLS
// ==========================================

export async function createProspectColumnAction({
  tabId,
  name,
  type = "TEXT",
  options,
  width = 160,
}: {
  tabId: string;
  name: string;
  type?: string;
  options?: string[];
  width?: number;
}): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const scope = await getCrmUserScope(user);
    if (!scope.canManageAll) {
      return { success: false, error: "Only Sales Head / HOD can add new columns to the schema." };
    }

    const cleanKey = name.toLowerCase().replace(/[^a-z0-9]/g, "_") + "_" + Date.now().toString().slice(-4);
    const order = await db.prospectColumn.count({ where: { tabId } });

    await db.prospectColumn.create({
      data: {
        tabId,
        name,
        key: cleanKey,
        type,
        options: options && options.length > 0 ? options : undefined,
        width,
        order,
      },
    });

    revalidatePath("/crm/prospects");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create column." };
  }
}

export async function updateProspectColumnAction(
  id: string,
  { name, width, options }: { name?: string; width?: number; options?: string[] }
): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const scope = await getCrmUserScope(user);
    if (!scope.canManageAll) {
      return { success: false, error: "Only Sales Head / HOD can modify column schemas." };
    }

    await db.prospectColumn.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(typeof width === "number" ? { width } : {}),
        ...(options ? { options } : {}),
      },
    });

    revalidatePath("/crm/prospects");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update column." };
  }
}

export async function deleteProspectColumnAction(id: string): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const scope = await getCrmUserScope(user);
    if (!scope.canManageAll) {
      return { success: false, error: "Only Sales Head / HOD can delete columns." };
    }

    await db.prospectColumn.delete({ where: { id } });
    revalidatePath("/crm/prospects");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete column." };
  }
}

// ==========================================
// BDM / CDM SPREADSHEET ROW & CELL OPERATIONS
// ==========================================

export async function addProspectRowAction(
  sheetId: string,
  initialData: Record<string, any> = {}
): Promise<ActionResult<SerializedProspectRow>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const count = await db.prospectRow.count({ where: { sheetId } });
    const row = await db.prospectRow.create({
      data: {
        sheetId,
        rowIndex: count,
        data: initialData,
        assignedBdmId: user.id,
      },
      include: {
        assignedBdm: { select: { firstName: true, lastName: true } },
      },
    });

    revalidatePath("/crm/prospects");
    return {
      success: true,
      data: {
        id: row.id,
        sheetId: row.sheetId,
        rowIndex: row.rowIndex,
        data: (row.data as Record<string, any>) || {},
        assignedBdmId: row.assignedBdmId,
        assignedBdmName: row.assignedBdm
          ? `${row.assignedBdm.firstName} ${row.assignedBdm.lastName}`.trim()
          : undefined,
        updatedAt: row.updatedAt.toISOString(),
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to add row." };
  }
}

export async function updateProspectRowCellAction(
  rowId: string,
  columnKey: string,
  value: any
): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const row = await db.prospectRow.findUnique({ where: { id: rowId } });
    if (!row) return { success: false, error: "Row not found." };

    const currentData = (row.data as Record<string, any>) || {};
    const updatedData = { ...currentData, [columnKey]: value };

    await db.prospectRow.update({
      where: { id: rowId },
      data: { data: updatedData },
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to save cell value." };
  }
}

export async function deleteProspectRowAction(rowId: string): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    await db.prospectRow.delete({ where: { id: rowId } });
    revalidatePath("/crm/prospects");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete row." };
  }
}

export async function convertProspectToLeadAction(rowId: string): Promise<ActionResult<{ leadId: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const row = await db.prospectRow.findUnique({ where: { id: rowId } });
    if (!row) return { success: false, error: "Prospect row not found." };

    const data = (row.data as Record<string, any>) || {};
    const name = data.contact_person || data.company_name || "New Prospect Lead";
    const phone = data.phone || "9999999999";
    const email = data.email || null;
    const companyName = data.company_name || null;
    const notes = data.notes || `Converted from Prospect Master Sheet. Requirement: ${data.service_inquired || "N/A"}`;
    const budget = data.estimated_value ? Number(String(data.estimated_value).replace(/[^0-9.]/g, "")) : 0;

    const leadCount = await db.lead.count();
    const leadNumber = `LEAD-${String(leadCount + 1).padStart(4, "0")}`;

    const lead = await db.lead.create({
      data: {
        leadNumber,
        name,
        phone,
        email,
        companyName,
        source: "Prospect Master Sheet",
        status: LeadStatus.QUALIFIED,
        notes,
        estimatedBudget: budget > 0 ? budget : null,
        assignedEmployeeId: user.id,
        createdById: user.id,
      },
    });

    // Mark status in prospect row as Converted
    const updatedData = { ...data, status: "Converted" };
    await db.prospectRow.update({
      where: { id: rowId },
      data: { data: updatedData },
    });

    revalidatePath("/crm/prospects");
    revalidatePath("/crm/leads");
    return { success: true, data: { leadId: lead.id } };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to convert prospect to lead." };
  }
}

export async function bulkUploadProspectRowsAction(
  sheetId: string,
  records: Record<string, any>[]
): Promise<ActionResult<{ insertedCount: number }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    let count = await db.prospectRow.count({ where: { sheetId } });

    for (const rec of records) {
      count++;
      await db.prospectRow.create({
        data: {
          sheetId,
          rowIndex: count,
          data: rec,
          assignedBdmId: user.id,
        },
      });
    }

    revalidatePath("/crm/prospects");
    return { success: true, data: { insertedCount: records.length } };
  } catch (error: any) {
    return { success: false, error: error.message || "Bulk upload failed." };
  }
}
