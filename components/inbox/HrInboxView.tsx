"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Inbox,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  CalendarCheck,
  Clock,
  Receipt,
  LogOut,
  LifeBuoy,
  TrendingUp,
  Calendar,
  Layers,
  CreditCard,
  ChevronRight,
  ExternalLink,
  Workflow,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { HrInboxData } from "@/lib/actions/inbox";
import { reviewLeaveAsHRAction } from "@/lib/actions/leave";
import { reviewRegularizationAction } from "@/lib/actions/regularization";
import { reviewReimbursementAction } from "@/lib/actions/reimbursement";
import { ApprovalStatus, ReimbursementStatus } from "@prisma/client";

interface HrInboxViewProps {
  initialData: HrInboxData;
}

export default function HrInboxView({ initialData }: HrInboxViewProps) {
  const [data, setData] = useState<HrInboxData>(initialData);
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [isPending, startTransition] = useTransition();

  const handleInlineLeaveAction = (requestId: string, action: "APPROVED" | "REJECTED") => {
    startTransition(async () => {
      const res = await reviewLeaveAsHRAction({
        requestId,
        status: action,
        comments: `Inline ${action.toLowerCase()} from HR Admin Inbox`,
      });

      if (res.success) {
        toast.success(`Leave request ${action.toLowerCase()}!`);
        setData((prev) => ({
          ...prev,
          totalPendingCount: Math.max(0, prev.totalPendingCount - 1),
          categories: {
            ...prev.categories,
            pendingLeaves: prev.categories.pendingLeaves.filter((l) => l.id !== requestId),
          },
        }));
      } else {
        toast.error(res.error || "Action failed.");
      }
    });
  };

  const handleInlineRegularizationAction = (
    regularizationId: string,
    action: ApprovalStatus
  ) => {
    startTransition(async () => {
      const res = await reviewRegularizationAction({
        regularizationId,
        status: action,
        remarks: `Inline ${action.toLowerCase()} from HR Admin Inbox`,
      });

      if (res.success) {
        toast.success(`Attendance Regularization ${action.toLowerCase()}!`);
        setData((prev) => ({
          ...prev,
          totalPendingCount: Math.max(0, prev.totalPendingCount - 1),
          categories: {
            ...prev.categories,
            attendanceRegularizations: prev.categories.attendanceRegularizations.filter(
              (r) => r.id !== regularizationId
            ),
          },
        }));
      } else {
        toast.error(res.error || "Action failed.");
      }
    });
  };

  const handleInlineReimbursementAction = (
    reimbursementId: string,
    action: ReimbursementStatus
  ) => {
    startTransition(async () => {
      const res = await reviewReimbursementAction({
        reimbursementId,
        status: action,
        remarks: `Inline ${action.toLowerCase()} from HR Admin Inbox`,
      });

      if (res.success) {
        toast.success(`Expense claim ${action.toLowerCase()}!`);
        setData((prev) => ({
          ...prev,
          totalPendingCount: Math.max(0, prev.totalPendingCount - 1),
          categories: {
            ...prev.categories,
            reimbursements: prev.categories.reimbursements.filter(
              (r) => r.id !== reimbursementId
            ),
          },
        }));
      } else {
        toast.error(res.error || "Action failed.");
      }
    });
  };

  const { aiDailyBrief, categories, totalPendingCount } = data;

  const categoryCards = [
    {
      id: "leaves",
      title: "Pending Leaves",
      icon: CalendarCheck,
      count: categories.pendingLeaves.length,
      badgeColor: "bg-amber-100 text-amber-800",
      href: "/hrms/leave",
    },
    {
      id: "regularization",
      title: "Attendance Corrections",
      icon: Clock,
      count: categories.attendanceRegularizations.length,
      badgeColor: "bg-sky-100 text-sky-800",
      href: "/hrms/attendance",
    },
    {
      id: "reimbursements",
      title: "Expense Claims",
      icon: Receipt,
      count: categories.reimbursements.length,
      badgeColor: "bg-emerald-100 text-emerald-800",
      href: "/hrms/reimbursements",
    },
    {
      id: "resignations",
      title: "Resignation Filings",
      icon: LogOut,
      count: categories.resignations.length,
      badgeColor: "bg-rose-100 text-rose-800",
      href: "/hrms/resignations",
    },
    {
      id: "helpdesk",
      title: "Helpdesk Inquiries",
      icon: LifeBuoy,
      count: categories.helpdeskTickets.length,
      badgeColor: "bg-purple-100 text-purple-800",
      href: "/hrms/helpdesk",
    },
    {
      id: "salaries",
      title: "Prior Month Salaries",
      icon: CreditCard,
      count: categories.priorMonthSalaries.count,
      badgeColor: "bg-rose-100 text-rose-800 font-bold",
      href: "/hrms/payroll",
    },
    {
      id: "appraisals",
      title: "Appraisals Due",
      icon: TrendingUp,
      count: categories.appraisals.length,
      badgeColor: "bg-slate-100 text-slate-800",
      href: "/hrms/performance",
    },
    {
      id: "checklists",
      title: "Lifecycle Checklists",
      icon: Layers,
      count: categories.lifecycleChecklists.length,
      badgeColor: "bg-teal-100 text-teal-800",
      href: "/hrms/lifecycle",
    },
    {
      id: "holidays",
      title: "Upcoming Holidays",
      icon: Calendar,
      count: categories.upcomingHolidays.length,
      badgeColor: "bg-indigo-100 text-indigo-800",
      href: "/hrms/calendar",
    },
    {
      id: "workflows",
      title: "Workflow Engine",
      icon: Workflow,
      count: categories.workflowApprovals.length,
      badgeColor: "bg-orange-100 text-orange-800",
      href: "/hrms/workflows",
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Deterministic AI Daily HR Brief Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-white/95 via-[#FCFAF7]/95 to-orange-50/60 backdrop-blur-2xl border border-orange-200/80 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-2xl bg-[#F0944D]/15 text-[#C66318] border border-orange-200">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#C66318] font-mono">
                Executive HR Daily Brief • Real-Time Pulse
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {aiDailyBrief.greeting}
            </h1>
            <p className="text-xs text-slate-600 font-medium">
              {aiDailyBrief.headline}
            </p>

            {/* Urgent Alerts Banner */}
            {aiDailyBrief.urgentAlerts.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {aiDailyBrief.urgentAlerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-center gap-2 shadow-2xs"
                  >
                    <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>{alert}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Bullet Points */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2 text-xs text-slate-600">
              {aiDailyBrief.summaryPoints.map((pt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#F0944D]" />
                  <span>{pt}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Operational Readiness Gauge */}
          <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-white/90 border border-slate-200/80 shadow-2xs shrink-0 sm:w-48 text-center">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Operations Health
            </span>
            <div className="relative flex items-center justify-center my-1">
              <span className="text-3xl font-extrabold text-slate-900 font-mono">
                {aiDailyBrief.readinessScore}%
              </span>
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              {totalPendingCount === 0 ? "Fully Clear" : `${totalPendingCount} Action Items`}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Category Quick Filters & Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {categoryCards.map((cat) => {
          const Icon = cat.icon;
          const isSelected = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(isSelected ? "ALL" : cat.id)}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                  : "bg-white/80 text-slate-800 border-slate-200/80 hover:border-[#ACCAD5]"
              }`}
            >
              <div className="flex items-center justify-between">
                <Icon className={`h-4 w-4 ${isSelected ? "text-amber-400" : "text-[#588594]"}`} />
                {cat.count > 0 && (
                  <span
                    className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isSelected ? "bg-white/20 text-white" : cat.badgeColor
                    }`}
                  >
                    {cat.count}
                  </span>
                )}
              </div>
              <span className="text-xs font-bold mt-2 truncate block">{cat.title}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Action Center Feed (10 Categories Consolidated) */}
      <div className="space-y-6">
        {/* Category 1: Pending Leaves */}
        {(activeCategory === "ALL" || activeCategory === "leaves") && (
          <div className="rounded-3xl bg-white/85 backdrop-blur-md border border-slate-200/80 p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-[#588594]" />
                <h3 className="text-sm font-bold text-slate-900">
                  Pending Leaves Awaiting HR Sign-off ({categories.pendingLeaves.length})
                </h3>
              </div>
              <Link
                href="/hrms/leave"
                className="text-xs font-semibold text-[#588594] hover:underline flex items-center gap-1"
              >
                Open Leave Desk <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            {categories.pendingLeaves.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">No pending leave applications.</p>
            ) : (
              <div className="space-y-2">
                {categories.pendingLeaves.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{item.employeeName}</span>
                        <span className="text-slate-500 font-mono text-[10px]">({item.employeeId})</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.leaveType === "SHORT_LEAVE"
                              ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : "bg-[#EBF3F6] text-[#588594]"
                          }`}
                        >
                          {item.leaveType === "SHORT_LEAVE"
                            ? `Short Leave (${item.durationHours || 1.5} hrs)`
                            : `Paid Leave (${item.totalDays} days)`}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-0.5">
                        Duration: {item.startDate} {item.leaveType === "PAID_LEAVE" ? `to ${item.endDate}` : `(${item.startTime} - ${item.endTime})`} • &quot;{item.reason}&quot;
                      </p>
                      {item.tlApprovedBy && (
                        <span className="text-[10px] text-emerald-700">
                          ✓ TL Approved by {item.tlApprovedBy}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <Button
                        size="sm"
                        onClick={() => handleInlineLeaveAction(item.id, "APPROVED")}
                        disabled={isPending}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-xl cursor-pointer"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleInlineLeaveAction(item.id, "REJECTED")}
                        disabled={isPending}
                        className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold px-3 py-1.5 rounded-xl cursor-pointer"
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Category 2: Attendance Regularizations */}
        {(activeCategory === "ALL" || activeCategory === "regularization") && (
          <div className="rounded-3xl bg-white/85 backdrop-blur-md border border-slate-200/80 p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#F0944D]" />
                <h3 className="text-sm font-bold text-slate-900">
                  Attendance Regularization Requests ({categories.attendanceRegularizations.length})
                </h3>
              </div>
              <Link
                href="/hrms/attendance"
                className="text-xs font-semibold text-[#588594] hover:underline flex items-center gap-1"
              >
                Open Attendance <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            {categories.attendanceRegularizations.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">No pending punch corrections.</p>
            ) : (
              <div className="space-y-2">
                {categories.attendanceRegularizations.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-[#FFFDF9] border border-amber-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{item.employeeName}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white border border-slate-200">
                          {item.regularizationType.replace(/_/g, " ")}
                        </span>
                        <span className="font-semibold text-slate-700">{item.date}</span>
                      </div>
                      <p className="text-slate-600 mt-0.5">
                        Requested Shift: {new Date(item.requestedIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – {new Date(item.requestedOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • &quot;{item.reason}&quot;
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <Button
                        size="sm"
                        onClick={() => handleInlineRegularizationAction(item.id, ApprovalStatus.APPROVED)}
                        disabled={isPending}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-xl cursor-pointer"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleInlineRegularizationAction(item.id, ApprovalStatus.REJECTED)}
                        disabled={isPending}
                        className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold px-3 py-1.5 rounded-xl cursor-pointer"
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Category 3: Pending Reimbursements */}
        {(activeCategory === "ALL" || activeCategory === "reimbursements") && (
          <div className="rounded-3xl bg-white/85 backdrop-blur-md border border-slate-200/80 p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Expense Claims Awaiting Settlement ({categories.reimbursements.length})
                </h3>
              </div>
              <Link
                href="/hrms/reimbursements"
                className="text-xs font-semibold text-[#588594] hover:underline flex items-center gap-1"
              >
                Open Claims Desk <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            {categories.reimbursements.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">No pending expense claims.</p>
            ) : (
              <div className="space-y-2">
                {categories.reimbursements.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{item.employeeName}</span>
                        <span className="font-bold text-slate-900 font-mono text-sm text-emerald-700">
                          ₹{item.amount.toLocaleString("en-IN")}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 font-mono">
                          {item.category.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-0.5">
                        {item.title} • {item.expenseDate} • &quot;{item.description}&quot;
                      </p>
                      {item.receiptUrls.length > 0 && (
                        <a
                          href={item.receiptUrls[0]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#588594] hover:underline inline-flex items-center gap-1 text-[11px] font-semibold mt-1"
                        >
                          <ExternalLink className="h-3 w-3" /> View Receipt #{1}
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <Button
                        size="sm"
                        onClick={() => handleInlineReimbursementAction(item.id, ReimbursementStatus.APPROVED)}
                        disabled={isPending}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-xl cursor-pointer"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleInlineReimbursementAction(item.id, ReimbursementStatus.REJECTED)}
                        disabled={isPending}
                        className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold px-3 py-1.5 rounded-xl cursor-pointer"
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Category 4: Prior Month Salaries Alert */}
        {categories.priorMonthSalaries.count > 0 && (
          <div className="p-5 rounded-3xl bg-rose-50 border border-rose-200 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                <h3 className="font-bold text-rose-900 text-sm">
                  Prior Month Pending Salaries ({categories.priorMonthSalaries.count} Staff)
                </h3>
              </div>
              <Link
                href="/hrms/payroll"
                className="font-bold text-rose-800 hover:underline flex items-center gap-1"
              >
                Go to Payroll Desk <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <p className="text-rose-700">
              ₹{categories.priorMonthSalaries.totalPending.toLocaleString("en-IN")} remains uncredited from prior month cycles. Please disburse via bank batch.
            </p>
          </div>
        )}

        {/* Category 5: Resignations & Helpdesk (Two Column Layout) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Resignations */}
          <div className="rounded-3xl bg-white/85 backdrop-blur-md border border-slate-200/80 p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LogOut className="h-4 w-4 text-rose-500" />
                <h3 className="text-sm font-bold text-slate-900">
                  Resignation Notices ({categories.resignations.length})
                </h3>
              </div>
              <Link href="/hrms/resignations" className="text-xs text-[#588594] hover:underline">
                View All
              </Link>
            </div>

            {categories.resignations.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">No active resignation notices.</p>
            ) : (
              <div className="space-y-2">
                {categories.resignations.map((item) => (
                  <div key={item.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60 text-xs space-y-1">
                    <div className="flex justify-between font-bold text-slate-900">
                      <span>{item.employeeName} ({item.department})</span>
                      <span className="text-rose-700 font-mono">LWD: {item.proposedLWD}</span>
                    </div>
                    <p className="text-slate-500 italic">&quot;{item.reason}&quot;</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Helpdesk Queries */}
          <div className="rounded-3xl bg-white/85 backdrop-blur-md border border-slate-200/80 p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LifeBuoy className="h-4 w-4 text-purple-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Helpdesk Inquiries ({categories.helpdeskTickets.length})
                </h3>
              </div>
              <Link href="/hrms/helpdesk" className="text-xs text-[#588594] hover:underline">
                View All
              </Link>
            </div>

            {categories.helpdeskTickets.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">No open helpdesk tickets.</p>
            ) : (
              <div className="space-y-2">
                {categories.helpdeskTickets.map((item) => (
                  <div key={item.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60 text-xs space-y-1">
                    <div className="flex justify-between font-bold text-slate-900">
                      <span>{item.ticketNumber} • {item.subject}</span>
                      <span className="text-[10px] font-mono text-purple-700">{item.priority}</span>
                    </div>
                    <p className="text-slate-500 line-clamp-1">{item.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Category 6: Checklists & Holidays Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Checklists */}
          <div className="rounded-3xl bg-white/85 backdrop-blur-md border border-slate-200/80 p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Active Lifecycle Checklists ({categories.lifecycleChecklists.length})
                </h3>
              </div>
              <Link href="/hrms/lifecycle" className="text-xs text-[#588594] hover:underline">
                View All
              </Link>
            </div>

            {categories.lifecycleChecklists.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">All employee checklists completed.</p>
            ) : (
              <div className="space-y-2">
                {categories.lifecycleChecklists.map((item) => (
                  <div key={item.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60 text-xs space-y-1.5">
                    <div className="flex justify-between font-semibold text-slate-800">
                      <span>{item.title}</span>
                      <span className="font-mono text-slate-900 font-bold">{item.progressPercent}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-teal-600 rounded-full" style={{ width: `${item.progressPercent}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Holidays */}
          <div className="rounded-3xl bg-white/85 backdrop-blur-md border border-slate-200/80 p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Upcoming Holidays (Next 30 Days)
                </h3>
              </div>
              <Link href="/hrms/calendar" className="text-xs text-[#588594] hover:underline">
                Full Calendar
              </Link>
            </div>

            {categories.upcomingHolidays.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">No public holidays in the next 30 days.</p>
            ) : (
              <div className="space-y-2">
                {categories.upcomingHolidays.map((item) => (
                  <div key={item.id} className="p-3 rounded-2xl bg-indigo-50/50 border border-indigo-200/60 text-xs flex justify-between items-center">
                    <span className="font-bold text-indigo-950">{item.name}</span>
                    <span className="font-mono text-indigo-800 font-semibold">{item.date}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
