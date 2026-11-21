"use client";

import { useState, useTransition } from "react";
import { ApprovalStatus } from "@prisma/client";
import { reviewLeaveAsTLAction, reviewLeaveAsHRAction } from "@/lib/actions/leave";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, ShieldCheck, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface QueueItem {
  id: string;
  employeeName: string;
  employeeId: string;
  department: string;
  designation: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  tlComments?: string | null;
  teamLeaderName?: string | null;
  createdAt: string;
}

interface LeaveApprovalQueueProps {
  tlQueue: QueueItem[];
  hrQueue: QueueItem[];
  isHR: boolean;
  isTL: boolean;
  onRefresh?: () => void;
}

export default function LeaveApprovalQueue({
  tlQueue,
  hrQueue,
  isHR,
  isTL,
  onRefresh,
}: LeaveApprovalQueueProps) {
  const [activeTab, setActiveTab] = useState<"tl" | "hr">(isTL && tlQueue.length > 0 ? "tl" : "hr");
  const [isPending, startTransition] = useTransition();

  // Review modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<{ id: string; action: "APPROVED" | "REJECTED"; tier: "tl" | "hr" } | null>(null);
  const [comments, setComments] = useState("");

  const handleOpenReview = (id: string, action: "APPROVED" | "REJECTED", tier: "tl" | "hr") => {
    setSelectedRequest({ id, action, tier });
    setComments("");
    setReviewModalOpen(true);
  };

  const handleConfirmReview = () => {
    if (!selectedRequest) return;

    startTransition(async () => {
      let res;
      if (selectedRequest.tier === "tl") {
        res = await reviewLeaveAsTLAction({
          requestId: selectedRequest.id,
          status: selectedRequest.action,
          comments,
        });
      } else {
        res = await reviewLeaveAsHRAction({
          requestId: selectedRequest.id,
          status: selectedRequest.action,
          comments,
        });
      }

      if (res.success) {
        toast.success(
          `Request successfully ${selectedRequest.action.toLowerCase()}! ${
            selectedRequest.action === "APPROVED" && selectedRequest.tier === "hr"
              ? "Leave balance automatically deducted."
              : ""
          }`
        );
        setReviewModalOpen(false);
        if (onRefresh) onRefresh();
      } else {
        toast.error(res.error || "Review failed.");
      }
    });
  };

  const currentList = activeTab === "tl" ? tlQueue : hrQueue;

  return (
    <div className="space-y-4">
      {/* Tab Switcher for Tier 1 vs Tier 2 (if user has both roles) */}
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        {isTL && (
          <button
            onClick={() => setActiveTab("tl")}
            className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "tl"
                ? "bg-[#588594] text-white shadow-sm"
                : "bg-white/60 text-slate-600 hover:bg-slate-100 border border-slate-200/70"
            }`}
          >
            <UserCheck className="h-3.5 w-3.5" />
            <span>Tier 1: Team Leader Queue</span>
            {tlQueue.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px] font-bold">
                {tlQueue.length}
              </span>
            )}
          </button>
        )}

        {isHR && (
          <button
            onClick={() => setActiveTab("hr")}
            className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "hr"
                ? "bg-[#1E293B] text-white shadow-sm"
                : "bg-white/60 text-slate-600 hover:bg-slate-100 border border-slate-200/70"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Tier 2: HR Final Sign-off</span>
            {hrQueue.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-900 text-[10px] font-bold">
                {hrQueue.length}
              </span>
            )}
          </button>
        )}
      </div>

      {currentList.length === 0 ? (
        <div className="text-center py-10 text-slate-400 text-xs">
          No pending leave applications in this review queue right now.
        </div>
      ) : (
        <div className="space-y-3">
          {currentList.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-2xl bg-white/80 border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-[#ACCAD5]"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900">{item.employeeName}</h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                    {item.employeeId}
                  </span>
                  <span className="text-xs font-semibold text-[#588594] px-2.5 py-0.5 rounded-full bg-[#EBF3F6]">
                    {item.leaveType} Leave ({item.totalDays} days)
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  {item.designation} • {item.department}
                </p>
                <div className="text-xs text-slate-700 font-medium pt-1">
                  <strong>Duration:</strong> {item.startDate} to {item.endDate}
                </div>
                <p className="text-xs text-slate-600 italic bg-slate-50 p-2 rounded-xl border border-slate-150 mt-1 max-w-xl">
                  &quot;{item.reason}&quot;
                </p>

                {activeTab === "hr" && item.tlComments && (
                  <div className="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 w-fit mt-1">
                    ✓ Tier-1 TL Approved ({item.teamLeaderName}): &quot;{item.tlComments}&quot;
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                <Button
                  size="sm"
                  onClick={() => handleOpenReview(item.id, "APPROVED", activeTab)}
                  disabled={isPending}
                  className="bg-[#10B981] hover:bg-[#059669] text-white text-xs font-semibold px-4 rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenReview(item.id, "REJECTED", activeTab)}
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
      )}

      {/* Review Dialog */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-[32px] bg-white/95 backdrop-blur-2xl border border-white/80 p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Confirm {selectedRequest?.action === "APPROVED" ? "Approval" : "Rejection"}
            </DialogTitle>
            <p className="text-xs text-slate-500 mt-1">
              Add optional reviewer remarks to include in the notification.
            </p>
          </DialogHeader>

          <div className="space-y-3 mt-3">
            <Textarea
              placeholder="Comments or handover remarks (optional)..."
              value={comments}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setComments(e.target.value)}
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
                  selectedRequest?.action === "APPROVED"
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
