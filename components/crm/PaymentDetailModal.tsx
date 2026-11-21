"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  IndianRupee,
  ShieldCheck,
  User,
  Users,
  AlertTriangle,
  ArrowRight,
  Briefcase,
} from "lucide-react";
import { SerializedPaymentRecord } from "@/lib/validations/payment";

interface PaymentDetailModalProps {
  payment: SerializedPaymentRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConvertToDeal?: (paymentId: string) => void;
}

export default function PaymentDetailModal({
  payment,
  open,
  onOpenChange,
  onConvertToDeal,
}: PaymentDetailModalProps) {
  if (!payment) return null;

  const formatCurrency = (val?: number | null) => {
    return `₹${Number(val || 0).toLocaleString("en-IN")}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "VERIFIED":
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Verified by Accounts</Badge>;
      case "REJECTED":
        return <Badge className="bg-rose-50 text-rose-700 border-rose-200">Rejected</Badge>;
      default:
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200">Pending Verification</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-xl border border-slate-200/80 shadow-2xl rounded-2xl p-6">
        <DialogHeader className="border-b border-slate-100 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#ACCAD5]/30 to-[#F0944D]/20 flex items-center justify-center text-slate-800">
                <CreditCard className="h-5 w-5 text-[#F0944D]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-lg font-bold text-slate-900">
                    Payment Receipt
                  </DialogTitle>
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                    {payment.receiptNumber}
                  </span>
                </div>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Recorded on {payment.paymentDate} • Entity: {payment.bankType}
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {getStatusBadge(payment.status)}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-3 text-xs text-slate-700">
          {/* Amount Spotlight Banner */}
          <div className="rounded-xl border border-[#ACCAD5]/50 bg-gradient-to-r from-slate-50 to-[#ACCAD5]/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Collected Amount</span>
              <p className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                {formatCurrency(payment.amount)}
              </p>
              <span className="text-[11px] text-slate-500">
                Payment Type: <strong className="text-slate-700">{payment.paymentType.replace(/_/g, " ")}</strong> • Mode: <strong className="text-slate-700">{payment.paymentMode}</strong>
              </span>
            </div>

            {payment.dealId ? (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-600">Linked to Deal</span>
                  <p className="font-semibold">{payment.dealNumber || "Deal Active"}</p>
                </div>
              </div>
            ) : onConvertToDeal ? (
              <Button
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onConvertToDeal(payment.id);
                }}
                className="h-8 text-xs font-semibold bg-gradient-to-r from-[#ACCAD5] to-[#F0944D] text-slate-900 shadow-xs hover:opacity-95 gap-1.5"
              >
                <Briefcase className="h-3.5 w-3.5" />
                Convert to Deal
              </Button>
            ) : null}
          </div>

          {/* Client & Commercial Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 space-y-2.5">
              <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
                <User className="h-4 w-4 text-[#F0944D]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Client Info</h4>
              </div>
              <div className="space-y-1.5 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px]">Client Name:</span>
                  <p className="font-semibold text-slate-800">{payment.clientName || "—"}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Phone:</span>
                  <p className="font-medium text-slate-700">{payment.clientPhone || "—"}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Email:</span>
                  <p className="font-medium text-slate-700 truncate">{payment.clientEmail || "—"}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 space-y-2.5">
              <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
                <Building2 className="h-4 w-4 text-sky-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Banking & Transaction</h4>
              </div>
              <div className="space-y-1.5 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px]">Receiving Entity:</span>
                  <p className="font-semibold text-slate-800">{payment.bankType}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Transaction UTR / Ref:</span>
                  <p className="font-mono font-medium text-slate-800">{payment.transactionRef || "—"}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Payment Date:</span>
                  <p className="font-medium text-slate-700">{payment.paymentDate}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Audit & Staff Logs */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 space-y-2.5">
            <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Audit & Verification</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-400 text-[11px]">Recorded By:</span>
                <p className="font-semibold text-slate-800">{payment.recordedByName || "System"}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[11px]">Verified By (Accounts):</span>
                <p className="font-semibold text-slate-800">{payment.verifiedByName || "Pending"}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[11px]">Verification Timestamp:</span>
                <p className="font-medium text-slate-700">{payment.verifiedAt || "—"}</p>
              </div>
            </div>
            {payment.remarks && (
              <div className="pt-2 border-t border-slate-200/60">
                <span className="text-slate-400 text-[11px]">Remarks / Staff Notes:</span>
                <p className="text-slate-700 mt-0.5">{payment.remarks}</p>
              </div>
            )}
          </div>

          {/* Proof Screenshot */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 space-y-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Payment Screenshot / Bank Slip
            </span>
            {payment.screenshotUrl ? (
              <div className="space-y-3">
                <div className="max-h-60 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center p-2">
                  <img
                    src={payment.screenshotUrl}
                    alt="Payment Slip Proof"
                    className="max-h-56 max-w-full object-contain rounded"
                  />
                </div>
                <a
                  href={payment.screenshotUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open full resolution image in new tab
                </a>
              </div>
            ) : (
              <p className="text-slate-400 italic text-xs">No screenshot uploaded for this payment.</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 mt-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-xs text-slate-600"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
