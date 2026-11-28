"use client";

import { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Clock,
  Plus,
  CheckCircle2,
  XCircle,
  FileCheck,
  AlertCircle,
  ShieldCheck,
  UserCheck,
  ExternalLink,
  ChevronRight,
  Filter,
} from "lucide-react";
import AttendanceRegularizationModal from "./AttendanceRegularizationModal";
import {
  getMyRegularizationsAction,
  getAllRegularizationsAction,
  reviewRegularizationAction,
} from "@/lib/actions/regularization";
import { ApprovalStatus } from "@prisma/client";

interface AttendanceRegularizationSectionProps {
  isHrAdmin: boolean;
  isTL?: boolean;
}

export default function AttendanceRegularizationSection({
  isHrAdmin,
  isTL = false,
}: AttendanceRegularizationSectionProps) {
  const [activeTab, setActiveTab] = useState<"my" | "review">("my");
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [myRecords, setMyRecords] = useState<any[]>([]);
  const [reviewRecords, setReviewRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Review modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<{
    id: string;
    action: ApprovalStatus;
  } | null>(null);
  const [remarks, setRemarks] = useState("");
  const [isPending, startTransition] = useTransition();

  const loadData = async () => {
    setLoading(true);
    const myRes = await getMyRegularizationsAction();
    if (myRes.success && myRes.data) {
      setMyRecords(myRes.data);
    }

    if (isHrAdmin || isTL) {
      const allRes = await getAllRegularizationsAction({ status: "PENDING" });
      if (allRes.success && allRes.data) {
        setReviewRecords(allRes.data);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [isHrAdmin, isTL]);

  const handleOpenReview = (id: string, action: ApprovalStatus) => {
    setSelectedRequest({ id, action });
    setRemarks("");
    setReviewModalOpen(true);
  };

  const handleConfirmReview = () => {
    if (!selectedRequest) return;

    startTransition(async () => {
      const res = await reviewRegularizationAction({
        regularizationId: selectedRequest.id,
        status: selectedRequest.action,
        remarks: remarks.trim() || undefined,
      });

      if (res.success) {
        toast.success(
          `Regularization request ${selectedRequest.action.toLowerCase()} successfully! Attendance timesheet synchronized.`
        );
        setReviewModalOpen(false);
        loadData();
      } else {
        toast.error(res.error || "Failed to record review.");
      }
    });
  };

  const formatTime = (isoStr: string) => {
    if (!isoStr) return "--";
    const d = new Date(isoStr);
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  const getStatusBadge = (status: ApprovalStatus) => {
    switch (status) {
      case ApprovalStatus.APPROVED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3" /> Approved
          </span>
        );
      case ApprovalStatus.REJECTED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="h-3 w-3" /> Declined
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="h-3 w-3" /> Pending Review
          </span>
        );
    }
  };

  return (
    <div className="rounded-3xl bg-white/80 backdrop-blur-md border border-slate-200/80 p-6 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">Attendance Regularization (AR)</h3>
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-[#EBF3F6] text-[#588594] border border-[#ACCAD5]/50">
              Timesheet Corrections
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Submit punch correction requests for missed clock-ins, biometric errors, or external duty.
          </p>
        </div>

        <Button
          onClick={() => setIsApplyOpen(true)}
          className="rounded-full bg-gradient-to-r from-[#ACCAD5] to-[#F0944D] text-white font-semibold text-xs px-4 py-2 shadow-xs cursor-pointer flex items-center gap-1.5 self-start sm:self-center"
        >
          <Plus className="h-3.5 w-3.5" />
          Apply Regularization
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
        <button
          onClick={() => setActiveTab("my")}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "my"
              ? "bg-[#588594] text-white shadow-2xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          My Requests ({myRecords.length})
        </button>

        {(isHrAdmin || isTL) && (
          <button
            onClick={() => setActiveTab("review")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "review"
                ? "bg-[#1E293B] text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Staff Review Queue</span>
            {reviewRecords.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-900 text-[10px] font-bold">
                {reviewRecords.length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-8 text-center text-xs text-slate-400">Loading regularizations...</div>
      ) : activeTab === "my" ? (
        myRecords.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No regularization requests filed yet. Click &quot;Apply Regularization&quot; to submit one.
          </div>
        ) : (
          <div className="space-y-2.5">
            {myRecords.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 font-mono text-sm">{item.date}</span>
                    <span className="font-semibold text-slate-700 px-2 py-0.5 rounded-full bg-white border border-slate-200 text-[11px]">
                      {item.regularizationType.replace(/_/g, " ")}
                    </span>
                    {getStatusBadge(item.status)}
                  </div>
                  <div className="text-slate-600">
                    <strong>Requested Shift:</strong> {formatTime(item.requestedClockIn)} to{" "}
                    {formatTime(item.requestedClockOut)}
                  </div>
                  <p className="text-slate-500 italic bg-white/80 p-2 rounded-xl border border-slate-150 max-w-xl">
                    &quot;{item.reason}&quot;
                  </p>
                  {item.reviewedByName && (
                    <div className="text-[11px] text-slate-500 pt-0.5">
                      Reviewed by {item.reviewedByName}
                      {item.reviewRemarks ? ` • "${item.reviewRemarks}"` : ""}
                    </div>
                  )}
                </div>

                {item.attachmentUrl && (
                  <a
                    href={item.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-[#588594] hover:underline flex items-center gap-1 text-[11px] font-medium"
                  >
                    <ExternalLink className="h-3 w-3" /> View Proof
                  </a>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        /* Review Queue for Admin / TL */
        reviewRecords.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No pending attendance regularization requests awaiting review.
          </div>
        ) : (
          <div className="space-y-3">
            {reviewRecords.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 text-sm">{item.employeeName}</h4>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {item.employeeId}
                    </span>
                    <span className="font-medium text-slate-500">
                      {item.designation} • {item.department}
                    </span>
                  </div>
                  <div className="text-slate-700">
                    <strong>Date:</strong> {item.date} •{" "}
                    <strong>Type:</strong> {item.regularizationType.replace(/_/g, " ")} •{" "}
                    <strong>Requested:</strong> {formatTime(item.requestedClockIn)} – {formatTime(item.requestedClockOut)}
                  </div>
                  <p className="text-slate-600 italic bg-slate-50 p-2 rounded-xl border border-slate-150 max-w-xl">
                    &quot;{item.reason}&quot;
                  </p>
                  {item.attachmentUrl && (
                    <a
                      href={item.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#588594] hover:underline inline-flex items-center gap-1 text-[11px] font-semibold mt-1"
                    >
                      <ExternalLink className="h-3 w-3" /> Inspect Attached Proof
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  <Button
                    size="sm"
                    onClick={() => handleOpenReview(item.id, ApprovalStatus.APPROVED)}
                    disabled={isPending}
                    className="bg-[#10B981] hover:bg-emerald-600 text-white text-xs font-semibold px-4 rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenReview(item.id, ApprovalStatus.REJECTED)}
                    disabled={isPending}
                    className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold px-4 rounded-xl flex items-center gap-1.5 cursor-pointer"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Apply Regularization Modal */}
      <AttendanceRegularizationModal
        isOpen={isApplyOpen}
        onClose={() => setIsApplyOpen(false)}
        onSuccess={loadData}
      />

      {/* Review Confirmation Dialog */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-3xl bg-white/95 backdrop-blur-2xl border border-white/80 p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Confirm {selectedRequest?.action === ApprovalStatus.APPROVED ? "Approval" : "Rejection"}
            </DialogTitle>
            <p className="text-xs text-slate-500 mt-1">
              Add optional remarks for the employee before recording your review decision.
            </p>
          </DialogHeader>

          <div className="space-y-3 mt-3">
            <Textarea
              placeholder="Reviewer remarks (optional)..."
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
                className={`rounded-full text-xs font-semibold px-5 text-white ${
                  selectedRequest?.action === ApprovalStatus.APPROVED
                    ? "bg-[#10B981] hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {isPending ? "Recording..." : `Confirm ${selectedRequest?.action}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
