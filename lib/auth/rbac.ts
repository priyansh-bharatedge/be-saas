import { db } from "@/lib/db";
import { Role, SystemRole } from "@prisma/client";
import { AuthUser } from "@/lib/auth/session";

export { DEPARTMENTS, type Department, isValidDepartment } from "@/lib/constants/departments";

export type ModuleCode = "crm" | "hrms" | "support" | "chat";

export type Permission =
  | "admin:full_access"
  | "crm:read"
  | "crm:write"
  | "crm:manage_deals"
  | "crm:workflows"
  | "crm:operations"
  | "crm:verify_payments"
  | "crm:legal_review"
  | "crm:quality_audit"
  | "hrms:read"
  | "hrms:write"
  | "hrms:manage_attendance"
  | "hrms:access_control"
  | "hrms:approve_leave_tl"
  | "hrms:approve_leave_hr"
  | "support:read"
  | "support:reply"
  | "support:assign"
  | "quality:audit"
  | "quality:escalate";

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.Admin]: [
    "admin:full_access",
    "crm:read",
    "crm:write",
    "crm:manage_deals",
    "crm:workflows",
    "crm:operations",
    "crm:verify_payments",
    "crm:legal_review",
    "crm:quality_audit",
    "hrms:read",
    "hrms:write",
    "hrms:manage_attendance",
    "hrms:access_control",
    "hrms:approve_leave_tl",
    "hrms:approve_leave_hr",
    "support:read",
    "support:reply",
    "support:assign",
    "quality:audit",
    "quality:escalate",
  ],
  [Role.CRM]: [
    "crm:read",
    "crm:write",
    "crm:manage_deals",
    "crm:workflows",
    "hrms:read",
    "hrms:manage_attendance",
    "support:read",
    "support:reply",
  ],
  [Role.HRMS]: [
    "hrms:read",
    "hrms:write",
    "hrms:manage_attendance",
    "hrms:access_control",
    "hrms:approve_leave_hr",
    "support:read",
    "support:reply",
  ],
  [Role.Support]: [
    "support:read",
    "support:reply",
    "support:assign",
    "quality:audit",
    "quality:escalate",
    "hrms:read",
    "hrms:manage_attendance",
  ],
};

export interface UserScopeFilter {
  currentUserId: string;
  role: Role;
  systemRole: SystemRole;
  department: string;
  isSuperAdmin: boolean;
  isHrAdmin: boolean;
  isHod: boolean;
  isTl: boolean;
  isTm: boolean;
  canViewAll: boolean;
  canManageAll: boolean;
  allowedEmployeeIds: string[] | null; // null = unrestricted / all records
  departmentEmployeeIds: string[];
  subordinateIds: string[];
}

/**
 * Resolves all direct and indirect subordinate employee IDs reporting under a given Team Leader (TL)
 * or all employee IDs belonging to a given Department (for HOD).
 */
export async function resolveSubordinateIds(
  employeeId: string,
  department?: string
): Promise<{ subordinateIds: string[]; departmentEmployeeIds: string[] }> {
  try {
    const [subordinates, deptStaff] = await Promise.all([
      db.employee.findMany({
        where: {
          OR: [
            { teamLeaderId: employeeId },
            { reportingManagerId: employeeId },
          ],
        },
        select: { id: true },
      }),
      department
        ? db.employee.findMany({
            where: {
              department: { equals: department, mode: "insensitive" },
            },
            select: { id: true },
          })
        : Promise.resolve([]),
    ]);

    const subordinateIds = Array.from(new Set(subordinates.map((s) => s.id)));
    const departmentEmployeeIds = Array.from(new Set(deptStaff.map((d) => d.id)));

    return { subordinateIds, departmentEmployeeIds };
  } catch (err) {
    console.error("[resolveSubordinateIds Error]:", err);
    return { subordinateIds: [], departmentEmployeeIds: [] };
  }
}

/**
 * Central Policy Utility: Generates exact Prisma query scoping filter based on the
 * unified Employee systemRole, department, and reporting hierarchy.
 */
