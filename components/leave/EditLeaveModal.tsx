"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
import { LeaveType } from "@prisma/client";
import { updateMyLeaveRequestAction } from "@/lib/actions/leave";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Edit, AlertCircle, CheckCircle2 } from "lucide-react";
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
  const [leaveType, setLeaveType] = useState<LeaveType>(request?.leaveType || LeaveType.CASUAL);
  const [startDate, setStartDate] = useState(request?.startDate || "");
  const [endDate, setEndDate] = useState(request?.endDate || "");
  const [reason, setReason] = useState(request?.reason || "");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (request && open) {
      setLeaveType(request.leaveType);
      setStartDate(request.startDate);
      setEndDate(request.endDate);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!request) return;

    if (!startDate || !endDate) {
      toast.error("Please specify start and end dates.");
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      toast.error("End date cannot precede start date.");
      return;
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
        endDate,
        reason,
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
          <div>
            <Label className="text-xs font-semibold text-slate-700">Leave Category</Label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value as LeaveType)}
              className="mt-1.5 w-full h-10 px-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 font-semibold cursor-pointer"
            >
              <option value={LeaveType.CASUAL}>Casual Leave (CL)</option>
              <option value={LeaveType.SICK}>Sick Leave (SL)</option>
              <option value={LeaveType.EARNED}>Earned / Privilege Leave (EL)</option>
            </select>
          </div>

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

          {calculatedDays > 0 && (
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
              className="bg-[#588594] hover:bg-[#466C78] text-white rounded-full text-xs font-semibold px-5 shadow-sm"
            >
              {isPending ? "Updating..." : "Save Modifications"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
