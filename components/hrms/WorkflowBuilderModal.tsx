"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  GitMerge,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Send,
  Loader2,
  Workflow,
} from "lucide-react";
import {
  HrmsWorkflowModule,
  WorkflowTriggerAction,
} from "@prisma/client";
import {
  createHrmsWorkflowAction,
  aiTranslateWorkflowRuleAction,
  WorkflowStepInput,
} from "@/lib/actions/workflow";

interface WorkflowBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const MODULE_OPTIONS: { label: string; value: HrmsWorkflowModule }[] = [
  { label: "Leave Management", value: "LEAVE" },
  { label: "Attendance Regularization", value: "ATTENDANCE_REGULARIZATION" },
  { label: "Reimbursement", value: "REIMBURSEMENT" },
  { label: "Resignation & Exit", value: "RESIGNATION" },
  { label: "Performance Appraisals", value: "PERFORMANCE" },
  { label: "Payroll & Salaries", value: "PAYROLL" },
  { label: "HRMS Helpdesk", value: "HELPDESK" },
  { label: "Employee Surveys", value: "SURVEY" },
  { label: "Lifecycle Checklists", value: "ONBOARDING_EXIT" },
];

const TRIGGER_OPTIONS: { label: string; value: WorkflowTriggerAction }[] = [
  { label: "On Record Submission (Create)", value: "ON_CREATE" },
  { label: "On Record Update", value: "ON_UPDATE" },
  { label: "On Record Approval", value: "ON_APPROVAL" },
  { label: "On Record Rejection", value: "ON_REJECTION" },
];

const DEPARTMENTS = ["ALL", "Sales", "Operations", "HR", "IT", "Legal", "Account", "Quality"];

const INTIMATION_PERSONS = [
  { label: "Reporting Team Leader (TL)", value: "REPORTING_TL" },
  { label: "Department Head (HOD)", value: "DEPT_HOD" },
  { label: "HR Administration (HR)", value: "HR_ADMIN" },
];

const APPROVER_ROLES = [
  { label: "Direct Reporting Team Leader", value: "REPORTING_TL" },
  { label: "Department Head (HOD)", value: "DEPT_HOD" },
  { label: "HR Operations Administrator", value: "HR_ADMIN" },
  { label: "Executive Super Admin", value: "SUPER_ADMIN" },
];