export async function getScopeFilter(
  user: AuthUser | null,
  domain: "crm" | "hrms" | "support"
): Promise<UserScopeFilter> {
  const fallbackScope: UserScopeFilter = {
    currentUserId: "",
    role: Role.HRMS,
    systemRole: SystemRole.TEAM_MEMBER,
    department: "",
    isSuperAdmin: false,
    isHrAdmin: false,
    isHod: false,
    isTl: false,
    isTm: true,
    canViewAll: false,
    canManageAll: false,
    allowedEmployeeIds: [],
    departmentEmployeeIds: [],
    subordinateIds: [],
  };

  if (!user || !user.id) return fallbackScope;

  // Retrieve fresh employee record for active hierarchy resolution
  const employee = await db.employee.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      role: true,
      systemRole: true,
      department: true,
      teamLeaderId: true,
      reportingManagerId: true,
    },
  });

  const role = employee?.role || user.role;
  const systemRole = employee?.systemRole || user.systemRole || SystemRole.TEAM_MEMBER;
  const dept = (employee?.department || user.department || "").trim();
  const deptLower = dept.toLowerCase();

  const isSuperAdmin = role === Role.Admin || systemRole === SystemRole.SUPER_ADMIN;
  const isHrAdmin = isSuperAdmin || systemRole === SystemRole.HR_ADMIN || deptLower.includes("hr");
  const isHod = isSuperAdmin || systemRole === SystemRole.ADMIN_HOD;
  const isTl = systemRole === SystemRole.TEAM_LEADER;
  const isTm = !isSuperAdmin && !isHod && !isTl && !isHrAdmin;

  // Resolve hierarchy subordinates & department colleagues
  const { subordinateIds, departmentEmployeeIds } = await resolveSubordinateIds(
    user.id,
    dept
  );

  // 1. SUPER ADMIN: Unrestricted access across CRM, HRMS, and Support
  if (isSuperAdmin) {
    return {
      currentUserId: user.id,
      role,
      systemRole,
      department: dept,
      isSuperAdmin: true,
      isHrAdmin: true,
      isHod: true,
      isTl: false,
      isTm: false,
      canViewAll: true,
      canManageAll: true,
      allowedEmployeeIds: null, // Unrestricted
      departmentEmployeeIds,
      subordinateIds,
    };
  }

  // 2. DOMAIN SPECIFIC SCOPING
  switch (domain) {
    case "crm": {
      // Accounts and Quality departments have full view of all CRM data for financial & compliance auditing
      if (deptLower.includes("account") || deptLower.includes("quality")) {
        return {
          currentUserId: user.id,
          role,
          systemRole,
          department: dept,
          isSuperAdmin: false,
          isHrAdmin: false,
          isHod,
          isTl,
          isTm,
          canViewAll: true,
          canManageAll: isHod || deptLower.includes("account"),
          allowedEmployeeIds: null,
          departmentEmployeeIds,
          subordinateIds,
        };
      }

      // Legal department: Deals reaching legal and beyond
      if (deptLower.includes("legal")) {
        return {
          currentUserId: user.id,
          role,
          systemRole,
          department: dept,
          isSuperAdmin: false,
          isHrAdmin: false,
          isHod,
          isTl,
          isTm,
          canViewAll: true,
          canManageAll: isHod,
          allowedEmployeeIds: null,
          departmentEmployeeIds,
          subordinateIds,
        };
      }

      // Operations HOD: Full visibility of CRM + Operations
      if (deptLower.includes("operation") && isHod) {
        return {
          currentUserId: user.id,
          role,
          systemRole,
          department: dept,
          isSuperAdmin: false,
          isHrAdmin: false,
          isHod: true,
          isTl: false,
          isTm: false,
          canViewAll: true,
          canManageAll: true,
          allowedEmployeeIds: null,
          departmentEmployeeIds,
          subordinateIds,
        };
      }

      // Sales HOD: All Sales department records
      if (deptLower.includes("sales") && isHod) {
        return {
          currentUserId: user.id,
          role,
          systemRole,
          department: dept,
          isSuperAdmin: false,
          isHrAdmin: false,
          isHod: true,
          isTl: false,
          isTm: false,
          canViewAll: false,
          canManageAll: true,
          allowedEmployeeIds: Array.from(new Set([user.id, ...departmentEmployeeIds])),
          departmentEmployeeIds,
          subordinateIds,
        };
      }

      // Team Leaders (Sales TL / Operations TL / Other TL):
      // Own data + all direct team members' records
      if (isTl) {
        const teamScope = Array.from(new Set([user.id, ...subordinateIds]));
        return {
          currentUserId: user.id,
          role,
          systemRole,
          department: dept,
          isSuperAdmin: false,
          isHrAdmin: false,
          isHod: false,
          isTl: true,
          isTm: false,
          canViewAll: false,
          canManageAll: false,
          allowedEmployeeIds: teamScope,
          departmentEmployeeIds,
          subordinateIds,
        };
      }

      // Team Members (BDM / CDM / Ops TM):
      // Restricted exclusively to own data and 50% partner deals
      return {
        currentUserId: user.id,
        role,
        systemRole,
        department: dept,
        isSuperAdmin: false,
        isHrAdmin: false,
        isHod: false,
        isTl: false,
        isTm: true,
        canViewAll: false,
        canManageAll: false,
        allowedEmployeeIds: [user.id],
        departmentEmployeeIds,
        subordinateIds: [],
      };
    }

    case "hrms": {
      // HR Admin / Super Admin: Full administrative access across all departments
      if (isHrAdmin) {
        return {
          currentUserId: user.id,
          role,
          systemRole,
          department: dept,
          isSuperAdmin: false,
          isHrAdmin: true,
          isHod,
          isTl,
          isTm,
          canViewAll: true,
          canManageAll: true,
          allowedEmployeeIds: null, // Full company directory
          departmentEmployeeIds,
          subordinateIds,
        };
      }

      // Department HOD: Own data + entire department hierarchy & attendance
      if (isHod) {
        const deptScope = Array.from(new Set([user.id, ...departmentEmployeeIds]));
        return {
          currentUserId: user.id,
          role,
          systemRole,
          department: dept,
          isSuperAdmin: false,
          isHrAdmin: false,
          isHod: true,
          isTl: false,
          isTm: false,
          canViewAll: false,
          canManageAll: false,
          allowedEmployeeIds: deptScope,
          departmentEmployeeIds,
          subordinateIds,
        };
      }

      // Team Leader: Own data + direct team members (Tier-1 leave approval)
      if (isTl) {
        const teamScope = Array.from(new Set([user.id, ...subordinateIds]));
        return {
          currentUserId: user.id,
          role,
          systemRole,
          department: dept,
          isSuperAdmin: false,
          isHrAdmin: false,
          isHod: false,
          isTl: true,
          isTm: false,
          canViewAll: false,
          canManageAll: false,
          allowedEmployeeIds: teamScope,
          departmentEmployeeIds,
          subordinateIds,
        };
      }

      // Team Member: Own data only
      return {
        currentUserId: user.id,
        role,
        systemRole,
        department: dept,
        isSuperAdmin: false,
        isHrAdmin: false,
        isHod: false,
        isTl: false,
        isTm: true,
        canViewAll: false,
        canManageAll: false,
        allowedEmployeeIds: [user.id],
        departmentEmployeeIds,
        subordinateIds: [],
      };
    }

    case "support": {
      // Quality Department: Full Support Desk management across all tickets
      if (deptLower.includes("quality")) {
        return {
          currentUserId: user.id,
          role,
          systemRole,
          department: dept,
          isSuperAdmin: false,
          isHrAdmin: false,
          isHod,
          isTl,
          isTm,
          canViewAll: true,
          canManageAll: true,
          allowedEmployeeIds: null,
          departmentEmployeeIds,
          subordinateIds,
        };
      }

      // Legal Department: Full Support Desk ticket visibility for cross-departmental coordination & compliance
      if (deptLower.includes("legal")) {
        return {
          currentUserId: user.id,
          role,
          systemRole,
          department: dept,
          isSuperAdmin: false,
          isHrAdmin: false,
          isHod,
          isTl,
          isTm,
          canViewAll: true,
          canManageAll: isHod,
          allowedEmployeeIds: null,
          departmentEmployeeIds,
          subordinateIds,
        };
      }

      // Department HOD: Tickets raised by their department staff
      if (isHod) {
        const deptScope = Array.from(new Set([user.id, ...departmentEmployeeIds]));
        return {
          currentUserId: user.id,
          role,
          systemRole,
          department: dept,
          isSuperAdmin: false,
          isHrAdmin: false,
          isHod: true,
          isTl: false,
          isTm: false,
          canViewAll: false,
          canManageAll: false,
          allowedEmployeeIds: deptScope,
          departmentEmployeeIds,
          subordinateIds,
        };
      }

      // Team Leader: Tickets raised by themselves or team members
      if (isTl) {
        const teamScope = Array.from(new Set([user.id, ...subordinateIds]));
        return {
          currentUserId: user.id,
          role,
          systemRole,
          department: dept,
          isSuperAdmin: false,
          isHrAdmin: false,
          isHod: false,
          isTl: true,
          isTm: false,
          canViewAll: false,
          canManageAll: false,
          allowedEmployeeIds: teamScope,
          departmentEmployeeIds,
          subordinateIds,
        };
      }

      // Team Member: Own raised tickets only
      return {
        currentUserId: user.id,
        role,
        systemRole,
        department: dept,
        isSuperAdmin: false,
        isHrAdmin: false,
        isHod: false,
        isTl: false,
        isTm: true,
        canViewAll: false,
        canManageAll: false,
        allowedEmployeeIds: [user.id],
        departmentEmployeeIds,
        subordinateIds: [],
      };
    }
  }
}

