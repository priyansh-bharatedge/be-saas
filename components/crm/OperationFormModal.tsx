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
  INTERNAL_STAGES_BY_TEAM,
  DEFAULT_STAGES,
} from "@/lib/validations/operation";
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
      internalStage: "Initiation",
      status: "IN_PROGRESS",
      dueDate: "",
      completionDate: "",
      workflowData: {},
      qualityFeedback: "",
    },
  });

  // Populate form on open/operation change
  useEffect(() => {
    if (operation && open) {
      const stages =
        INTERNAL_STAGES_BY_TEAM[operation.teamType] || DEFAULT_STAGES;
      const initialStage =
        operation.internalStage || stages[0] || "Initiation";

      reset({
        assignedTlId: operation.assignedTlId || "",
        assignedTmId: operation.assignedTmId || "",
        internalStage: initialStage,
        status: operation.status || "IN_PROGRESS",
        dueDate: operation.dueDate
          ? new Date(operation.dueDate).toISOString().split("T")[0]
          : "",
        completionDate: operation.completionDate
          ? new Date(operation.completionDate).toISOString().split("T")[0]
          : "",
        workflowData: operation.workflowData || {},
        qualityFeedback: operation.qualityFeedback || "",
      });
    }
  }, [operation, open, reset]);

  if (!open || !operation) return null;

  const currentTeamType = operation.teamType;
  const stagesList =
    INTERNAL_STAGES_BY_TEAM[currentTeamType] || DEFAULT_STAGES;

  const handleSendToQualityClick = async () => {
    if (!operation?.id || !onSendToQuality) return;
    setIsSendingToQuality(true);
    try {
      await onSendToQuality(operation.id);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit to quality.");
    } finally {
      setIsSendingToQuality(false);
    }
  };

  const handleFormSubmit = async (data: OperationFormData) => {
    await onSubmit(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200/80 bg-gradient-to-r from-slate-50 via-white to-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#ACCAD5]/40 to-[#F0944D]/30 border border-slate-200/80 flex items-center justify-center text-slate-800 shadow-2xs">
              <GitBranch className="h-5 w-5 text-[#F0944D]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Operation File: {operation.operationNumber}
                </h2>
                <Badge
                  variant="outline"
                  className="bg-amber-50 text-amber-800 border-amber-300 text-[10px] font-bold"
                >
                  {operation.teamType}
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    operation.stage === "QUALITY"
                      ? "bg-purple-50 text-purple-800 border-purple-300 text-[10px] font-bold"
                      : "bg-sky-50 text-sky-800 border-sky-300 text-[10px] font-bold"
                  }
                >
                  Stage: {operation.stage}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Service: <strong className="text-slate-700">{operation.serviceName}</strong> • Deal:{" "}
                <span className="font-semibold text-slate-700">{operation.dealNumber}</span> ({operation.dealTitle})
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
        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* 1. Parent Deal & Client Context Card */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-[#ACCAD5]/10 via-slate-50 to-[#F0944D]/10 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-400 font-medium">Company Name:</span>
              <p className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                <Building2 className="h-3.5 w-3.5 text-slate-500" />
                {operation.companyName || "N/A"}
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Client Contact:</span>
              <p className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                <User className="h-3.5 w-3.5 text-slate-500" />
                {operation.clientName} ({operation.clientPhone})
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Booking Date:</span>
              <p className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                {new Date(operation.bookingDate).toLocaleDateString("en-IN")}
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Target Service:</span>
              <p className="font-semibold text-slate-800 truncate mt-0.5">
                {operation.serviceName}
              </p>
            </div>
          </div>

          {/* Quality Feedback Alert if Returned */}
          {operation.qualityFeedback && (
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                operation.status === "REJECTED"
                  ? "bg-rose-50 border-rose-200 text-rose-900"
                  : "bg-purple-50 border-purple-200 text-purple-900"
              }`}
            >
              <Award className="h-5 w-5 shrink-0 mt-0.5 text-[#F0944D]" />
              <div className="text-xs">
                <p className="font-bold">
                  Quality Audit Feedback (Score: {operation.qualityScore || "N/A"}/100)
                </p>
                <p className="mt-0.5 font-medium leading-relaxed">
                  {operation.qualityFeedback}
                </p>
              </div>
            </div>
          )}

          {/* 2. Team Assignment & Responsibility */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-[#F0944D]" />
              Operation Assignment & Roles
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">
                  Assigned Team Leader (TL)
                </label>
                <select
                  {...register("assignedTlId")}
                  className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#F0944D]/50 focus:border-[#F0944D]"
                >
                  <option value="">-- Select Team Leader --</option>
                  {masterData.teamLeaders.map((tl) => (
                    <option key={tl.id} value={tl.id}>
                      {tl.name} ({tl.department})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">
                  Assigned Team Member (TM)
                </label>
                <select
                  {...register("assignedTmId")}
                  className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#F0944D]/50 focus:border-[#F0944D]"
                >
                  <option value="">-- Select Team Member --</option>
                  {masterData.teamMembers.map((tm) => (
                    <option key={tm.id} value={tm.id}>
                      {tm.name} ({tm.department})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 3. Stage & Execution Progress */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-[#ACCAD5]" />
              Stage & Execution Tracking
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">
                  Internal Stage ({operation.teamType}) *
                </label>
                <select
                  {...register("internalStage")}
                  className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#F0944D]/50 focus:border-[#F0944D]"
                >
                  {stagesList.map((stg) => (
                    <option key={stg} value={stg}>
                      {stg}
                    </option>
                  ))}
                </select>
                {errors.internalStage && (
                  <p className="text-[11px] text-rose-500 mt-1">
                    {errors.internalStage.message}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">
                  Execution Status
                </label>
                <select
                  {...register("status")}
                  className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#F0944D]/50 focus:border-[#F0944D]"
                >
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="ON_HOLD">On Hold</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="REJECTED">Revision Required</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">
                  Target Due Date
                </label>
                <Input
                  type="date"
                  {...register("dueDate")}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </div>

          {/* 4. Structured Team Workflow Data (JSONB) */}
          <div className="space-y-3 p-4 rounded-xl bg-slate-50/70 border border-slate-200/80">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-slate-600" />
              {currentTeamType} Execution Fields
            </h3>

            {currentTeamType === "Team Incorporation" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-600 font-medium block mb-1">
                    MCA SRN / Filing Ref #
                  </label>
                  <Input
                    placeholder="e.g., F12345678"
                    value={watch("workflowData.srnNumber") || ""}
                    onChange={(e) =>
                      setValue("workflowData.srnNumber", e.target.value)
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-slate-600 font-medium block mb-1">
                    Director DIN / DSC Status
                  </label>
                  <Input
                    placeholder="e.g., DSC Registered, DIN Approved"
                    value={watch("workflowData.dinDscStatus") || ""}
                    onChange={(e) =>
                      setValue("workflowData.dinDscStatus", e.target.value)
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-slate-600 font-medium block mb-1">
                    CIN / Registration #
                  </label>
                  <Input
                    placeholder="e.g., U72900MH2025PTC123456"
                    value={watch("workflowData.cinNumber") || ""}
                    onChange={(e) =>
                      setValue("workflowData.cinNumber", e.target.value)
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-slate-600 font-medium block mb-1">
                    Certificate / MCA URL
                  </label>
                  <Input
                    placeholder="https://..."
                    value={watch("workflowData.certificateUrl") || ""}
                    onChange={(e) =>
                      setValue("workflowData.certificateUrl", e.target.value)
                    }
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            )}

            {currentTeamType === "Team Funding" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-600 font-medium block mb-1">
                    Pitch Deck Drive Link
                  </label>
                  <Input
                    placeholder="https://..."
                    value={watch("workflowData.pitchDeckUrl") || ""}
                    onChange={(e) =>
                      setValue("workflowData.pitchDeckUrl", e.target.value)
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-slate-600 font-medium block mb-1">
                    Target Valuation (₹)
                  </label>
                  <Input
                    placeholder="e.g., ₹10,00,00,000"
                    value={watch("workflowData.targetValuation") || ""}
                    onChange={(e) =>
                      setValue("workflowData.targetValuation", e.target.value)
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-slate-600 font-medium block mb-1">
                    Virtual Data Room (VDR) Link
                  </label>
                  <Input
                    placeholder="https://..."
                    value={watch("workflowData.dataRoomUrl") || ""}
                    onChange={(e) =>
                      setValue("workflowData.dataRoomUrl", e.target.value)
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-slate-600 font-medium block mb-1">
                    Investor Outreach Count / Stage
                  </label>
                  <Input
                    placeholder="e.g., 25 outreach, 3 termsheet calls"
                    value={watch("workflowData.investorOutreach") || ""}
                    onChange={(e) =>
                      setValue("workflowData.investorOutreach", e.target.value)
                    }
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            )}

            {currentTeamType === "Team Compliance" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-600 font-medium block mb-1">
                    Compliance Year / Assessment Cycle
                  </label>
                  <Input
                    placeholder="e.g., FY 2024-25 / AY 2025-26"
                    value={watch("workflowData.complianceCycle") || ""}
                    onChange={(e) =>
                      setValue("workflowData.complianceCycle", e.target.value)
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-slate-600 font-medium block mb-1">
                    Statutory Form Type
                  </label>
                  <Input
                    placeholder="e.g., AOC-4, MGT-7, DIR-3 KYC"
                    value={watch("workflowData.statutoryForm") || ""}
                    onChange={(e) =>
                      setValue("workflowData.statutoryForm", e.target.value)
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-slate-600 font-medium block mb-1">
                    Govt Challan / Acknowledgement #
                  </label>
                  <Input
                    placeholder="e.g., CH-2025-987654"
                    value={watch("workflowData.challanNumber") || ""}
                    onChange={(e) =>
                      setValue("workflowData.challanNumber", e.target.value)
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-slate-600 font-medium block mb-1">
                    Tax / Audit Status
                  </label>
                  <Input
                    placeholder="e.g., CA Audit Signed & Certified"
                    value={watch("workflowData.taxStatus") || ""}
                    onChange={(e) =>
                      setValue("workflowData.taxStatus", e.target.value)
                    }
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            )}

            {currentTeamType === "Team Digital Marketing" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-600 font-medium block mb-1">
                    Live Website / Wireframe URL
                  </label>
                  <Input
                    placeholder="https://..."
                    value={watch("workflowData.websiteUrl") || ""}
                    onChange={(e) =>
                      setValue("workflowData.websiteUrl", e.target.value)
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-slate-600 font-medium block mb-1">
                    Ad Account / Pixel ID
                  </label>
                  <Input
                    placeholder="e.g., ACT-991283749"
                    value={watch("workflowData.adAccountId") || ""}
                    onChange={(e) =>
                      setValue("workflowData.adAccountId", e.target.value)
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-slate-600 font-medium block mb-1">
                    Monthly Campaign Target
                  </label>
                  <Input
                    placeholder="e.g., 500 Qualified Leads @ ₹150 CPL"
                    value={watch("workflowData.campaignTarget") || ""}
                    onChange={(e) =>
                      setValue("workflowData.campaignTarget", e.target.value)
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-slate-600 font-medium block mb-1">
                    Analytics / Live Dashboard URL
                  </label>
                  <Input
                    placeholder="https://lookerstudio.google.com/..."
                    value={watch("workflowData.analyticsUrl") || ""}
                    onChange={(e) =>
                      setValue("workflowData.analyticsUrl", e.target.value)
                    }
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-slate-600 font-medium block mb-1 text-xs">
                Fulfillment Scope & Detailed Remarks
              </label>
              <Textarea
                placeholder="Enter scope details, deliverables completed, or filing instructions..."
                rows={2}
                value={watch("workflowData.remarks") || ""}
                onChange={(e) =>
                  setValue("workflowData.remarks", e.target.value)
                }
                className="text-xs"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200/80">
            <div>
              {/* TM/TL Action: Send to Quality */}
              {operation.stage === "OPERATION" && onSendToQuality && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSendingToQuality}
                  onClick={handleSendToQualityClick}
                  className="h-9 text-xs font-semibold text-purple-700 border-purple-300 hover:bg-purple-50 gap-1.5 shadow-2xs"
                  title="Mark operational work completed and submit to Quality Audit"
                >
                  {isSendingToQuality ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Award className="h-3.5 w-3.5 text-purple-600" />
                  )}
                  Send to Quality Audit
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
                disabled={isSubmitting}
                className="h-9 text-xs font-semibold bg-[#F0944D] hover:bg-[#d87c35] text-white shadow-xs gap-1.5"
              >
                {isSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                Save Execution Progress
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
