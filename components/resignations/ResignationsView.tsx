"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  LogOut,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldCheck,
  UserCheck,
  FileText,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { ResignationStatus } from "@prisma/client";
import {
  submitResignationAction,
  reviewResignationAction,
  withdrawResignationAction,
} from "@/lib/actions/resignation";

interface ResignationRecord {
  id: string;
  employeeId?: string;
  employeeName?: string;
  department?: string;
  designation?: string;
  dateOfJoining?: string | null;
  resignationDate: string;
  proposedLastWorkingDay: string;
  actualLastWorkingDay?: string | null;
  reason: string;
  comments?: string | null;
  status: ResignationStatus;
  reviewerName?: string | null;
  reviewedAt?: string | null;
  noticePeriodDays?: number | null;
  exitInterviewNotes?: string | null;
}

interface ResignationsViewProps {
  myResignation: ResignationRecord | null;
  allResignations: ResignationRecord[];
  isReviewer: boolean;
}

export default function ResignationsView({
  myResignation,
  allResignations,
  isReviewer,
}: ResignationsViewProps) {
  const [activeTab, setActiveTab] = useState<"my" | "admin">(isReviewer ? "admin" : "my");
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [proposedLWD, setProposedLWD] = useState("");
  const [reason, setReason] = useState("");
  const [comments, setComments] = useState("");

  // Review modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<{
    id: string;
    action: ResignationStatus;
    defaultLWD: string;
  } | null>(null);
  const [actualLWD, setActualLWD] = useState("");
  const [exitNotes, setExitNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleOpenReview = (record: ResignationRecord, action: ResignationStatus) => {
    setSelectedRecord({ id: record.id, action, defaultLWD: record.proposedLastWorkingDay });
    setActualLWD(record.proposedLastWorkingDay);
    setExitNotes("");
    setReviewModalOpen(true);
  };

  const handleConfirmReview = () => {
    if (!selectedRecord) return;

    startTransition(async () => {
      const res = await reviewResignationAction({
        resignationId: selectedRecord.id,
        status: selectedRecord.action,
        actualLastWorkingDay: actualLWD || undefined,
        exitComments: exitNotes.trim() || undefined,
      });

      if (res.success) {
        toast.success(`Resignation marked ${selectedRecord.action.toLowerCase()} successfully.`);
        setReviewModalOpen(false);
        window.location.reload();
      } else {
        toast.error(res.error || "Failed to review resignation.");
      }
    });
  };

  const handleWithdraw = (id: string) => {
    if (!confirm("Are you sure you want to withdraw your resignation notice?")) return;

    startTransition(async () => {
      const res = await withdrawResignationAction(id);
      if (res.success) {
        toast.success("Resignation withdrawn successfully.");
        window.location.reload();
      } else {
        toast.error(res.error || "Failed to withdraw resignation.");
      }
    });
  };

  const handleSubmitResignation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposedLWD) {
      toast.error("Please specify your proposed last working day.");
      return;
    }
    if (!reason.trim()) {
      toast.error("Please explain the reason for resignation.");
      return;
    }

    startTransition(async () => {
      const res = await submitResignationAction({
        proposedLastWorkingDay: proposedLWD,
        reason: reason.trim(),
        comments: comments.trim() || undefined,
      });

      if (res.success) {
        toast.success("Resignation notice submitted for official review.");
        setIsApplyOpen(false);
        window.location.reload();
      } else {
        toast.error(res.error || "Failed to submit resignation.");
      }
    });
  };

  const getStatusBadge = (status: ResignationStatus) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3" /> Approved (Notice Active)
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="h-3 w-3" /> Declined
          </span>
        );
      case "WITHDRAWN":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <RotateCcw className="h-3 w-3" /> Withdrawn
          </span>
        );
      case "UNDER_REVIEW":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <Clock className="h-3 w-3" /> Under HR Review
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
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Resignation & Exit Management</h2>
            <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              Offboarding Operations
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Official resignation filings, last working day confirmation, notice period calculation, and exit interview management.
          </p>
        </div>

        {(!myResignation || myResignation.status === "WITHDRAWN" || myResignation.status === "REJECTED") && (
          <Button
            onClick={() => setIsApplyOpen(true)}
            className="rounded-full bg-slate-900 hover:bg-black text-white font-semibold text-xs px-5 py-2.5 shadow-xs cursor-pointer flex items-center gap-2 self-start sm:self-center"
          >
            <LogOut className="h-4 w-4 text-rose-400" />
            File Resignation Notice
          </Button>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
        <button
          onClick={() => setActiveTab("my")}
          className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "my"
              ? "bg-[#588594] text-white shadow-2xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          My Resignation Status
        </button>

        {isReviewer && (
          <button
            onClick={() => setActiveTab("admin")}
            className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "admin"
                ? "bg-[#1E293B] text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Staff Resignations Desk</span>
            {allResignations.filter((r) => r.status === "PENDING" || r.status === "UNDER_REVIEW").length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                {allResignations.filter((r) => r.status === "PENDING" || r.status === "UNDER_REVIEW").length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Content */}
      {activeTab === "my" ? (
        myResignation ? (
          <div className="p-6 rounded-3xl bg-white/85 backdrop-blur-md border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Your Resignation Filing</h3>
                <p className="text-xs text-slate-400">
                  Submitted on {myResignation.resignationDate}
                </p>
              </div>
              {getStatusBadge(myResignation.status)}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/60 text-xs">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                  Proposed Last Working Day
                </span>
                <span className="font-bold text-slate-800">{myResignation.proposedLastWorkingDay}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                  Official Confirmed LWD
                </span>
                <span className="font-bold text-slate-800">
                  {myResignation.actualLastWorkingDay || "Awaiting HR confirmation"}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                  Notice Period
                </span>
                <span className="font-bold text-slate-800">
                  {myResignation.noticePeriodDays ? `${myResignation.noticePeriodDays} days` : "--"}
                </span>
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <span className="font-semibold text-slate-700 block">Reason for Departure:</span>
              <p className="text-slate-600 bg-white p-3 rounded-xl border border-slate-200 italic">
                &quot;{myResignation.reason}&quot;
              </p>
            </div>

            {myResignation.exitInterviewNotes && (
              <div className="space-y-1 text-xs">
                <span className="font-semibold text-slate-700 block">HR Feedback / Notes:</span>
                <p className="text-slate-600 bg-sky-50 p-3 rounded-xl border border-sky-200">
                  {myResignation.exitInterviewNotes}
                </p>
              </div>
            )}

            {(myResignation.status === "PENDING" || myResignation.status === "UNDER_REVIEW") && (
              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleWithdraw(myResignation.id)}
                  disabled={isPending}
                  className="rounded-full text-xs border-slate-300 text-slate-600 hover:text-slate-900 cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="h-3 w-3" />
                  Withdraw Resignation Notice
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16 bg-white/60 rounded-3xl border border-slate-200/60 p-8">
            <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-400 mb-2" />
            <h3 className="text-sm font-bold text-slate-700">No active resignation notice</h3>
            <p className="text-xs text-slate-400 mt-1">
              Your employment status is active and in good standing.
            </p>
          </div>
        )
      ) : (
        /* Admin Desk */
        allResignations.length === 0 ? (
          <div className="text-center py-16 bg-white/60 rounded-3xl border border-slate-200/60 p-8">
            <CheckCircle2 className="h-10 w-10 mx-auto text-slate-300 mb-2" />
            <h3 className="text-sm font-bold text-slate-700">No staff resignations found</h3>
            <p className="text-xs text-slate-400 mt-1">No staff members have pending resignation notices.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {allResignations.map((item) => (
              <div
                key={item.id}
                className="p-5 rounded-2xl bg-white/85 backdrop-blur-md border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-slate-900">{item.employeeName}</h4>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {item.employeeId}
                    </span>
                    <span className="text-slate-500 font-medium">
                      {item.designation} • {item.department}
                    </span>
                    {getStatusBadge(item.status)}
                  </div>

                  <div className="text-slate-600 flex items-center gap-3">
                    <span>Filed: {item.resignationDate}</span>
                    <span>•</span>
                    <span>Proposed LWD: <strong>{item.proposedLastWorkingDay}</strong></span>
                    {item.actualLastWorkingDay && (
                      <>
                        <span>•</span>
                        <span>Confirmed LWD: <strong className="text-rose-700">{item.actualLastWorkingDay}</strong></span>
                      </>
                    )}
                  </div>

                  <p className="text-slate-500 italic bg-slate-50 p-2.5 rounded-xl border border-slate-150 max-w-2xl">
                    &quot;{item.reason}&quot;
                  </p>

                  {item.exitInterviewNotes && (
                    <div className="text-[11px] text-slate-400">
                      HR Exit Notes: &quot;{item.exitInterviewNotes}&quot;
                    </div>
                  )}
                </div>

                {/* Review Actions */}
                {(item.status === "PENDING" || item.status === "UNDER_REVIEW") && (
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <Button
                      size="sm"
                      onClick={() => handleOpenReview(item, "APPROVED")}
                      disabled={isPending}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Approve & Confirm LWD
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenReview(item, "REJECTED")}
                      disabled={isPending}
                      className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold px-4 rounded-xl flex items-center gap-1.5 cursor-pointer"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Decline
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Apply Resignation Modal */}
      <Dialog open={isApplyOpen} onOpenChange={setIsApplyOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-3xl bg-white/95 backdrop-blur-2xl border border-white/80 p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <LogOut className="h-4 w-4 text-rose-500" />
              File Formal Resignation Notice
            </DialogTitle>
            <p className="text-xs text-slate-500">
              Submit your official notice to HR and your reporting manager.
            </p>
          </DialogHeader>

          <form onSubmit={handleSubmitResignation} className="space-y-3.5 mt-2">
            <div>
              <Label className="text-xs text-slate-700 font-semibold">
                Proposed Last Working Day (LWD) *
              </Label>
              <Input
                type="date"
                min={new Date().toISOString().split("T")[0]}
                value={proposedLWD}
                onChange={(e) => setProposedLWD(e.target.value)}
                className="mt-1 bg-slate-50 text-xs font-semibold"
                required
              />
            </div>

            <div>
              <Label className="text-xs text-slate-700 font-semibold">Reason for Resignation *</Label>
              <Textarea
                placeholder="State your reason for leaving (career advancement, relocation, higher education, personal, etc.)..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1 bg-slate-50 border-slate-200 text-xs rounded-xl h-24 resize-none"
                required
              />
            </div>

            <div>
              <Label className="text-xs text-slate-600 font-medium">Handover & Transition Plan (Optional)</Label>
              <Textarea
                placeholder="Briefly outline your handover timeline, active project responsibilities, or proposed successor..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="mt-1 bg-slate-50 border-slate-200 text-xs rounded-xl h-16 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsApplyOpen(false)}
                className="rounded-full text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isPending || !proposedLWD || !reason.trim()}
                className="rounded-full text-xs font-semibold px-5 bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
              >
                {isPending ? "Submitting Notice..." : "Submit Notice"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="sm:max-w-[440px] rounded-3xl bg-white/95 backdrop-blur-2xl border border-white/80 p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Confirm Resignation {selectedRecord?.action}
            </DialogTitle>
            <p className="text-xs text-slate-500 mt-1">
              Verify official Last Working Day and record exit interview remarks.
            </p>
          </DialogHeader>

          <div className="space-y-3 mt-3">
            {selectedRecord?.action === "APPROVED" && (
              <div>
                <Label className="text-xs text-slate-700 font-semibold">
                  Official Last Working Day (LWD) *
                </Label>
                <Input
                  type="date"
                  value={actualLWD}
                  onChange={(e) => setActualLWD(e.target.value)}
                  className="mt-1 bg-slate-50 text-xs font-semibold"
                  required
                />
              </div>
            )}

            <div>
              <Label className="text-xs text-slate-700 font-semibold">Exit Interview & HR Notes</Label>
              <Textarea
                placeholder="Exit interview feedback, asset handover remarks, notice period waiver notes..."
                value={exitNotes}
                onChange={(e) => setExitNotes(e.target.value)}
                className="mt-1 rounded-2xl bg-slate-50 border-slate-200 text-xs text-slate-800 resize-none h-24"
              />
            </div>

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
                className="rounded-full text-xs font-semibold px-5 text-white bg-slate-900 hover:bg-black cursor-pointer"
              >
                {isPending ? "Recording..." : `Confirm ${selectedRecord?.action}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
