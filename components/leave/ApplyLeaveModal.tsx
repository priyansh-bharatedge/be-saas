"use client";

import { useState, useTransition, useMemo } from "react";
import { applyLeaveRequestAction } from "@/lib/actions/leave";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar,
  Plus,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  SunMedium,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface LeaveBalanceItem {
  leaveType: string;
  allocatedDays: number;
  usedDays: number;
  remainingDays: number;
  year: number;
}

interface ApplyLeaveModalProps {
  balances: LeaveBalanceItem[];
  paidLeaveAccrual?: {
    totalQuota: number;
    accruedDays: number;
    usedDays: number;
    remainingDays: number;
  };
  shortLeaveMonthly?: {
    maxMonthlyCount: number;
    usedCount: number;
    remainingCount: number;
    maxMonthlyHours: number;
    usedHours: number;
    remainingHours: number;
  };
  onSuccess?: () => void;
}

export default function ApplyLeaveModal({
  balances,
  paidLeaveAccrual,
  shortLeaveMonthly,
  onSuccess,
}: ApplyLeaveModalProps) {
  const [open, setOpen] = useState(false);
  const [leaveCategory, setLeaveCategory] = useState<"PAID_LEAVE" | "SHORT_LEAVE">("PAID_LEAVE");

  // Paid Leave state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Short Leave state
  const [shortDate, setShortDate] = useState("");
  const [startTime, setStartTime] = useState("14:00");
  const [endTime, setEndTime] = useState("15:30");

  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  // Paid Leave calculation
  const remainingPaidDays = paidLeaveAccrual
    ? paidLeaveAccrual.remainingDays
    : balances.find((b) => b.leaveType === "PAID_LEAVE")?.remainingDays ?? 12;

  const calculatedPaidDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) return 0;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, [startDate, endDate]);

  const isExceedingPaidBalance = calculatedPaidDays > remainingPaidDays;

  // Short Leave calculation
  const shortDurationHours = useMemo(() => {
    if (!startTime || !endTime) return 0;
    const [sH, sM] = startTime.split(":").map(Number);
    const [eH, eM] = endTime.split(":").map(Number);
    if (isNaN(sH) || isNaN(sM) || isNaN(eH) || isNaN(eM)) return 0;
    const diffMins = eH * 60 + eM - (sH * 60 + sM);
    if (diffMins <= 0) return 0;
    return parseFloat((diffMins / 60).toFixed(2));
  }, [startTime, endTime]);

  const remShortCount = shortLeaveMonthly?.remainingCount ?? 2;
  const remShortHours = shortLeaveMonthly?.remainingHours ?? 3.0;

  const isShortDurationInvalid = shortDurationHours <= 0 || shortDurationHours > 1.5;
  const isShortCountExceeded = remShortCount <= 0;
  const isShortHoursExceeded = shortDurationHours > remShortHours;

  const isFormInvalid =
    leaveCategory === "PAID_LEAVE"
      ? calculatedPaidDays <= 0 || isExceedingPaidBalance
      : !shortDate || isShortDurationInvalid || isShortCountExceeded || isShortHoursExceeded;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (reason.trim().length < 5) {
      toast.error("Please provide a descriptive reason with at least 5 characters.");
      return;
    }

    if (leaveCategory === "PAID_LEAVE") {
      if (!startDate || !endDate) {
        toast.error("Please select both start and end dates.");
        return;
      }
      if (new Date(endDate) < new Date(startDate)) {
        toast.error("End date cannot be earlier than start date.");
        return;
      }
      if (calculatedPaidDays <= 0) {
        toast.error("Leave duration must be at least 1 day.");
        return;
      }
      if (isExceedingPaidBalance) {
        toast.error(`Insufficient balance! You only have ${remainingPaidDays} days of Paid Leave remaining.`);
        return;
      }
    } else {
      // Short Leave
      if (!shortDate) {
        toast.error("Please select the date for your short leave.");
        return;
      }
      if (shortDurationHours <= 0) {
        toast.error("End time must be after start time.");
        return;
      }
      if (shortDurationHours > 1.5) {
        toast.error(`Short leave cannot exceed 1.5 hours per request (requested ${shortDurationHours} hrs).`);
        return;
      }
      if (isShortCountExceeded) {
        toast.error("You have already used your quota of 2 Short Leaves for this calendar month.");
        return;
      }
      if (isShortHoursExceeded) {
        toast.error(
          `Requested ${shortDurationHours} hrs exceeds your remaining monthly Short Leave limit (${remShortHours} hrs).`
        );
        return;
      }
    }

    startTransition(async () => {
      const res = await applyLeaveRequestAction({
        leaveType: leaveCategory,
        startDate: leaveCategory === "PAID_LEAVE" ? startDate : shortDate,
        endDate: leaveCategory === "PAID_LEAVE" ? endDate : shortDate,
        startTime: leaveCategory === "SHORT_LEAVE" ? startTime : undefined,
        endTime: leaveCategory === "SHORT_LEAVE" ? endTime : undefined,
        reason: reason.trim(),
      });

      if (res.success) {
        toast.success(
          `${leaveCategory === "SHORT_LEAVE" ? "Short Leave" : "Paid Leave"} request submitted! Routed to your Team Leader for review.`
        );
        setOpen(false);
        setStartDate("");
        setEndDate("");
        setShortDate("");
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
        <Button className="bg-[#E86C2C] hover:bg-[#D45E20] text-white font-semibold text-xs px-5 py-2.5 rounded-full shadow-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer">
          <Plus className="h-4 w-4" />
          Apply for Leave
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px] rounded-3xl bg-white/95 backdrop-blur-2xl border border-white/90 shadow-[0_20px_60px_rgba(0,0,0,0.1)] p-6 sm:p-7">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#E86C2C]" />
            Apply for Leave
          </DialogTitle>
        </DialogHeader>

        {/* Category Switcher Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-100/80 border border-slate-200/60 mt-3">
          <button
            type="button"
            onClick={() => setLeaveCategory("PAID_LEAVE")}
            className={cn(
              "py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
              leaveCategory === "PAID_LEAVE"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            <SunMedium className="w-3.5 h-3.5 text-[#E86C2C]" />
            <span>Paid Leave (Annual)</span>
          </button>
          <button
            type="button"
            onClick={() => setLeaveCategory("SHORT_LEAVE")}
            className={cn(
              "py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
              leaveCategory === "SHORT_LEAVE"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>Short Leave (Monthly)</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-3">
          {/* PAID LEAVE FORM */}
          {leaveCategory === "PAID_LEAVE" && (
            <div className="space-y-3">
              {/* Accrual Badge */}
              <div className="p-3 rounded-2xl bg-orange-50/70 border border-orange-200/70 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900">Paid Leave Quota:</span>
                  <span className="text-slate-600 ml-1">12 days/year (accrues 1 day/mo)</span>
                </div>
                <div className="font-extrabold text-[#E86C2C]">
                  {remainingPaidDays} days remaining
                </div>
              </div>

              {/* Start Date & End Date */}
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

              {/* Duration calculation banner */}
              {calculatedPaidDays > 0 && (
                <div
                  className={cn(
                    "p-3 rounded-2xl flex items-center justify-between text-xs font-medium",
                    isExceedingPaidBalance
                      ? "bg-rose-50 border border-rose-200 text-rose-700"
                      : "bg-emerald-50 border border-emerald-200 text-emerald-800"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {isExceedingPaidBalance ? (
                      <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    )}
                    <span>
                      Duration: <strong>{calculatedPaidDays} day(s)</strong>
                    </span>
                  </div>
                  <span>
                    {isExceedingPaidBalance
                      ? `Exceeds available (${remainingPaidDays} left)`
                      : `${remainingPaidDays - calculatedPaidDays} days remaining after`}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* SHORT LEAVE FORM */}
          {leaveCategory === "SHORT_LEAVE" && (
            <div className="space-y-3">
              {/* Monthly Quota Indicator */}
              <div className="p-3 rounded-2xl bg-sky-50/70 border border-sky-200/70 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">Monthly Quota Limits:</span>
                  <span className="text-[11px] font-bold text-sky-700">
                    Max 2 requests • Max 3.0 hrs
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600 pt-1 border-t border-sky-100">
                  <span>
                    Requests left this month: <strong>{remShortCount} / 2</strong>
                  </span>
                  <span>
                    Hours left: <strong>{remShortHours.toFixed(1)} / 3.0 hrs</strong>
                  </span>
                </div>
              </div>

              {/* Date */}
              <div>
                <Label className="text-xs font-semibold text-slate-700">Date of Short Leave</Label>
                <Input
                  type="date"
                  value={shortDate}
                  onChange={(e) => setShortDate(e.target.value)}
                  className="mt-1.5 h-11 rounded-2xl bg-slate-50 border-slate-200 text-xs font-medium"
                  required
                />
              </div>

              {/* Time Interval Pickers */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Start Time</Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="mt-1.5 h-11 rounded-2xl bg-slate-50 border-slate-200 text-xs font-medium"
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">End Time</Label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="mt-1.5 h-11 rounded-2xl bg-slate-50 border-slate-200 text-xs font-medium"
                    required
                  />
                </div>
              </div>

              {/* Short Leave Duration & Limit Warning */}
              {shortDurationHours > 0 && (
                <div
                  className={cn(
                    "p-3 rounded-2xl flex items-center justify-between text-xs font-medium",
                    shortDurationHours > 1.5 || isShortHoursExceeded || isShortCountExceeded
                      ? "bg-rose-50 border border-rose-200 text-rose-700"
                      : "bg-emerald-50 border border-emerald-200 text-emerald-800"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {shortDurationHours > 1.5 || isShortHoursExceeded || isShortCountExceeded ? (
                      <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    )}
                    <span>
                      Duration: <strong>{shortDurationHours} hrs</strong> (max 1.5 hrs/req)
                    </span>
                  </div>
                  <span>
                    {shortDurationHours > 1.5
                      ? "Exceeds 1.5h limit"
                      : isShortHoursExceeded
                      ? "Exceeds monthly hrs"
                      : `${(remShortHours - shortDurationHours).toFixed(1)} hrs left`}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Reason Input */}
          <div>
            <Label className="text-xs font-semibold text-slate-700">Reason for Request</Label>
            <Textarea
              placeholder="State the reason for your leave request (visible to TL and HR)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1.5 rounded-2xl bg-slate-50 border-slate-200 text-xs text-slate-800 resize-none h-20"
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
              disabled={isPending || isFormInvalid}
              className="bg-[#18181B] hover:bg-slate-800 text-white rounded-full text-xs font-semibold px-6 transition-all cursor-pointer"
            >
              {isPending ? "Submitting..." : "Submit Application"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
