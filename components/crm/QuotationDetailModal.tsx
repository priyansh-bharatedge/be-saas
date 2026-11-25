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
  FileText,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Edit2,
  ExternalLink,
  Eye,
  IndianRupee,
  Layers,
  Send,
  User,
} from "lucide-react";
import { SerializedQuotation } from "@/lib/validations/quotation";
import { openDocumentPreview } from "@/components/modals/DocumentPreviewModal";

interface QuotationDetailModalProps {
  quotation: SerializedQuotation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
  canEdit?: boolean;
}

export default function QuotationDetailModal({
  quotation,
  open,
  onOpenChange,
  onEdit,
  canEdit = true,
}: QuotationDetailModalProps) {
  if (!quotation) return null;

  const formatCurrency = (val?: number | null) => {
    return `₹${Number(val || 0).toLocaleString("en-IN")}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACCEPTED":
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Accepted</Badge>;
      case "SENT":
        return <Badge className="bg-sky-50 text-sky-700 border-sky-200">Sent to Client</Badge>;
      case "REJECTED":
        return <Badge className="bg-rose-50 text-rose-700 border-rose-200">Rejected</Badge>;
      case "EXPIRED":
        return <Badge className="bg-slate-100 text-slate-600 border-slate-300">Expired</Badge>;
      default:
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200">Draft</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-xl border border-slate-200/80 shadow-2xl rounded-2xl p-6">
        <DialogHeader className="border-b border-slate-100 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#ACCAD5]/30 to-[#F0944D]/20 flex items-center justify-center text-slate-800">
                <FileText className="h-5 w-5 text-[#F0944D]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-lg font-bold text-slate-900">
                    Quotation Proposal
                  </DialogTitle>
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                    {quotation.quotationNumber}
                  </span>
                </div>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Valid until {quotation.validUntil || "N/A"} • Prepared by {quotation.preparedByName || "Staff"}
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {getStatusBadge(quotation.status)}
              {quotation.pdfUrl && (
                <button
                  type="button"
                  onClick={() =>
                    openDocumentPreview(
                      quotation.pdfUrl!,
                      `${quotation.quotationNumber} — Quotation PDF`,
                      "pdf"
                    )
                  }
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-sky-200 bg-sky-50 text-sky-700 text-xs font-semibold hover:bg-sky-100 transition-colors cursor-pointer"
                >
                  <Eye className="h-3.5 w-3.5" />
                  View PDF
                </button>
              )}
              {canEdit && onEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onOpenChange(false);
                    onEdit();
                  }}
                  className="h-8 text-xs font-semibold text-slate-700 border-slate-200 hover:bg-slate-50 gap-1.5"
                >
                  <Edit2 className="h-3.5 w-3.5 text-[#F0944D]" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-3 text-xs text-slate-700">
          {/* Financial Breakdown Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Subtotal (Ex. GST)</span>
              <p className="text-base font-extrabold text-slate-900 mt-1">{formatCurrency(quotation.subTotal)}</p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">GST (18%)</span>
              <p className="text-base font-extrabold text-slate-800 mt-1">{formatCurrency(quotation.gstAmount)}</p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Discount</span>
              <p className="text-base font-extrabold text-slate-800 mt-1">{formatCurrency(quotation.discountAmount)}</p>
            </div>
            <div className="rounded-xl border border-[#ACCAD5]/60 bg-gradient-to-br from-[#ACCAD5]/20 to-[#F0944D]/10 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">Grand Total</span>
              <p className="text-lg font-black text-slate-900 mt-0.5">{formatCurrency(quotation.grandTotal)}</p>
            </div>
          </div>

          {/* Client & Company Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 space-y-2">
              <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
                <User className="h-4 w-4 text-[#F0944D]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Client Details</h4>
              </div>
              <div className="space-y-1.5 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px]">Contact Name:</span>
                  <p className="font-semibold text-slate-800">{quotation.clientName || "—"}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Phone:</span>
                  <p className="font-medium text-slate-700">{quotation.clientPhone || "—"}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Email:</span>
                  <p className="font-medium text-slate-700 truncate">{quotation.clientEmail || "—"}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Location:</span>
                  <p className="font-medium text-slate-700">
                    {[quotation.clientCity, quotation.clientState].filter(Boolean).join(", ") || "—"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 space-y-2">
              <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
                <Building2 className="h-4 w-4 text-sky-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Company Information</h4>
              </div>
              <div className="space-y-1.5 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px]">Entity Name:</span>
                  <p className="font-semibold text-slate-800">{quotation.companyName || "—"}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Company Type:</span>
                  <p className="font-medium text-slate-700">{quotation.companyType || "Private Limited Company"}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Incorporated Date:</span>
                  <p className="font-medium text-slate-700">{quotation.companyIncorporatedDate || "—"}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Address:</span>
                  <p className="font-medium text-slate-700">{quotation.companyAddress || "—"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quotation Line Items Table */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Quoted Services ({quotation.services.length})
                </h4>
              </div>
              <span className="text-[11px] text-slate-500">
                Grand Total: {formatCurrency(quotation.grandTotal)}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold uppercase text-slate-400">
                    <th className="py-2 px-2">#</th>
                    <th className="py-2 px-3">Service Name & Scope</th>
                    <th className="py-2 px-3 text-right">Taxable Subtotal</th>
                    <th className="py-2 px-3 text-right">GST (18%)</th>
                    <th className="py-2 px-3 text-right">Total Payable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {quotation.services.map((s, idx) => (
                    <tr key={s.id || idx} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-2 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {s.serviceName}
                        {s.remarks && (
                          <p className="text-[10px] text-slate-400 font-normal mt-0.5">{s.remarks}</p>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                        {formatCurrency(s.withoutGstAmount)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                        {formatCurrency(s.gstAmount)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {formatCurrency(s.totalAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Terms & Conditions / Remarks */}
          {(quotation.terms || quotation.notes) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {quotation.terms && (
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Commercial Terms & Conditions
                  </span>
                  <p className="text-slate-700 text-xs mt-1 whitespace-pre-line">{quotation.terms}</p>
                </div>
              )}
              {quotation.notes && (
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Internal Staff Notes
                  </span>
                  <p className="text-slate-700 text-xs mt-1 whitespace-pre-line">{quotation.notes}</p>
                </div>
              )}
            </div>
          )}
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
          {quotation.pdfUrl && (
            <button
              type="button"
              onClick={() =>
                openDocumentPreview(
                  quotation.pdfUrl!,
                  `${quotation.quotationNumber} — Quotation PDF`,
                  "pdf"
                )
              }
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-gradient-to-r from-[#ACCAD5] to-[#F0944D] text-slate-900 text-xs font-semibold hover:opacity-95 shadow-xs cursor-pointer"
            >
              <Eye className="h-3.5 w-3.5" />
              Preview Quotation PDF
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
