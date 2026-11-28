"use client";

import { SunMedium, Clock, Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaveBalanceItem {
  leaveType: string;
  allocatedDays: number;
  usedDays: number;
  remainingDays: number;
  year: number;
}

interface LeaveBalanceCardsProps {
  balances: LeaveBalanceItem[];
  paidLeaveAccrual?: {
    totalQuota: number;
    accruedDays: number;
    usedDays: number;
    remainingDays: number;
  };
  shortLeaveMonthly?: {
    maxMonthlyCount: number;
    usedCount: number;
    remainingCount: number;
    maxMonthlyHours: number;
    usedHours: number;
    remainingHours: number;
  };
}

export default function LeaveBalanceCards({
  balances,
  paidLeaveAccrual,
  shortLeaveMonthly,
}: LeaveBalanceCardsProps) {
  // Current month name
  const currentMonthName = new Date().toLocaleString("default", { month: "short" });
  const currentYear = new Date().getFullYear();

  // Paid Leave stats
  const paidAllocated = paidLeaveAccrual?.totalQuota ?? 12;
  const paidAccrued = paidLeaveAccrual?.accruedDays ?? Math.min(12, new Date().getMonth() + 1);
  const paidUsed = paidLeaveAccrual?.usedDays ?? (balances.find((b) => b.leaveType === "PAID_LEAVE")?.usedDays ?? 0);
  const paidRemaining = paidLeaveAccrual?.remainingDays ?? Math.max(0, paidAllocated - paidUsed);
  const paidPercent = Math.min(100, Math.round((paidUsed / paidAllocated) * 100));

  // Short Leave stats
  const shortMaxCount = shortLeaveMonthly?.maxMonthlyCount ?? 2;
  const shortUsedCount = shortLeaveMonthly?.usedCount ?? 0;
  const shortRemainingCount = shortLeaveMonthly?.remainingCount ?? Math.max(0, shortMaxCount - shortUsedCount);

  const shortMaxHours = shortLeaveMonthly?.maxMonthlyHours ?? 3.0;
  const shortUsedHours = shortLeaveMonthly?.usedHours ?? 0;
  const shortRemainingHours = shortLeaveMonthly?.remainingHours ?? Math.max(0, shortMaxHours - shortUsedHours);

  const shortCountPercent = Math.min(100, Math.round((shortUsedCount / shortMaxCount) * 100));
  const shortHoursPercent = Math.min(100, Math.round((shortUsedHours / shortMaxHours) * 100));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {/* -------------------------------------------------------------
          CARD 1: PAID LEAVE (Annual Accrual - 12 days/yr, 1 day/mo)
         ------------------------------------------------------------- */}
      <div className="rounded-[32px] bg-white/75 backdrop-blur-2xl border border-white/90 shadow-[0_12px_40px_rgba(0,0,0,0.03)] p-6 sm:p-7 relative overflow-hidden flex flex-col justify-between">
        {/* Ambient background blur */}
        <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 bg-[#F0944D]/15 rounded-full blur-3xl" />

        <div>
          {/* Card Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100/90 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-200/80 flex items-center justify-center text-[#E86C2C] shadow-xs">
                <SunMedium className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Paid Leave (PL)
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Annual quota of 12 days • Accrues 1 day / month
                </p>
              </div>
            </div>

            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-orange-100/70 text-[#C66318] border border-orange-200/60 font-mono">
              Year {currentYear}
            </span>
          </div>

          {/* Remaining Counter */}
          <div className="mt-5 flex items-baseline justify-between relative z-10">
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-black text-slate-900 tracking-tight">
                  {paidRemaining}
                </span>
                <span className="text-sm font-bold text-slate-400">/ {paidAllocated} days remaining</span>
              </div>
              <div className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Accrued to date: {paidAccrued} days ({currentMonthName})</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-500 font-medium block">Utilized</span>
              <span className="text-lg font-black text-slate-800">{paidUsed} days</span>
            </div>
          </div>
        </div>

        {/* Progress & Micro-stats */}
        <div className="mt-6 pt-3 border-t border-slate-100/80 relative z-10 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Deduction upon approval</span>
            <span>{paidPercent}% consumed</span>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              style={{ width: `${paidPercent}%` }}
              className="h-full bg-gradient-to-r from-[#F0944D] to-[#E86C2C] rounded-full transition-all duration-700 ease-out"
            />
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------
          CARD 2: SHORT LEAVE (Monthly Quota - Max 2/mo, 3.0 hrs/mo, 1.5 hrs/req)
         ------------------------------------------------------------- */}
      <div className="rounded-[32px] bg-white/75 backdrop-blur-2xl border border-white/90 shadow-[0_12px_40px_rgba(0,0,0,0.03)] p-6 sm:p-7 relative overflow-hidden flex flex-col justify-between">
        {/* Ambient background blur */}
        <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 bg-[#ACCAD5]/20 rounded-full blur-3xl" />

        <div>
          {/* Card Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100/90 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-sky-50 border border-sky-200/80 flex items-center justify-center text-sky-600 shadow-xs">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Short Leave (SL)
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Monthly quota • Max 1.5 hrs / single request
                </p>
              </div>
            </div>

            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-sky-100/70 text-sky-800 border border-sky-200/60 font-mono">
              {currentMonthName} {currentYear}
            </span>
          </div>

          {/* Dual Monthly Limits Counter: Count and Hours */}
          <div className="mt-5 grid grid-cols-2 gap-4 relative z-10">
            {/* Stat A: Monthly Requests Left */}
            <div className="p-3.5 rounded-2xl bg-sky-50/50 border border-sky-100/80">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Requests Left
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-black text-slate-900 tracking-tight">
                  {shortRemainingCount}
                </span>
                <span className="text-xs font-bold text-slate-500">/ {shortMaxCount} monthly</span>
              </div>
              <div className="mt-2 h-1.5 w-full bg-sky-200/60 rounded-full overflow-hidden">
                <div
                  style={{ width: `${shortCountPercent}%` }}
                  className="h-full bg-sky-600 rounded-full transition-all duration-700"
                />
              </div>
            </div>

            {/* Stat B: Monthly Hours Left */}
            <div className="p-3.5 rounded-2xl bg-sky-50/50 border border-sky-100/80">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Hours Left
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-black text-slate-900 tracking-tight">
                  {shortRemainingHours.toFixed(1)}
                </span>
                <span className="text-xs font-bold text-slate-500">/ {shortMaxHours.toFixed(1)} hrs</span>
              </div>
              <div className="mt-2 h-1.5 w-full bg-sky-200/60 rounded-full overflow-hidden">
                <div
                  style={{ width: `${shortHoursPercent}%` }}
                  className="h-full bg-sky-600 rounded-full transition-all duration-700"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Constraint Badge */}
        <div className="mt-5 pt-3 border-t border-slate-100/80 relative z-10 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
            Max 1.5 hrs per application
          </span>
          <span className="font-bold text-slate-700">
            {shortUsedHours.toFixed(1)} hrs used ({shortUsedCount} reqs)
          </span>
        </div>
      </div>
    </div>
  );
}
