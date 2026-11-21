"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Cog,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Edit2,
  Phone,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import { SerializedOperation } from "@/lib/validations/operation";

interface OperationDetailModalProps {
  operation: SerializedOperation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
  canEdit?: boolean;
}

export default function OperationDetailModal({
  operation,
  open,
  onOpenChange,
  onEdit,
  canEdit = true,
}: OperationDetailModalProps) {
  if (!operation) return null;

  const getStageBadge = (stage: string) => {
    switch (stage) {
      case "QUALITY_PASSED":
      case "COMPLETED":
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">{stage.replace(/_/g, " ")}</Badge>;
      case "SENT_TO_QUALITY":
        return <Badge className="bg-purple-50 text-purple-700 border-purple-200">Sent to Quality</Badge>;
      case "IN_PROGRESS":
        return <Badge className="bg-sky-50 text-sky-700 border-sky-200">In Progress</Badge>;
      case "BLOCKED":
        return <Badge className="bg-rose-50 text-rose-700 border-rose-200">Blocked</Badge>;
      default:
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200">Pending Intake</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-xl border border-slate-200/80 shadow-2xl rounded-2xl p-6">
        <DialogHeader className="border-b border-slate-100 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#ACCAD5]/30 to-[#F0944D]/20 flex items-center justify-center text-slate-800">
                <Cog className="h-5 w-5 text-[#F0944D]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-lg font-bold text-slate-900">
                    {operation.serviceName}
                  </DialogTitle>
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                    {operation.operationNumber}
                  </span>
                </div>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Team: {operation.teamType} • Booked: {operation.bookingDate}
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {getStageBadge(operation.stage)}
              {canEdit && onEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onOpenChange(false);
                    onEdit();
                  }}
                  className="h-8 text-xs font-semibold text-slate-700 border-slate-200 hover:bg-slate-50 gap-1.5"
                >
                  <Edit2 className="h-3.5 w-3.5 text-[#F0944D]" />
                  Update Workflow
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-3 text-xs text-slate-700">
          {/* Linked Deal & Client Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 space-y-2">
              <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
                <Briefcase className="h-4 w-4 text-[#F0944D]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Parent Deal Details</h4>
              </div>
              <div className="space-y-1.5 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px]">Deal Number:</span>
                  <p className="font-mono font-semibold text-slate-900">{operation.dealNumber}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Deal Title:</span>
                  <p className="font-semibold text-slate-800">{operation.dealTitle}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 space-y-2">
              <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
                <Building2 className="h-4 w-4 text-sky-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Client & Entity</h4>
              </div>
              <div className="space-y-1.5 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px]">Client Name & Phone:</span>
                  <p className="font-semibold text-slate-800">
                    {operation.clientName} ({operation.clientPhone})
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Company / Organization:</span>
                  <p className="font-semibold text-slate-800">{operation.companyName || "—"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Assigned Operations Staff & Timeline */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 space-y-2.5">
            <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
              <Users className="h-4 w-4 text-emerald-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Staff Alignment & Timeline
              </h4>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400 text-[11px]">Team Leader:</span>
                <p className="font-semibold text-slate-800">{operation.assignedTlName || "Unassigned"}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[11px]">Executing Specialist (TM):</span>
                <p className="font-semibold text-slate-800">{operation.assignedTmName || "Unassigned"}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[11px]">Target Due Date:</span>
                <p className="font-medium text-slate-700">{operation.dueDate || "Not set"}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[11px]">Fulfillment Date:</span>
                <p className="font-medium text-slate-700">{operation.completionDate || "In progress"}</p>
              </div>
            </div>
          </div>

          {/* Quality Audit Section */}
          {(operation.qualityScore !== null || operation.qualityFeedback) && (
            <div className="rounded-xl border border-purple-100 bg-purple-50/30 p-4 space-y-2">
              <div className="flex items-center gap-2 border-b border-purple-100 pb-2">
                <ShieldCheck className="h-4 w-4 text-purple-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900">
                  Quality Audit Evaluation
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px]">Quality Score:</span>
                  <p className="font-extrabold text-base text-purple-800">
                    {operation.qualityScore !== null ? `${operation.qualityScore}/100` : "—"}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-400 text-[11px]">Auditor Feedback:</span>
                  <p className="text-slate-700 mt-0.5">{operation.qualityFeedback || "Approved without remarks"}</p>
                </div>
              </div>
            </div>
          )}

          {/* Workflow Data / Custom Steps */}
          {operation.workflowData && Object.keys(operation.workflowData).length > 0 && (
            <div className="rounded-xl border border-slate-200/80 bg-white p-4 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Fulfillment Attributes & Milestones
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                {Object.entries(operation.workflowData).map(([key, val]) => (
                  <div key={key} className="p-2 rounded bg-slate-50 border border-slate-100 text-xs">
                    <span className="text-[10px] text-slate-400 font-medium uppercase">{key}:</span>
                    <p className="font-medium text-slate-800 truncate">{String(val)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 mt-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-xs text-slate-600"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
