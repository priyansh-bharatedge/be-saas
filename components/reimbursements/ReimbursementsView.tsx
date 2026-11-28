"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Receipt,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  IndianRupee,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  FileCheck,
  Filter,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ReimbursementStatus } from "@prisma/client";
import ApplyReimbursementModal from "./ApplyReimbursementModal";
import { reviewReimbursementAction } from "@/lib/actions/reimbursement";

interface ReimbursementRecord {
  id: string;
  employeeName?: string;
  employeeId?: string;
  department?: string;
  designation?: string;
  title: string;
  category: string;
  expenseDate: string;
  amount: number;
  description: string;
  receiptUrls: string[];
  status: ReimbursementStatus;
  reviewerName?: string | null;
  reviewedAt?: string | null;
  remarks?: string | null;
  createdAt: string;
}

interface ReimbursementsViewProps {
  initialMyRecords: ReimbursementRecord[];
  initialAllRecords: ReimbursementRecord[];
  isReviewer: boolean;
}

export default function ReimbursementsView({
  initialMyRecords,
  initialAllRecords,
  isReviewer,
}: ReimbursementsViewProps) {
  const [activeTab, setActiveTab] = useState<"my" | "desk">(isReviewer ? "desk" : "my");
  const [myRecords, setMyRecords] = useState<ReimbursementRecord[]>(initialMyRecords);
  const [allRecords, setAllRecords] = useState<ReimbursementRecord[]>(initialAllRecords);
  const [isApplyOpen, setIsApplyOpen] = useState(false);

  // Review modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<{
    id: string;
    action: ReimbursementStatus;
  } | null>(null);
  const [remarks, setRemarks] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleOpenReview = (id: string, action: ReimbursementStatus) => {
    setSelectedClaim({ id, action });
    setRemarks("");
    setReviewModalOpen(true);
  };

  const handleConfirmReview = () => {
    if (!selectedClaim) return;

    startTransition(async () => {
      const res = await reviewReimbursementAction({
        reimbursementId: selectedClaim.id,
        status: selectedClaim.action,
        remarks: remarks.trim() || undefined,
      });

      if (res.success) {
        toast.success(`Claim marked ${selectedClaim.action.toLowerCase()} successfully!`);
        setAllRecords((prev) =>
          prev.map((r) =>
            r.id === selectedClaim.id ? { ...r, status: selectedClaim.action, remarks } : r
          )
        );
        setReviewModalOpen(false);
      } else {
        toast.error(res.error || "Failed to review claim.");
      }
    });
  };

  const getStatusBadge = (status: ReimbursementStatus) => {
    switch (status) {
      case "PAID":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CreditCard className="h-3 w-3" /> Settled & Paid
          </span>
        );
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <CheckCircle2 className="h-3 w-3" /> Approved for Payout
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="h-3 w-3" /> Declined
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="h-3 w-3" /> Pending Approval
          </span>
        );
    }
  };

  // KPI Calculations
  const records = activeTab === "my" ? myRecords : allRecords;
  const totalAmount = records.reduce((acc, r) => acc + r.amount, 0);
  const paidAmount = records
    .filter((r) => r.status === "PAID" || r.status === "APPROVED")
    .reduce((acc, r) => acc + r.amount, 0);
  const pendingCount = records.filter((r) => r.status === "PENDING").length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Reimbursements & Expense Claims</h2>
            <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#EBF3F6] text-[#588594] border border-[#ACCAD5]/50">
              Finance & HR Operations
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Submit business expense claims with invoice attachments, monitor approval workflows, and process financial payouts.
          </p>
        </div>

        <Button
          onClick={() => setIsApplyOpen(true)}
          className="rounded-full bg-gradient-to-r from-[#ACCAD5] to-[#F0944D] text-white font-semibold text-xs px-5 py-2.5 shadow-xs cursor-pointer flex items-center gap-2 self-start sm:self-center"
        >
          <Plus className="h-4 w-4" />
          Submit Expense Claim
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white/85 backdrop-blur-md border border-slate-200/80 shadow-2xs">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Total Claims Value</span>
          <span className="text-xl font-bold text-slate-900">₹{totalAmount.toLocaleString("en-IN")}</span>
          <span className="text-[11px] text-slate-400 block mt-0.5">{records.length} total claims recorded</span>
        </div>
        <div className="p-5 rounded-2xl bg-white/85 backdrop-blur-md border border-emerald-200/70 shadow-2xs">
          <span className="text-xs font-semibold text-emerald-600 block mb-1">Approved & Settled</span>
          <span className="text-xl font-bold text-emerald-800">₹{paidAmount.toLocaleString("en-IN")}</span>
          <span className="text-[11px] text-slate-400 block mt-0.5">Cleared for reimbursement payout</span>
        </div>
        <div className="p-5 rounded-2xl bg-white/85 backdrop-blur-md border border-amber-200/70 shadow-2xs">
          <span className="text-xs font-semibold text-amber-600 block mb-1">Pending In Queue</span>
          <span className="text-xl font-bold text-amber-800">{pendingCount} Claims</span>
          <span className="text-[11px] text-slate-400 block mt-0.5">Awaiting manager or HR sign-off</span>
        </div>
      </div>

      {/* Tab Controls */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
        <button
          onClick={() => setActiveTab("my")}
          className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "my"
              ? "bg-[#588594] text-white shadow-2xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          My Expense Claims ({myRecords.length})
        </button>

        {isReviewer && (
          <button
            onClick={() => setActiveTab("desk")}
            className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "desk"
                ? "bg-[#1E293B] text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Finance Settlement Desk</span>
            {allRecords.filter((r) => r.status === "PENDING").length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-900 text-[10px] font-bold">
                {allRecords.filter((r) => r.status === "PENDING").length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Claims List */}
      {records.length === 0 ? (
        <div className="text-center py-16 bg-white/60 rounded-3xl border border-slate-200/60 p-8">
          <Receipt className="h-10 w-10 mx-auto text-slate-300 mb-2" />
          <h3 className="text-sm font-bold text-slate-700">No expense claims found</h3>
          <p className="text-xs text-slate-400 mt-1">
            Click &quot;Submit Expense Claim&quot; to file your receipts and expenditures.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-2xl bg-white/85 backdrop-blur-md border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-[#ACCAD5]"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {item.employeeName && (
                    <span className="font-bold text-slate-900 text-sm">
                      {item.employeeName} ({item.employeeId}) •{" "}
                    </span>
                  )}
                  <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono">
                    {item.category.replace(/_/g, " ")}
                  </span>
                  {getStatusBadge(item.status)}
                </div>

                <div className="text-xs text-slate-600 flex items-center gap-3">
                  <span>
                    <strong>Date:</strong> {item.expenseDate}
                  </span>
                  <span>•</span>
                  <span>
                    <strong>Amount:</strong>{" "}
                    <span className="font-bold text-slate-900 font-mono">
                      ₹{item.amount.toLocaleString("en-IN")}
                    </span>
                  </span>
                </div>

                <p className="text-xs text-slate-500 italic bg-slate-50/80 p-2 rounded-xl border border-slate-150 max-w-2xl">
                  &quot;{item.description}&quot;
                </p>

                {item.receiptUrls.length > 0 && (
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <span className="text-[11px] font-semibold text-slate-400">Receipts:</span>
                    {item.receiptUrls.map((url, uIdx) => (
                      <a
                        key={uIdx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-[#588594] hover:underline flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#EBF3F6]"
                      >
                        <ExternalLink className="h-3 w-3" /> Receipt #{uIdx + 1}
                      </a>
                    ))}
                  </div>
                )}

                {item.reviewerName && (
                  <div className="text-[11px] text-slate-400 pt-0.5">
                    Reviewed by {item.reviewerName}
                    {item.remarks ? ` • "${item.remarks}"` : ""}
                  </div>
                )}
              </div>

              {/* Review Desk Action Buttons */}
              {activeTab === "desk" && (
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  {item.status === "PENDING" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleOpenReview(item.id, "APPROVED")}
                        disabled={isPending}
                        className="bg-[#10B981] hover:bg-emerald-600 text-white text-xs font-semibold px-4 rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenReview(item.id, "REJECTED")}
                        disabled={isPending}
                        className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold px-4 rounded-xl flex items-center gap-1.5 cursor-pointer"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                      </Button>
                    </>
                  )}

                  {item.status === "APPROVED" && (
                    <Button
                      size="sm"
                      onClick={() => handleOpenReview(item.id, "PAID")}
                      disabled={isPending}
                      className="bg-slate-900 hover:bg-black text-white text-xs font-semibold px-4 rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <CreditCard className="h-3.5 w-3.5" />
                      Mark Settled / Paid
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Apply Modal */}
      <ApplyReimbursementModal
        isOpen={isApplyOpen}
        onClose={() => setIsApplyOpen(false)}
        onSuccess={() => window.location.reload()}
      />

      {/* Review Dialog */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-3xl bg-white/95 backdrop-blur-2xl border border-white/80 p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Confirm Claim {selectedClaim?.action}
            </DialogTitle>
            <p className="text-xs text-slate-500 mt-1">
              Add optional reviewer remarks or bank transaction reference.
            </p>
          </DialogHeader>

          <div className="space-y-3 mt-3">
            <Textarea
              placeholder="Comments or payment reference..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="rounded-2xl bg-slate-50 border-slate-200 text-xs text-slate-800 resize-none h-24"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReviewModalOpen(false)}
                className="rounded-full text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmReview}
                disabled={isPending}
                className="rounded-full text-xs font-semibold px-5 text-white bg-slate-900 hover:bg-black"
              >
                {isPending ? "Recording..." : `Confirm ${selectedClaim?.action}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
