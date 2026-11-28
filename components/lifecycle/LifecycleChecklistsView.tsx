"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  CheckSquare,
  Square,
  Plus,
  Users,
  UserPlus,
  LogOut,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
} from "lucide-react";
import { LifecycleType } from "@prisma/client";
import {
  toggleChecklistItemAction,
  createChecklistAction,
} from "@/lib/actions/lifecycle";

interface ChecklistTask {
  id: string;
  taskName: string;
  isCompleted: boolean;
  completedAt?: string | null;
  dueDate?: string | null;
}

interface ChecklistItem {
  id: string;
  employeeName: string;
  employeeId: string;
  department: string;
  designation: string;
  type: LifecycleType;
  title: string;
  progressPercent: number;
  isCompleted: boolean;
  createdAt: string;
  tasks: ChecklistTask[];
}

interface LifecycleChecklistsViewProps {
  initialChecklists: ChecklistItem[];
  allEmployees: { id: string; name: string; employeeId: string; department: string }[];
  isHrAdmin: boolean;
}

export default function LifecycleChecklistsView({
  initialChecklists,
  allEmployees,
  isHrAdmin,
}: LifecycleChecklistsViewProps) {
  const [checklists, setChecklists] = useState<ChecklistItem[]>(initialChecklists);
  const [filterType, setFilterType] = useState<"ALL" | LifecycleType>("ALL");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState(allEmployees[0]?.id || "");
  const [selectedType, setSelectedType] = useState<LifecycleType>("ONBOARDING");
  const [isPending, startTransition] = useTransition();

  const handleToggleTask = (checklistId: string, taskId: string, currentStatus: boolean) => {
    startTransition(async () => {
      const res = await toggleChecklistItemAction(taskId, !currentStatus);
      if (res.success) {
        setChecklists((prev) =>
          prev.map((c) => {
            if (c.id !== checklistId) return c;
            const updatedTasks = c.tasks.map((t) =>
              t.id === taskId ? { ...t, isCompleted: !currentStatus } : t
            );
            const comp = updatedTasks.filter((t) => t.isCompleted).length;
            const pct = Math.round((comp / updatedTasks.length) * 100);
            return {
              ...c,
              tasks: updatedTasks,
              progressPercent: pct,
              isCompleted: pct === 100,
            };
          })
        );
        toast.success(!currentStatus ? "Task marked completed!" : "Task marked incomplete.");
      } else {
        toast.error(res.error || "Failed to update task.");
      }
    });
  };

  const handleCreateChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId) return;

    startTransition(async () => {
      const res = await createChecklistAction({
        employeeId: selectedEmpId,
        type: selectedType,
      });

      if (res.success) {
        toast.success("Lifecycle checklist initialized!");
        setIsCreateOpen(false);
        window.location.reload();
      } else {
        toast.error(res.error || "Failed to create checklist.");
      }
    });
  };

  const filtered = checklists.filter((c) => {
    if (filterType !== "ALL" && c.type !== filterType) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Onboarding & Exit Checklists</h2>
            <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#EBF3F6] text-[#588594] border border-[#ACCAD5]/50">
              Lifecycle Governance
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Track asset handovers, security credentials, statutory filings, and department transitions for new hires and exiting staff.
          </p>
        </div>

        {isHrAdmin && (
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="rounded-full bg-gradient-to-r from-[#ACCAD5] to-[#F0944D] text-white font-semibold text-xs px-5 py-2.5 shadow-xs cursor-pointer flex items-center gap-2 self-start sm:self-center"
          >
            <Plus className="h-4 w-4" />
            Initialize Checklist
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
        <button
          onClick={() => setFilterType("ALL")}
          className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            filterType === "ALL" ? "bg-slate-900 text-white shadow-2xs" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          All Checklists ({checklists.length})
        </button>
        <button
          onClick={() => setFilterType("ONBOARDING")}
          className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            filterType === "ONBOARDING"
              ? "bg-[#588594] text-white shadow-2xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <UserPlus className="h-3.5 w-3.5" />
          <span>New Hire Onboarding ({checklists.filter((c) => c.type === "ONBOARDING").length})</span>
        </button>
        <button
          onClick={() => setFilterType("EXIT")}
          className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            filterType === "EXIT"
              ? "bg-rose-700 text-white shadow-2xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Exit Offboarding ({checklists.filter((c) => c.type === "EXIT").length})</span>
        </button>
      </div>

      {/* Checklists Cards Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white/60 rounded-3xl border border-slate-200/60 p-8">
          <Layers className="h-10 w-10 mx-auto text-slate-300 mb-2" />
          <h3 className="text-sm font-bold text-slate-700">No checklists found</h3>
          <p className="text-xs text-slate-400 mt-1">
            Click &quot;Initialize Checklist&quot; to assign onboarding or exit tasks.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-3xl bg-white/85 backdrop-blur-md border border-slate-200/80 shadow-2xs space-y-3.5 transition-all hover:border-[#ACCAD5]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase font-mono ${
                        item.type === "ONBOARDING"
                          ? "bg-sky-50 text-sky-800 border border-sky-200"
                          : "bg-rose-50 text-rose-800 border border-rose-200"
                      }`}
                    >
                      {item.type}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">{item.employeeName}</h4>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {item.designation} • {item.department} ({item.employeeId})
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-sm font-bold font-mono text-slate-900">
                    {item.progressPercent}%
                  </span>
                  <span className="text-[10px] text-slate-400 block">completed</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    item.isCompleted
                      ? "bg-emerald-500"
                      : item.type === "ONBOARDING"
                      ? "bg-[#588594]"
                      : "bg-[#F0944D]"
                  }`}
                  style={{ width: `${item.progressPercent}%` }}
                />
              </div>

              {/* Tasks List */}
              <div className="space-y-1.5 pt-1">
                {item.tasks.map((task) => (
                  <label
                    key={task.id}
                    onClick={() => isHrAdmin && handleToggleTask(item.id, task.id, task.isCompleted)}
                    className={`p-2.5 rounded-xl border text-xs flex items-center gap-2.5 transition-all ${
                      isHrAdmin ? "cursor-pointer" : "cursor-default"
                    } ${
                      task.isCompleted
                        ? "bg-slate-50/60 border-slate-200/60 text-slate-400 line-through"
                        : "bg-white border-slate-200 text-slate-800 hover:border-slate-300"
                    }`}
                  >
                    {task.isCompleted ? (
                      <CheckSquare className="h-4 w-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Square className="h-4 w-4 text-slate-300 shrink-0" />
                    )}
                    <span className="flex-1 font-medium">{task.taskName}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Initialize Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[440px] rounded-3xl bg-white/95 backdrop-blur-2xl border border-white/80 p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Initialize Lifecycle Checklist
            </DialogTitle>
            <p className="text-xs text-slate-500">
              Assign standard task templates for onboarding or offboarding staff
            </p>
          </DialogHeader>

          <form onSubmit={handleCreateChecklist} className="space-y-4 mt-2">
            <div>
              <Label className="text-xs text-slate-700 font-semibold">Select Staff Member *</Label>
              <select
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800"
                required
              >
                {allEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.employeeId}) • {emp.department}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs text-slate-700 font-semibold">Lifecycle Type *</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setSelectedType("ONBOARDING")}
                  className={`p-3 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    selectedType === "ONBOARDING"
                      ? "bg-[#588594] text-white border-[#588594] shadow-xs"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <UserPlus className="h-4 w-4" />
                  Onboarding
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedType("EXIT")}
                  className={`p-3 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    selectedType === "EXIT"
                      ? "bg-rose-700 text-white border-rose-700 shadow-xs"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <LogOut className="h-4 w-4" />
                  Exit Offboarding
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-full text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isPending || !selectedEmpId}
                className="rounded-full text-xs font-semibold px-5 bg-gradient-to-r from-[#ACCAD5] to-[#F0944D] text-white cursor-pointer"
              >
                {isPending ? "Creating..." : "Generate Checklist"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
