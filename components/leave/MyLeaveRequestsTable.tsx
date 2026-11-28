"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LeaveType, ApprovalStatus } from "@prisma/client";
import { Clock, CheckCircle2, XCircle, AlertCircle, MessageSquare, Edit2, Trash2, Lock, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import EditLeaveModal from "./EditLeaveModal";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import BulkImportWizard from "@/components/shared/BulkImportWizard";
import BulkExportMenu from "@/components/shared/BulkExportMenu";
import { cancelMyLeaveRequestAction } from "@/lib/actions/leave";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface PersonalLeaveRequest {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  startTime?: string | null;
  endTime?: string | null;
  durationHours?: number | null;
  reason: string;
  tlStatus: ApprovalStatus;
  tlComments: string | null;
  tlReviewedAt: string | null;
  teamLeaderName: string | null;
  hrStatus: ApprovalStatus;
  hrComments: string | null;
  hrReviewedAt: string | null;
  hrAdminName: string | null;
  finalStatus: ApprovalStatus;
  createdAt: string;
}

interface MyLeaveRequestsTableProps {
  requests: PersonalLeaveRequest[];
}

export default function MyLeaveRequestsTable({ requests }: MyLeaveRequestsTableProps) {
  const router = useRouter();
  const [selectedLeaveIds, setSelectedLeaveIds] = useState<string[]>([]);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<PersonalLeaveRequest | null>(null);
  const [requestToCancel, setRequestToCancel] = useState<PersonalLeaveRequest | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleConfirmCancel = () => {
    if (!requestToCancel) return;

    startTransition(async () => {
      const res = await cancelMyLeaveRequestAction(requestToCancel.id);
      if (res.success) {
        toast.success("Leave application cancelled.");
        setRequestToCancel(null);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to cancel leave request.");
      }
    });
  };

  const getApprovalBadge = (status: ApprovalStatus, reviewerTitle: string, reviewerName: string | null) => {
    switch (status) {
      case ApprovalStatus.APPROVED:
        return (
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/70 w-fit">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            <span>Approved</span>
          </div>
        );
      case ApprovalStatus.REJECTED:
        return (
          <div className="flex items-center gap-1.5 text-xs text-rose-700 font-semibold bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200/70 w-fit">
            <XCircle className="h-3 w-3 text-rose-600" />
            <span>Rejected</span>
          </div>
        );
      case ApprovalStatus.PENDING:
      default:
        return (
          <div className="flex items-center gap-1.5 text-xs text-amber-700 font-semibold bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/70 w-fit">
            <Clock className="h-3 w-3 text-amber-600 animate-pulse" />
            <span>Pending</span>
          </div>
        );
    }
  };

  const getFinalStatusBadge = (finalStatus: ApprovalStatus) => {
    switch (finalStatus) {
      case ApprovalStatus.APPROVED:
        return (
          <span className="text-[#10B981] font-semibold text-xs flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#10B981]" />
            Approved
          </span>
        );
      case ApprovalStatus.REJECTED:
        return (
          <span className="text-rose-600 font-semibold text-xs flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            Rejected
          </span>
        );
      case ApprovalStatus.PENDING:
      default:
        return (
          <span className="text-[#F0944D] font-semibold text-xs flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#F0944D] animate-ping" />
            Under Review
          </span>
        );
    }
  };

  if (requests.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 text-sm">
        No leave applications on record yet. Use &quot;Apply for Leave&quot; above to submit your first request.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Action Toolbar for Leaves */}
      <div className="relative z-20 flex items-center justify-between gap-3 pb-2">
        <div className="flex items-center gap-2">
          {selectedLeaveIds.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-xs text-[#F0944D] font-semibold">
              <span>{selectedLeaveIds.length} selected</span>
              <button
                type="button"
                onClick={() => setSelectedLeaveIds([])}
                className="text-[10px] underline hover:text-orange-700 ml-1 cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <BulkExportMenu
            moduleKey="leaves"
            selectedIds={selectedLeaveIds}
            totalCount={requests.length}
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsImportOpen(true)}
            className="rounded-full text-xs gap-1.5 h-9 border-slate-200 text-slate-700 bg-white/90 hover:bg-white shadow-2xs font-medium cursor-pointer"
          >
            <UploadCloud className="h-3.5 w-3.5 text-[#F0944D]" />
            Import Leaves
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#E7EAEF]/60 rounded-xl text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-3.5 px-3 w-10 text-center rounded-l-xl">
                <input
                  type="checkbox"
                  checked={requests.length > 0 && selectedLeaveIds.length === requests.length}
                  onChange={() => {
                    if (selectedLeaveIds.length === requests.length) {
                      setSelectedLeaveIds([]);
                    } else {
                      setSelectedLeaveIds(requests.map((r) => r.id));
                    }
                  }}
                  className="rounded border-slate-300 text-[#F0944D] focus:ring-[#F0944D] cursor-pointer"
                />
              </th>
              <th className="py-3.5 px-3">Category</th>
              <th className="py-3.5 px-3">Date Range</th>
              <th className="py-3.5 px-3">Duration</th>
              <th className="py-3.5 px-3">Tier 1: Team Leader</th>
              <th className="py-3.5 px-3">Tier 2: HR Admin</th>
              <th className="py-3.5 px-3">Final Status</th>
              <th className="py-3.5 px-4 text-right rounded-r-xl">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EAEFF4]/70">
            {requests.map((r) => {
              const isPendingAndModifiable =
                r.finalStatus === ApprovalStatus.PENDING && r.tlStatus === ApprovalStatus.PENDING;

              return (
                <tr key={r.id} className="hover:bg-white/50 transition-colors text-xs text-slate-800">
                  <td className="py-4 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedLeaveIds.includes(r.id)}
                      onChange={() =>
                        setSelectedLeaveIds((prev) =>
                          prev.includes(r.id)
                            ? prev.filter((id) => id !== r.id)
                            : [...prev, r.id]
                        )
                      }
                      className="rounded border-slate-300 text-[#F0944D] focus:ring-[#F0944D] cursor-pointer"
                    />
                  </td>
                  {/* Category & Reason */}
                  <td className="py-4 pl-4 pr-3">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border",
                          r.leaveType === "SHORT_LEAVE"
                            ? "bg-sky-50 text-sky-700 border-sky-200"
                            : "bg-orange-50 text-[#C66318] border-orange-200"
                        )}
                      >
                        {r.leaveType === "SHORT_LEAVE" ? "Short Leave" : "Paid Leave"}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 max-w-xs truncate mt-1">{r.reason}</div>
                  </td>

                  {/* Date Range */}
                  <td className="py-4 px-3 font-medium text-slate-700">
                    <div>
                      {r.leaveType === "SHORT_LEAVE" ? (
                        r.startDate
                      ) : (
                        <>
                          {r.startDate} <span className="text-slate-400">to</span> {r.endDate}
                        </>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Applied: {r.createdAt.split("T")[0]}</div>
                  </td>

                  {/* Duration */}
                  <td className="py-4 px-3 font-bold text-slate-900">
                    {r.leaveType === "SHORT_LEAVE" ? (
                      <div>
                        <div>{r.durationHours || 1.5} hrs</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {r.startTime || "14:00"} - {r.endTime || "15:30"}
                        </div>
                      </div>
                    ) : (
                      `${r.totalDays} day${r.totalDays > 1 ? "s" : ""}`
                    )}
                  </td>

                  {/* Tier 1: Team Leader */}
                  <td className="py-4 px-3">
                    <div className="space-y-1">
                      {getApprovalBadge(r.tlStatus, "Team Leader", r.teamLeaderName)}
                      <div className="text-[11px] text-slate-400">
                        Reviewer: {r.teamLeaderName || "Direct / Self"}
                      </div>
                      {r.tlComments && (
                        <div className="text-[10px] text-slate-500 italic bg-slate-50 p-1.5 rounded-lg border border-slate-150 max-w-xs">
                          &quot;{r.tlComments}&quot;
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Tier 2: HR Admin */}
                  <td className="py-4 px-3">
                    <div className="space-y-1">
                      {getApprovalBadge(r.hrStatus, "HR Admin", r.hrAdminName)}
                      <div className="text-[11px] text-slate-400">
                        Reviewer: {r.hrAdminName || "HR Operations"}
                      </div>
                      {r.hrComments && (
                        <div className="text-[10px] text-slate-500 italic bg-slate-50 p-1.5 rounded-lg border border-slate-150 max-w-xs">
                          &quot;{r.hrComments}&quot;
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Final Status */}
                  <td className="py-4 px-3">
                    {getFinalStatusBadge(r.finalStatus)}
                  </td>

                  {/* Actions: Edit & Cancel (only if PENDING) */}
                  <td className="py-4 px-4 text-right">
                    {isPendingAndModifiable ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setEditingRequest(r)}
                          className="h-7 w-7 rounded-full bg-slate-50 hover:bg-[#EBF3F6] text-slate-500 hover:text-[#588594] border border-slate-200 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                          title="Edit Application"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => setRequestToCancel(r)}
                          className="h-7 w-7 rounded-full bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                          title="Cancel Application"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                        <Lock className="h-3 w-3 text-slate-300" />
                        Locked
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Edit Leave Request Modal */}
        <EditLeaveModal
          open={!!editingRequest}
          onOpenChange={(open) => !open && setEditingRequest(null)}
          request={editingRequest}
          onSuccess={() => {
            setEditingRequest(null);
            router.refresh();
          }}
        />

        {/* Cancel Confirmation Modal */}
        <ConfirmationModal
          open={!!requestToCancel}
          onOpenChange={(open) => !open && setRequestToCancel(null)}
          title="Cancel Leave Application"
          description={`Are you sure you want to cancel your ${requestToCancel?.leaveType} leave application for ${requestToCancel?.totalDays} day(s)? This will remove it from the approval queue.`}
          confirmLabel="Yes, Cancel Request"
          cancelLabel="Keep Request"
          isDestructive={true}
          isPending={isPending}
          onConfirm={handleConfirmCancel}
        />

        {/* Bulk Import Leaves Wizard */}
        <BulkImportWizard
          open={isImportOpen}
          onOpenChange={setIsImportOpen}
          moduleKey="leaves"
          onSuccess={() => window.location.reload()}
        />
      </div>
      );
}
