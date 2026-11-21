"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Landmark,
  IndianRupee,
  Calendar,
  User,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { SerializedPaymentRecord } from "@/lib/validations/payment";
import { SalaryEntity } from "@prisma/client";

interface AccountsPaymentVerifyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: SerializedPaymentRecord | null;
  onVerify: (paymentId: string, bankType: SalaryEntity, remarks?: string) => Promise<void>;
  onReject: (paymentId: string, reason: string) => Promise<void>;
  isProcessing?: boolean;
}

export default function AccountsPaymentVerifyModal({
  open,
  onOpenChange,
  payment,
  onVerify,
  onReject,
  isProcessing = false,
}: AccountsPaymentVerifyModalProps) {
  const [selectedBankType, setSelectedBankType] = useState<SalaryEntity>(
    payment?.bankType || SalaryEntity.BSPL
  );
  const [remarks, setRemarks] = useState("");
  const [isRejectMode, setIsRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  if (!payment) return null;

  const handleVerifyClick = async () => {
    await onVerify(payment.id, selectedBankType, remarks);
    onOpenChange(false);
  };

  const handleRejectClick = async () => {
    if (!rejectReason.trim()) return;
    await onReject(payment.id, rejectReason);
    onOpenChange(false);
    setIsRejectMode(false);
    setRejectReason("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-xl border border-slate-200/80 shadow-2xl rounded-2xl p-6">
        <DialogHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Accounts Payment Verification
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Verify customer remittance proof against bank statement records for {payment.receiptNumber}.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Summary Box */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
              <div>
                <span className="text-[11px] text-slate-500">Client:</span>
                <h4 className="text-sm font-bold text-slate-900">{payment.clientName}</h4>
                <p className="text-xs text-slate-500">{payment.clientPhone}</p>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-slate-500">Amount Received:</span>
                <h3 className="text-xl font-bold text-[#F0944D]">
                  ₹{payment.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </h3>
                <Badge variant="outline" className="text-[10px] bg-white mt-1">
                  {payment.paymentType === "FIRST_PAYMENT" ? "First Payment (Advance)" : "Remaining Payment"}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500">Payment Date:</span>
                <p className="font-semibold text-slate-800">{payment.paymentDate}</p>
              </div>

              <div>
                <span className="text-slate-500">Payment Mode:</span>
                <p className="font-semibold text-slate-800">{payment.paymentMode}</p>
              </div>

              <div>
                <span className="text-slate-500">Transaction Ref / UTR:</span>
                <p className="font-mono text-slate-800 font-semibold">
                  {payment.transactionRef || "N/A"}
                </p>
              </div>

              <div>
                <span className="text-slate-500">Recorded By (BDM):</span>
                <p className="font-semibold text-slate-800">{payment.recordedByName || "Sales TM"}</p>
              </div>
            </div>

            {payment.remarks && (
              <div className="pt-2 border-t border-slate-200/50 text-xs">
                <span className="text-slate-500">Staff Note:</span>
                <p className="text-slate-700 italic mt-0.5">{payment.remarks}</p>
              </div>
            )}
          </div>

          {/* Payment Screenshot Preview */}
          <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Landmark className="h-3.5 w-3.5 text-slate-500" />
                Payment Proof / Screenshot
              </span>
              {payment.screenshotUrl && (
                <a
                  href={payment.screenshotUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-[#F0944D] hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open High-Res
                </a>
              )}
            </div>

            {payment.screenshotUrl ? (
              <div className="max-h-52 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center">
                <img
                  src={payment.screenshotUrl}
                  alt="Receipt Screenshot"
                  className="max-h-52 w-auto object-contain cursor-pointer hover:opacity-95"
                  onClick={() => window.open(payment.screenshotUrl!, "_blank")}
                />
              </div>
            ) : (
              <div className="p-6 rounded-lg bg-amber-50/60 border border-amber-200/60 text-center text-xs text-amber-700">
                No screenshot uploaded for this payment receipt.
              </div>
            )}
          </div>

          {/* Accounts Department Confirmation: Select Bank Entity */}
          {!isRejectMode ? (
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-bold text-slate-800">
                  Confirm Beneficiary Entity (Bank Account Credited) *
                </Label>
                <select
                  value={selectedBankType}
                  onChange={(e) => setSelectedBankType(e.target.value as SalaryEntity)}
                  className="w-full mt-1.5 h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-xs focus:ring-2 focus:ring-emerald-200"
                >
                  <option value={SalaryEntity.BSPL}>
                    BSPL — BharatEdge Services Pvt Ltd (Kotak Mahindra Bank A/C)
                  </option>
                  <option value={SalaryEntity.BSAPL}>
                    BSAPL — BharatEdge Allied Platforms LLP (ICICI Bank A/C)
                  </option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Selecting and verifying will update the verified revenue tally for this entity.
                </p>
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-700">
                  Verification Remarks (Optional)
                </Label>
                <Textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Verified with Kotak netbanking statement on 20th Nov."
                  rows={2}
                  className="mt-1 text-xs"
                />
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/60 space-y-2">
              <div className="flex items-center gap-2 text-rose-800 text-xs font-bold">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                <span>Specify Rejection Reason</span>
              </div>
              <Textarea
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. UTR number not found in Kotak statement. Please verify with client."
                rows={2}
                className="text-xs bg-white"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            {!isRejectMode ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsRejectMode(true)}
                  className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                >
                  <XCircle className="h-3.5 w-3.5 mr-1" />
                  Decline / Reject
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleVerifyClick}
                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Confirm & Verify Payment
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsRejectMode(false)}
                  className="text-xs text-slate-600"
                >
                  Back to Verify
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    disabled={isProcessing || !rejectReason.trim()}
                    onClick={handleRejectClick}
                    className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                  >
                    Confirm Rejection
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
