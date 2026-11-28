"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  TrendingUp,
  Award,
  Star,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldCheck,
  Plus,
  Calendar,
  UserCheck,
} from "lucide-react";
import { AppraisalStatus } from "@prisma/client";
import {
  submitSelfReviewAction,
  reviewManagerAppraisalAction,
  reviewHrFinalSignOffAction,
} from "@/lib/actions/performance";

interface AppraisalItem {
  id: string;
  employeeName?: string;
  employeeId?: string;
  department?: string;
  designation?: string;
  appraisalCycle: string;
  dueDate: string;
  selfReview?: string | null;
  managerRating?: number | null;
  managerReview?: string | null;
  managerName?: string | null;
  hrFinalRating?: number | null;
  hrRemarks?: string | null;
  status: AppraisalStatus;
  promotionRecommended?: boolean;
  createdAt: string;
}

interface PerformanceViewProps {
  initialMyRecords: AppraisalItem[];
  initialAllRecords: AppraisalItem[];
  isReviewer: boolean;
}

export default function PerformanceView({
  initialMyRecords,
  initialAllRecords,
  isReviewer,
}: PerformanceViewProps) {
  const [activeTab, setActiveTab] = useState<"my" | "desk">(isReviewer ? "desk" : "my");
  const [myRecords, setMyRecords] = useState<AppraisalItem[]>(initialMyRecords);
  const [allRecords, setAllRecords] = useState<AppraisalItem[]>(initialAllRecords);

  // Self review modal
  const [selfReviewModalOpen, setSelfReviewModalOpen] = useState(false);
  const [selectedAppraisalId, setSelectedAppraisalId] = useState<string | null>(null);
  const [selfReviewText, setSelfReviewText] = useState("");

  // Review modal
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewMode, setReviewMode] = useState<"manager" | "hr">("manager");
  const [rating, setRating] = useState<number>(4.0);
  const [reviewComments, setReviewComments] = useState("");
  const [promotionRecommended, setPromotionRecommended] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleOpenSelfReview = (item: AppraisalItem) => {
    setSelectedAppraisalId(item.id);
    setSelfReviewText(item.selfReview || "");
    setSelfReviewModalOpen(true);
  };

  const handleConfirmSelfReview = () => {
    if (!selectedAppraisalId || !selfReviewText.trim()) {
      toast.error("Please enter your self-evaluation.");
      return;
    }

    startTransition(async () => {
      const res = await submitSelfReviewAction({
        appraisalId: selectedAppraisalId,
        selfReview: selfReviewText.trim(),
      });

      if (res.success) {
        toast.success("Self-review submitted to manager.");
        setSelfReviewModalOpen(false);
        window.location.reload();
      } else {
        toast.error(res.error || "Failed to submit self-review.");
      }
    });
  };

  const handleOpenManagerReview = (item: AppraisalItem) => {
    setSelectedAppraisalId(item.id);
    setReviewMode("manager");
    setRating(item.managerRating || 4.0);
    setReviewComments(item.managerReview || "");
    setReviewModalOpen(true);
  };

  const handleOpenHrReview = (item: AppraisalItem) => {
    setSelectedAppraisalId(item.id);
    setReviewMode("hr");
    setRating(item.hrFinalRating || item.managerRating || 4.0);
    setReviewComments(item.hrRemarks || "");
    setPromotionRecommended(item.promotionRecommended ?? false);
    setReviewModalOpen(true);
  };

  const handleConfirmReview = () => {
    if (!selectedAppraisalId) return;

    startTransition(async () => {
      let res;
      if (reviewMode === "manager") {
        res = await reviewManagerAppraisalAction({
          appraisalId: selectedAppraisalId,
          managerRating: Number(rating),
          managerReview: reviewComments.trim(),
        });
      } else {
        res = await reviewHrFinalSignOffAction({
          appraisalId: selectedAppraisalId,
          hrFinalRating: Number(rating),
          hrRemarks: reviewComments.trim() || undefined,
          promotionRecommended,
        });
      }

      if (res.success) {
        toast.success(
          reviewMode === "manager"
            ? "Manager rating saved!"
            : "HR final sign-off completed!"
        );
        setReviewModalOpen(false);
        window.location.reload();
      } else {
        toast.error(res.error || "Failed to record evaluation.");
      }
    });
  };

  const getStatusBadge = (status: AppraisalStatus) => {
    switch (status) {
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3" /> Finalized
          </span>
        );
      case "IN_REVIEW":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <Clock className="h-3 w-3" /> In Review
          </span>
        );
      case "DUE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle className="h-3 w-3" /> Due Soon
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <Calendar className="h-3 w-3" /> Upcoming
          </span>
        );
    }
  };

  const records = activeTab === "my" ? myRecords : allRecords;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Performance & Appraisal Desk</h2>
            <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#EBF3F6] text-[#588594] border border-[#ACCAD5]/50">
              Talent & OKR Calibration
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Semi-annual & annual appraisal cycles, employee self-reviews, 5-point manager ratings, and HR final sign-off.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
        <button
          onClick={() => setActiveTab("my")}
          className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "my"
              ? "bg-[#588594] text-white shadow-2xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          My Self-Reviews ({myRecords.length})
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
            <span>Team Calibration Desk ({allRecords.length})</span>
          </button>
        )}
      </div>

      {/* Appraisals List */}
      {records.length === 0 ? (
        <div className="text-center py-16 bg-white/60 rounded-3xl border border-slate-200/60 p-8">
          <TrendingUp className="h-10 w-10 mx-auto text-slate-300 mb-2" />
          <h3 className="text-sm font-bold text-slate-700">No appraisal cycles assigned</h3>
          <p className="text-xs text-slate-400 mt-1">
            Active cycles will appear here when initiated by HR Administration.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((item) => (
            <div
              key={item.id}
              className="p-6 rounded-3xl bg-white/85 backdrop-blur-md border border-slate-200/80 shadow-2xs space-y-4 transition-all hover:border-[#ACCAD5]"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">{item.appraisalCycle}</h3>
                    {item.employeeName && (
                      <span className="text-xs font-semibold text-slate-600">
                        • {item.employeeName} ({item.department})
                      </span>
                    )}
                    {getStatusBadge(item.status)}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Due on {item.dueDate}</p>
                </div>

                {item.hrFinalRating && (
                  <div className="flex items-center gap-1 bg-amber-50 px-3 py-1.5 rounded-2xl border border-amber-200 self-start sm:self-center">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="font-bold text-amber-900 text-sm">{item.hrFinalRating} / 5.0</span>
                    {item.promotionRecommended && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full ml-1">
                        Promotion Recommended
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* 3 Review Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {/* 1. Self Review */}
                <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-slate-200/70 space-y-1.5">
                  <span className="font-bold text-slate-800 flex items-center justify-between">
                    <span>1. Self-Evaluation</span>
                    {item.selfReview && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                  </span>
                  <p className="text-slate-600 italic">
                    {item.selfReview ? `"${item.selfReview}"` : "Awaiting employee submission..."}
                  </p>
                </div>

                {/* 2. Manager Review */}
                <div className="p-3.5 rounded-2xl bg-[#FFFDF9] border border-amber-200/60 space-y-1.5">
                  <span className="font-bold text-slate-800 flex items-center justify-between">
                    <span>2. Manager Calibration</span>
                    {item.managerRating && (
                      <span className="font-bold text-[#F0944D] font-mono">
                        {item.managerRating} / 5.0
                      </span>
                    )}
                  </span>
                  <p className="text-slate-600 italic">
                    {item.managerReview ? `"${item.managerReview}"` : "Pending manager review..."}
                  </p>
                </div>

                {/* 3. HR Sign-off */}
                <div className="p-3.5 rounded-2xl bg-[#FCFAF7] border border-slate-200/70 space-y-1.5">
                  <span className="font-bold text-slate-800 flex items-center justify-between">
                    <span>3. HR Final Sign-off</span>
                    {item.hrFinalRating && (
                      <span className="font-bold text-emerald-700 font-mono">
                        {item.hrFinalRating} / 5.0
                      </span>
                    )}
                  </span>
                  <p className="text-slate-600 italic">
                    {item.hrRemarks ? `"${item.hrRemarks}"` : "Awaiting HR sign-off..."}
                  </p>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex justify-end gap-2 pt-1 border-t border-slate-100">
                {activeTab === "my" && !item.selfReview && (
                  <Button
                    size="sm"
                    onClick={() => handleOpenSelfReview(item)}
                    className="rounded-full bg-slate-900 hover:bg-black text-white text-xs font-semibold px-4 cursor-pointer"
                  >
                    Submit Self-Evaluation
                  </Button>
                )}

                {activeTab === "desk" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenManagerReview(item)}
                      className="rounded-full text-xs font-semibold border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      Rate as Manager
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleOpenHrReview(item)}
                      className="rounded-full bg-[#588594] hover:bg-[#466C78] text-white text-xs font-semibold px-4 cursor-pointer"
                    >
                      HR Final Sign-off
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Self Review Dialog */}
      <Dialog open={selfReviewModalOpen} onOpenChange={setSelfReviewModalOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-3xl bg-white/95 backdrop-blur-2xl border border-white/80 p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Submit Self-Evaluation
            </DialogTitle>
            <p className="text-xs text-slate-500 mt-1">
              Summarize your key achievements, deliverables, and development goals for this cycle.
            </p>
          </DialogHeader>

          <div className="space-y-3 mt-3">
            <Textarea
              placeholder="Highlight major project milestones, client wins, or process improvements..."
              value={selfReviewText}
              onChange={(e) => setSelfReviewText(e.target.value)}
              className="rounded-2xl bg-slate-50 border-slate-200 text-xs text-slate-800 resize-none h-32"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelfReviewModalOpen(false)}
                className="rounded-full text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmSelfReview}
                disabled={isPending || !selfReviewText.trim()}
                className="rounded-full text-xs font-semibold px-5 text-white bg-slate-900 hover:bg-black"
              >
                {isPending ? "Submitting..." : "Submit Self-Review"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manager / HR Evaluation Dialog */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="sm:max-w-[460px] rounded-3xl bg-white/95 backdrop-blur-2xl border border-white/80 p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {reviewMode === "manager" ? "Manager Performance Rating" : "HR Final Sign-off"}
            </DialogTitle>
            <p className="text-xs text-slate-500 mt-1">
              Assign score out of 5.0 and provide detailed qualitative feedback.
            </p>
          </DialogHeader>

          <div className="space-y-3.5 mt-2">
            <div>
              <Label className="text-xs text-slate-700 font-semibold">
                Score Rating (1.0 to 5.0) *
              </Label>
              <Input
                type="number"
                step="0.5"
                min="1.0"
                max="5.0"
                value={rating}
                onChange={(e) => setRating(parseFloat(e.target.value) || 1.0)}
                className="mt-1 bg-slate-50 text-xs font-bold font-mono"
                required
              />
            </div>

            <div>
              <Label className="text-xs text-slate-700 font-semibold">Feedback Remarks</Label>
              <Textarea
                placeholder="Specific commendations, leadership feedback, or areas for growth..."
                value={reviewComments}
                onChange={(e) => setReviewComments(e.target.value)}
                className="mt-1 rounded-2xl bg-slate-50 border-slate-200 text-xs text-slate-800 resize-none h-24"
              />
            </div>

            {reviewMode === "hr" && (
              <label className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={promotionRecommended}
                  onChange={(e) => setPromotionRecommended(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs font-semibold text-emerald-900">
                  Recommend for Promotion / Salary Increment
                </span>
              </label>
            )}

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
                {isPending ? "Recording..." : "Save Calibration"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
