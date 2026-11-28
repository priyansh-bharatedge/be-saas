"use client";

import { useState, useEffect, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  History,
  ShieldAlert,
  Save,
  Loader2,
  Sliders,
  CheckCircle2,
} from "lucide-react";
import {
  getEmployeeLeaveBalancesAction,
  adjustEmployeeLeaveBalanceAction,
} from "@/lib/actions/leave";

interface AdjustLeaveBalanceModalProps {
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AdjustLeaveBalanceModal({
  employee,
  isOpen,
  onClose,
  onSuccess,
}: AdjustLeaveBalanceModalProps) {
  const [leaveType, setLeaveType] = useState<"PAID_LEAVE" | "SHORT_LEAVE">("PAID_LEAVE");
  const [allocatedDays, setAllocatedDays] = useState<number>(12);
  const [remainingDays, setRemainingDays] = useState<number>(12);
  const [monthlyShortLeaves, setMonthlyShortLeaves] = useState<number>(2);
  const [monthlyShortHours, setMonthlyShortHours] = useState<number>(3.0);
  const [reason, setReason] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (isOpen && employee?.id) {
      setLoading(true);
      getEmployeeLeaveBalancesAction(employee.id).then((res) => {
        setLoading(false);
        if (res.success && res.data) {
          setAllocatedDays(res.data.paidBalance.allocated);
          setRemainingDays(res.data.paidBalance.remaining);
          setMonthlyShortLeaves(res.data.shortBalance.monthlyLeaves || 2);
          setMonthlyShortHours(res.data.shortBalance.monthlyHours || 3.0);
          setLogs(res.data.adjustmentLogs || []);
        }
      });
      setReason("");
    }
  }, [isOpen, employee?.id]);

  if (!employee) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error("Mandatory audit reason is required for balance adjustment.");
      return;
    }

    startTransition(async () => {
      const res = await adjustEmployeeLeaveBalanceAction({
        employeeId: employee.id,
        leaveType,
        newAllocatedDays: leaveType === "PAID_LEAVE" ? Number(allocatedDays) : undefined,
        newRemainingDays: leaveType === "PAID_LEAVE" ? Number(remainingDays) : undefined,
        newMonthlyShortLeaves:
          leaveType === "SHORT_LEAVE" ? Number(monthlyShortLeaves) : undefined,
        newMonthlyShortHours:
          leaveType === "SHORT_LEAVE" ? Number(monthlyShortHours) : undefined,
        reason: reason.trim(),
      });

      if (res.success) {
        toast.success("Leave balance adjusted successfully with audit log.");
        if (onSuccess) onSuccess();
        onClose();
      } else {
        toast.error(res.error || "Failed to adjust balance.");
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto rounded-3xl bg-white/95 backdrop-blur-2xl border border-white/80 p-6 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-orange-50 text-[#F0944D] border border-orange-200">
              <Sliders className="h-4 w-4" />
            </span>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Adjust Leave Balance
              </DialogTitle>
              <p className="text-xs text-slate-500">
                {employee.firstName} {employee.lastName} ({employee.employeeId}) • HR Admin Control
              </p>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin text-[#ACCAD5]" />
            <span className="text-xs">Loading current balances & audit logs...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {/* Tab: Paid Leave vs Short Leave */}
            <div className="flex p-1 bg-slate-100 rounded-2xl gap-1">
              <button
                type="button"
                onClick={() => setLeaveType("PAID_LEAVE")}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  leaveType === "PAID_LEAVE"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Calendar className="h-3.5 w-3.5 text-[#588594]" />
                Paid Leave Quota (Annual)
              </button>
              <button
                type="button"
                onClick={() => setLeaveType("SHORT_LEAVE")}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  leaveType === "SHORT_LEAVE"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Clock className="h-3.5 w-3.5 text-[#F0944D]" />
                Short Leave Monthly Limit
              </button>
            </div>

            {leaveType === "PAID_LEAVE" ? (
              <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200/80">
                <div>
                  <Label className="text-xs text-slate-600 font-medium">Annual Allocated Days</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    max="60"
                    value={allocatedDays}
                    onChange={(e) => setAllocatedDays(parseFloat(e.target.value) || 0)}
                    className="mt-1 bg-white text-xs font-semibold"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Default standard quota is 12 days/yr.</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-600 font-medium">New Remaining Balance</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    max="60"
                    value={remainingDays}
                    onChange={(e) => setRemainingDays(parseFloat(e.target.value) || 0)}
                    className="mt-1 bg-white text-xs font-semibold text-emerald-700"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Immediate usable balance.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-[#FFFDF9] border border-amber-200/80">
                <div>
                  <Label className="text-xs text-slate-600 font-medium">Max Requests / Month</Label>
                  <Input
                    type="number"
                    min="0"
                    max="10"
                    value={monthlyShortLeaves}
                    onChange={(e) => setMonthlyShortLeaves(parseInt(e.target.value) || 0)}
                    className="mt-1 bg-white text-xs font-semibold"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Default policy is 2 requests/mo.</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-600 font-medium">Max Hours / Month</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    max="20"
                    value={monthlyShortHours}
                    onChange={(e) => setMonthlyShortHours(parseFloat(e.target.value) || 0)}
                    className="mt-1 bg-white text-xs font-semibold text-[#F0944D]"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Default policy is 3.0 hrs/mo.</p>
                </div>
              </div>
            )}

            {/* Mandatory Reason */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs text-slate-700 font-semibold flex items-center gap-1">
                  <ShieldAlert className="h-3 w-3 text-amber-500" />
                  Mandatory Audit Reason *
                </Label>
                <span className="text-[10px] text-slate-400 font-mono">Logged permanently</span>
              </div>
              <Textarea
                placeholder="e.g. Credited 1 compensatory off for Sunday client deployment, approved by Operations HOD."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="bg-slate-50 border-slate-200 text-xs rounded-xl h-20 resize-none"
                required
              />
            </div>

            {/* Audit History (Last adjustments) */}
            {logs.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                  <History className="h-3 w-3" /> Recent Adjustment Audit Logs
                </div>
                <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-2 rounded-xl bg-slate-50 border border-slate-200/60 text-[11px] text-slate-600"
                    >
                      <div className="flex justify-between font-medium">
                        <span className="font-semibold text-slate-800">
                          {log.leaveType === "PAID_LEAVE" ? "Paid Leave" : "Short Leave"}:{" "}
                          {log.oldValue} → {log.newValue} {log.fieldChanged}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(log.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 italic mt-0.5">
                        &quot;{log.reason}&quot; • by {log.adjustedBy ? `${log.adjustedBy.firstName} ${log.adjustedBy.lastName}` : "Admin"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer Buttons */}
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
                disabled={isPending || !reason.trim()}
                className="rounded-full text-xs font-semibold px-5 bg-gradient-to-r from-[#ACCAD5] to-[#F0944D] text-white shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Saving Adjustment...
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    Save & Update Balance
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
