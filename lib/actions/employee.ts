"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { employeeFormSchema, EmployeeFormData } from "@/lib/validations/employee";
import { EmployeeStatus, Language, SalaryEntity, SystemRole, Role, NotificationType, ApprovalStatus, TrackerStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { getScopeFilter, canCreateEmployee } from "@/lib/auth/rbac";
import { createNotification, notifyHRAdmins } from "@/lib/actions/notifications";
import bcrypt from "bcryptjs";
import { decryptPassword } from "@/lib/security/encryption";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Creates a new Employee record in PostgreSQL with strict validation
 */
export async function createEmployeeAction(
  formData: EmployeeFormData
): Promise<ActionResult<{ id: string; employeeId: string; name: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized. Please log in." };

    if (!canCreateEmployee(user)) {
      return {
        success: false,
        error: "Access Denied: Only HR Administrators, HR HOD, or Super Admins can onboard new staff.",
      };
    }

    const parseResult = employeeFormSchema.safeParse(formData);

    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      return {
        success: false,
        error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Validation failed",
      };
    }

    const data = parseResult.data;

    // Check for existing employeeId
    const existingId = await db.employee.findUnique({
      where: { employeeId: data.employeeId },
      select: { id: true },
    });
    if (existingId) {
      return {
        success: false,
        error: `Employee ID "${data.employeeId}" is already assigned to another staff member.`,
      };
    }

    // Check for existing work email
    const existingEmail = await db.employee.findUnique({
      where: { workEmail: data.workEmail },
      select: { id: true },
    });
    if (existingEmail) {
      return {
        success: false,
        error: `Work email "${data.workEmail}" is already registered in the system.`,
      };
    }

    // Format dates properly for PostgreSQL
    const dob = new Date(data.dateOfBirth);
    const doj = new Date(data.dateOfJoining);

    // Derive gateway access role based on department or hierarchy
    let systemAuthRole: Role = Role.HRMS;
    if (data.systemRole === SystemRole.SUPER_ADMIN) {
      systemAuthRole = Role.Admin;
    } else if (data.department === "Sales") {
      systemAuthRole = Role.CRM;
    } else if (data.department === "Account") {
      systemAuthRole = Role.CRM;
    } else if (data.department === "Legal") {
      systemAuthRole = Role.CRM;
    } else if (data.department === "Operation") {
      systemAuthRole = Role.CRM;
    } else if (data.department === "Quality") {
      systemAuthRole = Role.Support;
    } else if (data.department === "Executive Management" || data.department === "IT") {
      systemAuthRole = Role.Admin;
    } else if (data.department === "HR") {
      systemAuthRole = Role.HRMS;
    } else {
      systemAuthRole = Role.HRMS;
    }

    const employee = await db.employee.create({
      data: {
        // Authentication Credentials (First-time password setup required on first OTP login)
        passwordHash: null,
        isPasswordSet: false,
        encryptedPassword: null,
        role: systemAuthRole,
        phone: data.contactNumber.trim(),
        jobTitle: data.designation.trim(),

        // Personal Details
        firstName: data.firstName.trim(),
        middleName: data.middleName?.trim() || null,
        lastName: data.lastName.trim(),
        dateOfBirth: dob,
        gender: data.gender,
        nationality: data.nationality || "Indian",
        maritalStatus: data.maritalStatus || "Single",
        contactNumber: data.contactNumber.trim(),
        personalEmail: data.personalEmail.trim().toLowerCase(),
        permanentAddress: data.permanentAddress.trim(),
        currentAddress: data.currentAddress.trim(),

        // Education & Skills
        educationQualification: data.educationQualification.trim(),
        professionalCertifications: data.professionalCertifications?.trim() || null,
        keySkills: data.keySkills?.trim() || null,
        languagesKnown: data.languagesKnown as Language[],

        // Emergency & Family Details
        emergencyFirstName: data.emergencyFirstName.trim(),
        emergencyLastName: data.emergencyLastName.trim(),
        emergencyNumber: data.emergencyNumber.trim(),
        emergencyRelationship: data.emergencyRelationship.trim(),

        // Department & Hierarchy
        employeeId: data.employeeId.trim(),
        dateOfJoining: doj,
        department: data.department.trim(),
        designation: data.designation.trim(),
        workEmail: data.workEmail.trim().toLowerCase(),
        employmentType: data.employmentType || "Full-Time",
        previousEmployer: data.previousEmployer?.trim() || null,
        totalExperience: data.totalExperience?.trim() || null,
        branch: data.branch || "Headquarters - Ahmedabad",
        systemRole: data.systemRole as SystemRole,
        teamLeaderId: data.teamLeaderId || null,
        reportingManagerId: data.reportingManagerId || null,
        monthlyTarget: data.monthlyTarget ? Number(data.monthlyTarget) : null,

        // Bank & Statutory
        bankAccountNumber: data.bankAccountNumber.trim(),
        bankName: data.bankName.trim(),
        ifscCode: data.ifscCode.trim().toUpperCase(),
        panNumber: data.panNumber.trim().toUpperCase(),
        aadhaarNumber: data.aadhaarNumber.trim(),
        passportNumber: data.passportNumber?.trim() || null,
        drivingLicenseNumber: data.drivingLicenseNumber?.trim() || null,
        salaryEntity: (data.salaryEntity || "BSPL") as SalaryEntity,
        pfApplicable: data.pfApplicable ?? true,
        esicNumber: data.esicNumber?.trim() || null,
        uanNumber: data.uanNumber?.trim() || null,
        medicalInsuranceNumber: data.medicalInsuranceNumber?.trim() || null,

        // Documents
        passbookChequeUrl: data.passbookChequeUrl || null,
        secondaryEduProofUrl: data.secondaryEduProofUrl || null,
        graduationMarkSheetsUrl: data.graduationMarkSheetsUrl || null,
        offerRelievingLettersUrl: data.offerRelievingLettersUrl || null,
        panCardCopyUrl: data.panCardCopyUrl || null,
        addressAgeProofUrl: data.addressAgeProofUrl || null,
        bankStatementUrl: data.bankStatementUrl || null,
        salarySlipsUrl: data.salarySlipsUrl || null,
        passportPhotoUrl: data.passportPhotoUrl || null,

        status: EmployeeStatus.ACTIVE,
      },
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        workEmail: true,
      },
    });

    // Initialize Default Leave Quota for New Staff
    const currentYear = new Date().getFullYear();
    await db.leaveBalance.createMany({
      data: [
        { employeeId: employee.id, leaveType: "CASUAL", year: currentYear, allocatedDays: 12, usedDays: 0, remainingDays: 12 },
        { employeeId: employee.id, leaveType: "SICK", year: currentYear, allocatedDays: 10, usedDays: 0, remainingDays: 10 },
        { employeeId: employee.id, leaveType: "EARNED", year: currentYear, allocatedDays: 15, usedDays: 0, remainingDays: 15 },
      ],
      skipDuplicates: true,
    });

    // Send Welcome Notification
    await createNotification({
      recipientUserId: employee.id,
      title: "Welcome to BharatEdge Enterprise!",
      message: `Your staff profile (${employee.employeeId}) has been created with instant login access. You can sign in using your work email (${employee.workEmail}) via OTP or default enterprise credentials.`,
      type: NotificationType.SUCCESS,
      actionUrl: "/portal",
    });

    revalidatePath("/hrms/directory");
    revalidatePath("/hrms");

    return {
      success: true,
      data: {
        id: employee.id,
        employeeId: employee.employeeId,
        name: `${employee.firstName} ${employee.lastName}`,
      },
    };
  } catch (error) {
    console.error("Error creating employee:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to register employee.",
    };
  }
}