/**
 * Checks if a user has access to one of the 3 primary SaaS gateways (CRM, HRMS, Support Desk).
 * Supports both AuthUser object and legacy Role enum string for zero-breakage compatibility.
 */
export function canAccessModule(
  userOrRole: AuthUser | Role | null,
  module: ModuleCode | string
): boolean {
  if (!userOrRole) return false;

  // Legacy Role overload
  if (typeof userOrRole === "string") {
    const role = userOrRole as Role;
    if (role === Role.Admin) return true;
    if (module === "crm") return role === Role.CRM;
    if (module === "hrms") return role === Role.HRMS;
    if (module === "support") return role === Role.Support;
    if (module === "chat") return true;
    return false;
  }

  const user = userOrRole as AuthUser;
  const role = user.role;
  const systemRole = user.systemRole;
  const dept = (user.department || "").toLowerCase();

  // Super Admin has unrestricted access to all products
  if (role === Role.Admin || systemRole === SystemRole.SUPER_ADMIN) {
    return true;
  }

  // Team Chat is accessible to all authenticated company employees
  if (module === "chat" || module.startsWith("/chat")) {
    return true;
  }

  // Gateway product access matrix
  if (module === "crm" || module.startsWith("/crm")) {
    // Critical restriction: Internal operations route is strictly blocked for Sales department
    if (module === "/crm/operations" && dept.includes("sales")) {
      return false;
    }
    // Sales, Operations, Accounts, Quality, Legal have CRM access
    return (
      dept.includes("sales") ||
      dept.includes("operation") ||
      dept.includes("account") ||
      dept.includes("quality") ||
      dept.includes("legal") ||
      role === Role.CRM
    );
  }

  if (module === "hrms" || module.startsWith("/hrms")) {
    // All active employees have HRMS self-service access (Clock In/Out, Profile, Leaves, Calendar)
    return true;
  }

  if (module === "support" || module.startsWith("/support")) {
    // Quality dept administers Support; all other employees can access Support Desk to raise/view tickets
    return true;
  }

  return false;
}

