"use client";

import { AlertTriangle, ExternalLink, Image as ImageIcon, CheckCircle, FileText } from "lucide-react";
import Link from "next/link";
import { openDocumentPreview } from "@/components/modals/DocumentPreviewModal";

export interface PaymentDiscrepancyMetadata {
  paymentId: string;
  receiptNumber: string;
  salespersonName: string;
  teamLeaderName: string;
  clientName: string;
  enteredAmount: number;
  aiDetectedAmount: number | null;
  variance: number;
  status: "MISMATCH" | "UNREADABLE" | "MATCHED";
  auditSummary: string;
  screenshotUrls: string[];
  createdAt: string;
}

export function PaymentDiscrepancyAlertCard({ metadata }: { metadata: PaymentDiscrepancyMetadata }) {
  if (!metadata) return null;

  const isMismatch = metadata.status === "MISMATCH";
  const isUnreadable = metadata.status === "UNREADABLE";

  return (
    <div className="w-full max-w-xl rounded-2xl bg-white border border-rose-300 shadow-md overflow-hidden text-xs my-2 animate-in fade-in zoom-in-95 duration-200">
      {/* Alert Header */}
      <div className="p-3.5 bg-gradient-to-r from-rose-500 to-amber-500 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
            <AlertTriangle className="h-4 w-4 text-white" />
          </div>
          <div>
            <h4 className="font-bold text-sm tracking-wide">
              {isMismatch ? "Vision AI: Payment Discrepancy Detected" : "Vision AI: Unreadable Payment Proof"}
            </h4>
            <p className="text-[11px] text-white/90">
              Receipt #{metadata.receiptNumber} • Automated Audit
            </p>
          </div>
        </div>

        <Link
          href={`/crm/payments`}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white font-semibold text-[11px] transition-colors"
        >
          <span>View Record</span>
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {/* Discrepancy Figures Comparison */}
      <div className="grid grid-cols-3 gap-2 p-3 bg-rose-50/40 border-b border-rose-100 text-center">
        <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Entered Amount</span>
          <span className="text-sm font-bold text-slate-800">
            ₹{metadata.enteredAmount.toLocaleString("en-IN")}
          </span>
        </div>

        <div className="p-2 rounded-xl bg-white border border-amber-200 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-amber-600 block">AI Detected</span>
          <span className="text-sm font-bold text-amber-700">
            {metadata.aiDetectedAmount !== null
              ? `₹${metadata.aiDetectedAmount.toLocaleString("en-IN")}`
              : "Unreadable / Failed"}
          </span>
        </div>

        <div className="p-2 rounded-xl bg-white border border-rose-200 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-rose-600 block">Variance</span>
          <span className="text-sm font-bold text-rose-700 font-mono">
            {metadata.variance > 0 ? "+" : ""}₹{metadata.variance.toLocaleString("en-IN")}
          </span>
        </div>
      </div>

      {/* Context Details */}
      <div className="p-3.5 space-y-2.5">
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Salesperson (Owner)</span>
            <span className="font-bold text-slate-800">{metadata.salespersonName}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Team Leader (TL)</span>
            <span className="font-semibold text-slate-700">{metadata.teamLeaderName || "Direct / HOD"}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Client</span>
            <span className="font-semibold text-slate-700">{metadata.clientName}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">TL Action Required</span>
            <span className="text-emerald-700 font-semibold inline-flex items-center gap-1">
              <CheckCircle className="h-3 w-3" /> Notification Sent to TL
            </span>
          </div>
        </div>

        {/* AI Audit Analysis Summary */}
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
          <span className="font-bold text-slate-700 block mb-0.5">Audit Observation:</span>
          <p>{metadata.auditSummary}</p>
        </div>

        {/* Attached Proof Screenshots with In-App Preview */}
        {metadata.screenshotUrls && metadata.screenshotUrls.length > 0 && (
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1.5">
              Audited Payment Screenshots ({metadata.screenshotUrls.length}):
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {metadata.screenshotUrls.map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => openDocumentPreview(url, `Payment Proof #${idx + 1}`)}
                  className="group relative h-14 w-20 rounded-xl overflow-hidden border border-slate-200 hover:border-[#F0944D] shadow-2xs transition-all cursor-pointer"
                >
                  <img src={url} alt={`Screenshot ${idx + 1}`} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                  <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                    <ImageIcon className="h-4 w-4" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