export interface GetEmployeesParams {
  search?: string;
  department?: string;
  systemRole?: SystemRole | "ALL";
  status?: EmployeeStatus | "ALL";
  page?: number;
  pageSize?: number;
}

/**
 * Retrieves paginated employee records with full-text search and department filtering
 */
export async function getEmployeesAction(params: GetEmployeesParams = {}) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const scope = await getScopeFilter(user, "hrms");

    const {
      search = "",
      department = "ALL",
      systemRole = "ALL",
      status = "ALL",
      page = 1,
      pageSize = 10,
    } = params;

    // Build Prisma where filter
    const whereClause: Record<string, unknown> = {};

    // Enforce strict Hierarchy Scoping
    if (!scope.canViewAll && scope.allowedEmployeeIds) {
      whereClause.id = { in: scope.allowedEmployeeIds };
    }

    if (search.trim()) {
      const q = search.trim();
      whereClause.OR = [
        { employeeId: { contains: q, mode: "insensitive" } },
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { workEmail: { contains: q, mode: "insensitive" } },
        { designation: { contains: q, mode: "insensitive" } },
        { department: { contains: q, mode: "insensitive" } },
      ];
    }

    if (department && department !== "ALL") {
      whereClause.department = department;
    }

    if (systemRole && systemRole !== "ALL") {
      whereClause.systemRole = systemRole;
    }

    if (status && status !== "ALL") {
      whereClause.status = status;
    }

    const [total, rawEmployees] = await Promise.all([
      db.employee.count({ where: whereClause }),
      db.employee.findMany({
        where: whereClause,
        orderBy: [{ createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          teamLeader: {
            select: { id: true, firstName: true, lastName: true, employeeId: true },
          },
          reportingManager: {
            select: { id: true, firstName: true, lastName: true, employeeId: true },
          },
        },
      }),
    ]);

    const isSuperAdmin = user.systemRole === "SUPER_ADMIN";

    // Serialize Decimal and Date fields to plain JSON-compatible types for Next.js Client Components
    const employees = rawEmployees.map((emp) => {
      // Strictly omit raw credentials from response payload
      const { passwordHash, encryptedPassword, otp, otpExpiry, otpAttempts, ...safeEmp } = emp;

      let visiblePassword: string | null = null;
      if (isSuperAdmin && emp.isPasswordSet && emp.encryptedPassword) {
        visiblePassword = decryptPassword(emp.encryptedPassword);
      }

      return {
        ...safeEmp,
        isPasswordSet: emp.isPasswordSet,
        visiblePassword: isSuperAdmin ? visiblePassword : null,
        monthlyTarget: emp.monthlyTarget != null ? Number(emp.monthlyTarget) : null,
        dateOfBirth: emp.dateOfBirth instanceof Date ? emp.dateOfBirth.toISOString() : emp.dateOfBirth,
        dateOfJoining: emp.dateOfJoining instanceof Date ? emp.dateOfJoining.toISOString() : emp.dateOfJoining,
        createdAt: emp.createdAt instanceof Date ? emp.createdAt.toISOString() : emp.createdAt,
        updatedAt: emp.updatedAt instanceof Date ? emp.updatedAt.toISOString() : emp.updatedAt,
      };
    });

    return {
      success: true,
      data: {
        employees,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    };
  } catch (error) {
    console.error("Error retrieving employees:", error);
    return {
      success: false,
      error: "Failed to load employee directory.",
      data: {
        employees: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      },
    };
  }
}