/**
 * Checks whether the user is permitted to onboard / create new employees.
 * Strictly restricted to:
 * - Super Admin (Role.Admin or SystemRole.SUPER_ADMIN)
 * - HR Admin (SystemRole.HR_ADMIN)
 * - HR Department HOD (SystemRole.ADMIN_HOD in "HR" department)
 * Strictly BLOCKED for all other roles and departments (Sales HOD, Ops HOD, Accounts HOD, TLs, TMs, etc.)
 */
export function canCreateEmployee(user: AuthUser | null): boolean {
  if (!user || !user.id) return false;

  const isSuperAdmin =
    user.role === Role.Admin || user.systemRole === SystemRole.SUPER_ADMIN;
  if (isSuperAdmin) return true;

  const isHrAdmin = user.systemRole === SystemRole.HR_ADMIN;
  if (isHrAdmin) return true;

  const dept = (user.department || "").trim().toLowerCase();
  const isHrHod =
    user.systemRole === SystemRole.ADMIN_HOD &&
    (dept === "hr" || dept === "human resources" || dept.includes("hr"));

  return Boolean(isHrHod);
}

/**
 * Checks whether the user has HR Administrator or Super Admin authority across HRMS.
 * True for:
 * - Super Admin (Role.Admin or SystemRole.SUPER_ADMIN)
 * - HR Admin (SystemRole.HR_ADMIN)
 * - HR Department HOD / HR Members
 */
