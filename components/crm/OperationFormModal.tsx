"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  X,
  GitBranch,
  Building2,
  Calendar,
  User,
  Users,
  CheckCircle2,
  Clock,
  Send,
  Loader2,
  AlertCircle,
  FileText,
  Link as LinkIcon,
  Award,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Eye,
  EyeOff,
  Sparkles,
  Plus,
  Trash2,
  Scale,
  Shield,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  operationFormSchema,
  OperationFormData,
  SerializedOperation,
  OperationMasterData,
  STANDARD_STATUSES,
  RESUBMISSION_STATUSES,
  OPERATION_STAGES,
  normalizeTeamType,
  FileAttachment,
} from "@/lib/validations/operation";
import { R2MultiFileUpload } from "./R2MultiFileUpload";
import { EmployeeSelector } from "./EmployeeSelector";
import { SocialMediaCalendar } from "./SocialMediaCalendar";
import { toast } from "sonner";

interface OperationFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operation: SerializedOperation | null;
  masterData: OperationMasterData;
  onSubmit: (data: OperationFormData) => Promise<void>;
  onSendToQuality?: (operationId: string) => Promise<void>;
  isSubmitting?: boolean;
}

export default function OperationFormModal({
  open,
  onOpenChange,
  operation,
  masterData,
  onSubmit,
  onSendToQuality,
  isSubmitting = false,
}: OperationFormModalProps) {
  const [isSendingToQuality, setIsSendingToQuality] = useState(false);
  const [showPortalPassword, setShowPortalPassword] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    sec_1: true,
    sec_2: true,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OperationFormData>({
    resolver: zodResolver(operationFormSchema) as any,
    defaultValues: {
      assignedTlId: "",
      assignedTmId: "",
      caCs1Id: "",
      caCs2Id: "",
      internalStage: "Doc Collection",
      status: "In-process",
      dueDate: "",
      completionDate: "",
      workflowData: {},
      qualityFeedback: "",
    },
  });

  const workflowData = watch("workflowData") || {};
  const teamType = normalizeTeamType(operation?.teamType);
  const companyType =
    workflowData.companyType || operation?.companyType || "PVT LTD";
  const afterAllocation = workflowData.afterAllocation || "No";

  // Toggle Accordion section
  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const setWorkflowField = (path: string, val: any) => {
    const keys = path.split(".");
    const current = { ...(watch("workflowData") || {}) };
    let temp: any = current;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!temp[keys[i]] || typeof temp[keys[i]] !== "object") {
        temp[keys[i]] = {};
      }
      temp = temp[keys[i]];
    }

    temp[keys[keys.length - 1]] = val;
    setValue("workflowData", current, { shouldDirty: true });
  };

  const getWorkflowVal = (path: string, fallback: any = ""): any => {
    const keys = path.split(".");
    let temp: any = workflowData;
    for (const k of keys) {
      if (temp === undefined || temp === null) return fallback;
      temp = temp[k];
    }
    return temp !== undefined && temp !== null ? temp : fallback;
  };

  // Populate form on open/operation change
  useEffect(() => {
    if (operation && open) {
      reset({
        assignedTlId: operation.assignedTlId || "",
        assignedTmId: operation.assignedTmId || "",
        caCs1Id: operation.caCs1Id || "",
        caCs2Id: operation.caCs2Id || "",
        internalStage: operation.internalStage || "Doc Collection",
        status: operation.status || "In-process",
        dueDate: operation.dueDate
          ? new Date(operation.dueDate).toISOString().split("T")[0]
          : "",
        completionDate: operation.completionDate
          ? new Date(operation.completionDate).toISOString().split("T")[0]
          : "",
        workflowData: operation.workflowData || {},
        qualityFeedback: operation.qualityFeedback || "",
      });

      // Expand all default sections initially
      setOpenSections({
        sec_1: true,
        sec_2: true,
        sec_3: true,
        sec_4: true,
        sec_5: true,
        sec_after: true,
      });
    }
  }, [operation, open, reset]);

  if (!open || !operation) return null;

  const handleSendToQualityClick = async () => {
    if (!operation?.id || !onSendToQuality) return;
    if (
      !confirm(
        "Send this operation to Quality? This marks the operation as Closed Won / Quality."
      )
    ) {
      return;
    }
    setIsSendingToQuality(true);
    try {
      // First save current form data
      const currentValues = watch();
      await onSubmit(currentValues);
      await onSendToQuality(operation.id);
      onOpenChange(false);
      toast.success("Operation dispatched to Quality successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit to quality.");
    } finally {
      setIsSendingToQuality(false);
    }
  };

  const handleFormSubmit = async (data: OperationFormData) => {
    await onSubmit(data);
  };

  // Helper renderer for standard section wrapper
  const renderSectionHeader = (
    id: string,
    title: string,
    statusVal?: string,
    employeeName?: string
  ) => {
    const isOpen = openSections[id] !== false;
    const isDone =
      statusVal === "Approved" ||
      statusVal === "Filed" ||
      statusVal === "Received" ||
      statusVal === "Closed Won";

    return (
      <div
        onClick={() => toggleSection(id)}
        className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 hover:bg-slate-100/70 transition-colors cursor-pointer select-none"
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
              isDone
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-200 text-slate-700"
            }`}
          >
            {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-3.5 w-3.5" />}
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">{title}</h4>
            {employeeName && (
              <p className="text-[10px] text-slate-400">Assigned: {employeeName}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {statusVal && (
            <Badge
              variant="outline"
              className={`text-[10px] font-semibold ${
                isDone
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                  : statusVal === "Rejected"
                  ? "bg-rose-50 text-rose-800 border-rose-300"
                  : "bg-white text-slate-700 border-slate-300"
              }`}
            >
              {statusVal}
            </Badge>
          )}
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-200/80 bg-gradient-to-r from-slate-50 via-white to-slate-50 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#ACCAD5]/40 to-[#F0944D]/30 border border-slate-200/80 flex items-center justify-center text-slate-800 shadow-2xs">
              <GitBranch className="h-5 w-5 text-[#F0944D]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  {operation.operationNumber}
                </h2>
                <Badge
                  variant="outline"
                  className="bg-amber-50 text-amber-800 border-amber-300 text-[10px] font-bold"
                >
                  {teamType}
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    operation.stage === "QUALITY"
                      ? "bg-purple-50 text-purple-800 border-purple-300 text-[10px] font-bold"
                      : "bg-sky-50 text-sky-800 border-sky-300 text-[10px] font-bold"
                  }
                >
                  Stage: {watch("internalStage") || operation.internalStage}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Service: <strong className="text-slate-800">{operation.serviceName}</strong> • Deal:{" "}
                <span className="font-semibold text-slate-800">{operation.dealNumber}</span> ({operation.dealTitle})
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content Form */}
        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="p-6 space-y-6 max-h-[82vh] overflow-y-auto"
        >
          {/* 1. Parent Deal & Client Summary Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#ACCAD5]/15 via-white to-[#F0944D]/15 border border-slate-200/80 shadow-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-400 font-medium">Company / Entity:</span>
              <p className="font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                <Building2 className="h-3.5 w-3.5 text-slate-500" />
                {operation.companyName || "N/A"}
              </p>
              <p className="text-[10px] text-slate-500">{companyType}</p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Client Contact:</span>
              <p className="font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                <User className="h-3.5 w-3.5 text-slate-500" />
                {operation.clientName}
              </p>
              <p className="text-[10px] text-slate-500">{operation.clientPhone}</p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Deal Reference:</span>
              <p className="font-bold text-slate-900 flex items-center gap-1.5 mt-0.5 font-mono">
                {operation.dealNumber}
              </p>
              <p className="text-[10px] text-slate-500">
                Booked: {new Date(operation.bookingDate).toLocaleDateString("en-IN")}
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Service Line:</span>
              <p className="font-bold text-slate-900 truncate mt-0.5" title={operation.serviceName}>
                {operation.serviceName}
              </p>
              <p className="text-[10px] text-emerald-600 font-semibold">
                Value: ₹{Number(operation.dealValue || 0).toLocaleString("en-IN")}
              </p>
            </div>
          </div>

          {/* Quality Feedback Alert if returned for revision */}
          {operation.qualityFeedback && (
            <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200 text-purple-950 flex items-start gap-3">
              <Award className="h-5 w-5 shrink-0 mt-0.5 text-purple-600" />
              <div className="text-xs">
                <p className="font-bold">
                  Quality Audit Feedback (Score: {operation.qualityScore || "N/A"}/100)
                </p>
                <p className="mt-0.5 text-slate-700 whitespace-pre-line">
                  {operation.qualityFeedback}
                </p>
              </div>
            </div>
          )}

          {/* 2. Common Header Operational Routing & Assignments */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Users className="h-4 w-4 text-[#F0944D]" />
                <span>Common Operational Assignments & Stage Routing</span>
              </h3>
              <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600">
                Server RBAC Synchronized
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {/* Stage Dropdown */}
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Overall Stage Dropdown
                </label>
                <select
                  {...register("internalStage")}
                  className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs bg-white text-slate-900 focus:outline-none focus:border-[#588594]"
                >
                  {OPERATION_STAGES.map((stg) => (
                    <option key={stg} value={stg}>
                      {stg}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Execution Status
                </label>
                <select
                  {...register("status")}
                  className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs bg-white text-slate-900 focus:outline-none focus:border-[#588594]"
                >
                  {STANDARD_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {/* Team Leader (TL) */}
              <div>
                <EmployeeSelector
                  label="Team Leader (TL)"
                  value={watch("assignedTlId")}
                  onChange={(id) => setValue("assignedTlId", id, { shouldDirty: true })}
                  employees={masterData.teamLeaders.map((tl) => ({
                    id: tl.id,
                    name: tl.name,
                    department: tl.department,
                    designation: "Team Leader",
                  }))}
                  placeholder="Select Team Leader"
                />
              </div>

              {/* Team Member (TM) */}
              <div>
                <EmployeeSelector
                  label="Team Member (TM)"
                  value={watch("assignedTmId")}
                  onChange={(id) => setValue("assignedTmId", id, { shouldDirty: true })}
                  employees={masterData.teamMembers.map((tm) => ({
                    id: tm.id,
                    name: tm.name,
                    department: tm.department,
                    designation: "Team Member",
                  }))}
                  placeholder="Select Team Member"
                />
              </div>

              {/* CA / CS 1 & 2 (Render strictly for Incorporation and Compliance) */}
              {(teamType === "Incorporation" || teamType === "Compliance") && (
                <>
                  <div>
                    <EmployeeSelector
                      label="CA / CS 1 (Chartered / Company Secretary)"
                      value={watch("caCs1Id")}
                      onChange={(id) => setValue("caCs1Id", id, { shouldDirty: true })}
                      employees={masterData.caCsList}
                      placeholder="Select CA / CS 1"
                    />
                  </div>

                  <div>
                    <EmployeeSelector
                      label="CA / CS 2 (Second Reviewer)"
                      value={watch("caCs2Id")}
                      onChange={(id) => setValue("caCs2Id", id, { shouldDirty: true })}
                      employees={masterData.caCsList}
                      placeholder="Select CA / CS 2"
                    />
                  </div>
                </>
              )}

              {/* Due Date */}
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Target Due Date
                </label>
                <Input type="date" {...register("dueDate")} className="h-8 text-xs bg-white" />
              </div>

              {/* Completion Date */}
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Completion Date
                </label>
                <Input
                  type="date"
                  {...register("completionDate")}
                  className="h-8 text-xs bg-white"
                />
              </div>
            </div>
          </div>

          {/* 3. DYNAMIC WORKFLOW SECTIONS BY TEAM TYPE */}

          {/* ========================================================
              TEAM TYPE A: INCORPORATION
              ======================================================== */}
          {teamType === "Incorporation" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Incorporation Workflow Sections
                </h3>
                <span className="text-[11px] text-slate-400">
                  Company Type: <strong>{companyType}</strong>
                </span>
              </div>

              {/* Section 1: Doc Collection */}
              <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-2xs">
                {renderSectionHeader(
                  "inc_sec_1",
                  "1. Document Collection & KYC Verification",
                  getWorkflowVal("docCollection.status", "Pending")
                )}
                {openSections.inc_sec_1 !== false && (
                  <div className="p-4 space-y-3.5 border-t border-slate-100">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <EmployeeSelector
                        label="Assignee (Name)"
                        value={getWorkflowVal("docCollection.employeeId")}
                        onChange={(id) => setWorkflowField("docCollection.employeeId", id)}
                        employees={masterData.allEmployees}
                      />
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                          Date
                        </label>
                        <Input
                          type="date"
                          value={getWorkflowVal("docCollection.date")}
                          onChange={(e) => setWorkflowField("docCollection.date", e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                          Status
                        </label>
                        <select
                          value={getWorkflowVal("docCollection.status", "Pending")}
                          onChange={(e) => setWorkflowField("docCollection.status", e.target.value)}
                          className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs bg-white"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Received">Received</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                          Company Type
                        </label>
                        <select
                          value={companyType}
                          onChange={(e) => setWorkflowField("companyType", e.target.value)}
                          className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs bg-white"
                        >
                          <option value="PVT LTD">PVT LTD (Private Limited)</option>
                          <option value="LLP">LLP (Limited Liability Partnership)</option>
                          <option value="Section 8">Section 8 (Non-Profit)</option>
                        </select>
                      </div>
                    </div>
                    <R2MultiFileUpload
                      label="KYC Documents (Multiple Uploads)"
                      value={getWorkflowVal("docCollection.files", [])}
                      onChange={(files) => setWorkflowField("docCollection.files", files)}
                      folder="incorporation/doc-collection"
                    />
                  </div>
                )}
              </div>

              {/* Section 2: Name Application (With Resubmission Loop if Rejected) */}
              <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-2xs">
                {renderSectionHeader(
                  "inc_sec_2",
                  "2. Name Application (RUN / SPICe+ Part A)",
                  getWorkflowVal("nameApplication.status", "In-process")
                )}
                {openSections.inc_sec_2 !== false && (
                  <div className="p-4 space-y-3.5 border-t border-slate-100">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      <EmployeeSelector
                        label="Assignee (Name)"
                        value={getWorkflowVal("nameApplication.employeeId")}
                        onChange={(id) => setWorkflowField("nameApplication.employeeId", id)}
                        employees={masterData.allEmployees}
                      />
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                          Approved Name
                        </label>
                        <Input
                          placeholder="e.g. Acme Technologies Pvt Ltd"
                          value={getWorkflowVal("nameApplication.approvedName")}
                          onChange={(e) =>
                            setWorkflowField("nameApplication.approvedName", e.target.value)
                          }
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                          Date
                        </label>
                        <Input
                          type="date"
                          value={getWorkflowVal("nameApplication.date")}
                          onChange={(e) =>
                            setWorkflowField("nameApplication.date", e.target.value)
                          }
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                          Status (Resubmission Trigger)
                        </label>
                        <select
                          value={getWorkflowVal("nameApplication.status", "In-process")}
                          onChange={(e) =>
                            setWorkflowField("nameApplication.status", e.target.value)
                          }
                          className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs bg-white font-medium"
                        >
                          {RESUBMISSION_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <R2MultiFileUpload
                      label="Name Approval Challans & Approvals"
                      value={getWorkflowVal("nameApplication.files", [])}
                      onChange={(files) => setWorkflowField("nameApplication.files", files)}
                      folder="incorporation/name-application"
                    />

                    {/* REPEATABLE RESUBMISSION LOOP IF REJECTED */}
                    {(getWorkflowVal("nameApplication.status") === "Rejected" ||
                      (getWorkflowVal("nameApplication.resubmissions", []) || []).length > 0) && (
                      <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                            <AlertCircle className="h-4 w-4 text-rose-600" />
                            <span>Name Application Resubmission Attempts</span>
                          </h5>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const existing = getWorkflowVal("nameApplication.resubmissions", []);
                              setWorkflowField("nameApplication.resubmissions", [
                                ...existing,
                                {
                                  attemptNumber: existing.length + 2,
                                  employeeId: "",
                                  approvedName: "",
                                  date: new Date().toISOString().split("T")[0],
                                  status: "In-process",
                                  files: [],
                                },
                              ]);
                            }}
                            className="h-7 text-xs bg-white text-rose-700 border-rose-300 hover:bg-rose-50"
                          >
                            + Add Resubmission Attempt
                          </Button>
                        </div>

                        {(getWorkflowVal("nameApplication.resubmissions", []) || []).map(
                          (resub: any, rIdx: number) => (
                            <div
                              key={rIdx}
                              className="p-3 rounded-lg bg-white border border-rose-200 shadow-2xs space-y-2.5"
                            >
                              <div className="flex items-center justify-between border-b border-rose-100 pb-1.5">
                                <span className="font-bold text-xs text-rose-800">
                                  Resubmission #{rIdx + 2}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const existing = getWorkflowVal(
                                      "nameApplication.resubmissions",
                                      []
                                    );
                                    setWorkflowField(
                                      "nameApplication.resubmissions",
                                      existing.filter((_: any, idx: number) => idx !== rIdx)
                                    );
                                  }}
                                  className="text-slate-400 hover:text-rose-600"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                                <EmployeeSelector
                                  label="Assignee"
                                  value={resub.employeeId}
                                  onChange={(id) => {
                                    const existing = [
                                      ...getWorkflowVal("nameApplication.resubmissions", []),
                                    ];
                                    existing[rIdx].employeeId = id;
                                    setWorkflowField("nameApplication.resubmissions", existing);
                                  }}
                                  employees={masterData.allEmployees}
                                />
                                <div>
                                  <label className="text-[10px] font-semibold text-slate-600 block mb-1">
                                    Proposed Name
                                  </label>
                                  <Input
                                    value={resub.approvedName || ""}
                                    onChange={(e) => {
                                      const existing = [
                                        ...getWorkflowVal("nameApplication.resubmissions", []),
                                      ];
                                      existing[rIdx].approvedName = e.target.value;
                                      setWorkflowField("nameApplication.resubmissions", existing);
                                    }}
                                    className="h-8 text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-semibold text-slate-600 block mb-1">
                                    Date
                                  </label>
                                  <Input
                                    type="date"
                                    value={resub.date || ""}
                                    onChange={(e) => {
                                      const existing = [
                                        ...getWorkflowVal("nameApplication.resubmissions", []),
                                      ];
                                      existing[rIdx].date = e.target.value;
                                      setWorkflowField("nameApplication.resubmissions", existing);
                                    }}
                                    className="h-8 text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-semibold text-slate-600 block mb-1">
                                    Status
                                  </label>
                                  <select
                                    value={resub.status || "In-process"}
                                    onChange={(e) => {
                                      const existing = [
                                        ...getWorkflowVal("nameApplication.resubmissions", []),
                                      ];
                                      existing[rIdx].status = e.target.value;
                                      setWorkflowField("nameApplication.resubmissions", existing);
                                    }}
                                    className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs bg-white"
                                  >
                                    {RESUBMISSION_STATUSES.map((st) => (
                                      <option key={st} value={st}>
                                        {st}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Section 3: DSC Creation */}
              <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-2xs">
                {renderSectionHeader(
                  "inc_sec_3",
                  "3. DSC Creation & Registration",
                  getWorkflowVal("dscCreation.status", "Pending")
                )}
                {openSections.inc_sec_3 !== false && (
                  <div className="p-4 space-y-3 border-t border-slate-100">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <EmployeeSelector
                        label="Assignee (Name)"
                        value={getWorkflowVal("dscCreation.employeeId")}
                        onChange={(id) => setWorkflowField("dscCreation.employeeId", id)}
                        employees={masterData.allEmployees}
                      />
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                          Date
                        </label>
                        <Input
                          type="date"
                          value={getWorkflowVal("dscCreation.date")}
                          onChange={(e) => setWorkflowField("dscCreation.date", e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                          Status
                        </label>
                        <select
                          value={getWorkflowVal("dscCreation.status", "Pending")}
                          onChange={(e) => setWorkflowField("dscCreation.status", e.target.value)}
                          className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs bg-white"
                        >
                          {STANDARD_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 4: Final Filing (SPICe+ Part B) */}
              <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-2xs">
                {renderSectionHeader(
                  "inc_sec_4",
                  "4. Final Filing (SPICe+ Part B / FiLLiP)",
                  getWorkflowVal("finalFiling.status", "Pending")
                )}
                {openSections.inc_sec_4 !== false && (
                  <div className="p-4 space-y-3.5 border-t border-slate-100">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <EmployeeSelector
                        label="Assignee (Name)"
                        value={getWorkflowVal("finalFiling.employeeId")}
                        onChange={(id) => setWorkflowField("finalFiling.employeeId", id)}
                        employees={masterData.allEmployees}
                      />
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                          Date
                        </label>
                        <Input
                          type="date"
                          value={getWorkflowVal("finalFiling.date")}
                          onChange={(e) => setWorkflowField("finalFiling.date", e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                          Status (Resubmission Trigger)
                        </label>
                        <select
                          value={getWorkflowVal("finalFiling.status", "Pending")}
                          onChange={(e) => setWorkflowField("finalFiling.status", e.target.value)}
                          className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs bg-white font-medium"
                        >
                          {RESUBMISSION_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <R2MultiFileUpload
                      label="Final Filing Forms, SRN Challans & COI"
                      value={getWorkflowVal("finalFiling.files", [])}
                      onChange={(files) => setWorkflowField("finalFiling.files", files)}
                      folder="incorporation/final-filing"
                    />

                    {/* Resubmission Loop for Final Filing if Rejected */}
                    {(getWorkflowVal("finalFiling.status") === "Rejected" ||
                      (getWorkflowVal("finalFiling.resubmissions", []) || []).length > 0) && (
                      <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                            <AlertCircle className="h-4 w-4 text-rose-600" />
                            <span>Final Filing Resubmission Attempts</span>
                          </h5>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const existing = getWorkflowVal("finalFiling.resubmissions", []);
                              setWorkflowField("finalFiling.resubmissions", [
                                ...existing,
                                {
                                  attemptNumber: existing.length + 2,
                                  employeeId: "",
                                  date: new Date().toISOString().split("T")[0],
                                  status: "In-process",
                                  files: [],
                                },
                              ]);
                            }}
                            className="h-7 text-xs bg-white text-rose-700 border-rose-300 hover:bg-rose-50"
                          >
                            + Add Resubmission Attempt
                          </Button>
                        </div>

                        {(getWorkflowVal("finalFiling.resubmissions", []) || []).map(
                          (resub: any, rIdx: number) => (
                            <div
                              key={rIdx}
                              className="p-3 rounded-lg bg-white border border-rose-200 shadow-2xs space-y-2.5"
                            >
                              <div className="flex items-center justify-between border-b border-rose-100 pb-1.5">
                                <span className="font-bold text-xs text-rose-800">
                                  Final Filing Resubmission #{rIdx + 2}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const existing = getWorkflowVal(
                                      "finalFiling.resubmissions",
                                      []
                                    );
                                    setWorkflowField(
                                      "finalFiling.resubmissions",
                                      existing.filter((_: any, idx: number) => idx !== rIdx)
                                    );
                                  }}
                                  className="text-slate-400 hover:text-rose-600"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                                <EmployeeSelector
                                  label="Assignee"
                                  value={resub.employeeId}
                                  onChange={(id) => {
                                    const existing = [
                                      ...getWorkflowVal("finalFiling.resubmissions", []),
                                    ];
                                    existing[rIdx].employeeId = id;
                                    setWorkflowField("finalFiling.resubmissions", existing);
                                  }}
                                  employees={masterData.allEmployees}
                                />
                                <div>
                                  <label className="text-[10px] font-semibold text-slate-600 block mb-1">
                                    Date
                                  </label>
                                  <Input
                                    type="date"
                                    value={resub.date || ""}
                                    onChange={(e) => {
                                      const existing = [
                                        ...getWorkflowVal("finalFiling.resubmissions", []),
                                      ];
                                      existing[rIdx].date = e.target.value;
                                      setWorkflowField("finalFiling.resubmissions", existing);
                                    }}
                                    className="h-8 text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-semibold text-slate-600 block mb-1">
                                    Status
                                  </label>
                                  <select
                                    value={resub.status || "In-process"}
                                    onChange={(e) => {
                                      const existing = [
                                        ...getWorkflowVal("finalFiling.resubmissions", []),
                                      ];
                                      existing[rIdx].status = e.target.value;
                                      setWorkflowField("finalFiling.resubmissions", existing);
                                    }}
                                    className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs bg-white"
                                  >
                                    {RESUBMISSION_STATUSES.map((st) => (
                                      <option key={st} value={st}>
                                        {st}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* CONDITIONAL GATE: AFTER ALLOCATION (YES / NO) */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-white to-amber-500/5 border border-amber-300 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/80 pb-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-amber-600" />
                      <span>Post-Incorporation Compliance Gate: After Allocation</span>
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Set to &quot;Yes&quot; to reveal mandatory post-allocation filings for {companyType}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700">After Allocation:</span>
                    <select
                      value={afterAllocation}
                      onChange={(e) => setWorkflowField("afterAllocation", e.target.value)}
                      className="h-8 px-3 rounded-lg border-2 border-amber-400 bg-white text-xs font-bold text-slate-900"
                    >
                      <option value="No">No (Hide Post-Allocation)</option>
                      <option value="Yes">Yes (Display Post-Allocation)</option>
                    </select>
                  </div>
                </div>

                {afterAllocation === "Yes" && (
                  <div className="space-y-3 animate-in fade-in duration-200">
                    {/* IF PVT LTD or Section 8 */}
                    {(companyType === "PVT LTD" || companyType === "Section 8") && (
                      <>
                        {/* 1. Board Resolution */}
                        <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-3">
                          <h5 className="text-xs font-bold text-slate-900">
                            1. Board Resolution
                          </h5>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <EmployeeSelector
                              label="Assignee"
                              value={getWorkflowVal("boardResolution.employeeId")}
                              onChange={(id) => setWorkflowField("boardResolution.employeeId", id)}
                              employees={masterData.allEmployees}
                            />
                            <div>
                              <label className="text-[10px] font-semibold text-slate-600 block mb-1">Date</label>
                              <Input
                                type="date"
                                value={getWorkflowVal("boardResolution.date")}
                                onChange={(e) => setWorkflowField("boardResolution.date", e.target.value)}
                                className="h-8 text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-slate-600 block mb-1">Status</label>
                              <select
                                value={getWorkflowVal("boardResolution.status", "In-process")}
                                onChange={(e) => setWorkflowField("boardResolution.status", e.target.value)}
                                className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs bg-white"
                              >
                                {STANDARD_STATUSES.map((st) => (
                                  <option key={st} value={st}>{st}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <R2MultiFileUpload
                            label="Board Resolution Documents"
                            value={getWorkflowVal("boardResolution.files", [])}
                            onChange={(files) => setWorkflowField("boardResolution.files", files)}
                            folder="incorporation/board-resolution"
                          />
                        </div>

                        {/* 2. 2-Share Certificate */}
                        <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-3">
                          <h5 className="text-xs font-bold text-slate-900">
                            2. 2-Share Certificate Issuance
                          </h5>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <EmployeeSelector
                              label="Assignee"
                              value={getWorkflowVal("shareCertificate.employeeId")}
                              onChange={(id) => setWorkflowField("shareCertificate.employeeId", id)}
                              employees={masterData.allEmployees}
                            />
                            <div>
                              <label className="text-[10px] font-semibold text-slate-600 block mb-1">Date</label>
                              <Input
                                type="date"
                                value={getWorkflowVal("shareCertificate.date")}
                                onChange={(e) => setWorkflowField("shareCertificate.date", e.target.value)}
                                className="h-8 text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-slate-600 block mb-1">Status</label>
                              <select
                                value={getWorkflowVal("shareCertificate.status", "In-process")}
                                onChange={(e) => setWorkflowField("shareCertificate.status", e.target.value)}
                                className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs bg-white"
                              >
                                {STANDARD_STATUSES.map((st) => (
                                  <option key={st} value={st}>{st}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <R2MultiFileUpload
                            label="Share Certificates (Stamped / Issued)"
                            value={getWorkflowVal("shareCertificate.files", [])}
                            onChange={(files) => setWorkflowField("shareCertificate.files", files)}
                            folder="incorporation/share-certificates"
                          />
                        </div>

                        {/* 3. MSME Certificate */}
                        <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-3">
                          <h5 className="text-xs font-bold text-slate-900">
                            3. MSME (Udyam) Registration
                          </h5>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <EmployeeSelector
                              label="Assignee"
                              value={getWorkflowVal("msmeCertificate.employeeId")}
                              onChange={(id) => setWorkflowField("msmeCertificate.employeeId", id)}
                              employees={masterData.allEmployees}
                            />
                            <div>
                              <label className="text-[10px] font-semibold text-slate-600 block mb-1">Date</label>
                              <Input
                                type="date"
                                value={getWorkflowVal("msmeCertificate.date")}
                                onChange={(e) => setWorkflowField("msmeCertificate.date", e.target.value)}
                                className="h-8 text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-slate-600 block mb-1">Status</label>
                              <select
                                value={getWorkflowVal("msmeCertificate.status", "In-process")}
                                onChange={(e) => setWorkflowField("msmeCertificate.status", e.target.value)}
                                className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs bg-white"
                              >
                                {STANDARD_STATUSES.map((st) => (
                                  <option key={st} value={st}>{st}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <R2MultiFileUpload
                            label="Udyam Certificate"
                            value={getWorkflowVal("msmeCertificate.files", [])}
                            onChange={(files) => setWorkflowField("msmeCertificate.files", files)}
                            folder="incorporation/msme"
                          />
                        </div>

                        {/* 4. ADT-1 */}
                        <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-3">
                          <h5 className="text-xs font-bold text-slate-900">
                            4. Form ADT-1 (Auditor Appointment)
                          </h5>
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                            <EmployeeSelector
                              label="Assignee"
                              value={getWorkflowVal("adt1.employeeId")}
                              onChange={(id) => setWorkflowField("adt1.employeeId", id)}
                              employees={masterData.allEmployees}
                            />
                            <div>
                              <label className="text-[10px] font-semibold text-slate-600 block mb-1">Auditor Name</label>
                              <Input
                                placeholder="Auditor / Firm Name"
                                value={getWorkflowVal("adt1.auditorName")}
                                onChange={(e) => setWorkflowField("adt1.auditorName", e.target.value)}
                                className="h-8 text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-slate-600 block mb-1">Date</label>
                              <Input
                                type="date"
                                value={getWorkflowVal("adt1.date")}
                                onChange={(e) => setWorkflowField("adt1.date", e.target.value)}
                                className="h-8 text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-slate-600 block mb-1">Status</label>
                              <select
                                value={getWorkflowVal("adt1.status", "In-process")}
                                onChange={(e) => setWorkflowField("adt1.status", e.target.value)}
                                className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs bg-white"
                              >
                                {STANDARD_STATUSES.map((st) => (
                                  <option key={st} value={st}>{st}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <R2MultiFileUpload
                            label="ADT-1 Filing Challan & Consent Letter"
                            value={getWorkflowVal("adt1.files", [])}
                            onChange={(files) => setWorkflowField("adt1.files", files)}
                            folder="incorporation/adt-1"
                          />
                        </div>

                        {/* 5. INC 20-A */}
                        <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-3">
                          <h5 className="text-xs font-bold text-slate-900">
                            5. Form INC 20-A (Commencement of Business)
                          </h5>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <EmployeeSelector
                              label="Assignee"
                              value={getWorkflowVal("inc20a.employeeId")}
                              onChange={(id) => setWorkflowField("inc20a.employeeId", id)}
                              employees={masterData.allEmployees}
                            />
                            <div>
                              <label className="text-[10px] font-semibold text-slate-600 block mb-1">Date</label>
                              <Input
                                type="date"
                                value={getWorkflowVal("inc20a.date")}
                                onChange={(e) => setWorkflowField("inc20a.date", e.target.value)}
                                className="h-8 text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-slate-600 block mb-1">Status</label>
                              <select
                                value={getWorkflowVal("inc20a.status", "In-process")}
                                onChange={(e) => setWorkflowField("inc20a.status", e.target.value)}
                                className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs bg-white"
                              >
                                {STANDARD_STATUSES.map((st) => (
                                  <option key={st} value={st}>{st}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <R2MultiFileUpload
                            label="INC 20-A Filing Proof & Bank Statement"
                            value={getWorkflowVal("inc20a.files", [])}
                            onChange={(files) => setWorkflowField("inc20a.files", files)}
                            folder="incorporation/inc-20a"
                          />
                        </div>
                      </>
                    )}

                    {/* IF LLP */}
                    {companyType === "LLP" && (
                      <>
                        {/* 1. LLP Agreement Preparation */}
                        <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-3">
                          <h5 className="text-xs font-bold text-slate-900">
                            1. LLP Agreement Drafting & Stamping
                          </h5>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <EmployeeSelector
                              label="Assignee"
                              value={getWorkflowVal("llpAgreement.employeeId")}
                              onChange={(id) => setWorkflowField("llpAgreement.employeeId", id)}
                              employees={masterData.allEmployees}
                            />
                            <div>
                              <label className="text-[10px] font-semibold text-slate-600 block mb-1">Date</label>
                              <Input
                                type="date"
                                value={getWorkflowVal("llpAgreement.date")}
                                onChange={(e) => setWorkflowField("llpAgreement.date", e.target.value)}
                                className="h-8 text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-slate-600 block mb-1">Status</label>
                              <select
                                value={getWorkflowVal("llpAgreement.status", "In-process")}
                                onChange={(e) => setWorkflowField("llpAgreement.status", e.target.value)}
                                className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs bg-white"
                              >
                                {STANDARD_STATUSES.map((st) => (
                                  <option key={st} value={st}>{st}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <R2MultiFileUpload
                            label="Executed LLP Agreement"
                            value={getWorkflowVal("llpAgreement.files", [])}
                            onChange={(files) => setWorkflowField("llpAgreement.files", files)}
                            folder="incorporation/llp-agreement"
                          />
                        </div>

                        {/* 2. MSME Certificate */}
                        <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-3">
                          <h5 className="text-xs font-bold text-slate-900">
                            2. MSME (Udyam) Registration
                          </h5>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <EmployeeSelector
                              label="Assignee"
                              value={getWorkflowVal("msmeCertificate.employeeId")}
                              onChange={(id) => setWorkflowField("msmeCertificate.employeeId", id)}
                              employees={masterData.allEmployees}
                            />
                            <div>
                              <label className="text-[10px] font-semibold text-slate-600 block mb-1">Date</label>
                              <Input
                                type="date"
                                value={getWorkflowVal("msmeCertificate.date")}
                                onChange={(e) => setWorkflowField("msmeCertificate.date", e.target.value)}
                                className="h-8 text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-slate-600 block mb-1">Status</label>
                              <select
                                value={getWorkflowVal("msmeCertificate.status", "In-process")}
                                onChange={(e) => setWorkflowField("msmeCertificate.status", e.target.value)}
                                className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs bg-white"
                              >
                                {STANDARD_STATUSES.map((st) => (
                                  <option key={st} value={st}>{st}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <R2MultiFileUpload
                            label="MSME Certificate"
                            value={getWorkflowVal("msmeCertificate.files", [])}
                            onChange={(files) => setWorkflowField("msmeCertificate.files", files)}
                            folder="incorporation/msme-llp"
                          />
                        </div>

                        {/* 3. Form 3 */}
                        <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-3">
                          <h5 className="text-xs font-bold text-slate-900">
                            3. Form 3 (Filing of LLP Agreement)
                          </h5>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <EmployeeSelector
                              label="Assignee"
                              value={getWorkflowVal("form3.employeeId")}
                              onChange={(id) => setWorkflowField("form3.employeeId", id)}
                              employees={masterData.allEmployees}
                            />
                            <div>
                              <label className="text-[10px] font-semibold text-slate-600 block mb-1">Date</label>
                              <Input
                                type="date"
                                value={getWorkflowVal("form3.date")}
                                onChange={(e) => setWorkflowField("form3.date", e.target.value)}
                                className="h-8 text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-slate-600 block mb-1">Status</label>
                              <select
                                value={getWorkflowVal("form3.status", "In-process")}
                                onChange={(e) => setWorkflowField("form3.status", e.target.value)}
                                className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs bg-white"
                              >
                                {STANDARD_STATUSES.map((st) => (
                                  <option key={st} value={st}>{st}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <R2MultiFileUpload
                            label="Form 3 Challan & Approval"
                            value={getWorkflowVal("form3.files", [])}
                            onChange={(files) => setWorkflowField("form3.files", files)}
                            folder="incorporation/form-3"
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================
              TEAM TYPE B: COMPLIANCE
              ======================================================== */}
          {teamType === "Compliance" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Compliance Fulfillment Sections
                </h3>
                <span className="text-[11px] text-slate-400">
                  Company Type: <strong>{companyType}</strong>
                </span>
              </div>

              {/* 1. Doc Collection */}
              <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-white space-y-3">
                <h5 className="text-xs font-bold text-slate-900">
                  1. Document Collection & Statutory Intake
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  <EmployeeSelector
                    label="Assignee"
                    value={getWorkflowVal("docCollection.employeeId")}
                    onChange={(id) => setWorkflowField("docCollection.employeeId", id)}
                    employees={masterData.allEmployees}
                  />
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">Date</label>
                    <Input
                      type="date"
                      value={getWorkflowVal("docCollection.date")}
                      onChange={(e) => setWorkflowField("docCollection.date", e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">Status</label>
                    <select
                      value={getWorkflowVal("docCollection.status", "Pending")}
                      onChange={(e) => setWorkflowField("docCollection.status", e.target.value)}
                      className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs bg-white"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Received">Received</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">Company Type</label>
                    <select
                      value={companyType}
                      onChange={(e) => setWorkflowField("companyType", e.target.value)}
                      className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs bg-white"
                    >
                      <option value="PVT LTD">PVT LTD</option>
                      <option value="LLP">LLP</option>
                      <option value="Section 8">Section 8</option>
                    </select>
                  </div>
                </div>
                <R2MultiFileUpload
                  label="Statutory Records & Accounting Files"
                  value={getWorkflowVal("docCollection.files", [])}
                  onChange={(files) => setWorkflowField("docCollection.files", files)}
                  folder="compliance/doc-collection"
                />
              </div>

              {/* 2. Director ITR */}
              <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-white space-y-3">
                <h5 className="text-xs font-bold text-slate-900">
                  2. Director Income Tax Returns (ITR)
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
                  <EmployeeSelector
                    label="Assignee"
                    value={getWorkflowVal("directorItr.employeeId")}
                    onChange={(id) => setWorkflowField("directorItr.employeeId", id)}
                    employees={masterData.allEmployees}
                  />
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">Date</label>
                    <Input
                      type="date"
                      value={getWorkflowVal("directorItr.date")}
                      onChange={(e) => setWorkflowField("directorItr.date", e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">Status</label>
                    <select
                      value={getWorkflowVal("directorItr.status", "In-process")}
                      onChange={(e) => setWorkflowField("directorItr.status", e.target.value)}
                      className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs bg-white"
                    >
                      {STANDARD_STATUSES.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">File Required</label>
                    <select
                      value={getWorkflowVal("directorItr.fileRequired", "Yes")}
                      onChange={(e) => setWorkflowField("directorItr.fileRequired", e.target.value)}
                      className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs bg-white"
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">Doc Collection</label>
                    <select
                      value={getWorkflowVal("directorItr.docCollection", "No")}
                      onChange={(e) => setWorkflowField("directorItr.docCollection", e.target.value)}
                      className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs bg-white"
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </div>
                </div>
                <R2MultiFileUpload
                  label="Director ITR Computation & Acknowledgments"
                  value={getWorkflowVal("directorItr.files", [])}
                  onChange={(files) => setWorkflowField("directorItr.files", files)}
                  folder="compliance/director-itr"
                />
              </div>

              {/* 3. Accounting */}
              <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-white space-y-3">
                <h5 className="text-xs font-bold text-slate-900">
                  3. Financial Accounting & Bookkeeping
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  <EmployeeSelector
                    label="Assignee"
                    value={getWorkflowVal("accounting.employeeId")}
                    onChange={(id) => setWorkflowField("accounting.employeeId", id)}
                    employees={masterData.allEmployees}
                  />
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">Date</label>
                    <Input
                      type="date"
                      value={getWorkflowVal("accounting.date")}
                      onChange={(e) => setWorkflowField("accounting.date", e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">Status</label>
                    <select
                      value={getWorkflowVal("accounting.status", "In-process")}
                      onChange={(e) => setWorkflowField("accounting.status", e.target.value)}
                      className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs bg-white"
                    >
                      {STANDARD_STATUSES.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">Doc Collection</label>
                    <select
                      value={getWorkflowVal("accounting.docCollection", "Pending")}
                      onChange={(e) => setWorkflowField("accounting.docCollection", e.target.value)}
                      className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs bg-white"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>
                <R2MultiFileUpload
                  label="Ledger, Tally / Zoho Backups & Bank Statements"
                  value={getWorkflowVal("accounting.files", [])}
                  onChange={(files) => setWorkflowField("accounting.files", files)}
                  folder="compliance/accounting"
                />
              </div>

              {/* 4. Audit */}
              <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-white space-y-3">
                <h5 className="text-xs font-bold text-slate-900">
                  4. Statutory & Tax Audit
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  <EmployeeSelector
                    label="Assignee"
                    value={getWorkflowVal("audit.employeeId")}
                    onChange={(id) => setWorkflowField("audit.employeeId", id)}
                    employees={masterData.allEmployees}
                  />
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">Date</label>
                    <Input
                      type="date"
                      value={getWorkflowVal("audit.date")}
                      onChange={(e) => setWorkflowField("audit.date", e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">Status</label>
                    <select
                      value={getWorkflowVal("audit.status", "In-process")}
                      onChange={(e) => setWorkflowField("audit.status", e.target.value)}
                      className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs bg-white"
                    >
                      {STANDARD_STATUSES.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">Doc Collection</label>
                    <select
                      value={getWorkflowVal("audit.docCollection", "Pending")}
                      onChange={(e) => setWorkflowField("audit.docCollection", e.target.value)}
                      className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs bg-white"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Done">Done</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>
                <R2MultiFileUpload
                  label="Independent Auditor Reports & Balance Sheets"
                  value={getWorkflowVal("audit.files", [])}
                  onChange={(files) => setWorkflowField("audit.files", files)}
                  folder="compliance/audit"
                />
              </div>

              {/* 5. Company ITR */}
              <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-white space-y-3">
                <h5 className="text-xs font-bold text-slate-900">
                  5. Corporate Income Tax Return (ITR-6 / ITR-5)
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  <EmployeeSelector
                    label="Assignee"
                    value={getWorkflowVal("companyItr.employeeId")}
                    onChange={(id) => setWorkflowField("companyItr.employeeId", id)}
                    employees={masterData.allEmployees}
                  />
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">Date</label>
                    <Input
                      type="date"
                      value={getWorkflowVal("companyItr.date")}
                      onChange={(e) => setWorkflowField("companyItr.date", e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">Status</label>
                    <select
                      value={getWorkflowVal("companyItr.status", "In-process")}
                      onChange={(e) => setWorkflowField("companyItr.status", e.target.value)}
                      className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs bg-white"
                    >
                      {STANDARD_STATUSES.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">Document Verified</label>
                    <select
                      value={getWorkflowVal("companyItr.document", "Yes")}
                      onChange={(e) => setWorkflowField("companyItr.document", e.target.value)}
                      className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs bg-white"
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                </div>
                <R2MultiFileUpload
                  label="Company ITR Form & Ack Receipt"
                  value={getWorkflowVal("companyItr.files", [])}
                  onChange={(files) => setWorkflowField("companyItr.files", files)}
                  folder="compliance/company-itr"
                />
              </div>

              {/* COMPANY-TYPE-SPECIFIC BASE COMPLIANCE SECTIONS */}
              {(companyType === "PVT LTD" || companyType === "Section 8") && (
                <>
                  {/* 6. DPT-3 */}
                  <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-white space-y-3">
                    <h5 className="text-xs font-bold text-slate-900">
                      6. Form DPT-3 (Return of Deposits)
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <EmployeeSelector
                        label="Assignee"
                        value={getWorkflowVal("dpt3.employeeId")}
                        onChange={(id) => setWorkflowField("dpt3.employeeId", id)}
                        employees={masterData.allEmployees}
                      />
                      <div>
                        <label className="text-[10px] font-semibold text-slate-600 block mb-1">Date</label>
                        <Input
                          type="date"
                          value={getWorkflowVal("dpt3.date")}
                          onChange={(e) => setWorkflowField("dpt3.date", e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-600 block mb-1">Status</label>
                        <select
                          value={getWorkflowVal("dpt3.status", "In-process")}
                          onChange={(e) => setWorkflowField("dpt3.status", e.target.value)}
                          className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs bg-white"
                        >
                          {STANDARD_STATUSES.map((st) => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <R2MultiFileUpload
                      label="DPT-3 MCA Filing & Challan"
                      value={getWorkflowVal("dpt3.files", [])}
                      onChange={(files) => setWorkflowField("dpt3.files", files)}
                      folder="compliance/dpt-3"
                    />
                  </div>

                  {/* 7. AOC-4 */}
                  <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-white space-y-3">
                    <h5 className="text-xs font-bold text-slate-900">
                      7. Form AOC-4 (Filing of Financial Statements with ROC)
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <EmployeeSelector
                        label="Assignee"
                        value={getWorkflowVal("aoc4.employeeId")}
                        onChange={(id) => setWorkflowField("aoc4.employeeId", id)}
                        employees={masterData.allEmployees}
                      />
                      <div>
                        <label className="text-[10px] font-semibold text-slate-600 block mb-1">Date</label>
                        <Input
                          type="date"
                          value={getWorkflowVal("aoc4.date")}
                          onChange={(e) => setWorkflowField("aoc4.date", e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-600 block mb-1">Status</label>
                        <select
                          value={getWorkflowVal("aoc4.status", "In-process")}
                          onChange={(e) => setWorkflowField("aoc4.status", e.target.value)}
                          className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs bg-white"
                        >
                          {STANDARD_STATUSES.map((st) => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <R2MultiFileUpload
                      label="AOC-4 Form & SRN Receipt"
                      value={getWorkflowVal("aoc4.files", [])}
                      onChange={(files) => setWorkflowField("aoc4.files", files)}
                      folder="compliance/aoc-4"
                    />
                  </div>

                  {/* 8. MGT-7 / 7A */}
                  <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-white space-y-3">
                    <h5 className="text-xs font-bold text-slate-900">
                      8. Form MGT-7 / MGT-7A (Annual Return)
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <EmployeeSelector
                        label="Assignee"
                        value={getWorkflowVal("mgt7.employeeId")}
                        onChange={(id) => setWorkflowField("mgt7.employeeId", id)}
                        employees={masterData.allEmployees}
                      />
                      <div>
                        <label className="text-[10px] font-semibold text-slate-600 block mb-1">Date</label>
                        <Input
                          type="date"
                          value={getWorkflowVal("mgt7.date")}
                          onChange={(e) => setWorkflowField("mgt7.date", e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-600 block mb-1">Status</label>
                        <select
                          value={getWorkflowVal("mgt7.status", "In-process")}
                          onChange={(e) => setWorkflowField("mgt7.status", e.target.value)}
                          className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs bg-white"
                        >
                          {STANDARD_STATUSES.map((st) => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <R2MultiFileUpload
                      label="MGT-7/7A Filing & SRN Receipt"
                      value={getWorkflowVal("mgt7.files", [])}
                      onChange={(files) => setWorkflowField("mgt7.files", files)}
                      folder="compliance/mgt-7"
                    />
                  </div>
                </>
              )}

              {/* IF LLP BASE COMPLIANCE SECTIONS */}
              {companyType === "LLP" && (
                <>
                  {/* 6. Form 11 */}
                  <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-white space-y-3">
                    <h5 className="text-xs font-bold text-slate-900">
                      6. Form 11 (Annual Return of LLP)
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <EmployeeSelector
                        label="Assignee"
                        value={getWorkflowVal("form11.employeeId")}
                        onChange={(id) => setWorkflowField("form11.employeeId", id)}
                        employees={masterData.allEmployees}
                      />
                      <div>
                        <label className="text-[10px] font-semibold text-slate-600 block mb-1">Date</label>
                        <Input
                          type="date"
                          value={getWorkflowVal("form11.date")}
                          onChange={(e) => setWorkflowField("form11.date", e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-600 block mb-1">Status</label>
                        <select
                          value={getWorkflowVal("form11.status", "In-process")}
                          onChange={(e) => setWorkflowField("form11.status", e.target.value)}
                          className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs bg-white"
                        >
                          {STANDARD_STATUSES.map((st) => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <R2MultiFileUpload
                      label="Form 11 Challan & MCA Copy"
                      value={getWorkflowVal("form11.files", [])}
                      onChange={(files) => setWorkflowField("form11.files", files)}
                      folder="compliance/form-11"
                    />
                  </div>

                  {/* 7. Form 8 */}
                  <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-white space-y-3">
                    <h5 className="text-xs font-bold text-slate-900">
                      7. Form 8 (Statement of Account & Solvency)
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                      <EmployeeSelector
                        label="Assignee"
                        value={getWorkflowVal("form8.employeeId")}
                        onChange={(id) => setWorkflowField("form8.employeeId", id)}
                        employees={masterData.allEmployees}
                      />
                      <div>
                        <label className="text-[10px] font-semibold text-slate-600 block mb-1">Date</label>
                        <Input
                          type="date"
                          value={getWorkflowVal("form8.date")}
                          onChange={(e) => setWorkflowField("form8.date", e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-600 block mb-1">Status</label>
                        <select
                          value={getWorkflowVal("form8.status", "In-process")}
                          onChange={(e) => setWorkflowField("form8.status", e.target.value)}
                          className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs bg-white"
                        >
                          {STANDARD_STATUSES.map((st) => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-600 block mb-1">Audit Report</label>
                        <select
                          value={getWorkflowVal("form8.auditReport", "No")}
                          onChange={(e) => setWorkflowField("form8.auditReport", e.target.value)}
                          className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs bg-white"
                        >
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                      </div>
                    </div>
                    <R2MultiFileUpload
                      label="Form 8 MCA Filing & Attachments"
                      value={getWorkflowVal("form8.files", [])}
                      onChange={(files) => setWorkflowField("form8.files", files)}
                      folder="compliance/form-8"
                    />
                  </div>
                </>
              )}

              {/* CONDITIONAL GATE: AFTER ALLOCATION (YES / NO) */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-white to-amber-500/5 border border-amber-300 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/80 pb-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-amber-600" />
                      <span>Post-Allocation Gate (Compliance): After Allocation</span>
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Set to &quot;Yes&quot; to display post-allocation statutory filings
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700">After Allocation:</span>
                    <select
                      value={afterAllocation}
                      onChange={(e) => setWorkflowField("afterAllocation", e.target.value)}
                      className="h-8 px-3 rounded-lg border-2 border-amber-400 bg-white text-xs font-bold text-slate-900"
                    >
                      <option value="No">No (Hide Post-Allocation)</option>
                      <option value="Yes">Yes (Display Post-Allocation)</option>
                    </select>
                  </div>
                </div>

                {afterAllocation === "Yes" && (
                  <div className="space-y-3 animate-in fade-in duration-200">
                    {(companyType === "PVT LTD" || companyType === "Section 8") && (
                      <>
                        {/* ADT-1 */}
                        <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-3">
                          <h5 className="text-xs font-bold text-slate-900">Form ADT-1</h5>
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                            <EmployeeSelector
                              label="Assignee"
                              value={getWorkflowVal("adt1.employeeId")}
                              onChange={(id) => setWorkflowField("adt1.employeeId", id)}
                              employees={masterData.allEmployees}
                            />
                            <div>
                              <label className="text-[10px] font-semibold text-slate-600 block mb-1">Auditor Name</label>
                              <Input
                                placeholder="Auditor Name"
                                value={getWorkflowVal("adt1.auditorName")}
                                onChange={(e) => setWorkflowField("adt1.auditorName", e.target.value)}
                                className="h-8 text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-slate-600 block mb-1">Date</label>
                              <Input
                                type="date"
                                value={getWorkflowVal("adt1.date")}
                                onChange={(e) => setWorkflowField("adt1.date", e.target.value)}
                                className="h-8 text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-slate-600 block mb-1">Status</label>
                              <select
                                value={getWorkflowVal("adt1.status", "In-process")}
                                onChange={(e) => setWorkflowField("adt1.status", e.target.value)}
                                className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs bg-white"
                              >
                                {STANDARD_STATUSES.map((st) => (
                                  <option key={st} value={st}>{st}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <R2MultiFileUpload
                            label="ADT-1 Files"
                            value={getWorkflowVal("adt1.files", [])}
                            onChange={(files) => setWorkflowField("adt1.files", files)}
                            folder="compliance/adt-1"
                          />
                        </div>

                        {/* INC 20-A */}
                        <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-3">
                          <h5 className="text-xs font-bold text-slate-900">Form INC 20-A</h5>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <EmployeeSelector
                              label="Assignee"
                              value={getWorkflowVal("inc20a.employeeId")}
                              onChange={(id) => setWorkflowField("inc20a.employeeId", id)}
                              employees={masterData.allEmployees}
                            />
                            <div>
                              <label className="text-[10px] font-semibold text-slate-600 block mb-1">Date</label>
                              <Input
                                type="date"
                                value={getWorkflowVal("inc20a.date")}
                                onChange={(e) => setWorkflowField("inc20a.date", e.target.value)}
                                className="h-8 text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-slate-600 block mb-1">Status</label>
                              <select
                                value={getWorkflowVal("inc20a.status", "In-process")}
                                onChange={(e) => setWorkflowField("inc20a.status", e.target.value)}
                                className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs bg-white"
                              >
                                {STANDARD_STATUSES.map((st) => (
                                  <option key={st} value={st}>{st}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <R2MultiFileUpload
                            label="INC 20-A Files"
                            value={getWorkflowVal("inc20a.files", [])}
                            onChange={(files) => setWorkflowField("inc20a.files", files)}
                            folder="compliance/inc-20a"
                          />
                        </div>
                      </>
                    )}

                    {companyType === "LLP" && (
                      <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-3">
                        <h5 className="text-xs font-bold text-slate-900">Form 3 (LLP Agreement)</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <EmployeeSelector
                            label="Assignee"
                            value={getWorkflowVal("form3.employeeId")}
                            onChange={(id) => setWorkflowField("form3.employeeId", id)}
                            employees={masterData.allEmployees}
                          />
                          <div>
                            <label className="text-[10px] font-semibold text-slate-600 block mb-1">Date</label>
                            <Input
                              type="date"
                              value={getWorkflowVal("form3.date")}
                              onChange={(e) => setWorkflowField("form3.date", e.target.value)}
                              className="h-8 text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-slate-600 block mb-1">Status</label>
                            <select
                              value={getWorkflowVal("form3.status", "In-process")}
                              onChange={(e) => setWorkflowField("form3.status", e.target.value)}
                              className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs bg-white"
                            >
                              {STANDARD_STATUSES.map((st) => (
                                <option key={st} value={st}>{st}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <R2MultiFileUpload
                          label="Form 3 Files"
                          value={getWorkflowVal("form3.files", [])}
                          onChange={(files) => setWorkflowField("form3.files", files)}
                          folder="compliance/form-3"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================
              TEAM TYPE C: FUNDING
              ======================================================== */}
          {teamType === "Funding" && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Funding & Pitch Deck Workflow
              </h3>

              {/* 1. DPR / Pitch Deck Creation */}
              <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-white space-y-3">
                <h5 className="text-xs font-bold text-slate-900">
                  1. DPR / Pitch Deck Creation
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <EmployeeSelector
                    label="Assignee"
                    value={getWorkflowVal("dprPitchDeck.employeeId")}
                    onChange={(id) => setWorkflowField("dprPitchDeck.employeeId", id)}
                    employees={masterData.allEmployees}
                  />
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">Date</label>
                    <Input
                      type="date"
                      value={getWorkflowVal("dprPitchDeck.date")}
                      onChange={(e) => setWorkflowField("dprPitchDeck.date", e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">Status</label>
                    <select
                      value={getWorkflowVal("dprPitchDeck.status", "In-process")}
                      onChange={(e) => setWorkflowField("dprPitchDeck.status", e.target.value)}
                      className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs bg-white"
                    >
                      {STANDARD_STATUSES.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <R2MultiFileUpload
                  label="Pitch Deck Presentations & DPR Documents"
                  value={getWorkflowVal("dprPitchDeck.files", [])}
                  onChange={(files) => setWorkflowField("dprPitchDeck.files", files)}
                  folder="funding/pitch-decks"
                />
              </div>

              {/* 2. Finance */}
              <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-white space-y-3">
                <h5 className="text-xs font-bold text-slate-900">
                  2. Financial Modeling & Valuation
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <EmployeeSelector
                    label="Assignee"
                    value={getWorkflowVal("finance.employeeId")}
                    onChange={(id) => setWorkflowField("finance.employeeId", id)}
                    employees={masterData.allEmployees}
                  />
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">Date</label>
                    <Input
                      type="date"
                      value={getWorkflowVal("finance.date")}
                      onChange={(e) => setWorkflowField("finance.date", e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">Status</label>
                    <select
                      value={getWorkflowVal("finance.status", "In-process")}
                      onChange={(e) => setWorkflowField("finance.status", e.target.value)}
                      className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs bg-white"
                    >
                      {STANDARD_STATUSES.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <R2MultiFileUpload
                  label="Financial Projections & CMA Data"
                  value={getWorkflowVal("finance.files", [])}
                  onChange={(files) => setWorkflowField("finance.files", files)}
                  folder="funding/finance"
                />
              </div>

              {/* 3. Application Submission */}
              <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-white space-y-3">
                <h5 className="text-xs font-bold text-slate-900">
                  3. Application Submission (Grant / Portal / Bank)
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <EmployeeSelector
                    label="Assignee"
                    value={getWorkflowVal("applicationSubmission.employeeId")}
                    onChange={(id) => setWorkflowField("applicationSubmission.employeeId", id)}
                    employees={masterData.allEmployees}
                  />
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">Date</label>
                    <Input
                      type="date"
                      value={getWorkflowVal("applicationSubmission.date")}
                      onChange={(e) =>
                        setWorkflowField("applicationSubmission.date", e.target.value)
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">Status</label>
                    <select
                      value={getWorkflowVal("applicationSubmission.status", "In-process")}
                      onChange={(e) =>
                        setWorkflowField("applicationSubmission.status", e.target.value)
                      }
                      className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs bg-white"
                    >
                      {STANDARD_STATUSES.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">Portal ID</label>
                    <Input
                      placeholder="Username / Application ID"
                      value={getWorkflowVal("applicationSubmission.portalId")}
                      onChange={(e) =>
                        setWorkflowField("applicationSubmission.portalId", e.target.value)
                      }
                      className="h-8 text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">Portal Password</label>
                    <div className="relative">
                      <Input
                        type={showPortalPassword ? "text" : "password"}
                        placeholder="Portal credentials"
                        value={getWorkflowVal("applicationSubmission.portalPassword")}
                        onChange={(e) =>
                          setWorkflowField("applicationSubmission.portalPassword", e.target.value)
                        }
                        className="h-8 text-xs pr-8"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPortalPassword(!showPortalPassword)}
                        className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                      >
                        {showPortalPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">Registration / Application Number</label>
                    <Input
                      placeholder="Reg / Ack Number"
                      value={getWorkflowVal("applicationSubmission.registrationNumber")}
                      onChange={(e) =>
                        setWorkflowField("applicationSubmission.registrationNumber", e.target.value)
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                <R2MultiFileUpload
                  label="Submission Acknowledgments & Sanction Letters"
                  value={getWorkflowVal("applicationSubmission.files", [])}
                  onChange={(files) =>
                    setWorkflowField("applicationSubmission.files", files)
                  }
                  folder="funding/applications"
                />
              </div>
            </div>
          )}

          {/* ========================================================
              TEAM TYPE D: CERTIFICATION
              ======================================================== */}
          {teamType === "Certification" && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Certification & Licensing Workflow
              </h3>

              {/* 1. Doc Collection / DSC */}
              <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-white space-y-3">
                <h5 className="text-xs font-bold text-slate-900">
                  1. Document Collection & DSC Verification
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <EmployeeSelector
                    label="Assignee"
                    value={getWorkflowVal("docCollectionDsc.employeeId")}
                    onChange={(id) => setWorkflowField("docCollectionDsc.employeeId", id)}
                    employees={masterData.allEmployees}
                  />
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">Date</label>
                    <Input
                      type="date"
                      value={getWorkflowVal("docCollectionDsc.date")}
                      onChange={(e) => setWorkflowField("docCollectionDsc.date", e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">Status</label>
                    <select
                      value={getWorkflowVal("docCollectionDsc.status", "In-process")}
                      onChange={(e) => setWorkflowField("docCollectionDsc.status", e.target.value)}
                      className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs bg-white"
                    >
                      {STANDARD_STATUSES.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <R2MultiFileUpload
                  label="Audit Checklists & Technical Evidence"
                  value={getWorkflowVal("docCollectionDsc.files", [])}
                  onChange={(files) => setWorkflowField("docCollectionDsc.files", files)}
                  folder="certification/doc-collection"
                />
              </div>

              {/* 2. Final Application */}
              <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-white space-y-3">
                <h5 className="text-xs font-bold text-slate-900">
                  2. Final Application & Certificate Issuance
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <EmployeeSelector
                    label="Assignee"
                    value={getWorkflowVal("finalApplication.employeeId")}
                    onChange={(id) => setWorkflowField("finalApplication.employeeId", id)}
                    employees={masterData.allEmployees}
                  />
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">Date</label>
                    <Input
                      type="date"
                      value={getWorkflowVal("finalApplication.date")}
                      onChange={(e) => setWorkflowField("finalApplication.date", e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">Status</label>
                    <select
                      value={getWorkflowVal("finalApplication.status", "In-process")}
                      onChange={(e) => setWorkflowField("finalApplication.status", e.target.value)}
                      className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs bg-white"
                    >
                      {STANDARD_STATUSES.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <R2MultiFileUpload
                  label="Issued Certificates & Licenses"
                  value={getWorkflowVal("finalApplication.files", [])}
                  onChange={(files) => setWorkflowField("finalApplication.files", files)}
                  folder="certification/final"
                />
              </div>
            </div>
          )}

          {/* ========================================================
              TEAM TYPE E: DIGITAL MARKETING
              ======================================================== */}
          {teamType === "Digital Marketing" && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Digital Marketing Execution Engine
              </h3>

              {/* 1. Service Scope & Onboarding */}
              <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-white space-y-3">
                <h5 className="text-xs font-bold text-slate-900">
                  1. Service Scope & Brand Onboarding
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">Service Track</label>
                    <select
                      value={getWorkflowVal("serviceScope.serviceTrack", "Website")}
                      onChange={(e) => setWorkflowField("serviceScope.serviceTrack", e.target.value)}
                      className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs bg-white font-medium"
                    >
                      <option value="Website">Website Development</option>
                      <option value="SEO">Search Engine Optimization (SEO)</option>
                      <option value="Social Media Marketing">Social Media Marketing</option>
                      <option value="Performance Ads">Performance Ads (Meta / Google)</option>
                    </select>
                  </div>
                  <EmployeeSelector
                    label="Assignee"
                    value={getWorkflowVal("serviceScope.employeeId")}
                    onChange={(id) => setWorkflowField("serviceScope.employeeId", id)}
                    employees={masterData.allEmployees}
                  />
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">Date</label>
                    <Input
                      type="date"
                      value={getWorkflowVal("serviceScope.date")}
                      onChange={(e) => setWorkflowField("serviceScope.date", e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">Status</label>
                    <select
                      value={getWorkflowVal("serviceScope.status", "In-process")}
                      onChange={(e) => setWorkflowField("serviceScope.status", e.target.value)}
                      className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs bg-white"
                    >
                      {STANDARD_STATUSES.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <R2MultiFileUpload
                  label="Brand Assets, Logos & Client Questionnaire Briefs"
                  value={getWorkflowVal("serviceScope.files", [])}
                  onChange={(files) => setWorkflowField("serviceScope.files", files)}
                  folder="marketing/brand-assets"
                />
              </div>

              {/* 2. Website & SEO Execution Tracker */}
              <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-white space-y-3">
                <h5 className="text-xs font-bold text-slate-900">
                  2. Website & SEO Execution Tracker
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">Milestones / Deliverables</label>
                    <Input
                      placeholder="e.g. Sitemap, Wireframes, Page Copy, On-page Audit"
                      value={getWorkflowVal("executionTracker.milestones")}
                      onChange={(e) => setWorkflowField("executionTracker.milestones", e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">Live URL</label>
                    <div className="relative">
                      <Input
                        placeholder="https://clientdomain.com"
                        value={getWorkflowVal("executionTracker.liveUrl")}
                        onChange={(e) => setWorkflowField("executionTracker.liveUrl", e.target.value)}
                        className="h-8 text-xs pr-8"
                      />
                      {getWorkflowVal("executionTracker.liveUrl") && (
                        <a
                          href={getWorkflowVal("executionTracker.liveUrl")}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute right-2 top-2 text-slate-400 hover:text-sky-600"
                          title="Open Live URL"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                  <EmployeeSelector
                    label="Assignee"
                    value={getWorkflowVal("executionTracker.employeeId")}
                    onChange={(id) => setWorkflowField("executionTracker.employeeId", id)}
                    employees={masterData.allEmployees}
                  />
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">Date</label>
                    <Input
                      type="date"
                      value={getWorkflowVal("executionTracker.date")}
                      onChange={(e) => setWorkflowField("executionTracker.date", e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">Status</label>
                    <select
                      value={getWorkflowVal("executionTracker.status", "In-process")}
                      onChange={(e) => setWorkflowField("executionTracker.status", e.target.value)}
                      className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs bg-white"
                    >
                      {STANDARD_STATUSES.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <R2MultiFileUpload
                  label="Keyword Reports, Technical SEO Audits & Backlink Sheets"
                  value={getWorkflowVal("executionTracker.files", [])}
                  onChange={(files) => setWorkflowField("executionTracker.files", files)}
                  folder="marketing/seo-reports"
                />
              </div>

              {/* 3. Interactive Social Media Content Calendar */}
              <SocialMediaCalendar
                posts={getWorkflowVal("socialMediaCalendar", [])}
                onChange={(posts) => setWorkflowField("socialMediaCalendar", posts)}
                employees={masterData.allEmployees}
              />
            </div>
          )}

          {/* Modal Action Footer */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-0 bg-white/95 backdrop-blur-md py-3 z-10">
            {/* Send to Quality Trigger */}
            <div>
              {onSendToQuality && operation.stage !== "QUALITY" && (
                <Button
                  type="button"
                  onClick={handleSendToQualityClick}
                  disabled={isSendingToQuality || isSubmitting}
                  className="h-9 px-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-xs gap-1.5"
                >
                  {isSendingToQuality ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  <span>Send to Quality (Closed Won)</span>
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-9 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || isSendingToQuality}
                className="h-9 px-4 rounded-xl bg-gradient-to-r from-[#ACCAD5] to-[#F0944D] text-slate-900 font-bold text-xs shadow-xs hover:opacity-95 gap-1.5"
              >
                {isSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                <span>Save Operation File</span>
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
