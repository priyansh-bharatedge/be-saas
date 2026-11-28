"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Receipt,
  Calendar,
  IndianRupee,
  UploadCloud,
  FileCheck,
  X,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { ReimbursementCategory } from "@prisma/client";
import { createReimbursementAction } from "@/lib/actions/reimbursement";

interface ApplyReimbursementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const CATEGORIES: { label: string; value: ReimbursementCategory }[] = [
  { label: "Travel & Transit", value: "TRAVEL" },
  { label: "Client Meeting / Hospitality", value: "CLIENT_MEETING" },
  { label: "Food & Meals", value: "FOOD" },
  { label: "Internet & Telecom", value: "INTERNET" },
  { label: "Office Supplies & Stationery", value: "OFFICE_SUPPLIES" },
  { label: "Other Operational Expense", value: "OTHER" },
];

export default function ApplyReimbursementModal({
  isOpen,
  onClose,
  onSuccess,
}: ApplyReimbursementModalProps) {
  const today = new Date().toISOString().split("T")[0];
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ReimbursementCategory>("TRAVEL");
  const [expenseDate, setExpenseDate] = useState(today);
  const [amount, setAmount] = useState<number | "">("");
  const [description, setDescription] = useState("");
  const [receiptUrls, setReceiptUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Receipt file cannot exceed 5MB.");
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
        setReceiptUrls((prev) => [...prev, data.url]);
        toast.success("Receipt uploaded to Cloudflare R2.");
      } else {
        toast.error(data.error || "File upload failed.");
      }
    } catch {
      toast.error("Error uploading receipt.");
    } finally {
      setUploading(false);
    }
  };

  const removeReceipt = (index: number) => {
    setReceiptUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please provide an expense claim title.");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }

    startTransition(async () => {
      const res = await createReimbursementAction({
        title: title.trim(),
        category,
        expenseDate,
        amount: Number(amount),
        description: description.trim(),
        receiptUrls,
      });

      if (res.success) {
        toast.success("Reimbursement claim submitted for approval!");
        if (onSuccess) onSuccess();
        onClose();
      } else {
        toast.error(res.error || "Failed to submit claim.");
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto rounded-3xl bg-white/95 backdrop-blur-2xl border border-white/80 p-6 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-orange-50 text-[#F0944D] border border-orange-200">
              <Receipt className="h-4 w-4" />
            </span>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Submit Expense Claim
              </DialogTitle>
              <p className="text-xs text-slate-500">
                File a reimbursement claim for official travel, meals, internet, or supplies
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Title */}
          <div>
            <Label className="text-xs text-slate-700 font-semibold">Expense Claim Title *</Label>
            <Input
              placeholder="e.g. Flight to Jaipur for Client Pitch"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 bg-slate-50 text-xs font-semibold"
              required
            />
          </div>

          {/* Category & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-600 font-medium">Category *</Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ReimbursementCategory)}
                className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ACCAD5]"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs text-slate-600 font-medium">Expense Date *</Label>
              <Input
                type="date"
                value={expenseDate}
                max={today}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="mt-1 bg-slate-50 text-xs font-semibold"
                required
              />
            </div>
          </div>

          {/* Amount */}
          <div>
            <Label className="text-xs text-slate-700 font-semibold flex items-center gap-1">
              <IndianRupee className="h-3 w-3 text-[#F0944D]" />
              Claim Amount (INR) *
            </Label>
            <Input
              type="number"
              step="1"
              min="1"
              placeholder="e.g. 3500"
              value={amount}
              onChange={(e) => setAmount(e.target.value === "" ? "" : parseFloat(e.target.value))}
              className="mt-1 bg-slate-50 text-xs font-bold text-slate-900"
              required
            />
          </div>

          {/* Description */}
          <div>
            <Label className="text-xs text-slate-700 font-semibold">Purpose & Description *</Label>
            <Textarea
              placeholder="Explain the business context of this expenditure (client name, project, route)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 bg-slate-50 border-slate-200 text-xs rounded-xl h-20 resize-none"
              required
            />
          </div>

          {/* Receipt Upload (Cloudflare R2) */}
          <div className="space-y-2">
            <Label className="text-xs text-slate-600 font-medium flex items-center justify-between">
              <span>Attached Receipts & Invoices</span>
              <span className="text-[10px] text-slate-400 font-mono">{receiptUrls.length} attached</span>
            </Label>

            {receiptUrls.length > 0 && (
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {receiptUrls.map((url, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <span className="truncate flex-1 font-mono text-[11px] text-slate-600">
                      {url.split("/").pop()}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeReceipt(idx)}
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
              <span>{uploading ? "Uploading to Cloudflare R2..." : "+ Add Receipt (JPG, PNG, PDF)"}</span>
              <input
                type="file"
                className="hidden"
                accept="image/*,.pdf"
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
              disabled={isPending || uploading || !title.trim() || !amount}
              className="rounded-full text-xs font-semibold px-5 bg-gradient-to-r from-[#ACCAD5] to-[#F0944D] text-white shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Submitting Claim...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Submit Claim
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
