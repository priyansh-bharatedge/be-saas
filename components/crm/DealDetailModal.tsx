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
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Edit2,
  ExternalLink,
  FileCheck,
  FileText,
  IndianRupee,
  Layers,
  Phone,
  Scale,
  ShieldCheck,
  User,
  Users,
  X,
} from "lucide-react";
import { SerializedDeal } from "@/lib/validations/deal";

interface DealDetailModalProps {
  deal: SerializedDeal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
  canEdit?: boolean;
  isSalesUser?: boolean;
}

export default function DealDetailModal({
  deal,
  open,
  onOpenChange,
  onEdit,
  canEdit = true,
  isSalesUser = false,
}: DealDetailModalProps) {
  if (!deal) return null;

  const formatCurrency = (val?: number | null) => {
    return `₹${Number(val || 0).toLocaleString("en-IN")}`;
  };

  const getStageBadgeColor = (stage: string) => {
    switch (stage) {
      case "WON":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "LOST":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "PROPOSAL":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "NEGOTIATION":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-sky-50 text-sky-700 border-sky-200";
    }
  };

  const getAccountsBadgeColor = (status: string) => {
    switch (status) {
      case "ACCOUNTS_VERIFIED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "PENDING_ACCOUNTS":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "SENT_TO_LEGAL":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "SENT_TO_OPERATION":
        return "bg-sky-50 text-sky-700 border-sky-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-xl border border-slate-200/80 shadow-2xl rounded-2xl p-6">
        {/* Header */}
        <DialogHeader className="border-b border-slate-100 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#ACCAD5]/30 to-[#F0944D]/20 flex items-center justify-center text-slate-800">
                <Briefcase className="h-5 w-5 text-[#F0944D]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-lg font-bold text-slate-900">
                    {deal.title}
                  </DialogTitle>
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                    {deal.dealNumber}
                  </span>
                </div>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Booked on {deal.bookingDate || "N/A"} • Currency: {deal.currency || "INR"}
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-xs font-semibold ${getStageBadgeColor(deal.stage)}`}>
                {deal.stage}
              </Badge>
              <Badge variant="outline" className={`text-xs font-semibold ${getAccountsBadgeColor(deal.accountsStatus)}`}>
                {deal.accountsStatus.replace(/_/g, " ")}
              </Badge>
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
                  Edit Deal
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-3 text-xs text-slate-700">
          {/* Financial Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Value</span>
              <p className="text-base font-extrabold text-slate-900 mt-1">{formatCurrency(deal.totalValue)}</p>
              <span className="text-[10px] text-slate-400">Subtotal: {formatCurrency(deal.subTotal)}</span>
            </div>
            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Amount Received</span>
              <p className="text-base font-extrabold text-emerald-700 mt-1">{formatCurrency(deal.amountReceived)}</p>
              <span className="text-[10px] text-emerald-600 font-medium">Verified in Accounts</span>
            </div>
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Amount Pending</span>
              <p className="text-base font-extrabold text-amber-700 mt-1">{formatCurrency(deal.amountPending)}</p>
              <span className="text-[10px] text-amber-600 font-medium">To be collected</span>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">GST (18%)</span>
              <p className="text-base font-extrabold text-slate-800 mt-1">{formatCurrency(deal.gstAmount)}</p>
              <span className="text-[10px] text-slate-400">Tax liability</span>
            </div>
          </div>

          {/* Section 1: Client & Company Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Client Card */}
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
                <User className="h-4 w-4 text-[#F0944D]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Client Details</h4>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px]">Full Name:</span>
                  <p className="font-semibold text-slate-800">{deal.clientName || "—"}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Contact Phone:</span>
                  <p className="font-semibold text-slate-800">{deal.clientPhone || "—"}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Email:</span>
                  <p className="font-medium text-slate-700 truncate">{deal.clientEmail || "—"}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Alt Phone:</span>
                  <p className="font-medium text-slate-700">{deal.clientAlternatePhone || "—"}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 text-[11px]">Location:</span>
                  <p className="font-medium text-slate-700">
                    {[deal.clientCity, deal.clientState].filter(Boolean).join(", ") || "—"}
                  </p>
                  {deal.clientAddress && (
                    <p className="text-[11px] text-slate-500 mt-0.5">{deal.clientAddress}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Company Card */}
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
                <Building2 className="h-4 w-4 text-sky-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Company / Entity Info</h4>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="col-span-2">
                  <span className="text-slate-400 text-[11px]">Company Name:</span>
                  <p className="font-semibold text-slate-900">{deal.companyName || "—"}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Entity Type:</span>
                  <p className="font-medium text-slate-700">{deal.companyType || "Private Limited Company"}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Incorporated Date:</span>
                  <p className="font-medium text-slate-700">{deal.companyIncorporatedDate || "—"}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 text-[11px]">Company Address:</span>
                  <p className="font-medium text-slate-700">{deal.companyAddress || "—"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Sales Personnel & Commercial Metadata */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
              <Users className="h-4 w-4 text-[#F0944D]" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Commercial & Staff Alignment</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-400 text-[11px]">Primary BDM / Owner:</span>
                <p className="font-semibold text-slate-800">{deal.assignedEmployeeName || "—"}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[11px]">Partner BDM:</span>
                <p className="font-medium text-slate-700">{deal.partnerBdmName || "None (100% Direct)"}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[11px]">PAN Number:</span>
                <p className="font-mono font-medium text-slate-800">{deal.panNumber || "—"}</p>
              </div>
            </div>
          </div>

          {/* Section 3: Services Breakdown */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Service Deliverables ({deal.services.length})
                </h4>
              </div>
              <span className="text-[11px] text-slate-500">
                Total Line Value: {formatCurrency(deal.totalValue)}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold uppercase text-slate-400">
                    <th className="py-2 px-2">#</th>
                    <th className="py-2 px-3">Service Name</th>
                    <th className="py-2 px-3">Team</th>
                    <th className="py-2 px-3 text-right">Price (ex. GST)</th>
                    <th className="py-2 px-3 text-right">Total (inc. GST)</th>
                    <th className="py-2 px-3 text-right">Received</th>
                    <th className="py-2 px-3 text-right">Pending</th>
                    {!isSalesUser && <th className="py-2 px-3">Legal Status</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {deal.services.map((s, idx) => (
                    <tr key={s.id || idx} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-2 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {s.serviceName}
                        {s.remarks && (
                          <p className="text-[10px] text-slate-400 font-normal mt-0.5">{s.remarks}</p>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{s.teamType || "Team Incorporation"}</td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                        {formatCurrency(s.withoutGstAmount)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {formatCurrency(s.totalPrice)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-emerald-600">
                        {formatCurrency(s.amountReceived)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-amber-600">
                        {formatCurrency(s.amountPending)}
                      </td>
                      {!isSalesUser && (
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                            {s.legalStatus || "PENDING"}
                          </span>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4: Legal Department Tracking (STRICTLY HIDDEN FOR SALES USERS) */}
          {!isSalesUser && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-4 space-y-3">
              <div className="flex items-center gap-2 border-b border-indigo-100 pb-2">
                <Scale className="h-4 w-4 text-indigo-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                  Legal Department Tracking & Contract Execution
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px]">Sender Name:</span>
                  <p className="font-semibold text-slate-800">{deal.legalDocSenderName || "—"}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Dispatch Date:</span>
                  <p className="font-medium text-slate-700">{deal.legalDocSenderDate || "—"}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Receiver Name:</span>
                  <p className="font-semibold text-slate-800">{deal.legalDocReceiverName || "—"}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Signed Date:</span>
                  <p className="font-medium text-slate-700">{deal.legalDocReceiverDate || "—"}</p>
                </div>
              </div>

              {(deal.agreementTerms || deal.legalRemarks) && (
                <div className="pt-2 border-t border-indigo-100/60 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {deal.agreementTerms && (
                    <div>
                      <span className="text-slate-400 text-[11px]">Agreement Terms:</span>
                      <p className="text-slate-700 bg-white/60 rounded-md p-2 mt-0.5 border border-indigo-100/60">
                        {deal.agreementTerms}
                      </p>
                    </div>
                  )}
                  {deal.legalRemarks && (
                    <div>
                      <span className="text-slate-400 text-[11px]">Legal Remarks:</span>
                      <p className="text-slate-700 bg-white/60 rounded-md p-2 mt-0.5 border border-indigo-100/60">
                        {deal.legalRemarks}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Section 5: Attachments & Cloudflare R2 Documents */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
              <FileCheck className="h-4 w-4 text-sky-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Attachments & Contracts (Cloudflare R2)
              </h4>
            </div>

            <div className="space-y-3">
              {/* Payment Proof */}
              <div>
                <span className="text-[11px] font-semibold text-slate-500">Payment Screenshot / Proof:</span>
                {deal.paymentScreenshotUrl ? (
                  <div className="mt-1 flex items-center gap-2">
                    <a
                      href={deal.paymentScreenshotUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-sky-200 bg-sky-50 text-sky-700 font-semibold hover:bg-sky-100 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      View Payment Screenshot
                    </a>
                  </div>
                ) : (
                  <p className="text-slate-400 italic text-[11px] mt-0.5">No screenshot uploaded.</p>
                )}
              </div>

              {/* Uploaded Documents */}
              <div>
                <span className="text-[11px] font-semibold text-slate-500">
                  Attached Documents ({deal.documents.length}):
                </span>
                {deal.documents.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1.5">
                    {deal.documents.map((doc, idx) => (
                      <div
                        key={doc.id || idx}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-slate-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 truncate">{doc.title}</p>
                            <span className="text-[10px] text-slate-400 uppercase">{doc.docType}</span>
                          </div>
                        </div>
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 p-1.5 rounded-md hover:bg-slate-100 text-slate-600 transition-colors"
                          title="Open document"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic text-[11px] mt-0.5">No contract or KYC documents attached.</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 6: Notes & Quality Remarks */}
          {(deal.notes || deal.qualityRemarks) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {deal.notes && (
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Deal Notes</span>
                  <p className="text-slate-700 text-xs mt-1 whitespace-pre-line">{deal.notes}</p>
                </div>
              )}
              {deal.qualityRemarks && (
                <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Quality Remarks</span>
                  <p className="text-amber-900 text-xs mt-1 whitespace-pre-line">{deal.qualityRemarks}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-xs text-slate-600"
          >
            Close
          </Button>
          {canEdit && onEdit && (
            <Button
              type="button"
              onClick={() => {
                onOpenChange(false);
                onEdit();
              }}
              className="text-xs bg-gradient-to-r from-[#ACCAD5] to-[#F0944D] text-slate-900 font-semibold shadow-xs hover:opacity-95 gap-1.5"
            >
              <Edit2 className="h-3.5 w-3.5" />
              Edit Deal
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