export function isHrAdminRole(user: AuthUser | null): boolean {
  if (!user || !user.id) return false;

  const isSuperAdmin =
    user.role === Role.Admin || user.systemRole === SystemRole.SUPER_ADMIN;
  if (isSuperAdmin) return true;

  const isHrAdmin = user.systemRole === SystemRole.HR_ADMIN;
  if (isHrAdmin) return true;

  const dept = (user.department || "").trim().toLowerCase();
  const isHrDept = dept === "hr" || dept === "human resources" || dept.includes("hr");
  if (isHrDept && (user.systemRole === SystemRole.ADMIN_HOD || user.role === Role.HRMS)) {
    return true;
  }

  return false;
}

/**
 * Validates whether the user has permission to modify or delete a record based on ownership/scoping
 */
export function canModifyRecord(
  scope: UserScopeFilter,
  ownerEmployeeId?: string | null,
  partnerEmployeeId?: string | null
): boolean {
  if (scope.canManageAll) return true;
  if (!scope.allowedEmployeeIds) return true;

  if (ownerEmployeeId && scope.allowedEmployeeIds.includes(ownerEmployeeId)) {
    return true;
  }
  if (partnerEmployeeId && scope.allowedEmployeeIds.includes(partnerEmployeeId)) {
    return true;
  }

  return false;
}

/**
 * Checks if a user role has an explicit permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  if (role === Role.Admin) {
    return true;
  }
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission) || permissions.includes("admin:full_access");
}

export interface ModuleGatewayConfig {
  code: ModuleCode;
  title: string;
  tagline: string;
  badge: string;
  href: string;
  requiredRole: string;
  accentColor: string;
}

export const MODULE_GATEWAYS: Record<ModuleCode, ModuleGatewayConfig> = {
  crm: {
    code: "crm",
    title: "Customer Relationship Management",
    tagline: "Pipelines, Lead Automation & Deal Workflows",
    badge: "SALES & REVENUE",
    href: "/crm",
    requiredRole: "Sales, Account, Legal, Operation, Quality",
    accentColor: "#F0944D", // Brand orange
  },
  hrms: {
    code: "hrms",
    title: "Human Resource Management",
    tagline: "Workforce Directory, Attendance & Hierarchy",
    badge: "PEOPLE & TALENT",
    href: "/hrms",
    requiredRole: "All Employees (Self-Service & Admin)",
    accentColor: "#ACCAD5", // Brand cyan
  },
  support: {
    code: "support",
    title: "Customer Support Desk & Quality",
    tagline: "Omnichannel Ticketing & Quality Department Oversight",
    badge: "SERVICE & QA",
    href: "/support",
    requiredRole: "Quality Dept & Employee Requests",
    accentColor: "#C66318", // Dark orange / amber
  },
  chat: {
    code: "chat",
    title: "Team Chat & Collaboration",
    tagline: "Real-time 1-on-1 Direct Messaging & Departmental Groups",
    badge: "INTERNAL COLLAB",
    href: "/chat",
    requiredRole: "All Employees (Enterprise Wide)",
    accentColor: "#588594",
  },
};
