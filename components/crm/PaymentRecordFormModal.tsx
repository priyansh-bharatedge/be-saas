"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  IndianRupee,
  UploadCloud,
  CheckCircle2,
  Building2,
  User,
  Plus,
  Loader2,
  FileText,
  Search,
  ExternalLink,
  Image as ImageIcon,
} from "lucide-react";
import {
  paymentRecordSchema,
  quickClientSchema,
  PaymentRecordFormData,
  QuickClientFormData,
  PaymentMasterData,
  SerializedPaymentRecord,
} from "@/lib/validations/payment";
import { createQuickClientAction } from "@/lib/actions/payments";
import { SalaryEntity, PaymentType } from "@prisma/client";
import { toast } from "sonner";

interface PaymentRecordFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  masterData: PaymentMasterData;
  onSubmit: (data: PaymentRecordFormData) => Promise<void>;
  isSubmitting?: boolean;
}

export default function PaymentRecordFormModal({
  open,
  onOpenChange,
  masterData,
  onSubmit,
  isSubmitting = false,
}: PaymentRecordFormModalProps) {
  // Quick client modal state
  const [isQuickClientOpen, setIsQuickClientOpen] = useState(false);
  const [quickClientName, setQuickClientName] = useState("");
  const [quickClientPhone, setQuickClientPhone] = useState("");
  const [quickClientEmail, setQuickClientEmail] = useState("");
  const [isCreatingQuickClient, setIsCreatingQuickClient] = useState(false);

  // File upload state for screenshot
  const [isUploadingScreenshot, setIsUploadingScreenshot] = useState(false);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);

  // Client search query
  const [clientSearchTerm, setClientSearchTerm] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<PaymentRecordFormData>({
    resolver: zodResolver(paymentRecordSchema) as any,
    defaultValues: {
      clientId: "",
      clientName: "",
      clientPhone: "",
      clientEmail: "",
      dealId: "",
      amount: 10000,
      bankType: SalaryEntity.BSPL,
      paymentType: PaymentType.FIRST_PAYMENT,
      paymentMode: "BANK_TRANSFER",
      transactionRef: "",
      screenshotUrl: "",
      screenshotKey: "",
      paymentDate: new Date().toISOString().split("T")[0],
      remarks: "",
    },
  });

  const selectedPaymentType = watch("paymentType");
  const selectedClientId = watch("clientId");
  const selectedBankType = watch("bankType");

  useEffect(() => {
    if (open) {
      reset({
        clientId: "",
        clientName: "",
        clientPhone: "",
        clientEmail: "",
        dealId: "",
        amount: 10000,
        bankType: SalaryEntity.BSPL,
        paymentType: PaymentType.FIRST_PAYMENT,
        paymentMode: "BANK_TRANSFER",
        transactionRef: "",
        screenshotUrl: "",
        screenshotKey: "",
        paymentDate: new Date().toISOString().split("T")[0],
        remarks: "",
      });
      setScreenshotPreview(null);
      setClientSearchTerm("");
    }
  }, [open, reset]);

  // Filter clients by search
  const filteredClients = masterData.clients.filter((c) => {
    if (!clientSearchTerm.trim()) return true;
    const q = clientSearchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  });

  // Filter deals for selected client
  const clientDeals = masterData.deals.filter(
    (d) => d.clientId === selectedClientId
  );

  const handleSelectClient = (clientId: string) => {
    const client = masterData.clients.find((c) => c.id === clientId);
    if (!client) return;

    setValue("clientId", client.id);
    setValue("clientName", client.name);
    setValue("clientPhone", client.phone);
    setValue("clientEmail", client.email || "");

    // If remaining payment, auto-select first active deal if available
    const deals = masterData.deals.filter((d) => d.clientId === client.id);
    if (deals.length > 0) {
      setValue("dealId", deals[0].id);
    } else {
      setValue("dealId", "");
    }
  };

  // Quick Client Creation handler
  const handleQuickClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickClientName.trim() || !quickClientPhone.trim()) {
      toast.error("Please provide client name and phone number.");
      return;
    }

    setIsCreatingQuickClient(true);
    try {
      const res = await createQuickClientAction({
        name: quickClientName.trim(),
        phone: quickClientPhone.trim(),
        email: quickClientEmail.trim() || undefined,
      });

      if (res.success && res.data) {
        toast.success(`Client ${res.data.name} created successfully!`);
        masterData.clients.unshift({
          id: res.data.id,
          name: res.data.name,
          phone: res.data.phone,
          email: res.data.email,
          companyName: null,
        });

        // Set as selected client
        setValue("clientId", res.data.id);
        setValue("clientName", res.data.name);
        setValue("clientPhone", res.data.phone);
        setValue("clientEmail", res.data.email || "");

        setIsQuickClientOpen(false);
        setQuickClientName("");
        setQuickClientPhone("");
        setQuickClientEmail("");
      } else {
        toast.error(res.error || "Failed to create client.");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred.");
    } finally {
      setIsCreatingQuickClient(false);
    }
  };

  // Upload screenshot to Cloudflare R2
  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingScreenshot(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "payments");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.url) {
        setValue("screenshotUrl", data.url);
        setValue("screenshotKey", data.key || "");
        setScreenshotPreview(data.url);
        toast.success("Payment screenshot uploaded to R2!");
      } else {
        toast.error(data.error || "Upload failed.");
      }
    } catch (err: any) {
      toast.error("Network error during file upload.");
    } finally {
      setIsUploadingScreenshot(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto bg-white/95 backdrop-blur-xl border border-slate-200/80 shadow-2xl rounded-2xl p-6">
        <DialogHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#ACCAD5]/30 to-[#F0944D]/20 flex items-center justify-center text-slate-800">
              <IndianRupee className="h-5 w-5 text-[#F0944D]" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Log Customer Payment Record
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Record advance or installment collections for BSPL/BSAPL bank accounts. Verification will be handled by the Accounts department.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-5 pt-3">
          {/* SECTION 1: CLIENT SELECTION & QUICK CREATION */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-[#F0944D]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Client Information *
                </h4>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsQuickClientOpen(true)}
                className="h-7 text-[11px] gap-1 text-[#F0944D] border-[#F0944D]/30 hover:bg-[#F0944D]/10"
              >
                <Plus className="h-3 w-3" />
                New Client On Spot
              </Button>
            </div>

            {/* Client Search / Select */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Filter client list by name, phone, or email..."
                  value={clientSearchTerm}
                  onChange={(e) => setClientSearchTerm(e.target.value)}
                  className="pl-8 text-xs h-8 bg-white"
                />
              </div>

              <select
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#F0944D]/20"
                value={selectedClientId}
                onChange={(e) => handleSelectClient(e.target.value)}
              >
                <option value="" disabled>
                  Select client ({filteredClients.length} matches)...
                </option>
                {filteredClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.phone} {c.companyName ? `(${c.companyName})` : ""}
                  </option>
                ))}
              </select>
              {errors.clientId && (
                <p className="text-[10px] text-rose-500">{errors.clientId.message}</p>
              )}
            </div>

            {/* Display Selected Client Details Summary */}
            {selectedClientId && (
              <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200/60 text-xs text-emerald-900 flex items-center justify-between">
                <div>
                  <span className="font-semibold">{watch("clientName")}</span>
                  <span className="text-emerald-700 text-[11px] ml-2">({watch("clientPhone")})</span>
                  {watch("clientEmail") && (
                    <span className="text-emerald-600 text-[11px] ml-2">| {watch("clientEmail")}</span>
                  )}
                </div>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
            )}
          </div>

          {/* SECTION 2: PAYMENT TYPE & DEAL LINKAGE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Payment Stage *</Label>
              <select
                {...register("paymentType")}
                className="w-full mt-1 h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#F0944D]/20"
              >
                <option value={PaymentType.FIRST_PAYMENT}>First Payment (Advance Booking)</option>
                <option value={PaymentType.REMAINING_PAYMENT}>Remaining Payment (Installment)</option>
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                {selectedPaymentType === PaymentType.FIRST_PAYMENT
                  ? "First payments can be converted to an active Deal with 1 click."
                  : "Remaining payments must be linked to an active client deal."}
              </p>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Bank Entity Account *</Label>
              <select
                {...register("bankType")}
                className="w-full mt-1 h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#F0944D]/20"
              >
                <option value={SalaryEntity.BSPL}>BSPL — BharatEdge Services Pvt Ltd (Kotak)</option>
                <option value={SalaryEntity.BSAPL}>BSAPL — BharatEdge Allied Platforms LLP (ICICI)</option>
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                Accounts department will verify the bank statement against this entity.
              </p>
            </div>
          </div>

          {/* If Remaining Payment, select existing Deal */}
          {selectedPaymentType === PaymentType.REMAINING_PAYMENT && (
            <div className="p-3 rounded-xl border border-sky-200 bg-sky-50/50 space-y-2">
              <Label className="text-xs font-semibold text-sky-900">
                Linked Client Deal (Required for Remaining Payment) *
              </Label>
              {clientDeals.length > 0 ? (
                <select
                  {...register("dealId")}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-2xs focus:outline-none focus:ring-2 focus:ring-sky-300"
                >
                  <option value="" disabled>
                    Select client deal to credit...
                  </option>
                  {clientDeals.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.dealNumber || "Deal"} — {d.title} (Pending: ₹{d.amountPending.toLocaleString("en-IN")})
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-amber-700">
                  No existing deals found for this client. Please convert a First Payment into a Deal first.
                </p>
              )}
            </div>
          )}

          {/* SECTION 3: AMOUNT, DATE & TRANSACTION */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Received Amount (₹) *</Label>
              <Input
                type="number"
                step="any"
                {...register("amount", { valueAsNumber: true })}
                className="mt-1 text-sm font-bold text-slate-900 h-9"
                placeholder="10000"
              />
              {errors.amount && (
                <p className="text-[10px] text-rose-500 mt-1">{errors.amount.message}</p>
              )}
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Payment Date *</Label>
              <Input
                type="date"
                {...register("paymentDate")}
                className="mt-1 text-xs h-9"
              />
              {errors.paymentDate && (
                <p className="text-[10px] text-rose-500 mt-1">{errors.paymentDate.message}</p>
              )}
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Payment Mode</Label>
              <select
                {...register("paymentMode")}
                className="w-full mt-1 h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#F0944D]/20"
              >
                <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
                <option value="UPI">UPI / QR Code</option>
                <option value="CHEQUE">Bank Cheque</option>
                <option value="CASH">Cash Deposit</option>
                <option value="PAYMENT_GATEWAY">Online Gateway / Card</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <Label className="text-xs font-semibold text-slate-700">
                Transaction Reference / UTR Number
              </Label>
              <Input
                {...register("transactionRef")}
                placeholder="e.g. UTR # 428919283719 or Cheque # 001928"
                className="mt-1 text-xs h-9"
              />
            </div>
          </div>

          {/* SECTION 4: PAYMENT SCREENSHOT (CLOUDFLARE R2 UPLOAD) */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-3">
            <Label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>Payment Proof / Screenshot (Cloudflare R2)</span>
              {screenshotPreview && (
                <a
                  href={screenshotPreview}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-[#F0944D] hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  View Uploaded File
                </a>
              )}
            </Label>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1 w-full">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleScreenshotUpload}
                  disabled={isUploadingScreenshot}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-gradient-to-r file:from-[#ACCAD5]/20 file:to-[#F0944D]/20 file:text-slate-800 hover:file:opacity-90 cursor-pointer"
                />
              </div>

              {isUploadingScreenshot && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin text-[#F0944D]" />
                  <span>Uploading to R2...</span>
                </div>
              )}

              {screenshotPreview && (
                <div className="h-12 w-12 rounded-lg border border-slate-200 overflow-hidden shrink-0 bg-white shadow-2xs">
                  <img
                    src={screenshotPreview}
                    alt="Receipt Thumbnail"
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Remarks */}
          <div>
            <Label className="text-xs font-semibold text-slate-700">Remarks / Staff Notes</Label>
            <Textarea
              {...register("remarks")}
              rows={2}
              placeholder="e.g. Received via Kotak netbanking for company registration advance."
              className="mt-1 text-xs"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-xs text-slate-600"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isUploadingScreenshot}
              className="text-xs bg-gradient-to-r from-[#ACCAD5] to-[#F0944D] text-slate-900 font-semibold shadow-xs hover:opacity-95"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Saving Receipt...
                </>
              ) : (
                "Save Payment Record"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>

      {/* INLINE POPUP MODAL: CREATE CLIENT ON THE SPOT */}
      {isQuickClientOpen && (
        <Dialog open={isQuickClientOpen} onOpenChange={setIsQuickClientOpen}>
          <DialogContent className="max-w-md bg-white border border-slate-200 shadow-2xl rounded-2xl p-5">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold text-slate-900">
                Quick Create Client On The Spot
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Quickly add this contact to the CRM registry to attach their first payment.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleQuickClientSubmit} className="space-y-3 pt-2">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Client Name *</Label>
                <Input
                  required
                  placeholder="e.g. Ramesh Patel"
                  value={quickClientName}
                  onChange={(e) => setQuickClientName(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Phone Number *</Label>
                <Input
                  required
                  placeholder="e.g. 9825012345"
                  value={quickClientPhone}
                  onChange={(e) => setQuickClientPhone(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Email Address</Label>
                <Input
                  type="email"
                  placeholder="e.g. ramesh@example.com"
                  value={quickClientEmail}
                  onChange={(e) => setQuickClientEmail(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsQuickClientOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isCreatingQuickClient}
                  className="text-xs bg-[#F0944D] text-white hover:bg-[#F0944D]/90"
                >
                  {isCreatingQuickClient ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    "Save & Select Client"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}