/**
 * Returns eligible managers and team leaders for assignment in employee creation
 */
export async function getHierarchyManagersAction() {
  try {
    const leaders = await db.employee.findMany({
      where: {
        systemRole: {
          in: [
            SystemRole.TEAM_LEADER,
            SystemRole.ADMIN_HOD,
            SystemRole.HR_ADMIN,
            SystemRole.SUPER_ADMIN,
          ],
        },
      },
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        department: true,
        designation: true,
        systemRole: true,
      },
      orderBy: { firstName: "asc" },
    });

    return { success: true, data: leaders };
  } catch (error) {
    console.error("Error fetching leaders:", error);
    return { success: true, data: [] };
  }
}

/**
 * Retrieves a single employee's complete details
 */
export async function getEmployeeByIdAction(id: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized. Please log in." };
    const scope = await getScopeFilter(user, "hrms");

    if (!scope.canViewAll && scope.allowedEmployeeIds && !scope.allowedEmployeeIds.includes(id)) {
      return { success: false, error: "Access Denied: You do not have permission to view this employee record." };
    }

    const employee = await db.employee.findUnique({
      where: { id },
      include: {
        teamLeader: true,
        reportingManager: true,
        teamMembers: {
          select: { id: true, firstName: true, lastName: true, employeeId: true, designation: true },
        },
      },
    });

    if (!employee) {
      return { success: false, error: "Employee record not found." };
    }

    const isSuperAdmin = user.systemRole === "SUPER_ADMIN";
    const { passwordHash, encryptedPassword, otp, otpExpiry, otpAttempts, ...safeEmployee } = employee;

    let visiblePassword: string | null = null;
    if (isSuperAdmin && employee.isPasswordSet && employee.encryptedPassword) {
      visiblePassword = decryptPassword(employee.encryptedPassword);
    }

    const serializedEmployee = {
      ...safeEmployee,
      isPasswordSet: employee.isPasswordSet,
      visiblePassword: isSuperAdmin ? visiblePassword : null,
      monthlyTarget: employee.monthlyTarget != null ? Number(employee.monthlyTarget) : null,
      dateOfBirth: employee.dateOfBirth instanceof Date ? employee.dateOfBirth.toISOString() : employee.dateOfBirth,
      dateOfJoining: employee.dateOfJoining instanceof Date ? employee.dateOfJoining.toISOString() : employee.dateOfJoining,
      createdAt: employee.createdAt instanceof Date ? employee.createdAt.toISOString() : employee.createdAt,
      updatedAt: employee.updatedAt instanceof Date ? employee.updatedAt.toISOString() : employee.updatedAt,
      teamLeader: employee.teamLeader
        ? {
            ...employee.teamLeader,
            monthlyTarget: employee.teamLeader.monthlyTarget != null ? Number(employee.teamLeader.monthlyTarget) : null,
          }
        : null,
      reportingManager: employee.reportingManager
        ? {
            ...employee.reportingManager,
            monthlyTarget:
              employee.reportingManager.monthlyTarget != null
                ? Number(employee.reportingManager.monthlyTarget)
                : null,
          }
        : null,
    };

    return { success: true, data: serializedEmployee };
  } catch (error) {
    console.error("Error fetching employee details:", error);
    return { success: false, error: "Failed to fetch employee record." };
  }
}

