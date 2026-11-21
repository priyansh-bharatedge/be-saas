import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getMyLeaveDataAction, getApprovalsQueueAction, getAllLeaveRequestsAction } from "@/lib/actions/leave";
import PageTransition from "@/components/animations/PageTransition";
import LeaveBalanceCards from "@/components/leave/LeaveBalanceCards";
import ApplyLeaveModal from "@/components/leave/ApplyLeaveModal";
import MyLeaveRequestsTable from "@/components/leave/MyLeaveRequestsTable";
import LeaveApprovalQueue from "@/components/leave/LeaveApprovalQueue";
import { CalendarCheck, Users, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Leave Management & Approvals • BharatEdge HRMS",
  description: "2-Tier leave approval workflow, dynamic balances, and employee time-off logging.",
};

export default async function HRMSLeavePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Fetch personal leave data
  const leaveDataRes = await getMyLeaveDataAction();
  const leaveData = leaveDataRes.success && leaveDataRes.data ? leaveDataRes.data : null;

  // Fetch approval queue (for TLs and HR Admins)
  const queueRes = await getApprovalsQueueAction();
  const queueData = queueRes.success && queueRes.data ? queueRes.data : null;

  const balances = leaveData?.balances || [];
  const personalRequests = leaveData?.requests || [];
  const employeeInfo = leaveData?.employeeInfo;

  const tlQueue = queueData?.tlQueue || [];
  const hrQueue = queueData?.hrQueue || [];
  const hasReviewDuties = (queueData?.isTL && tlQueue.length > 0) || (queueData?.isHR && hrQueue.length > 0);

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header with Title & Apply Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Leave Management &amp; Approvals
              </h1>
              <span className="text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full bg-[#EBF3F6] text-[#588594] border border-[#ACCAD5]/50 font-semibold">
                2-Tier Workflow
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Employee leave balances, multi-tier approvals (Team Leader &rarr; HR Admin), and time-off tracking.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <ApplyLeaveModal balances={balances} />
          </div>
        </div>

        {/* 1. Leave Balance Cards */}
        <LeaveBalanceCards balances={balances} />

        {/* 2. Review Queue Banner for Team Leaders & HR Admins (if pending items exist) */}
        {hasReviewDuties && (
          <div className="rounded-[32px] bg-white/75 backdrop-blur-2xl border border-white/80 shadow-[0_12px_40px_rgba(0,0,0,0.03)] p-6 sm:p-8">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Pending Review Queue</h3>
                  <p className="text-xs text-slate-500">
                    Requests awaiting your authorization as {queueData?.isHR ? "HR Admin" : "Team Leader"}.
                  </p>
                </div>
              </div>
            </div>

            <LeaveApprovalQueue
              tlQueue={tlQueue}
              hrQueue={hrQueue}
              isHR={queueData?.isHR || false}
              isTL={queueData?.isTL || false}
            />
          </div>
        )}

        {/* 3. My Leave Applications Table (Light Glassmorphic Container) */}
        <div className="rounded-[36px] bg-white/70 backdrop-blur-2xl border border-white/80 shadow-[0_12px_40px_rgba(0,0,0,0.03)] p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100/80">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-[#EBF3F6] border border-[#ACCAD5]/50 flex items-center justify-center text-[#588594]">
                <CalendarCheck className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">My Leave Applications</h3>
                <p className="text-xs text-slate-500">
                  Staff: {employeeInfo?.name} ({employeeInfo?.employeeId}) • TL: {employeeInfo?.teamLeaderName || "Direct / Executive"}
                </p>
              </div>
            </div>
          </div>

          <MyLeaveRequestsTable requests={personalRequests} />
        </div>
      </div>
    </PageTransition>
  );
}
