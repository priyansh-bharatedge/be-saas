"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
import { LeaveType } from "@prisma/client";
import { updateMyLeaveRequestAction } from "@/lib/actions/leave";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Edit, CheckCircle2, Calendar, Clock } from "lucide-react";
import { toast } from "sonner";
import { PersonalLeaveRequest } from "./MyLeaveRequestsTable";

interface EditLeaveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: PersonalLeaveRequest | null;
  onSuccess?: () => void;
}

export default function EditLeaveModal({
  open,
  onOpenChange,
  request,
  onSuccess,
}: EditLeaveModalProps) {
  const [leaveType, setLeaveType] = useState<LeaveType>(
    (request?.leaveType as LeaveType) || LeaveType.PAID_LEAVE
  );
  const [startDate, setStartDate] = useState(request?.startDate || "");
  const [endDate, setEndDate] = useState(request?.endDate || "");
  const [startTime, setStartTime] = useState(request?.startTime || "10:00");
  const [endTime, setEndTime] = useState(request?.endTime || "11:30");
  const [reason, setReason] = useState(request?.reason || "");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (request && open) {
      setLeaveType((request.leaveType as LeaveType) || LeaveType.PAID_LEAVE);
      setStartDate(request.startDate);
      setEndDate(request.endDate);
      setStartTime(request.startTime || "10:00");
      setEndTime(request.endTime || "11:30");
      setReason(request.reason);
    }
  }, [request, open]);

  const calculatedDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) return 0;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, [startDate, endDate]);

  const shortLeaveDurationHours = useMemo(() => {
    if (!startTime || !endTime) return 0;
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    if (isNaN(sh) || isNaN(eh)) return 0;
    const mins = eh * 60 + em - (sh * 60 + sm);
    return mins > 0 ? Math.round((mins / 60) * 10) / 10 : 0;
  }, [startTime, endTime]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!request) return;

    if (!startDate) {
      toast.error("Please specify a date.");
      return;
    }

    if (leaveType === LeaveType.SHORT_LEAVE) {
      if (shortLeaveDurationHours <= 0) {
        toast.error("End time must be later than start time.");
        return;
      }
      if (shortLeaveDurationHours > 1.5) {
        toast.error("Short Leave cannot exceed 1.5 hours per request.");
        return;
      }
    } else {
      if (new Date(endDate) < new Date(startDate)) {
        toast.error("End date cannot precede start date.");
        return;
      }
    }

    if (reason.trim().length < 5) {
      toast.error("Reason must be at least 5 characters long.");
      return;
    }

    startTransition(async () => {
      const res = await updateMyLeaveRequestAction({
        requestId: request.id,
        leaveType,
        startDate,
        endDate: leaveType === LeaveType.SHORT_LEAVE ? startDate : endDate,
        startTime: leaveType === LeaveType.SHORT_LEAVE ? startTime : null,
        endTime: leaveType === LeaveType.SHORT_LEAVE ? endTime : null,
        reason: reason.trim(),
      });

      if (res.success) {
        toast.success("Leave application updated successfully!");
        onOpenChange(false);
        if (onSuccess) onSuccess();
      } else {
        toast.error(res.error || "Failed to update leave request.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] rounded-[32px] bg-white/95 backdrop-blur-2xl border border-white/80 p-6 sm:p-8">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Edit className="h-5 w-5 text-[#588594]" />
            Modify Pending Leave Application
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-1">
            You can modify the dates, leave category, or explanation while the application is in PENDING state.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-3">
          {/* Dual Tab Switcher */}
          <div className="flex p-1 bg-slate-100 rounded-2xl gap-1">
            <button
              type="button"
              onClick={() => setLeaveType(LeaveType.PAID_LEAVE)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                leaveType === LeaveType.PAID_LEAVE
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Calendar className="h-3.5 w-3.5 text-[#588594]" />
              Paid Leave
            </button>
            <button
              type="button"
              onClick={() => setLeaveType(LeaveType.SHORT_LEAVE)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                leaveType === LeaveType.SHORT_LEAVE
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Clock className="h-3.5 w-3.5 text-[#F0944D]" />
              Short Leave
            </button>
          </div>

          {leaveType === LeaveType.PAID_LEAVE ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1.5 h-10 rounded-2xl bg-slate-50 border-slate-200 text-xs"
                  required
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1.5 h-10 rounded-2xl bg-slate-50 border-slate-200 text-xs"
                  required
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3 p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200/60">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Leave Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setEndDate(e.target.value);
                  }}
                  className="mt-1.5 h-10 rounded-2xl bg-white border-slate-200 text-xs"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">From Time</Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="mt-1.5 h-10 rounded-2xl bg-white border-slate-200 text-xs font-semibold"
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">To Time</Label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="mt-1.5 h-10 rounded-2xl bg-white border-slate-200 text-xs font-semibold"
                    required
                  />
                </div>
              </div>
              {shortLeaveDurationHours > 0 && (
                <div className="text-[11px] font-semibold text-amber-800">
                  Duration: {shortLeaveDurationHours} hours (Max allowed: 1.5 hrs)
                </div>
              )}
            </div>
          )}

          {leaveType === LeaveType.PAID_LEAVE && calculatedDays > 0 && (
            <div className="p-3 rounded-2xl bg-[#EBF3F6] border border-[#ACCAD5]/60 text-[#3D6472] text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#588594]" />
              <span>
                Updated Duration: <strong>{calculatedDays} day(s)</strong>
              </span>
            </div>
          )}

          <div>
            <Label className="text-xs font-semibold text-slate-700">Reason / Explanation</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1.5 rounded-2xl bg-slate-50 border-slate-200 text-xs text-slate-800 resize-none h-24"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="rounded-full text-xs px-4"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              className="bg-[#588594] hover:bg-[#466C78] text-white rounded-full text-xs font-semibold px-5 shadow-sm cursor-pointer"
            >
              {isPending ? "Updating..." : "Save Modifications"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