/**
 * Updates an existing Employee record in PostgreSQL with strict validation
 */
export async function updateEmployeeAction(
  id: string,
  formData: EmployeeFormData
): Promise<ActionResult<{ id: string; name: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized. Please log in." };
    const scope = await getScopeFilter(user, "hrms");

    const isSelf = user.id === id;
    if (!scope.canManageAll && !scope.isHrAdmin && !isSelf) {
      return { success: false, error: "Access Denied: Only HR Admins can update employee records." };
    }

    const parseResult = employeeFormSchema.safeParse(formData);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      return {
        success: false,
        error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Validation failed",
      };
    }

    const data = parseResult.data;

    // Check if ID exists
    const existing = await db.employee.findUnique({
      where: { id },
    });
    if (!existing) {
      return { success: false, error: "Employee record not found." };
    }

    // Check conflict on employeeId
    if (data.employeeId !== existing.employeeId) {
      const conflictId = await db.employee.findUnique({
        where: { employeeId: data.employeeId },
      });
      if (conflictId) {
        return { success: false, error: `Employee ID "${data.employeeId}" is already assigned to another staff member.` };
      }
    }

    // Check conflict on workEmail
    if (data.workEmail !== existing.workEmail) {
      const conflictEmail = await db.employee.findUnique({
        where: { workEmail: data.workEmail },
      });
      if (conflictEmail) {
        return { success: false, error: `Work email "${data.workEmail}" is already registered in the system.` };
      }
    }

    const dob = new Date(data.dateOfBirth);
    const doj = new Date(data.dateOfJoining);

    let updatedRole: Role = existing.role;
    if (data.systemRole === SystemRole.SUPER_ADMIN) {
      updatedRole = Role.Admin;
    } else if (data.department === "Sales") {
      updatedRole = Role.CRM;
    } else if (data.department === "Account") {
      updatedRole = Role.CRM;
    } else if (data.department === "Legal") {
      updatedRole = Role.CRM;
    } else if (data.department === "Operation") {
      updatedRole = Role.CRM;
    } else if (data.department === "Quality") {
      updatedRole = Role.Support;
    } else if (data.department === "Executive Management" || data.department === "IT") {
      updatedRole = Role.Admin;
    } else if (data.department === "HR") {
      updatedRole = Role.HRMS;
    }

    const updated = await db.employee.update({
      where: { id },
      data: {
        role: updatedRole,
        phone: data.contactNumber.trim(),
        jobTitle: data.designation.trim(),

        firstName: data.firstName.trim(),
        middleName: data.middleName?.trim() || null,
        lastName: data.lastName.trim(),
        dateOfBirth: dob,
        gender: data.gender,
        nationality: data.nationality,
        maritalStatus: data.maritalStatus,
        contactNumber: data.contactNumber.trim(),
        personalEmail: data.personalEmail.trim().toLowerCase(),
        permanentAddress: data.permanentAddress.trim(),
        currentAddress: data.currentAddress.trim(),

        educationQualification: data.educationQualification.trim(),
        professionalCertifications: data.professionalCertifications?.trim() || null,
        keySkills: data.keySkills?.trim() || null,
        languagesKnown: data.languagesKnown as Language[],

        emergencyFirstName: data.emergencyFirstName.trim(),
        emergencyLastName: data.emergencyLastName.trim(),
        emergencyNumber: data.emergencyNumber.trim(),
        emergencyRelationship: data.emergencyRelationship.trim(),

        employeeId: data.employeeId.trim(),
        dateOfJoining: doj,
        department: data.department.trim(),
        designation: data.designation.trim(),
        workEmail: data.workEmail.trim().toLowerCase(),
        employmentType: data.employmentType || "Full-Time",
        previousEmployer: data.previousEmployer?.trim() || null,
        totalExperience: data.totalExperience?.trim() || null,
        branch: data.branch || "Headquarters - Ahmedabad",
        systemRole: data.systemRole as SystemRole,
        monthlyTarget: data.monthlyTarget ? Number(data.monthlyTarget) : null,

        teamLeaderId: data.teamLeaderId || null,
        reportingManagerId: data.reportingManagerId || null,

        bankAccountNumber: data.bankAccountNumber.trim(),
        bankName: data.bankName.trim(),
        ifscCode: data.ifscCode.trim(),
        panNumber: data.panNumber.trim().toUpperCase(),
        aadhaarNumber: data.aadhaarNumber.trim(),
        passportNumber: data.passportNumber?.trim() || null,
        drivingLicenseNumber: data.drivingLicenseNumber?.trim() || null,
        salaryEntity: (data.salaryEntity || "BSPL") as SalaryEntity,
        pfApplicable: data.pfApplicable ?? true,
        esicNumber: data.esicNumber?.trim() || null,
        uanNumber: data.uanNumber?.trim() || null,
        medicalInsuranceNumber: data.medicalInsuranceNumber?.trim() || null,

        passbookChequeUrl: data.passbookChequeUrl || null,
        secondaryEduProofUrl: data.secondaryEduProofUrl || null,
        graduationMarkSheetsUrl: data.graduationMarkSheetsUrl || null,
        offerRelievingLettersUrl: data.offerRelievingLettersUrl || null,
        panCardCopyUrl: data.panCardCopyUrl || null,
        addressAgeProofUrl: data.addressAgeProofUrl || null,
        bankStatementUrl: data.bankStatementUrl || null,
        salarySlipsUrl: data.salarySlipsUrl || null,
        passportPhotoUrl: data.passportPhotoUrl || null,
      },
    });

    // Targeted Notification Triggers:
    // 1. Notify the employee that their profile/role has been updated
    await createNotification({
      recipientEmail: updated.workEmail,
      title: "Profile / Role Updated",
      message: `Your staff profile was updated by HR. Department: ${updated.department}, Designation: ${updated.designation}, Role: ${updated.systemRole}.`,
      type: NotificationType.INFO,
      actionUrl: "/hrms/directory",
    });

    // 2. Notify HR Admins
    await notifyHRAdmins({
      title: "Employee Record Updated",
      message: `${updated.firstName} ${updated.lastName} (${updated.employeeId}) profile was updated by ${user.name}.`,
      type: NotificationType.INFO,
      actionUrl: "/hrms/directory",
    });

    revalidatePath("/hrms/directory");
    revalidatePath("/hrms");

    return {
      success: true,
      data: {
        id: updated.id,
        name: `${updated.firstName} ${updated.lastName}`,
      },
    };
  } catch (error) {
    console.error("Error updating employee:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update employee.",
    };
  }
}

