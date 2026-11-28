"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Clock,
  Calendar,
  FileCheck,
  UploadCloud,
  Loader2,
  AlertCircle,
  X,
  FileText,
} from "lucide-react";
import { RegularizationType } from "@prisma/client";
import { createRegularizationAction } from "@/lib/actions/regularization";

interface AttendanceRegularizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const REGULARIZATION_TYPES: { label: string; value: RegularizationType; desc: string }[] = [
  { label: "Missed Punch", value: "MISSED_PUNCH", desc: "Forgot to clock in or clock out during shift" },
  { label: "Late Coming", value: "LATE_COMING", desc: "Delayed reporting due to technical or transit issue" },
  { label: "Early Going", value: "EARLY_GOING", desc: "Permitted early departure before official shift end" },
  { label: "Client Visit", value: "CLIENT_VISIT", desc: "Attending direct client meeting or external pitch" },
];

export default function AttendanceRegularizationModal({
  isOpen,
  onClose,
  onSuccess,
}: AttendanceRegularizationModalProps) {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [regularizationType, setRegularizationType] = useState<RegularizationType>("MISSED_PUNCH");
  const [clockInTime, setClockInTime] = useState("09:30");
  const [clockOutTime, setClockOutTime] = useState("18:30");
  const [reason, setReason] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size cannot exceed 5MB.");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        setAttachmentUrl(data.url);
        toast.success("Attachment uploaded successfully.");
      } else {
        toast.error(data.error || "File upload failed.");
      }
    } catch (err) {
      toast.error("Error uploading file.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error("Please explain the reason for regularization.");
      return;
    }

    const requestedClockIn = `${date}T${clockInTime}:00`;
    const requestedClockOut = `${date}T${clockOutTime}:00`;

    if (new Date(requestedClockOut) <= new Date(requestedClockIn)) {
      toast.error("Clock-out time must be later than clock-in time.");
      return;
    }

    startTransition(async () => {
      const res = await createRegularizationAction({
        date,
        requestedClockIn,
        requestedClockOut,
        regularizationType,
        reason: reason.trim(),
        attachmentUrl,
      });

      if (res.success) {
        toast.success("Attendance regularization request submitted for approval.");
        if (onSuccess) onSuccess();
        onClose();
      } else {
        toast.error(res.error || "Failed to submit regularization request.");
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] rounded-3xl bg-white/95 backdrop-blur-2xl border border-white/80 p-6 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-orange-50 text-[#F0944D] border border-orange-200">
              <Clock className="h-4 w-4" />
            </span>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Apply Attendance Regularization
              </DialogTitle>
              <p className="text-xs text-slate-500">
                Request correction for a missed punch, field duty, or technical glitch
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Date Picker */}
          <div>
            <Label className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-[#588594]" />
              Select Date of Regularization *
            </Label>
            <Input
              type="date"
              value={date}
              max={today}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 bg-slate-50 text-xs font-semibold"
              required
            />
          </div>

          {/* Regularization Type Selector */}
          <div>
            <Label className="text-xs text-slate-600 font-medium">Regularization Category *</Label>
            <select
              value={regularizationType}
              onChange={(e) => setRegularizationType(e.target.value as RegularizationType)}
              className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ACCAD5]"
            >
              {REGULARIZATION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label} — {t.desc}
                </option>
              ))}
            </select>
          </div>

          {/* Requested Clock In & Clock Out */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-[#F8FAFC] border border-slate-200/70">
            <div>
              <Label className="text-xs text-slate-600 font-medium">Requested Clock In *</Label>
              <Input
                type="time"
                value={clockInTime}
                onChange={(e) => setClockInTime(e.target.value)}
                className="mt-1 bg-white text-xs font-semibold"
                required
              />
            </div>
            <div>
              <Label className="text-xs text-slate-600 font-medium">Requested Clock Out *</Label>
              <Input
                type="time"
                value={clockOutTime}
                onChange={(e) => setClockOutTime(e.target.value)}
                className="mt-1 bg-white text-xs font-semibold text-slate-800"
                required
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <Label className="text-xs text-slate-700 font-semibold">Detailed Reason *</Label>
            <Textarea
              placeholder="Explain why you could not punch in/out on time (e.g. biometric machine glitch, met client in Jaipur office, etc.)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 bg-slate-50 border-slate-200 text-xs rounded-xl h-20 resize-none"
              required
            />
          </div>

          {/* Optional Attachment (R2 Upload) */}
          <div>
            <Label className="text-xs text-slate-600 font-medium flex items-center justify-between">
              <span>Supporting Proof / Approval Email (Optional)</span>
              {attachmentUrl && (
                <button
                  type="button"
                  onClick={() => setAttachmentUrl(null)}
                  className="text-[10px] text-rose-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <X className="h-3 w-3" /> Remove
                </button>
              )}
            </Label>
            {attachmentUrl ? (
              <div className="mt-1 p-2 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800">
                <FileCheck className="h-4 w-4 text-emerald-600" />
                <span className="truncate flex-1 font-mono text-[11px]">{attachmentUrl}</span>
              </div>
            ) : (
              <div className="mt-1 flex items-center gap-2">
                <label className="flex-1 border border-dashed border-slate-200 rounded-xl px-3 py-2 bg-slate-50/50 hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-center gap-2 text-xs text-slate-500">
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[#F0944D]" />
                  ) : (
                    <UploadCloud className="h-4 w-4 text-[#ACCAD5]" />
                  )}
                  <span>{uploading ? "Uploading to Cloudflare R2..." : "Attach screenshot or document"}</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                </label>
              </div>
            )}
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
              disabled={isPending || uploading || !reason.trim()}
              className="rounded-full text-xs font-semibold px-5 bg-gradient-to-r from-[#ACCAD5] to-[#F0944D] text-white shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <FileText className="h-3.5 w-3.5" />
                  Submit Request
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
