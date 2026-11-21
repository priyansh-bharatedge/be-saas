"use client";

import { useState, useTransition, useMemo } from "react";
import { LeaveType } from "@prisma/client";
import { applyLeaveRequestAction } from "@/lib/actions/leave";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Plus, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface LeaveBalanceItem {
  leaveType: LeaveType;
  allocatedDays: number;
  usedDays: number;
  remainingDays: number;
  year: number;
}

interface ApplyLeaveModalProps {
  balances: LeaveBalanceItem[];
  onSuccess?: () => void;
}

export default function ApplyLeaveModal({ balances, onSuccess }: ApplyLeaveModalProps) {
  const [open, setOpen] = useState(false);
  const [leaveType, setLeaveType] = useState<LeaveType>(LeaveType.CASUAL);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  // Selected balance lookup
  const selectedBalance = useMemo(() => {
    return balances.find((b) => b.leaveType === leaveType);
  }, [balances, leaveType]);

  const remainingDays = selectedBalance ? selectedBalance.remainingDays : 0;

  // Calculate day difference
  const calculatedDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) return 0;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, [startDate, endDate]);

  const isExceedingBalance = calculatedDays > remainingDays;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!startDate || !endDate) {
      toast.error("Please select both start and end dates.");
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      toast.error("End date cannot be earlier than start date.");
      return;
    }

    if (calculatedDays <= 0) {
      toast.error("Leave duration must be at least 1 day.");
      return;
    }

    if (isExceedingBalance) {
      toast.error(`Insufficient balance! You only have ${remainingDays} days of ${leaveType} leave left.`);
      return;
    }

    if (reason.trim().length < 5) {
      toast.error("Please provide a reason with at least 5 characters.");
      return;
    }

    startTransition(async () => {
      const res = await applyLeaveRequestAction({
        leaveType,
        startDate,
        endDate,
        reason,
      });

      if (res.success) {
        toast.success("Leave request submitted! Routed to your Team Leader for Tier-1 review.");
        setOpen(false);
        setStartDate("");
        setEndDate("");
        setReason("");
        if (onSuccess) onSuccess();
      } else {
        toast.error(res.error || "Failed to submit leave request.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-[#588594] to-[#4A7280] hover:from-[#4A7280] hover:to-[#3D606C] text-white font-semibold text-xs px-5 py-2.5 rounded-full shadow-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer">
          <Plus className="h-4 w-4" />
          Apply for Leave
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[480px] rounded-[32px] bg-white/95 backdrop-blur-2xl border border-white/80 shadow-[0_20px_60px_rgba(0,0,0,0.08)] p-6 sm:p-8">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#588594]" />
            Submit Leave Application
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-1">
            2-Tier Workflow: Requires approval from Team Leader and final sign-off from HR Admin.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Leave Category Selector */}
          <div>
            <Label className="text-xs font-semibold text-slate-700">Leave Category</Label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value as LeaveType)}
              className="mt-1.5 w-full h-11 px-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-[#588594] cursor-pointer"
            >
              {balances.map((b) => (
                <option key={b.leaveType} value={b.leaveType}>
                  {b.leaveType} Leave ({b.remainingDays} days available)
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1.5 h-11 rounded-2xl bg-slate-50 border-slate-200 text-xs font-medium"
                required
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-700">End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1.5 h-11 rounded-2xl bg-slate-50 border-slate-200 text-xs font-medium"
                required
              />
            </div>
          </div>

          {/* Duration Summary Pill */}
          {calculatedDays > 0 && (
            <div
              className={`p-3 rounded-2xl flex items-center justify-between text-xs font-medium ${
                isExceedingBalance
                  ? "bg-rose-50 border border-rose-200 text-rose-700"
                  : "bg-[#EBF3F6] border border-[#ACCAD5]/60 text-[#3D6472]"
              }`}
            >
              <div className="flex items-center gap-2">
                {isExceedingBalance ? (
                  <AlertCircle className="h-4 w-4 text-rose-500" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-[#588594]" />
                )}
                <span>
                  Requested: <strong>{calculatedDays} day(s)</strong>
                </span>
              </div>
              <span className="text-[11px]">
                {remainingDays} days available in {leaveType}
              </span>
            </div>
          )}

          {/* Reason Input */}
          <div>
            <Label className="text-xs font-semibold text-slate-700">Reason for Leave</Label>
            <Textarea
              placeholder="Please provide details for your team leader and HR review..."
              value={reason}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value)}
              className="mt-1.5 rounded-2xl bg-slate-50 border-slate-200 text-xs text-slate-800 resize-none h-24"
              required
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="rounded-full text-xs px-4"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || isExceedingBalance || calculatedDays <= 0}
              className="bg-[#588594] hover:bg-[#466C78] text-white rounded-full text-xs font-semibold px-6 transition-all"
            >
              {isPending ? "Submitting..." : "Submit Application"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