/**
 * Safely deletes an Employee record protected with RBAC
 */
export async function deleteEmployeeAction(id: string): Promise<ActionResult<{ success: boolean }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized. Please log in." };
    const scope = await getScopeFilter(user, "hrms");

    if (!scope.isSuperAdmin && !scope.isHrAdmin) {
      return { success: false, error: "Access Denied: Only Super Admins or HR Admins can delete employee records." };
    }

    const employee = await db.employee.findUnique({
      where: { id },
    });

    if (!employee) {
      return { success: false, error: "Employee record not found." };
    }

    // Safely delete employee
    await db.employee.delete({
      where: { id },
    });

    // Notify HR Admins of critical record deletion
    await notifyHRAdmins({
      title: "Critical Record Deleted",
      message: `Employee ${employee.firstName} ${employee.lastName} (${employee.employeeId}) was permanently removed from the workforce directory by ${user.name}.`,
      type: NotificationType.WARNING,
      actionUrl: "/hrms/directory",
    });

    revalidatePath("/hrms/directory");
    revalidatePath("/hrms");

    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Error deleting employee:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete employee record.",
    };
  }
}

export interface HierarchyMember {
  id: string;
  employeeId: string;
  name: string;
  firstName: string;
  lastName: string;
  workEmail: string;
  phone: string | null;
  designation: string;
  department: string;
  systemRole: SystemRole;
  role: Role;
  avatarUrl: string | null;
  status: EmployeeStatus;
  teamLeaderId: string | null;
  teamLeaderName?: string | null;
  reportingManagerId: string | null;
  reportingManagerName?: string | null;
  attendanceToday: {
    status: TrackerStatus | "NOT_RECORDED";
    clockInTime: string | null;
    totalHours: number;
  };
  onLeaveToday: boolean;
  leaveType?: string | null;
  subordinatesCount?: number;
}