export default function WorkflowBuilderModal({
  isOpen,
  onClose,
  onSuccess,
}: WorkflowBuilderModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [module, setModule] = useState<HrmsWorkflowModule>("LEAVE");
  const [triggerAction, setTriggerAction] = useState<WorkflowTriggerAction>("ON_CREATE");
  const [departmentScope, setDepartmentScope] = useState("ALL");
  const [intimations, setIntimations] = useState<string[]>(["HR_ADMIN"]);
  const [steps, setSteps] = useState<WorkflowStepInput[]>([
    { stepOrder: 1, approverRole: "REPORTING_TL", isMandatory: true },
    { stepOrder: 2, approverRole: "HR_ADMIN", isMandatory: true },
  ]);

  // AI Rule Assistant state
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiTranslating, setAiTranslating] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleAiTranslate = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Please enter a natural language HR rule first.");
      return;
    }

    setAiTranslating(true);
    const res = await aiTranslateWorkflowRuleAction(aiPrompt.trim());
    setAiTranslating(false);

    if (res.success && res.data) {
      setName(res.data.suggestedName);
      setModule(res.data.module);
      setTriggerAction(res.data.triggerAction);
      setDepartmentScope(res.data.departmentScope);
      setIntimations(res.data.intimationRecipients);
      setSteps(res.data.steps);
      toast.success("AI translated policy into workflow configuration!");
    } else {
      toast.error(res.error || "Failed to parse natural language rule.");
    }
  };

  const handleAddStep = () => {
    setSteps((prev) => [
      ...prev,
      {
        stepOrder: prev.length + 1,
        approverRole: "HR_ADMIN",
        isMandatory: true,
      },
    ]);
  };

  const handleRemoveStep = (index: number) => {
    if (steps.length <= 1) {
      toast.error("At least one approval step is required.");
      return;
    }
    const filtered = steps.filter((_, i) => i !== index);
    const reindexed = filtered.map((s, i) => ({ ...s, stepOrder: i + 1 }));
    setSteps(reindexed);
  };

  const handleStepRoleChange = (index: number, role: string) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, approverRole: role } : s))
    );
  };

  const toggleIntimation = (val: string) => {
    setIntimations((prev) =>
      prev.includes(val) ? prev.filter((p) => p !== val) : [...prev, val]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Workflow name is required.");
      return;
    }

    startTransition(async () => {
      const res = await createHrmsWorkflowAction({
        name: name.trim(),
        description: description.trim() || undefined,
        module,
        triggerAction,
        departmentScope,
        intimationRecipients: intimations,
        steps,
      });

      if (res.success) {
        toast.success("HRMS Workflow created & activated successfully!");
        if (onSuccess) onSuccess();
        onClose();
      } else {
        toast.error(res.error || "Failed to create workflow.");
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto rounded-3xl bg-white/95 backdrop-blur-2xl border border-white/80 p-6 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-orange-50 text-[#F0944D] border border-orange-200">
              <Workflow className="h-4 w-4" />
            </span>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Create Dynamic HRMS Workflow
              </DialogTitle>
              <p className="text-xs text-slate-500">
                Design multi-tier approval chains, intimation rules, and role triggers
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* 1. AI Rule Assistant Box */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-orange-50/70 via-amber-50/50 to-sky-50/50 border border-orange-200/70 space-y-2 mt-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[#F0944D] animate-spin" />
              AI Rule Assistant (Plain English Translator)
            </span>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-white text-[#C66318] border border-orange-200">
              Auto-Config
            </span>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder='e.g. "When reimbursement is submitted in Sales, inform TL and send to HOD then HR Admin"'
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              className="bg-white text-xs rounded-xl border-orange-200"
            />
            <Button
              type="button"
              size="sm"
              onClick={handleAiTranslate}
              disabled={aiTranslating || !aiPrompt.trim()}
              className="rounded-xl bg-[#F0944D] hover:bg-orange-600 text-white text-xs font-semibold px-3.5 shrink-0 cursor-pointer shadow-2xs"
            >
              {aiTranslating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Translate"}
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-3">
          {/* Workflow Name */}
          <div>
            <Label className="text-xs text-slate-700 font-semibold">Workflow Rule Name *</Label>
            <Input
              placeholder="e.g. Standard 2-Tier Leave Approval Engine"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 bg-slate-50 text-xs font-semibold"
              required
            />
          </div>

          {/* Module & Trigger */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-600 font-medium">HRMS Module *</Label>
              <select
                value={module}
                onChange={(e) => setModule(e.target.value as HrmsWorkflowModule)}
                className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ACCAD5]"
              >
                {MODULE_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs text-slate-600 font-medium">Trigger Action *</Label>
              <select
                value={triggerAction}
                onChange={(e) => setTriggerAction(e.target.value as WorkflowTriggerAction)}
                className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ACCAD5]"
              >
                {TRIGGER_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Department Scope */}
          <div>
            <Label className="text-xs text-slate-600 font-medium">Department Scope *</Label>
            <div className="flex gap-1.5 flex-wrap mt-1">
              {DEPARTMENTS.map((dept) => (
                <button
                  key={dept}
                  type="button"
                  onClick={() => setDepartmentScope(dept)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                    departmentScope === dept
                      ? "bg-[#588594] text-white border-[#588594] shadow-2xs"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {dept === "ALL" ? "All Departments" : dept}
                </button>
              ))}
            </div>
          </div>

          {/* Intimation Persons (FYI Recipients) */}
          <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-slate-200/70 space-y-2">
            <Label className="text-xs text-slate-700 font-semibold flex items-center justify-between">
              <span>Intimation Persons (Instant Notification Dispatched)</span>
              <span className="text-[10px] text-slate-400 font-normal">Non-blocking FYI</span>
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {INTIMATION_PERSONS.map((p) => {
                const checked = intimations.includes(p.value);
                return (
                  <label
                    key={p.value}
                    onClick={() => toggleIntimation(p.value)}
                    className={`p-2 rounded-xl border text-xs font-medium cursor-pointer flex items-center gap-2 transition-all ${
                      checked
                        ? "bg-white border-[#588594] text-slate-900 shadow-2xs"
                        : "bg-white/60 border-slate-200 text-slate-500 hover:bg-white"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      readOnly
                      className="rounded border-slate-300 text-[#588594]"
                    />
                    <span className="text-[11px] font-semibold">{p.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Sequential Approval Steps */}
          <div className="p-3.5 rounded-2xl bg-[#FCFAF7] border border-orange-200/70 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-slate-900 font-bold flex items-center gap-1.5">
                <GitMerge className="h-3.5 w-3.5 text-[#F0944D]" />
                Sequential Approval Pipeline
              </Label>
              <button
                type="button"
                onClick={handleAddStep}
                className="text-xs font-semibold text-[#C66318] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="h-3 w-3" /> Add Step
              </button>
            </div>

            <div className="space-y-2">
              {steps.map((step, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <span className="h-6 w-6 rounded-full bg-slate-900 text-white font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-xs text-slate-500 font-medium shrink-0">Approver:</span>
                    <select
                      value={step.approverRole || "HR_ADMIN"}
                      onChange={(e) => handleStepRoleChange(idx, e.target.value)}
                      className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800"
                    >
                      {APPROVER_ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {steps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveStep(idx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Remove Step"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="rounded-full text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending || !name.trim()}
              className="rounded-full text-xs font-semibold px-5 bg-gradient-to-r from-[#ACCAD5] to-[#F0944D] text-white shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Activating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Save & Activate Workflow
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
