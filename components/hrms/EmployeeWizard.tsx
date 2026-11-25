"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  employeeFormSchema,
  EmployeeFormData,
  step1PersonalSchema,
  step2EducationSchema,
  step3EmergencySchema,
  step4DepartmentSchema,
  step5BankSchema,
  step6DocumentsSchema,
} from "@/lib/validations/employee";
import { DEPARTMENTS } from "@/lib/constants/departments";
import { createEmployeeAction } from "@/lib/actions/employee";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Building2,
  Award,
  CreditCard,
  FileText,
  ArrowRight,
  ArrowLeft,
  Check,
  ChevronRight,
  Loader2,
  UploadCloud,
  FileCheck,
  Sparkles,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface LeaderOption {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  department: string;
  designation: string;
}

interface EmployeeWizardProps {
  leaders?: LeaderOption[];
}

const STEPS = [
  { id: 1, label: "Personal details", shortLabel: "Personal", subtitle: "Let's start with your details", icon: User },
  { id: 2, label: "Education & Skills", shortLabel: "Education", subtitle: "Qualifications & spoken languages", icon: Award },
  { id: 3, label: "Emergency & Family", shortLabel: "Emergency", subtitle: "Emergency contact & relations", icon: Phone },
  { id: 4, label: "Department & Hierarchy", shortLabel: "Department", subtitle: "Role, reporting line & designation", icon: Building2 },
  { id: 5, label: "Bank & Statutory Details", shortLabel: "Bank & Statutory", subtitle: "Bank accounts, PAN, PF & Aadhaar", icon: CreditCard },
  { id: 6, label: "Documents & Verification", shortLabel: "Documents", subtitle: "Verification proofs & credentials", icon: FileText },
];