export interface DepartmentGroup {
  department: string;
  hods: HierarchyMember[];
  teamLeaders: {
    leader: HierarchyMember;
    members: HierarchyMember[];
  }[];
  directMembers: HierarchyMember[];
  stats: {
    totalEmployees: number;
    clockedIn: number;
    onLeave: number;
    pendingLeaves: number;
  };
}

export interface DepartmentHierarchyData {
  departments: DepartmentGroup[];
  totalCompanyEmployees: number;
  totalClockedIn: number;
  totalOnLeave: number;
  totalPendingLeaves: number;
  userRole: {
    isSuperAdmin: boolean;
    isHrAdmin: boolean;
    isHod: boolean;
    isTl: boolean;
    department: string;
  };
}

/**
 * Retrieves the department and managerial reporting hierarchy with live attendance and leave status,
 * scoped strictly to the viewer's enterprise RBAC permissions.
 */
export async function getDepartmentHierarchyAction(): Promise<ActionResult<DepartmentHierarchyData>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized. Please log in." };

    const scope = await getScopeFilter(user, "hrms");

    // Build where clause based on RBAC scope
    const whereClause: Record<string, unknown> = {
      status: EmployeeStatus.ACTIVE,
    };

    if (!scope.canViewAll && scope.allowedEmployeeIds) {
      whereClause.id = { in: scope.allowedEmployeeIds };
    }

    const rawEmployees = await db.employee.findMany({
      where: whereClause,
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        workEmail: true,
        phone: true,
        designation: true,
        department: true,
        systemRole: true,
        role: true,
        avatarUrl: true,
        status: true,
        teamLeaderId: true,
        reportingManagerId: true,
        teamLeader: {
          select: { id: true, firstName: true, lastName: true },
        },
        reportingManager: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: [{ department: "asc" }, { firstName: "asc" }],
    });

    const employeeIds = rawEmployees.map((e) => e.id);

    // Normalize today for attendance & leave lookup
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const [todayAttendances, activeLeaves, pendingLeaves] = await Promise.all([
      db.attendance.findMany({
        where: {
          date: today,
          employeeId: { in: employeeIds },
        },
        select: {
          employeeId: true,
          currentStatus: true,
          clockInTime: true,
          totalActiveHours: true,
        },
      }),
      db.leaveRequest.findMany({
        where: {
          startDate: { lte: today },
          endDate: { gte: today },
          finalStatus: ApprovalStatus.APPROVED,
          employeeId: { in: employeeIds },
        },
        select: {
          employeeId: true,
          leaveType: true,
        },
      }),
      db.leaveRequest.findMany({
        where: {
          finalStatus: ApprovalStatus.PENDING,
          employeeId: { in: employeeIds },
        },
        select: {
          id: true,
          employeeId: true,
        },
      }),
    ]);

    const attendanceMap = new Map<string, (typeof todayAttendances)[0]>();
    for (const a of todayAttendances) {
      attendanceMap.set(a.employeeId, a);
    }

    const leaveMap = new Map<string, string>();
    for (const l of activeLeaves) {
      leaveMap.set(l.employeeId, l.leaveType);
    }

    const pendingLeaveCountMap = new Map<string, number>();
    for (const p of pendingLeaves) {
      pendingLeaveCountMap.set(p.employeeId, (pendingLeaveCountMap.get(p.employeeId) || 0) + 1);
    }

    // Format member records
    const members: HierarchyMember[] = rawEmployees.map((e) => {
      const att = attendanceMap.get(e.id);
      const onLeave = leaveMap.has(e.id);
      return {
        id: e.id,
        employeeId: e.employeeId,
        name: `${e.firstName} ${e.lastName}`,
        firstName: e.firstName,
        lastName: e.lastName,
        workEmail: e.workEmail,
        phone: e.phone,
        designation: e.designation,
        department: e.department || "General",
        systemRole: e.systemRole,
        role: e.role,
        avatarUrl: e.avatarUrl,
        status: e.status,
        teamLeaderId: e.teamLeaderId,
        teamLeaderName: e.teamLeader ? `${e.teamLeader.firstName} ${e.teamLeader.lastName}` : null,
        reportingManagerId: e.reportingManagerId,
        reportingManagerName: e.reportingManager ? `${e.reportingManager.firstName} ${e.reportingManager.lastName}` : null,
        attendanceToday: {
          status: att ? att.currentStatus : "NOT_RECORDED",
          clockInTime: att?.clockInTime ? att.clockInTime.toISOString() : null,
          totalHours: att ? Number(att.totalActiveHours) : 0,
        },
        onLeaveToday: onLeave,
        leaveType: onLeave ? leaveMap.get(e.id) : null,
      };
    });

    // Group by department
    const deptMap = new Map<string, HierarchyMember[]>();
    for (const m of members) {
      const deptName = m.department || "General";
      if (!deptMap.has(deptName)) deptMap.set(deptName, []);
      deptMap.get(deptName)!.push(m);
    }

    let totalCompanyEmployees = 0;
    let totalClockedIn = 0;
    let totalOnLeave = 0;
    let totalPendingLeaves = 0;

    const departmentGroups: DepartmentGroup[] = [];

    deptMap.forEach((deptMembers, deptName) => {
      totalCompanyEmployees += deptMembers.length;

      let deptClockedIn = 0;
      let deptOnLeave = 0;
      let deptPendingLeaves = 0;

      for (const m of deptMembers) {
        if (m.attendanceToday.status === TrackerStatus.ACTIVE || m.attendanceToday.status === TrackerStatus.IDLE) {
          deptClockedIn++;
          totalClockedIn++;
        }
        if (m.onLeaveToday) {
          deptOnLeave++;
          totalOnLeave++;
        }
        const pCount = pendingLeaveCountMap.get(m.id) || 0;
        deptPendingLeaves += pCount;
        totalPendingLeaves += pCount;
      }

      // Identify HODs
      const hods = deptMembers.filter(
        (m) => m.systemRole === SystemRole.ADMIN_HOD || m.role === Role.Admin
      );

      // Identify TLs
      const tlMembers = deptMembers.filter(
        (m) => m.systemRole === SystemRole.TEAM_LEADER
      );

      // Map TL branches
      const handledMemberIds = new Set<string>();
      hods.forEach((h) => handledMemberIds.add(h.id));
      tlMembers.forEach((t) => handledMemberIds.add(t.id));

      const teamLeaders = tlMembers.map((tl) => {
        const team = deptMembers.filter(
          (m) =>
            !handledMemberIds.has(m.id) &&
            (m.teamLeaderId === tl.id || m.reportingManagerId === tl.id)
        );
        team.forEach((m) => handledMemberIds.add(m.id));
        tl.subordinatesCount = team.length;
        return {
          leader: tl,
          members: team,
        };
      });

      // Direct members not under a TL
      const directMembers = deptMembers.filter((m) => !handledMemberIds.has(m.id));

      departmentGroups.push({
        department: deptName,
        hods,
        teamLeaders,
        directMembers,
        stats: {
          totalEmployees: deptMembers.length,
          clockedIn: deptClockedIn,
          onLeave: deptOnLeave,
          pendingLeaves: deptPendingLeaves,
        },
      });
    });

    return {
      success: true,
      data: {
        departments: departmentGroups,
        totalCompanyEmployees,
        totalClockedIn,
        totalOnLeave,
        totalPendingLeaves,
        userRole: {
          isSuperAdmin: scope.isSuperAdmin,
          isHrAdmin: scope.isHrAdmin,
          isHod: scope.isHod,
          isTl: scope.isTl,
          department: scope.department,
        },
      },
    };
  } catch (error) {
    console.error("Error generating department hierarchy:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load department hierarchy.",
    };
  }
}
