"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  GitMerge,
  Plus,
  Play,
  Pause,
  Trash2,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Bell,
  Sparkles,
  Workflow,
  Layers,
  Filter,
} from "lucide-react";
import WorkflowBuilderModal from "./WorkflowBuilderModal";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import {
  toggleHrmsWorkflowStatusAction,
  deleteHrmsWorkflowAction,
} from "@/lib/actions/workflow";

interface WorkflowItem {
  id: string;
  name: string;
  description?: string | null;
  module: string;
  triggerAction: string;
  departmentScope: string;
  intimationRecipients: string[];
  isActive: boolean;
  createdAt: string;
  createdByName: string;
  executionCount: number;
  steps: {
    id: string;
    stepOrder: number;
    approverRole?: string | null;
    approverName?: string | null;
    isMandatory: boolean;
  }[];
}

interface WorkflowsViewProps {
  initialWorkflows: WorkflowItem[];
}

export default function WorkflowsView({ initialWorkflows }: WorkflowsViewProps) {
  const [workflows, setWorkflows] = useState<WorkflowItem[]>(initialWorkflows);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState("ALL");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleToggle = (id: string, currentStatus: boolean) => {
    startTransition(async () => {
      const res = await toggleHrmsWorkflowStatusAction(id, !currentStatus);
      if (res.success) {
        setWorkflows((prev) =>
          prev.map((w) => (w.id === id ? { ...w, isActive: !currentStatus } : w))
        );
        toast.success(`Workflow ${!currentStatus ? "activated" : "paused"}.`);
      } else {
        toast.error(res.error || "Failed to update workflow status.");
      }
    });
  };

  const handleDelete = () => {
    if (!deletingId) return;

    startTransition(async () => {
      const res = await deleteHrmsWorkflowAction(deletingId);
      if (res.success) {
        setWorkflows((prev) => prev.filter((w) => w.id !== deletingId));
        toast.success("Workflow deleted successfully.");
        setDeletingId(null);
      } else {
        toast.error(res.error || "Failed to delete workflow.");
      }
    });
  };

  const filtered = workflows.filter((w) => {
    if (selectedModule !== "ALL" && w.module !== selectedModule) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Dynamic HRMS Workflow Engine</h2>
            <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Active Runtime
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Configure automated approval pipelines, intimations, and multi-tier governance rules across all HRMS modules (Leaves, Regularizations, Reimbursements, Appraisals, etc.).
          </p>
        </div>

        <Button
          onClick={() => setIsBuilderOpen(true)}
          className="rounded-full bg-gradient-to-r from-[#ACCAD5] to-[#F0944D] text-white font-semibold text-xs px-5 py-2.5 shadow-xs cursor-pointer flex items-center gap-2 self-start sm:self-center"
        >
          <Plus className="h-4 w-4" />
          Create New Workflow
        </Button>
      </div>

      {/* Module Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {["ALL", "LEAVE", "ATTENDANCE_REGULARIZATION", "REIMBURSEMENT", "RESIGNATION", "PERFORMANCE", "PAYROLL", "HELPDESK", "SURVEY"].map(
          (mod) => (
            <button
              key={mod}
              onClick={() => setSelectedModule(mod)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedModule === mod
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "bg-white/80 text-slate-600 hover:bg-slate-100 border border-slate-200/70"
              }`}
            >
              {mod === "ALL" ? "All Modules" : mod.replace(/_/g, " ")}
            </button>
          )
        )}
      </div>

      {/* Workflows List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white/60 rounded-3xl border border-slate-200/60 p-8">
          <Workflow className="h-10 w-10 mx-auto text-slate-300 mb-2" />
          <h3 className="text-sm font-bold text-slate-700">No workflows configured</h3>
          <p className="text-xs text-slate-400 mt-1">
            Click &quot;Create New Workflow&quot; or use the AI Assistant to define your first rule.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`p-6 rounded-3xl bg-white/85 backdrop-blur-md border transition-all ${
                item.isActive
                  ? "border-slate-200/80 shadow-2xs hover:border-[#ACCAD5]"
                  : "border-slate-200/40 opacity-70 bg-slate-50/70"
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-base font-bold text-slate-900">{item.name}</h3>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 uppercase font-mono">
                      {item.module.replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EBF3F6] text-[#588594] border border-[#ACCAD5]/50">
                      Scope: {item.departmentScope}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      Trigger: {item.triggerAction.replace(/_/g, " ")}
                    </span>
                    {item.isActive ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        <Play className="h-2.5 w-2.5 fill-emerald-600" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                        <Pause className="h-2.5 w-2.5" /> Paused
                      </span>
                    )}
                  </div>

                  {item.description && (
                    <p className="text-xs text-slate-500">{item.description}</p>
                  )}

                  {/* Sequential Approval Pipeline */}
                  <div className="pt-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Approval Chain:
                      </span>
                      {item.steps.map((step, sIdx) => (
                        <div key={step.id} className="flex items-center gap-1.5">
                          <span className="px-3 py-1 rounded-full bg-[#F8FAFC] border border-slate-200 text-xs font-semibold text-slate-800 flex items-center gap-1.5 shadow-2xs">
                            <span className="h-4 w-4 rounded-full bg-[#ACCAD5] text-slate-800 text-[10px] font-bold flex items-center justify-center">
                              {step.stepOrder}
                            </span>
                            {step.approverName || step.approverRole?.replace(/_/g, " ") || "Reviewer"}
                          </span>
                          {sIdx < item.steps.length - 1 && (
                            <ArrowRight className="h-3 w-3 text-slate-300" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Intimations & Meta */}
                  <div className="flex items-center gap-3 text-xs text-slate-400 pt-1 flex-wrap">
                    {item.intimationRecipients.length > 0 && (
                      <div className="flex items-center gap-1 text-slate-600 text-[11px]">
                        <Bell className="h-3 w-3 text-[#F0944D]" />
                        <span>
                          Intimation: {item.intimationRecipients.map((r) => r.replace(/_/g, " ")).join(", ")}
                        </span>
                      </div>
                    )}
                    <span>•</span>
                    <span className="text-[11px]">Executions: {item.executionCount}</span>
                    <span>•</span>
                    <span className="text-[11px]">Created by {item.createdByName}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggle(item.id, item.isActive)}
                    disabled={isPending}
                    className="rounded-xl text-xs font-semibold border-slate-200 cursor-pointer"
                  >
                    {item.isActive ? (
                      <>
                        <Pause className="h-3.5 w-3.5 text-amber-600" /> Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5 text-emerald-600" /> Activate
                      </>
                    )}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDeletingId(item.id)}
                    disabled={isPending}
                    className="rounded-xl text-xs font-semibold border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Workflow Builder Modal */}
      <WorkflowBuilderModal
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        onSuccess={() => window.location.reload()}
      />

      {/* Delete Confirmation */}
      <ConfirmationModal
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
        title="Delete Workflow Rule"
        description="Are you sure you want to delete this workflow rule? Records currently in progress will default to standard enterprise HR review."
        confirmLabel="Confirm Delete"
        isPending={isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
