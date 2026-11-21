"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  X,
  Award,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Building2,
  User,
  Calendar,
  FileText,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  qualityAuditSchema,
  QualityAuditFormData,
  SerializedOperation,
} from "@/lib/validations/operation";

interface QualityAuditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operation: SerializedOperation | null;
  onAuditSubmit: (data: QualityAuditFormData) => Promise<void>;
  isSubmitting?: boolean;
}

export default function QualityAuditModal({
  open,
  onOpenChange,
  operation,
  onAuditSubmit,
  isSubmitting = false,
}: QualityAuditModalProps) {
  const [decision, setDecision] = useState<"APPROVE" | "SEND_BACK">("APPROVE");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<QualityAuditFormData>({
    resolver: zodResolver(qualityAuditSchema) as any,
    defaultValues: {
      qualityScore: 90,
      qualityFeedback: "",
      decision: "APPROVE",
    },
  });

  useEffect(() => {
    if (operation && open) {
      reset({
        qualityScore: operation.qualityScore || 90,
        qualityFeedback: operation.qualityFeedback || "",
        decision: "APPROVE",
      });
      setDecision("APPROVE");
    }
  }, [operation, open, reset]);

  if (!open || !operation) return null;

  const currentScore = watch("qualityScore");

  const handleDecisionChange = (val: "APPROVE" | "SEND_BACK") => {
    setDecision(val);
    setValue("decision", val);
  };

  const handleFormSubmit = async (data: QualityAuditFormData) => {
    await onAuditSubmit(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200/80 bg-gradient-to-r from-purple-50 via-white to-amber-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 shadow-2xs">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Quality Audit Console
                </h2>
                <Badge
                  variant="outline"
                  className="bg-purple-50 text-purple-800 border-purple-300 text-[10px] font-bold"
                >
                  Stage: QUALITY REVIEW
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Auditing: <strong className="text-slate-800">{operation.operationNumber}</strong> •{" "}
                {operation.serviceName}
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
        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-5">
          {/* Operation & Deal Summary Card */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
            <div>
              <span className="text-slate-400 font-medium">Company:</span>
              <p className="font-semibold text-slate-800 truncate">
                {operation.companyName || "N/A"}
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Parent Deal:</span>
              <p className="font-semibold text-slate-800">
                {operation.dealNumber}
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Team Department:</span>
              <p className="font-semibold text-slate-800">
                {operation.teamType}
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Assigned TL:</span>
              <p className="font-semibold text-slate-800">
                {operation.assignedTlName || "Unassigned"}
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Assigned TM:</span>
              <p className="font-semibold text-slate-800">
                {operation.assignedTmName || "Unassigned"}
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Current Sub-Stage:</span>
              <p className="font-semibold text-slate-800 truncate">
                {operation.internalStage}
              </p>
            </div>
          </div>

          {/* Audit Decision Selector (2 Big Buttons) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
              Audit Decision *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleDecisionChange("APPROVE")}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                  decision === "APPROVE"
                    ? "bg-emerald-50 border-emerald-400 text-emerald-950 ring-2 ring-emerald-400/40 shadow-xs"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div
                  className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                    decision === "APPROVE"
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold">Approve & Pass Audit</h4>
                  <p className="text-[11px] text-slate-500">
                    Meets BharatEdge quality standards
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleDecisionChange("SEND_BACK")}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                  decision === "SEND_BACK"
                    ? "bg-rose-50 border-rose-400 text-rose-950 ring-2 ring-rose-400/40 shadow-xs"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div
                  className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                    decision === "SEND_BACK"
                      ? "bg-rose-600 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <RotateCcw className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold">Return for Revision</h4>
                  <p className="text-[11px] text-slate-500">
                    Send back to Operations TM with feedback
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Score Slider & Numeric Input */}
          <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                Quality Compliance Score (1 - 100) *
              </label>
              <span
                className={`text-sm font-extrabold px-2.5 py-0.5 rounded-full border ${
                  currentScore >= 80
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                    : currentScore >= 60
                    ? "bg-amber-100 text-amber-800 border-amber-300"
                    : "bg-rose-100 text-rose-800 border-rose-300"
                }`}
              >
                {currentScore}/100
              </span>
            </div>

            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="100"
                step="1"
                {...register("qualityScore", { valueAsNumber: true })}
                className="w-full accent-purple-600 cursor-pointer"
              />
              <Input
                type="number"
                min="1"
                max="100"
                {...register("qualityScore", { valueAsNumber: true })}
                className="w-20 h-8 text-center text-xs font-bold"
              />
            </div>
            {errors.qualityScore && (
              <p className="text-[11px] text-rose-500 mt-1">
                {errors.qualityScore.message}
              </p>
            )}
          </div>

          {/* Audit Remarks & Observation */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
              Auditor Feedback & Observations *
            </label>
            <Textarea
              {...register("qualityFeedback")}
              rows={4}
              placeholder={
                decision === "APPROVE"
                  ? "Enter compliance verification remarks, checklist validation notes, and final sign-off comments..."
                  : "State exactly which documents or filings require correction by the Operations Team Member..."
              }
              className="text-xs resize-none"
            />
            {errors.qualityFeedback && (
              <p className="text-[11px] text-rose-500">
                {errors.qualityFeedback.message}
              </p>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200/80">
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
              className={`h-9 text-xs font-semibold text-white shadow-xs gap-1.5 ${
                decision === "APPROVE"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-rose-600 hover:bg-rose-700"
              }`}
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : decision === "APPROVE" ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" />
              )}
              {decision === "APPROVE" ? "Pass & Complete Audit" : "Return to Operations"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