export function EmployeeWizard({ leaders = [] }: EmployeeWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize React Hook Form with combined schema
  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeFormSchema) as any,
    mode: "onBlur",
    defaultValues: {
      firstName: "",
      middleName: "",
      lastName: "",
      dateOfBirth: "",
      gender: "Male",
      nationality: "Indian",
      maritalStatus: "Single",
      contactNumber: "",
      personalEmail: "",
      permanentAddress: "",
      currentAddress: "",

      educationQualification: "",
      professionalCertifications: "",
      keySkills: "",
      languagesKnown: ["Hindi", "English"],

      emergencyFirstName: "",
      emergencyLastName: "",
      emergencyNumber: "",
      emergencyRelationship: "Parent",

      employeeId: `BE-EMP-${Math.floor(100 + Math.random() * 900)}`,
      dateOfJoining: new Date().toISOString().split("T")[0],
      department: "Sales",
      designation: "",
      workEmail: "",
      employmentType: "Full-Time",
      previousEmployer: "",
      totalExperience: "2 Years",
      branch: "Headquarters - Ahmedabad",
      systemRole: "TEAM_MEMBER",
      teamLeaderId: "",
      reportingManagerId: "",
      monthlyTarget: undefined,

      bankAccountNumber: "",
      bankName: "HDFC Bank",
      ifscCode: "",
      panNumber: "",
      aadhaarNumber: "",
      passportNumber: "",
      drivingLicenseNumber: "",
      salaryEntity: "BSPL",
      pfApplicable: true,
      esicNumber: "",
      uanNumber: "",
      medicalInsuranceNumber: "",

      passbookChequeUrl: "",
      secondaryEduProofUrl: "",
      graduationMarkSheetsUrl: "",
      offerRelievingLettersUrl: "",
      panCardCopyUrl: "",
      addressAgeProofUrl: "",
      bankStatementUrl: "",
      salarySlipsUrl: "",
      passportPhotoUrl: "",
    },
  });

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const watchedLanguages = watch("languagesKnown") || [];
  const watchedDocuments = {
    passbook: watch("passbookChequeUrl"),
    secondary: watch("secondaryEduProofUrl"),
    graduation: watch("graduationMarkSheetsUrl"),
    offer: watch("offerRelievingLettersUrl"),
    pan: watch("panCardCopyUrl"),
    address: watch("addressAgeProofUrl"),
    statement: watch("bankStatementUrl"),
    slips: watch("salarySlipsUrl"),
    photo: watch("passportPhotoUrl"),
  };

  // Step-specific field validation before advancing
  const validateStep = async (step: number) => {
    let fieldsToValidate: (keyof EmployeeFormData)[] = [];
    let stepSchema: any = null;

    switch (step) {
      case 1:
        fieldsToValidate = [
          "firstName",
          "lastName",
          "dateOfBirth",
          "gender",
          "nationality",
          "maritalStatus",
          "contactNumber",
          "personalEmail",
          "permanentAddress",
          "currentAddress",
        ];
        stepSchema = step1PersonalSchema;
        break;
      case 2:
        fieldsToValidate = [
          "educationQualification",
          "languagesKnown",
        ];
        stepSchema = step2EducationSchema;
        break;
      case 3:
        fieldsToValidate = [
          "emergencyFirstName",
          "emergencyLastName",
          "emergencyNumber",
          "emergencyRelationship",
        ];
        stepSchema = step3EmergencySchema;
        break;
      case 4:
        fieldsToValidate = [
          "employeeId",
          "dateOfJoining",
          "department",
          "designation",
          "workEmail",
          "employmentType",
          "branch",
          "systemRole",
        ];
        stepSchema = step4DepartmentSchema;
        break;
      case 5:
        fieldsToValidate = [
          "bankAccountNumber",
          "bankName",
          "ifscCode",
          "panNumber",
          "aadhaarNumber",
          "salaryEntity",
        ];
        stepSchema = step5BankSchema;
        break;
      case 6:
        fieldsToValidate = [];
        stepSchema = step6DocumentsSchema;
        break;
    }

    // First validate via RHF trigger for reactive field-level state
    const isTriggerValid = await trigger(fieldsToValidate);

    // Deep validation against the step schema to capture and show exact field issues
    if (stepSchema) {
      const currentValues = form.getValues();
      const parseResult = stepSchema.safeParse(currentValues);
      if (!parseResult.success) {
        parseResult.error.issues.forEach((issue: any) => {
          const fieldKey = issue.path[0] as keyof EmployeeFormData;
          if (fieldKey) {
            form.setError(fieldKey, {
              type: "manual",
              message: issue.message,
            });
          }
        });

        const messages = parseResult.error.issues.map((i: any) => i.message);
        const uniqueMessages = Array.from(new Set(messages));
        toast.error(uniqueMessages.slice(0, 3).join(" • "));
        return false;
      }
    }

    if (!isTriggerValid) {
      toast.error("Please fill in all required fields accurately to proceed.");
      return false;
    }

    return true;
  };

  const handleNext = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid) {
      if (currentStep < 6) {
        setCurrentStep((prev) => prev + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const onSubmit = async (data: EmployeeFormData) => {
    setIsSubmitting(true);
    try {
      const res = await createEmployeeAction(data);
      if (res.success) {
        toast.success(`Employee ${res.data?.name} (${res.data?.employeeId}) registered successfully!`);
        router.push("/hrms/directory");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to create employee.");
      }
    } catch (err) {
      toast.error("An unexpected error occurred while saving the record.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleLanguage = (lang: "Hindi" | "English" | "Gujarati") => {
    const current = [...watchedLanguages];
    const index = current.indexOf(lang);
    if (index > -1) {
      if (current.length > 1) {
        current.splice(index, 1);
        setValue("languagesKnown", current);
      } else {
        toast.error("At least one language must be selected.");
      }
    } else {
      current.push(lang);
      setValue("languagesKnown", current);
    }
  };

  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [uploadedMeta, setUploadedMeta] = useState<
    Record<string, { fileName: string; fileSize?: number; uploadedAt?: string }>
  >({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: keyof EmployeeFormData,
    label: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. File Type Validation (.pdf, .jpg, .jpeg, .png, .webp)
    const validExtensions = [".pdf", ".jpg", ".jpeg", ".png", ".webp"];
    const fileExt = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    const isValidType =
      validExtensions.includes(fileExt) ||
      file.type.startsWith("image/") ||
      file.type === "application/pdf";

    if (!isValidType) {
      toast.error(`Invalid format for ${label}. Please upload PDF, JPG, PNG, or WebP.`);
      e.target.value = "";
      return;
    }

    // 2. File Size Validation (Max 10 MB per document)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error(
        `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 10 MB.`
      );
      e.target.value = "";
      return;
    }

    setUploadingKey(field as string);
    const toastId = toast.loading(`Uploading ${file.name} to Cloudflare R2...`);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "hrms-documents");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success || !data.url) {
        throw new Error(data.error || "Failed to upload file to Cloudflare R2.");
      }

      // Persist Cloudflare R2 URL into React Hook Form
      setValue(field, data.url, { shouldValidate: true, shouldDirty: true });

      // Save metadata
      setUploadedMeta((prev) => ({
        ...prev,
        [field]: {
          fileName: file.name,
          fileSize: file.size,
          uploadedAt: new Date().toISOString(),
        },
      }));

      toast.success(`${label} attached successfully!`, { id: toastId });
    } catch (err: any) {
      console.error("[Document Upload Error]:", err);
      toast.error(err.message || `Failed to upload ${label}. Please try again.`, { id: toastId });
    } finally {
      setUploadingKey(null);
      e.target.value = "";
    }
  };

  const handleRemoveFile = (field: keyof EmployeeFormData, label: string) => {
    setValue(field, "", { shouldValidate: true, shouldDirty: true });
    setUploadedMeta((prev) => {
      const next = { ...prev };
      delete next[field as string];
      return next;
    });
    toast.info(`Removed ${label}`);
  };

  return (
    <div className="relative min-h-[85vh] flex flex-col justify-center items-center py-6 px-4">
      {/* Ambient background blur circles matching Reference Image 3 */}
      <div className="pointer-events-none absolute -top-10 -left-10 w-96 h-96 rounded-full bg-[#ACCAD5]/30 blur-3xl opacity-60" />
      <div className="pointer-events-none absolute -bottom-10 -right-10 w-96 h-96 rounded-full bg-[#F0944D]/25 blur-3xl opacity-60" />

      {/* Floating Stepper Breadcrumbs matching Reference Image 3 */}
      <div className="relative z-10 w-full max-w-4xl mb-5 px-1">
        <div className="flex items-center justify-between gap-1 sm:gap-2 px-3.5 py-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-x-auto scrollbar-none">
          {STEPS.map((step, idx) => {
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;

            return (
              <div key={step.id} className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={async () => {
                    if (step.id < currentStep) {
                      setCurrentStep(step.id);
                    } else if (step.id > currentStep) {
                      const valid = await validateStep(currentStep);
                      if (valid) setCurrentStep(step.id);
                    }
                  }}
                  className={`flex items-center gap-1.5 py-1 px-2 sm:px-2.5 rounded-full text-xs transition-all cursor-pointer ${
                    isActive
                      ? "text-slate-900 font-bold bg-white shadow-xs border border-slate-200"
                      : isCompleted
                      ? "text-slate-700 font-semibold hover:text-slate-900 hover:bg-white/60"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isActive
                        ? "bg-slate-950 text-white"
                        : isCompleted
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {isCompleted ? <Check className="h-3 w-3" /> : step.id}
                  </span>
                  <span className="hidden xl:inline">{step.label}</span>
                  <span className="hidden sm:inline xl:hidden">{step.shortLabel}</span>
                  <span className="inline sm:hidden font-medium text-[11px]">{isActive ? step.shortLabel : ""}</span>
                </button>

                {idx < STEPS.length - 1 && (
                  <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0 mx-0.5" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Centered Floating Card Container matching Reference Image 3 */}
      <motion.div
        layout
        className="relative z-10 w-full max-w-4xl rounded-[36px] bg-white/95 backdrop-blur-2xl border border-white/80 shadow-[0_20px_60px_rgba(0,0,0,0.06)] p-8 sm:p-10"
      >
        {/* Card Step Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-slate-950">
            {STEPS[currentStep - 1].subtitle}
          </h2>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
            <span>Provide essential information to proceed</span>
            <Sparkles className="h-3.5 w-3.5 text-[#F0944D]" />
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <AnimatePresence mode="wait">
            {/* STEP 1: Personal Details */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.25 }}
                className="space-y-5"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      First Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      {...register("firstName")}
                      placeholder="e.g. Vikram"
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-50/80 border border-slate-200/90 text-xs text-slate-900 focus:bg-white focus:border-[#F0944D] focus:ring-2 focus:ring-[#F0944D]/20 transition-all outline-none"
                    />
                    {errors.firstName && (
                      <p className="text-[11px] text-rose-500 mt-1">{errors.firstName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Middle Name
                    </label>
                    <input
                      {...register("middleName")}
                      placeholder="Optional"
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-50/80 border border-slate-200/90 text-xs text-slate-900 focus:bg-white focus:border-[#F0944D] focus:ring-2 focus:ring-[#F0944D]/20 transition-all outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Last Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      {...register("lastName")}
                      placeholder="e.g. Sharma"
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-50/80 border border-slate-200/90 text-xs text-slate-900 focus:bg-white focus:border-[#F0944D] focus:ring-2 focus:ring-[#F0944D]/20 transition-all outline-none"
                    />
                    {errors.lastName && (
                      <p className="text-[11px] text-rose-500 mt-1">{errors.lastName.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Date of Birth <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      {...register("dateOfBirth")}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-50/80 border border-slate-200/90 text-xs text-slate-900 focus:bg-white focus:border-[#F0944D] focus:ring-2 focus:ring-[#F0944D]/20 transition-all outline-none"
                    />
                    {errors.dateOfBirth && (
                      <p className="text-[11px] text-rose-500 mt-1">{errors.dateOfBirth.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Gender <span className="text-rose-500">*</span>
                    </label>
                    <select
                      {...register("gender")}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-50/80 border border-slate-200/90 text-xs text-slate-900 focus:bg-white focus:border-[#F0944D] focus:ring-2 focus:ring-[#F0944D]/20 transition-all outline-none"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Contact Number <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-xs text-slate-400 font-mono">+91</span>
                      <input
                        {...register("contactNumber")}
                        placeholder="9876543210"
                        className="w-full pl-12 pr-4 py-2.5 rounded-2xl bg-slate-50/80 border border-slate-200/90 text-xs text-slate-900 focus:bg-white focus:border-[#F0944D] focus:ring-2 focus:ring-[#F0944D]/20 transition-all outline-none"
                      />
                    </div>
                    {errors.contactNumber && (
                      <p className="text-[11px] text-rose-500 mt-1">{errors.contactNumber.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Personal Email <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      {...register("personalEmail")}
                      placeholder="vikram@example.com"
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-50/80 border border-slate-200/90 text-xs text-slate-900 focus:bg-white focus:border-[#F0944D] focus:ring-2 focus:ring-[#F0944D]/20 transition-all outline-none"
                    />
                    {errors.personalEmail && (
                      <p className="text-[11px] text-rose-500 mt-1">{errors.personalEmail.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Nationality
                    </label>
                    <input
                      {...register("nationality")}
                      placeholder="Indian"
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-50/80 border border-slate-200/90 text-xs text-slate-900 focus:bg-white focus:border-[#F0944D] focus:ring-2 focus:ring-[#F0944D]/20 transition-all outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Marital Status
                    </label>
                    <select
                      {...register("maritalStatus")}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-50/80 border border-slate-200/90 text-xs text-slate-900 focus:bg-white focus:border-[#F0944D] focus:ring-2 focus:ring-[#F0944D]/20 transition-all outline-none"
                    >
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Divorced">Divorced</option>
                      <option value="Widowed">Widowed</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Current Address <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    {...register("currentAddress")}
                    placeholder="Residential address with city, state, and pin code"
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50/80 border border-slate-200/90 text-xs text-slate-900 focus:bg-white focus:border-[#F0944D] focus:ring-2 focus:ring-[#F0944D]/20 transition-all outline-none resize-none"
                  />
                  {errors.currentAddress && (
                    <p className="text-[11px] text-rose-500 mt-1">{errors.currentAddress.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Permanent Address <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    {...register("permanentAddress")}
                    placeholder="Permanent hometown address"
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50/80 border border-slate-200/90 text-xs text-slate-900 focus:bg-white focus:border-[#F0944D] focus:ring-2 focus:ring-[#F0944D]/20 transition-all outline-none resize-none"
                  />
                  {errors.permanentAddress && (
                    <p className="text-[11px] text-rose-500 mt-1">{errors.permanentAddress.message}</p>
                  )}
                </div>
              </motion.div>
            )}

            {/* STEP 2: Education & Skills */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.25 }}
                className="space-y-5"
              >
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Highest Education Qualification <span className="text-rose-500">*</span>
                  </label>
                  <input
                    {...register("educationQualification")}
                    placeholder="e.g. B.Tech Computer Science, MBA Human Resources"
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50/80 border border-slate-200/90 text-xs text-slate-900 focus:bg-white focus:border-[#F0944D] focus:ring-2 focus:ring-[#F0944D]/20 transition-all outline-none"
                  />
                  {errors.educationQualification && (
                    <p className="text-[11px] text-rose-500 mt-1">{errors.educationQualification.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Professional Certifications
                  </label>
                  <input
                    {...register("professionalCertifications")}
                    placeholder="e.g. SHRM-CP, PMP, AWS Cloud Practitioner, Six Sigma"
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50/80 border border-slate-200/90 text-xs text-slate-900 focus:bg-white focus:border-[#F0944D] focus:ring-2 focus:ring-[#F0944D]/20 transition-all outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Key Technical & Functional Skills
                  </label>
                  <input
                    {...register("keySkills")}
                    placeholder="e.g. Talent Sourcing, Payroll Management, Labor Law, React, PostgreSQL"
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50/80 border border-slate-200/90 text-xs text-slate-900 focus:bg-white focus:border-[#F0944D] focus:ring-2 focus:ring-[#F0944D]/20 transition-all outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Languages Known <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {(["Hindi", "English", "Gujarati"] as const).map((lang) => {
                      const isSelected = watchedLanguages.includes(lang);
                      return (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => toggleLanguage(lang)}
                          className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer flex items-center gap-2 ${
                            isSelected
                              ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          <span
                            className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                              isSelected ? "bg-white text-slate-900" : "bg-slate-200"
                            }`}
                          >
                            {isSelected && <Check className="h-2.5 w-2.5" />}
                          </span>
                          <span>{lang}</span>
                        </button>
                      );
                    })}
                  </div>
                  {errors.languagesKnown && (
                    <p className="text-[11px] text-rose-500 mt-1">{errors.languagesKnown.message}</p>
                  )}
                </div>
              </motion.div>
            )}

            {/* STEP 3: Emergency & Family Details */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.25 }}
                className="space-y-5"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Emergency Contact First Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      {...register("emergencyFirstName")}
                      placeholder="e.g. Sunita"
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-50/80 border border-slate-200/90 text-xs text-slate-900 focus:bg-white focus:border-[#F0944D] focus:ring-2 focus:ring-[#F0944D]/20 transition-all outline-none"
                    />
                    {errors.emergencyFirstName && (
                      <p className="text-[11px] text-rose-500 mt-1">{errors.emergencyFirstName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Emergency Contact Last Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      {...register("emergencyLastName")}
                      placeholder="e.g. Iyer"
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-50/80 border border-slate-200/90 text-xs text-slate-900 focus:bg-white focus:border-[#F0944D] focus:ring-2 focus:ring-[#F0944D]/20 transition-all outline-none"
                    />
                    {errors.emergencyLastName && (
                      <p className="text-[11px] text-rose-500 mt-1">{errors.emergencyLastName.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Relationship <span className="text-rose-500">*</span>
                    </label>
                    <input
                      {...register("emergencyRelationship")}
                      placeholder="e.g. Spouse, Father, Mother, Sibling"
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-50/80 border border-slate-200/90 text-xs text-slate-900 focus:bg-white focus:border-[#F0944D] focus:ring-2 focus:ring-[#F0944D]/20 transition-all outline-none"
                    />
                    {errors.emergencyRelationship && (
                      <p className="text-[11px] text-rose-500 mt-1">{errors.emergencyRelationship.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Emergency Contact Number <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-xs text-slate-400 font-mono">+91</span>
                      <input
                        {...register("emergencyNumber")}
                        placeholder="9876543299"
                        className="w-full pl-12 pr-4 py-2.5 rounded-2xl bg-slate-50/80 border border-slate-200/90 text-xs text-slate-900 focus:bg-white focus:border-[#F0944D] focus:ring-2 focus:ring-[#F0944D]/20 transition-all outline-none"
                      />
                    </div>
                    {errors.emergencyNumber && (
                      <p className="text-[11px] text-rose-500 mt-1">{errors.emergencyNumber.message}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 4: Department & Access Hierarchy */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.25 }}
                className="space-y-5"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Employee ID <span className="text-rose-500">*</span>
                    </label>
                    <input
                      {...register("employeeId")}
                      placeholder="BE-EMP-001"
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-50/80 border border-slate-200/90 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-[#F0944D] focus:ring-2 focus:ring-[#F0944D]/20 transition-all outline-none"
                    />
                    {errors.employeeId && (
                      <p className="text-[11px] text-rose-500 mt-1">{errors.employeeId.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Date of Joining <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      {...register("dateOfJoining")}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-50/80 border border-slate-200/90 text-xs text-slate-900 focus:bg-white focus:border-[#F0944D] focus:ring-2 focus:ring-[#F0944D]/20 transition-all outline-none"
                    />
                    {errors.dateOfJoining && (
                      <p className="text-[11px] text-rose-500 mt-1">{errors.dateOfJoining.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Department <span className="text-rose-500">*</span>
                    </label>
                    <select
                      {...register("department")}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-50/80 border border-slate-200/90 text-xs text-slate-900 focus:bg-white focus:border-[#F0944D] focus:ring-2 focus:ring-[#F0944D]/20 transition-all outline-none"
                    >
                      {DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept === "Executive Management"
                            ? "Executive Management (C-level / Super Admin only)"
                            : dept}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Designation / Job Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      {...register("designation")}
                      placeholder="e.g. Senior People Partner"
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-50/80 border border-slate-200/90 text-xs text-slate-900 focus:bg-white focus:border-[#F0944D] focus:ring-2 focus:ring-[#F0944D]/20 transition-all outline-none"
                    />
                    {errors.designation && (
                      <p className="text-[11px] text-rose-500 mt-1">{errors.designation.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Company Work Email <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      {...register("workEmail")}
                      placeholder="firstname.lastname@bharatedge.com"
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-50/80 border border-slate-200/90 text-xs text-slate-900 focus:bg-white focus:border-[#F0944D] focus:ring-2 focus:ring-[#F0944D]/20 transition-all outline-none"
                    />
                    {errors.workEmail && (
                      <p className="text-[11px] text-rose-500 mt-1">{errors.workEmail.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      System Role <span className="text-rose-500">*</span>
                    </label>
                    <select
                      {...register("systemRole")}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-50/80 border border-slate-200/90 text-xs font-mono text-slate-900 focus:bg-white focus:border-[#F0944D] focus:ring-2 focus:ring-[#F0944D]/20 transition-all outline-none"
                    >
                      <option value="TEAM_MEMBER">Team Member</option>
                      <option value="TEAM_LEADER">Team Leader</option>
                      <option value="ADMIN_HOD">Admin / HOD</option>
                      <option value="HR_ADMIN">HR Admin</option>
                      <option value="SUPER_ADMIN">Super Admin</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Employment Type
                    </label>
                    <select
                      {...register("employmentType")}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-50/80 border border-slate-200/90 text-xs text-slate-900 focus:bg-white focus:border-[#F0944D] focus:ring-2 focus:ring-[#F0944D]/20 transition-all outline-none"
                    >
                      <option value="Full-Time">Full-Time</option>
                      <option value="Part-Time">Part-Time</option>
                      <option value="Contract">Contract</option>
                      <option value="Intern">Intern</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Branch Location
                    </label>
                    <input
                      {...register("branch")}
                      placeholder="Headquarters - Ahmedabad"
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-50/80 border border-slate-200/90 text-xs text-slate-900 focus:bg-white focus:border-[#F0944D] focus:ring-2 focus:ring-[#F0944D]/20 transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Team Leader (Optional)
                    </label>
                    <select
                      {...register("teamLeaderId")}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-50/80 border border-slate-200/90 text-xs text-slate-900 focus:bg-white focus:border-[#F0944D] focus:ring-2 focus:ring-[#F0944D]/20 transition-all outline-none"
                    >
                      <option value="">None / Self-Managed</option>
                      {leaders.map((lead) => (
                        <option key={lead.id} value={lead.id}>
                          {lead.firstName} {lead.lastName} ({lead.designation})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Reporting Manager (Optional)
                    </label>
                    <select
                      {...register("reportingManagerId")}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-50/80 border border-slate-200/90 text-xs text-slate-900 focus:bg-white focus:border-[#F0944D] focus:ring-2 focus:ring-[#F0944D]/20 transition-all outline-none"
                    >
                      <option value="">None / Executive</option>
                      {leaders.map((lead) => (
                        <option key={lead.id} value={lead.id}>
                          {lead.firstName} {lead.lastName} ({lead.designation})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Total Experience
                    </label>
                    <input
                      {...register("totalExperience")}
                      placeholder="e.g. 3.5 Years"
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-50/80 border border-slate-200/90 text-xs text-slate-900 focus:bg-white focus:border-[#F0944D] focus:ring-2 focus:ring-[#F0944D]/20 transition-all outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Monthly Target (₹ INR, for Sales/CRM)
                    </label>
                    <input
                      type="number"
                      {...register("monthlyTarget")}
                      placeholder="e.g. 1000000"
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-50/80 border border-slate-200/90 text-xs text-slate-900 focus:bg-white focus:border-[#F0944D] focus:ring-2 focus:ring-[#F0944D]/20 transition-all outline-none"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 5: Bank & Statutory Details */}
            {currentStep === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.25 }}
                className="space-y-5"
              >
                <div className="flex items-center justify-between pb-1">
                  <p className="text-xs text-slate-500">
                    Mandatory Indian banking & tax statutory identifiers for monthly payroll disbursal.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setValue("bankName", "HDFC Bank", { shouldValidate: true });
                      setValue("bankAccountNumber", "50100223344558", { shouldValidate: true });
                      setValue("ifscCode", "HDFC0000006", { shouldValidate: true });
                      setValue("panNumber", "ABCDE1234F", { shouldValidate: true });
                      setValue("aadhaarNumber", "890123456794", { shouldValidate: true });
                      setValue("salaryEntity", "BSPL", { shouldValidate: true });
                      setValue("pfApplicable", true, { shouldValidate: true });
                      setValue("uanNumber", "100987654321", { shouldValidate: true });
                      toast.success("Sample bank & statutory details filled.");
                    }}
                    className="text-[11px] font-semibold text-[#C66318] hover:text-[#A74E0F] hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Sparkles className="h-3 w-3 text-[#F0944D]" />
                    <span>Auto-Fill Sample</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Bank Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      {...register("bankName")}
                      placeholder="e.g. HDFC Bank, ICICI Bank"
                      className={`w-full px-4 py-2.5 rounded-2xl text-xs text-slate-900 transition-all outline-none ${
                        errors.bankName
                          ? "bg-rose-50/40 border border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                          : "bg-slate-50/80 border border-slate-200/90 focus:bg-white focus:border-[#F0944D] focus:ring-2 focus:ring-[#F0944D]/20"
                      }`}
                    />
                    {errors.bankName && (
                      <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.bankName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Bank Account Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      {...register("bankAccountNumber")}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/[^0-9]/g, "").slice(0, 18);
                        setValue("bankAccountNumber", cleaned, { shouldValidate: true });
                      }}
                      placeholder="9 to 18 digits (e.g. 50100223344558)"
                      className={`w-full px-4 py-2.5 rounded-2xl text-xs font-mono text-slate-900 transition-all outline-none ${
                        errors.bankAccountNumber
                          ? "bg-rose-50/40 border border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                          : "bg-slate-50/80 border border-slate-200/90 focus:bg-white focus:border-[#F0944D] focus:ring-2 focus:ring-[#F0944D]/20"
                      }`}
                    />
                    {errors.bankAccountNumber && (
                      <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.bankAccountNumber.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      IFSC Code <span className="text-rose-500">*</span>
                    </label>
                    <input
                      {...register("ifscCode")}
                      onChange={(e) => {
                        const cleaned = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11);
                        setValue("ifscCode", cleaned, { shouldValidate: true });
                      }}
                      placeholder="e.g. HDFC0000006"
                      autoCapitalize="characters"
                      className={`w-full px-4 py-2.5 rounded-2xl text-xs font-mono uppercase text-slate-900 transition-all outline-none ${
                        errors.ifscCode
                          ? "bg-rose-50/40 border border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                          : "bg-slate-50/80 border border-slate-200/90 focus:bg-white focus:border-[#F0944D] focus:ring-2 focus:ring-[#F0944D]/20"
                      }`}
                    />
                    {errors.ifscCode && (
                      <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.ifscCode.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      PAN Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      {...register("panNumber")}
                      onChange={(e) => {
                        const cleaned = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
                        setValue("panNumber", cleaned, { shouldValidate: true });
                      }}
                      placeholder="e.g. ABCDE1234F"
                      autoCapitalize="characters"
                      className={`w-full px-4 py-2.5 rounded-2xl text-xs font-mono uppercase text-slate-900 transition-all outline-none ${
                        errors.panNumber
                          ? "bg-rose-50/40 border border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                          : "bg-slate-50/80 border border-slate-200/90 focus:bg-white focus:border-[#F0944D] focus:ring-2 focus:ring-[#F0944D]/20"
                      }`}
                    />
                    {errors.panNumber && (
                      <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.panNumber.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Aadhaar Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      {...register("aadhaarNumber")}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/[^0-9]/g, "").slice(0, 12);
                        setValue("aadhaarNumber", cleaned, { shouldValidate: true });
                      }}
                      placeholder="12 digits (e.g. 890123456794)"
                      className={`w-full px-4 py-2.5 rounded-2xl text-xs font-mono text-slate-900 transition-all outline-none ${
                        errors.aadhaarNumber
                          ? "bg-rose-50/40 border border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                          : "bg-slate-50/80 border border-slate-200/90 focus:bg-white focus:border-[#F0944D] focus:ring-2 focus:ring-[#F0944D]/20"
                      }`}
                    />
                    {errors.aadhaarNumber && (
                      <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.aadhaarNumber.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Salary Disbursing Entity <span className="text-rose-500">*</span>
                    </label>
                    <select
                      {...register("salaryEntity")}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-50/80 border border-slate-200/90 text-xs font-bold text-slate-900 focus:bg-white focus:border-[#F0944D] focus:ring-2 focus:ring-[#F0944D]/20 transition-all outline-none"
                    >
                      <option value="BSPL">BSPL (BharatEdge Services Pvt Ltd)</option>
                      <option value="BSAPL">BSAPL (BharatEdge Analytics Pvt Ltd)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-3 pt-6">
                    <input
                      type="checkbox"
                      id="pfCheck"
                      {...register("pfApplicable")}
                      className="h-4 w-4 rounded text-slate-900 focus:ring-[#F0944D] cursor-pointer"
                    />
                    <label htmlFor="pfCheck" className="text-xs font-semibold text-slate-800 cursor-pointer">
                      PF Applicable (Provident Fund Deduction Enabled)
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      UAN Number
                    </label>
                    <input
                      {...register("uanNumber")}
                      placeholder="100987654321"
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-50/80 border border-slate-200/90 text-xs font-mono text-slate-900 focus:bg-white focus:border-[#F0944D] focus:ring-2 focus:ring-[#F0944D]/20 transition-all outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      ESIC Number
                    </label>
                    <input
                      {...register("esicNumber")}
                      placeholder="Optional"
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-50/80 border border-slate-200/90 text-xs font-mono text-slate-900 focus:bg-white focus:border-[#F0944D] focus:ring-2 focus:ring-[#F0944D]/20 transition-all outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Passport / DL Number
                    </label>
                    <input
                      {...register("passportNumber")}
                      placeholder="Optional"
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-50/80 border border-slate-200/90 text-xs font-mono text-slate-900 focus:bg-white focus:border-[#F0944D] focus:ring-2 focus:ring-[#F0944D]/20 transition-all outline-none"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 6: Documents & Verification */}
            {currentStep === 6 && (
              <motion.div
                key="step6"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">
                    Attach requisite onboarding documents and credentials (.pdf, .jpg, .jpeg, .png, .webp, max 10 MB each). Files are securely stored in Cloudflare R2.
                  </p>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                    {
                      [
                        watchedDocuments.passbook,
                        watchedDocuments.secondary,
                        watchedDocuments.graduation,
                        watchedDocuments.offer,
                        watchedDocuments.pan,
                        watchedDocuments.address,
                        watchedDocuments.statement,
                        watchedDocuments.slips,
                        watchedDocuments.photo,
                      ].filter(Boolean).length
                    } / 9 Attached
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {[
                    { label: "Passbook / Cancelled Cheque", key: "passbookChequeUrl" as const, val: watchedDocuments.passbook },
                    { label: "Secondary / Higher Secondary Proof", key: "secondaryEduProofUrl" as const, val: watchedDocuments.secondary },
                    { label: "Graduation Mark Sheets", key: "graduationMarkSheetsUrl" as const, val: watchedDocuments.graduation },
                    { label: "Offer / Relieving Letters", key: "offerRelievingLettersUrl" as const, val: watchedDocuments.offer },
                    { label: "PAN Card Copy", key: "panCardCopyUrl" as const, val: watchedDocuments.pan },
                    { label: "Address / Age Proof (Aadhaar)", key: "addressAgeProofUrl" as const, val: watchedDocuments.address },
                    { label: "Last 3 Months Bank Statement", key: "bankStatementUrl" as const, val: watchedDocuments.statement },
                    { label: "Last 3 Months Salary Slips", key: "salarySlipsUrl" as const, val: watchedDocuments.slips },
                    { label: "4 Passport Size Photos", key: "passportPhotoUrl" as const, val: watchedDocuments.photo },
                  ].map((doc) => {
                    const isUploading = uploadingKey === doc.key;
                    const isAttached = Boolean(doc.val);
                    const meta = uploadedMeta[doc.key];
                    const displayName = meta?.fileName || (doc.val ? doc.val.split("/").pop() : null);
                    const displaySize = meta?.fileSize ? `${(meta.fileSize / 1024).toFixed(0)} KB` : null;

                    return (
                      <div
                        key={doc.key}
                        className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          isAttached
                            ? "bg-emerald-50/40 border-emerald-200/80 shadow-2xs"
                            : "border-slate-200/80 bg-slate-50/60 hover:bg-slate-50/90"
                        }`}
                      >
                        <input
                          type="file"
                          ref={(el) => {
                            fileInputRefs.current[doc.key] = el;
                          }}
                          onChange={(e) => handleFileSelect(e, doc.key, doc.label)}
                          accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
                          className="hidden"
                        />

                        {/* Left: Icon & Label */}
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                              isAttached
                                ? "bg-emerald-100/90 border-emerald-200 text-emerald-700 shadow-2xs"
                                : "bg-white border-slate-200/90 text-slate-400"
                            }`}
                          >
                            {isUploading ? (
                              <Loader2 className="h-4 w-4 animate-spin text-[#F0944D]" />
                            ) : isAttached ? (
                              <FileCheck className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <UploadCloud className="h-4 w-4 text-slate-400" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-900 truncate">{doc.label}</p>
                            {isUploading ? (
                              <p className="text-[10px] text-[#F0944D] font-medium flex items-center gap-1 animate-pulse">
                                Uploading to Cloudflare R2...
                              </p>
                            ) : isAttached ? (
                              <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 truncate mt-0.5">
                                <span className="font-mono truncate max-w-[140px] sm:max-w-[180px]" title={displayName || "Attached file"}>
                                  {displayName}
                                </span>
                                {displaySize && <span className="text-[10px] text-slate-400 font-mono">({displaySize})</span>}
                              </div>
                            ) : (
                              <p className="text-[10px] text-slate-400 truncate mt-0.5">PDF, JPG, PNG or WebP · Max 10 MB</p>
                            )}
                          </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isAttached && (
                            <>
                              <a
                                href={doc.val}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="View / Preview Document"
                                className="px-2 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:border-slate-300 text-[11px] font-semibold transition-all flex items-center gap-1 shadow-2xs"
                              >
                                <ExternalLink className="h-3 w-3 text-slate-500" />
                                <span className="hidden sm:inline">View</span>
                              </a>
                              <button
                                type="button"
                                onClick={() => handleRemoveFile(doc.key, doc.label)}
                                title="Remove Attachment"
                                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            disabled={isUploading}
                            onClick={() => fileInputRefs.current[doc.key]?.click()}
                            className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                              isAttached
                                ? "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/90 shadow-2xs"
                                : "bg-slate-900 hover:bg-black text-white shadow-2xs hover:scale-[1.02] active:scale-[0.98]"
                            }`}
                          >
                            {isUploading ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                <span>Uploading...</span>
                              </>
                            ) : isAttached ? (
                              <span>Re-upload</span>
                            ) : (
                              <>
                                <UploadCloud className="h-3 w-3" />
                                <span>Attach File</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom Card Controls matching Reference Image 3 */}
          <div className="mt-10 pt-6 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 1 || isSubmitting}
              className="px-5 py-2.5 rounded-2xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-2"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Go back</span>
            </button>

            {currentStep < 6 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2.5 rounded-2xl bg-slate-900 hover:bg-black text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center gap-2"
              >
                <span>Next Step</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-7 py-2.5 rounded-2xl bg-gradient-to-r from-[#ACCAD5] via-[#E4B592] to-[#F0944D] text-slate-950 font-bold text-xs shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-slate-900" />
                    <span>Registering Employee...</span>
                  </>
                ) : (
                  <>
                    <span>Submit & Create Employee</span>
                    <Check className="h-4 w-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default EmployeeWizard;
