import { auth } from "@/auth";
import { Role, SystemRole } from "@prisma/client";
import { db } from "@/lib/db";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  systemRole?: SystemRole;
  jobTitle?: string;
  avatarUrl?: string;
  employeeId?: string;
  department?: string;
  teamLeaderId?: string | null;
  reportingManagerId?: string | null;
  isPasswordSet?: boolean;
}

/**
 * Retrieves the current authenticated user session from NextAuth v5
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const session = await auth();
    if (session?.user?.email) {
      const employee = await db.employee.findUnique({
        where: { workEmail: session.user.email },
      });

      const fullName = employee
        ? `${employee.firstName} ${employee.lastName}`.trim()
        : session.user.name || session.user.email.split("@")[0];

      return {
        id: employee?.id || session.user.id || "",
        email: session.user.email,
        name: fullName,
        role: employee?.role || (session.user as { role: Role }).role || Role.HRMS,
        systemRole: employee?.systemRole || session.user.systemRole,
        jobTitle: employee?.designation || employee?.jobTitle || undefined,
        avatarUrl: employee?.avatarUrl ?? undefined,
        employeeId: employee?.employeeId,
        department: employee?.department || session.user.department || undefined,
        teamLeaderId: employee?.teamLeaderId || session.user.teamLeaderId || null,
        reportingManagerId: employee?.reportingManagerId || session.user.reportingManagerId || null,
        isPasswordSet: employee?.isPasswordSet ?? (session.user as any).isPasswordSet ?? false,
      };
    }
  } catch (err) {
    if ((err as { digest?: string })?.digest === "DYNAMIC_SERVER_USAGE") {
      throw err;
    }
    console.error("Error retrieving current user session:", err);
  }

  return null;
}
