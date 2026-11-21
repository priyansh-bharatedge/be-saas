import { AuthUser } from "@/lib/auth/session";
import { getScopeFilter, canModifyRecord, UserScopeFilter } from "@/lib/auth/rbac";

export interface CrmScopeResult {
  canViewAll: boolean;
  canManageAll: boolean;
  isHod: boolean;
  isTeamLeader: boolean;
  currentUserId: string;
  allowedUserIds: string[] | null; // null means unrestricted / all records
}

/**
 * Calculates the exact RBAC visibility and management scope for a user across CRM modules.
 * Delegated to the centralized Policy Utility in lib/auth/rbac.ts
 */
export async function getCrmUserScope(user: AuthUser | null): Promise<CrmScopeResult> {
  const scope = await getScopeFilter(user, "crm");
  return {
    canViewAll: scope.canViewAll,
    canManageAll: scope.canManageAll,
    isHod: scope.isHod,
    isTeamLeader: scope.isTl,
    currentUserId: scope.currentUserId,
    allowedUserIds: scope.allowedEmployeeIds,
  };
}

/**
 * Validates whether the user has permission to modify or delete a CRM record based on creator/assignee.
 */
export function canUserModifyRecord(
  scope: CrmScopeResult,
  recordCreatedById?: string | null,
  recordAssignedId?: string | null
): boolean {
  if (scope.canManageAll) return true;
  if (!scope.allowedUserIds) return true;

  if (recordCreatedById && scope.allowedUserIds.includes(recordCreatedById)) {
    return true;
  }
  if (recordAssignedId && scope.allowedUserIds.includes(recordAssignedId)) {
    return true;
  }

  return false;
}
