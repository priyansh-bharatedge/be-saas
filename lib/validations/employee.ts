import { z } from "zod";
import { DEPARTMENTS } from "@/lib/constants/departments";

// Statutory & contact regex definitions
export const PHONE_REGEX = /^[0-9+() -]{10,15}$/;
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
export const AADHAAR_REGEX = /^\d{12}$/;
export const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const BANK_ACC_REGEX = /^\d{9,18}$/;

export const LanguageEnum = z.enum(["Hindi", "English", "Gujarati"]);
export const SystemRoleEnum = z.enum([
  "TEAM_MEMBER",
  "TEAM_LEADER",
  "ADMIN_HOD",
  "HR_ADMIN",
  "SUPER_ADMIN",
]);
export const SalaryEntityEnum = z.enum(["BSPL", "BSAPL"]);
export const EmployeeStatusEnum = z.enum([
  "ACTIVE",
  "ONBOARDING",
  "ON_LEAVE",
  "TERMINATED",
]);

// Step 1: Personal Details Schema
export const step1PersonalSchema = z.object({
  firstName: z.string().trim().min(2, "First name is required (at least 2 characters)"),
  middleName: z.string().trim().optional(),
  lastName: z.string().trim().min(2, "Last name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.string().min(1, "Please select gender"),
  nationality: z.string().default("Indian"),
  maritalStatus: z.string().default("Single"),
  contactNumber: z.string().regex(PHONE_REGEX, "Enter a valid 10-digit mobile number"),
  personalEmail: z.string().email("Enter a valid personal email address"),
  permanentAddress: z.string().min(5, "Permanent address must be at least 5 characters"),
  currentAddress: z.string().min(5, "Current address must be at least 5 characters"),
});

// Step 2: Education & Skills Schema
export const step2EducationSchema = z.object({
  educationQualification: z.string().min(2, "Highest qualification is required"),
  professionalCertifications: z.string().optional(),
  keySkills: z.string().optional(),
  languagesKnown: z.array(LanguageEnum).min(1, "Select at least one language"),
});

// Step 3: Emergency & Family Schema
export const step3EmergencySchema = z.object({
  emergencyFirstName: z.string().min(2, "Emergency contact first name is required"),
  emergencyLastName: z.string().min(2, "Emergency contact last name is required"),
  emergencyNumber: z.string().regex(PHONE_REGEX, "Enter a valid emergency contact number"),
  emergencyRelationship: z.string().min(2, "Specify relationship (e.g. Parent, Spouse, Sibling)"),
});

// Step 4: Department & Access Hierarchy Schema
export const step4DepartmentSchema = z.object({
  employeeId: z.string().min(3, "Employee ID is required (e.g. BE-EMP-001)"),
  dateOfJoining: z.string().min(1, "Date of joining is required"),
  department: z.enum(DEPARTMENTS, {
    message: "Please select a valid official department",
  }),
  designation: z.string().min(2, "Designation / Job Title is required"),
  workEmail: z.string().email("Enter a valid company work email"),
  employmentType: z.string().default("Full-Time"),
  previousEmployer: z.string().optional(),
  totalExperience: z.string().optional(),
  branch: z.string().default("Headquarters - Ahmedabad"),
  systemRole: SystemRoleEnum.default("TEAM_MEMBER"),
  teamLeaderId: z.string().optional().nullable(),
  reportingManagerId: z.string().optional().nullable(),
  monthlyTarget: z.coerce.number().optional().nullable(),
});

// Step 5: Bank & Statutory Details Schema
export const step5BankSchema = z.object({
  bankAccountNumber: z
    .string()
    .trim()
    .transform((val) => val.replace(/[\s-]/g, ""))
    .refine((val) => /^\d{9,18}$/.test(val), {
      message: "Bank account number must be 9 to 18 digits",
    }),
  bankName: z.string().trim().min(2, "Bank name is required"),
  ifscCode: z
    .string()
    .trim()
    .toUpperCase()
    .refine((val) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(val), {
      message: "Enter valid 11-character IFSC (e.g. HDFC0000006)",
    }),
  panNumber: z
    .string()
    .trim()
    .toUpperCase()
    .refine((val) => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(val), {
      message: "Enter valid 10-character PAN (e.g. ABCDE1234F)",
    }),
  aadhaarNumber: z
    .string()
    .trim()
    .transform((val) => val.replace(/[\s-]/g, ""))
    .refine((val) => /^\d{12}$/.test(val), {
      message: "Aadhaar number must be exactly 12 digits",
    }),
  passportNumber: z.string().trim().optional(),
  drivingLicenseNumber: z.string().trim().optional(),
  salaryEntity: SalaryEntityEnum.default("BSPL"),
  pfApplicable: z.boolean().default(true),
  esicNumber: z.string().trim().optional(),
  uanNumber: z.string().trim().optional(),
  medicalInsuranceNumber: z.string().trim().optional(),
});

// Step 6: Documents Schema
export const step6DocumentsSchema = z.object({
  passbookChequeUrl: z.string().optional(),
  secondaryEduProofUrl: z.string().optional(),
  graduationMarkSheetsUrl: z.string().optional(),
  offerRelievingLettersUrl: z.string().optional(),
  panCardCopyUrl: z.string().optional(),
  addressAgeProofUrl: z.string().optional(),
  bankStatementUrl: z.string().optional(),
  salarySlipsUrl: z.string().optional(),
  passportPhotoUrl: z.string().optional(),
});

// Complete Combined Employee Form Schema
export const employeeFormSchema = step1PersonalSchema
  .merge(step2EducationSchema)
  .merge(step3EmergencySchema)
  .merge(step4DepartmentSchema)
  .merge(step5BankSchema)
  .merge(step6DocumentsSchema);

export type EmployeeFormData = z.infer<typeof employeeFormSchema>;
export type Step1PersonalData = z.infer<typeof step1PersonalSchema>;
export type Step2EducationData = z.infer<typeof step2EducationSchema>;
export type Step3EmergencyData = z.infer<typeof step3EmergencySchema>;
export type Step4DepartmentData = z.infer<typeof step4DepartmentSchema>;
export type Step5BankData = z.infer<typeof step5BankSchema>;
export type Step6DocumentsData = z.infer<typeof step6DocumentsSchema>;
