"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  MessageSquare,
  UploadCloud,
  FileCheck,
  X,
  Loader2,
  AlertCircle,
  LifeBuoy,
} from "lucide-react";
import { HelpdeskCategory, TicketPriority } from "@prisma/client";
import { createHelpdeskTicketAction } from "@/lib/actions/helpdesk";

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const DEPARTMENTS = ["HR", "IT", "Account", "Admin", "Legal", "Operation", "Quality"];

const CATEGORIES: { label: string; value: HelpdeskCategory }[] = [
  { label: "HR Inquiry & Policies", value: "HR_INQUIRY" },
  { label: "IT Hardware / Workstation Issue", value: "IT_HARDWARE" },
  { label: "IT Software & App Credentials", value: "IT_SOFTWARE" },
  { label: "Accounts & Payroll Discrepancy", value: "ACCOUNTS_PAYROLL" },
  { label: "Admin & Workplace Facilities", value: "ADMIN_FACILITIES" },
  { label: "Legal & Compliance Question", value: "LEGAL_COMPLIANCE" },
  { label: "Operations Access & Files", value: "OPERATIONS_ACCESS" },
  { label: "Other General Inquiry", value: "OTHER" },
];

const PRIORITIES: { label: string; value: TicketPriority }[] = [
  { label: "Low", value: "LOW" },
  { label: "Medium", value: "MEDIUM" },
  { label: "High", value: "HIGH" },
  { label: "Urgent", value: "URGENT" },
];

export default function CreateTicketModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateTicketModalProps) {
  const [targetDepartment, setTargetDepartment] = useState("HR");
  const [category, setCategory] = useState<HelpdeskCategory>("HR_INQUIRY");
  const [priority, setPriority] = useState<TicketPriority>("MEDIUM");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
        setAttachments((prev) => [...prev, data.url]);
        toast.success("Attachment uploaded.");
      } else {
        toast.error(data.error || "Upload failed.");
      }
    } catch {
      toast.error("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      toast.error("Subject and description are required.");
      return;
    }

    startTransition(async () => {
      const res = await createHelpdeskTicketAction({
        targetDepartment,
        category,
        priority,
        subject: subject.trim(),
        description: description.trim(),
        attachments,
      });

      if (res.success) {
        toast.success(`Ticket ${res.data?.ticketNumber} logged successfully!`);
        if (onSuccess) onSuccess();
        onClose();
      } else {
        toast.error(res.error || "Failed to create ticket.");
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto rounded-3xl bg-white/95 backdrop-blur-2xl border border-white/80 p-6 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-orange-50 text-[#F0944D] border border-orange-200">
              <LifeBuoy className="h-4 w-4" />
            </span>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Raise Helpdesk Ticket
              </DialogTitle>
              <p className="text-xs text-slate-500">
                Submit an internal query to HR, IT, Accounts, or Administration
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Target Department & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-600 font-medium">Target Department *</Label>
              <select
                value={targetDepartment}
                onChange={(e) => setTargetDepartment(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs text-slate-600 font-medium">Priority *</Label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TicketPriority)}
                className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category */}
          <div>
            <Label className="text-xs text-slate-600 font-medium">Issue Category *</Label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as HelpdeskCategory)}
              className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div>
            <Label className="text-xs text-slate-700 font-semibold">Subject *</Label>
            <Input
              placeholder="e.g. Dual-monitor setup request for Sales workstation"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1 bg-slate-50 text-xs font-semibold"
              required
            />
          </div>

          {/* Description */}
          <div>
            <Label className="text-xs text-slate-700 font-semibold">Detailed Description *</Label>
            <Textarea
              placeholder="Provide exact details, error messages, or device details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 bg-slate-50 border-slate-200 text-xs rounded-xl h-24 resize-none"
              required
            />
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <Label className="text-xs text-slate-600 font-medium flex items-center justify-between">
              <span>Supporting Screenshots / Logs</span>
              <span className="text-[10px] text-slate-400 font-mono">{attachments.length} attached</span>
            </Label>

            {attachments.length > 0 && (
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {attachments.map((url, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <span className="truncate flex-1 font-mono text-[11px] text-slate-600">
                      {url.split("/").pop()}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label className="border border-dashed border-slate-200 rounded-xl px-3 py-2 bg-slate-50/50 hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-center gap-2 text-xs text-slate-500">
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin text-[#F0944D]" />
              ) : (
                <UploadCloud className="h-4 w-4 text-[#ACCAD5]" />
              )}
              <span>{uploading ? "Uploading to Cloudflare R2..." : "+ Add Screenshot or Error Log"}</span>
              <input
                type="file"
                className="hidden"
                accept="image/*,.pdf,.txt,.log"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>
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
              disabled={isPending || uploading || !subject.trim() || !description.trim()}
              className="rounded-full text-xs font-semibold px-5 bg-gradient-to-r from-[#ACCAD5] to-[#F0944D] text-white cursor-pointer"
            >
              {isPending ? "Submitting..." : "Submit Ticket"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
