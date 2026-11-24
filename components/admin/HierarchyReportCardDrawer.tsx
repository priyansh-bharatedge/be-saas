"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  TrendingUp,
  Target,
  Clock,
  IndianRupee,
  Users,
  Building2,
  FileText,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Sparkles,
  PhoneCall,
  Calendar,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { SelectedNodeType } from "./OrbitalHierarchyVisualizer";
import { HierarchyNodeMetrics } from "@/lib/actions/super-admin-hierarchy";

interface HierarchyReportCardDrawerProps {
  selectedNode: SelectedNodeType | null;
  onClose: () => void;
  dateFilterLabel?: string;
}

export function formatINR(amount: number): string {
  if (isNaN(amount)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function HierarchyReportCardDrawer({
  selectedNode,
  onClose,
  dateFilterLabel = "Current Month",
}: HierarchyReportCardDrawerProps) {
  if (!selectedNode) return null;

  // Extract breadcrumbs, name, title, badge, metrics based on node type
  let breadcrumbs: string[] = [];
  let name = "";
  let roleTitle = "";
  let branchName = "";
  let email = "";
  let avatarUrl: string | null | undefined = null;
  let metrics: HierarchyNodeMetrics;
  let employeeId = "";

  if (selectedNode.type === "HOD") {
    breadcrumbs = ["Sales Organization", "Sales HOD"];
    name = selectedNode.data.name;
    roleTitle = selectedNode.data.designation;
    branchName = "All Enterprise Branches";
    email = selectedNode.data.email;
    avatarUrl = selectedNode.data.avatarUrl;
    metrics = selectedNode.data.metrics;
    employeeId = selectedNode.data.employeeId;
  } else if (selectedNode.type === "BRANCH") {
    breadcrumbs = [selectedNode.parentHOD.name, selectedNode.data.name];
    name = selectedNode.data.name;
    roleTitle = `Branch Operations (${selectedNode.data.code})`;
    branchName = selectedNode.data.name;
    metrics = selectedNode.data.metrics;
  } else if (selectedNode.type === "TL") {
    breadcrumbs = [
      selectedNode.parentHOD.name,
      selectedNode.parentBranch.name.replace(/Headquarters\s*-\s*/i, ""),
      selectedNode.data.name,
    ];
    name = selectedNode.data.name;
    roleTitle = selectedNode.data.designation;
    branchName = selectedNode.parentBranch.name;
    email = selectedNode.data.email;
    avatarUrl = selectedNode.data.avatarUrl;
    metrics = selectedNode.data.metrics;
    employeeId = selectedNode.data.employeeId;
  } else {
    // TM
    breadcrumbs = [
      selectedNode.parentHOD.name,
      selectedNode.parentBranch.name.replace(/Headquarters\s*-\s*/i, ""),
      selectedNode.parentTL.name,
      selectedNode.data.name,
    ];
    name = selectedNode.data.name;
    roleTitle = selectedNode.data.designation;
    branchName = selectedNode.parentBranch.name;
    email = selectedNode.data.email;
    avatarUrl = selectedNode.data.avatarUrl;
    metrics = selectedNode.data.metrics;
    employeeId = selectedNode.data.employeeId;
  }

  // Circular attainment ring calculation
  const attainmentRate = metrics.attainmentRate;
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, attainmentRate) / 100) * circumference;

  const isClockedIn =
    metrics.attendanceStatus === "ACTIVE" || metrics.attendanceStatus === "MEETING_MODE";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 20, scale: 0.98 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 20, scale: 0.98 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="fixed inset-y-4 right-4 z-50 w-full max-w-lg bg-white/95 backdrop-blur-2xl border border-slate-200/90 rounded-[28px] shadow-[0_25px_60px_rgba(0,0,0,0.18)] flex flex-col overflow-hidden"
      >
        {/* Ambient background blur */}
        <div className="pointer-events-none absolute -top-10 -right-10 w-60 h-60 rounded-full bg-[#ACCAD5]/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 w-60 h-60 rounded-full bg-[#F0944D]/15 blur-3xl" />

        {/* 1. Header & Breadcrumb Trail */}
        <div className="relative z-10 px-6 pt-6 pb-4 border-b border-slate-200/70">
          <div className="flex items-center justify-between gap-3 mb-3">
            {/* Breadcrumb Trail */}
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 overflow-x-auto whitespace-nowrap scrollbar-none">
              {breadcrumbs.map((crumb, idx) => (
                <span key={idx} className="flex items-center gap-1">
                  {idx > 0 && <ChevronRight className="h-3 w-3 text-slate-300 shrink-0" />}
                  <span className={cn(idx === breadcrumbs.length - 1 ? "text-[#C66318] font-bold" : "text-slate-500")}>
                    {crumb}
                  </span>
                </span>
              ))}
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* User / Node Profile Info */}
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#ACCAD5] to-[#F0944D] text-white flex items-center justify-center font-black text-xl shadow-md border-2 border-white">
                {name.charAt(0)}
              </div>
              {isClockedIn && (
                <div
                  className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white"
                  title="Currently active & clocked-in"
                />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 truncate">{name}</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#F0944D]/15 text-[#C66318] border border-[#F0944D]/25">
                  {selectedNode.type}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">{roleTitle}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200/60">
                  <Building2 className="h-3 w-3 text-slate-400" />
                  {branchName}
                </span>
                {employeeId && (
                  <span className="text-[10px] font-mono font-semibold text-slate-400">
                    ID: {employeeId}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 2. Scrollable Metrics Content Canvas */}
        <div className="relative z-10 flex-1 overflow-y-auto p-6 space-y-6">
          {/* Target Attainment Circular Ring & Revenue Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-white to-[#F9FBFC] border border-slate-200/80 shadow-xs flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Revenue Target Attainment
                </span>
                <span className="text-[10px] font-semibold text-slate-400">({dateFilterLabel})</span>
              </div>
              <div className="text-2xl font-black text-slate-900">
                {formatINR(metrics.achievedAmount)}
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-1.5 pt-0.5">
                <span>Target: <strong className="text-slate-700">{formatINR(metrics.targetAmount)}</strong></span>
                <span>•</span>
                <span>Shortfall: <strong className="text-rose-600">{formatINR(metrics.shortfallAmount)}</strong></span>
              </div>
            </div>

            {/* Circular Gauge */}
            <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  className="stroke-slate-100"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  stroke="#F0944D"
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-base font-black text-slate-900">{attainmentRate}%</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase">Attained</span>
              </div>
            </div>
          </div>

          {/* Cashflow & Financial Telemetry */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Verified Received
              </span>
              <span className="text-base font-extrabold text-emerald-600 mt-1 block">
                {formatINR(metrics.verifiedReceived)}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Bank receipts verified
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Pending Receivables
              </span>
              <span className="text-base font-extrabold text-amber-600 mt-1 block">
                {formatINR(metrics.pendingAmount)}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Awaiting client payment
              </span>
            </div>
          </div>

          {/* Activity & Conversion Stats */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/60 text-center">
              <Briefcase className="h-4 w-4 text-[#F0944D] mx-auto mb-1" />
              <div className="text-sm font-bold text-slate-900">{metrics.dealsBookedCount}</div>
              <div className="text-[10px] text-slate-500 font-medium">Deals Booked</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/60 text-center">
              <FileText className="h-4 w-4 text-[#ACCAD5] mx-auto mb-1" />
              <div className="text-sm font-bold text-slate-900">{metrics.quotationsCount}</div>
              <div className="text-[10px] text-slate-500 font-medium">Quotations</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/60 text-center">
              <AlertCircle className="h-4 w-4 text-rose-500 mx-auto mb-1" />
              <div className="text-sm font-bold text-slate-900">{metrics.unconvertedPaymentsCount}</div>
              <div className="text-[10px] text-slate-500 font-medium">CRM Pending</div>
            </div>
          </div>

          {/* 1-on-1 Review Attendance & Live Presence */}
          <div className="p-4 rounded-2xl bg-[#FCFAF7] border border-slate-200/80 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#C66318]" />
                <span className="text-xs font-bold text-slate-800">
                  Today's Attendance & Tracker
                </span>
              </div>
              <span
                className={cn(
                  "px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                  isClockedIn
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-slate-100 text-slate-600 border-slate-200"
                )}
              >
                {metrics.attendanceStatus}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
              <span>Logged Active Work Hours Today:</span>
              <strong className="text-slate-900">
                {metrics.activeHoursToday.toFixed(1)} hrs
              </strong>
            </div>
          </div>

          {/* Recent Deals in Period */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Recent Deals in Period ({metrics.recentDeals.length})
              </h4>
              <Link
                href="/crm/deals"
                className="text-[11px] font-bold text-[#C66318] hover:underline inline-flex items-center gap-1"
              >
                <span>View CRM Deals</span>
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>

            {metrics.recentDeals.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                No deals logged in this period.
              </div>
            ) : (
              <div className="space-y-2">
                {metrics.recentDeals.map((deal) => (
                  <div
                    key={deal.id}
                    className="p-3 rounded-xl bg-white border border-slate-200/70 shadow-xs flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 truncate max-w-[200px]">
                          {deal.title}
                        </span>
                        {deal.isPartnerSplit && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                            50% Split
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {deal.dealNumber} • Stage: {deal.stage}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-slate-900">{formatINR(deal.value)}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(deal.date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 3. Bottom Action Buttons for 1-on-1 Review */}
        <div className="relative z-10 px-6 py-4 border-t border-slate-200/70 bg-white/90 backdrop-blur-md flex items-center justify-between gap-3">
          <Link
            href="/chat"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all"
          >
            <PhoneCall className="h-3.5 w-3.5 text-slate-600" />
            <span>Chat 1-on-1</span>
          </Link>
          <Link
            href="/crm/deals"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#ACCAD5] to-[#F0944D] text-slate-950 text-xs font-bold shadow-md hover:opacity-95 transition-all"
          >
            <span>Review Deals in CRM</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
