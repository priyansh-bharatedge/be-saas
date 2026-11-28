"use client";

import { useState } from "react";
import {
  ArrowUpRight,
  Clock,
  Play,
  Pause,
  CheckCircle2,
  Calendar,
  Building2,
  Users,
  Briefcase,
  TrendingUp,
  Award,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  IndianRupee,
  Sparkles,
  FileText,
  BadgePercent,
  Layers,
  MapPin,
  User,
  Eye,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  SuperAdminBentoData,
  BentoBranchData,
  BentoHODData,
  BentoTLData,
  BentoTMData,
  BentoRosterMember,
} from "@/lib/actions/super-admin-bento";
import { BentoHierarchySelection } from "./TierHierarchyDrillDown";
import { formatINR, formatCompactINR } from "./bento-utils";
import {
  IndividualTelemetryModal,
  IndividualTelemetryData,
} from "./IndividualTelemetryModal";
import {
  TeamRollUpModal,
  TeamRollUpData,
} from "./TeamRollUpModal";

interface ExecutiveBentoGridProps {
  data: SuperAdminBentoData;
  selection: BentoHierarchySelection;
  onSelectSubordinate: (member: BentoRosterMember) => void;
}

export function ExecutiveBentoGrid({
  data,
  selection,
  onSelectSubordinate,
}: ExecutiveBentoGridProps) {
  // Accordion state for Bottom-Left Card
  const [expandedAccordion, setExpandedAccordion] = useState<string | null>("id-branch");

  // Telemetry Popups State (Reference Images 3 & 4: Self Telemetry vs Team Roll-Up)
  const [selectedIndividual, setSelectedIndividual] = useState<IndividualTelemetryData | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<TeamRollUpData | null>(null);

  // Progressive Hierarchy Tree Expansions (Branch -> HOD -> TL -> TM)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if ("hodId" in selection && selection.hodId) initial.add(selection.hodId);
    if ("tlId" in selection && selection.tlId) initial.add(selection.tlId);
    return initial;
  });

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  // Determine active target node based on selection
  const activeBranch =
    selection.tier !== "all"
      ? data.branches.find((b) => b.id === selection.branchId)
      : null;

  const activeHOD =
    (selection.tier === "hod" || selection.tier === "tl" || selection.tier === "tm") &&
    activeBranch
      ? activeBranch.hods.find((h) => h.id === selection.hodId)
      : null;

  const activeTL =
    (selection.tier === "tl" || selection.tier === "tm") && activeHOD
      ? activeHOD.teamLeaders.find((t) => t.id === selection.tlId)
      : null;

  const activeTM =
    selection.tier === "tm" && activeTL
      ? activeTL.teamMembers.find((m) => m.id === selection.tmId)
      : null;

  // Resolve current active metrics
  const isIndividualTM = selection.tier === "tm" && !!activeTM;
  const isTL = selection.tier === "tl" && !!activeTL;
  const isHOD = selection.tier === "hod" && !!activeHOD;
  const isBranch = selection.tier === "branch" && !!activeBranch;
  const isAll = selection.tier === "all";

  // Unified active values
  const profileName = activeTM
    ? activeTM.name
    : activeTL
    ? activeTL.name
    : activeHOD
    ? activeHOD.name
    : activeBranch
    ? `${activeBranch.name} Hub`
    : "BharatEdge Enterprise";

  const profileSubtitle = activeTM
    ? `${activeTM.designation} • ${activeTM.branch}`
    : activeTL
    ? `${activeTL.designation} • ${activeTL.branch}`
    : activeHOD
    ? `${activeHOD.designation} • ${activeHOD.branch}`
    : activeBranch
    ? `Operational Branch • ${activeBranch.totalStaffCount} Staff`
    : "Executive Command Center • All Branches";

  const bookedRevenue = activeTM
    ? activeTM.bookedRevenue
    : activeTL
    ? activeTL.teamBookedRevenue
    : activeHOD
    ? activeHOD.teamBookedRevenue
    : activeBranch
    ? activeBranch.bookedRevenue
    : data.company.bookedRevenue;

  const receivedRevenue = activeTM
    ? activeTM.receivedRevenue
    : activeTL
    ? activeTL.teamReceivedRevenue
    : activeHOD
    ? activeHOD.teamReceivedRevenue
    : activeBranch
    ? activeBranch.receivedRevenue
    : data.company.receivedRevenue;

  const pendingReceivables = activeTM
    ? activeTM.pendingReceivables
    : activeTL
    ? activeTL.teamPendingReceivables
    : activeHOD
    ? activeHOD.teamPendingReceivables
    : activeBranch
    ? activeBranch.pendingReceivables
    : data.company.pendingReceivables;

  const targetAmount = activeTM
    ? activeTM.targetAmount
    : activeTL
    ? activeTL.teamTargetAmount
    : activeHOD
    ? activeHOD.teamTargetAmount
    : activeBranch
    ? activeBranch.targetAmount
    : data.company.targetAmount;

  const dealsClosed = activeTM
    ? activeTM.dealsClosedCount
    : activeTL
    ? activeTL.teamDealsClosedCount
    : activeHOD
    ? activeHOD.teamDealsClosedCount
    : activeBranch
    ? activeBranch.dealsClosedCount
    : data.company.dealsClosedCount;

  const totalDeals = activeTM
    ? activeTM.totalDealsCount
    : activeTL
    ? activeTL.teamTotalDealsCount
    : activeHOD
    ? activeHOD.teamTotalDealsCount
    : activeBranch
    ? activeBranch.totalDealsCount
    : data.company.totalDealsCount;

  const activeStaff = activeTM
    ? activeTM.attendanceStatus === "ACTIVE" ? 1 : 0
    : activeTL
    ? activeTL.teamActiveStaffCount
    : activeHOD
    ? activeHOD.teamActiveStaffCount
    : activeBranch
    ? activeBranch.activeStaffCount
    : data.company.activeStaffCount;

  const totalStaff = activeTM
    ? 1
    : activeTL
    ? activeTL.teamTotalStaffCount
    : activeHOD
    ? activeHOD.teamTotalStaffCount
    : activeBranch
    ? activeBranch.totalStaffCount
    : data.company.totalStaffCount;

  const attendanceHours = activeTM
    ? activeTM.formattedActiveHours
    : activeTL
    ? activeTL.formattedActiveHours
    : activeHOD
    ? activeHOD.formattedActiveHours
    : "07:15";

  const attendanceStatus = activeTM
    ? activeTM.attendanceStatus
    : activeTL
    ? activeTL.attendanceStatus
    : activeHOD
    ? activeHOD.attendanceStatus
    : "ACTIVE";

  const attendanceRate = activeTM
    ? activeTM.monthlyAttendanceRate
    : activeTL
    ? activeTL.monthlyAttendanceRate
    : activeHOD
    ? activeHOD.monthlyAttendanceRate
    : activeBranch
    ? activeBranch.attendancePercent
    : data.company.attendancePercent;

  const timelineBars = activeTM
    ? activeTM.activityTimeline
    : activeTL
    ? activeTL.activityTimeline
    : activeHOD
    ? activeHOD.activityTimeline
    : activeBranch
    ? activeBranch.activityTimeline
    : data.company.activityTimeline;

  const recentMilestones = activeTM
    ? activeTM.recentMilestones
    : activeTL
    ? activeTL.recentMilestones
    : activeHOD
    ? activeHOD.recentMilestones
    : activeBranch
    ? activeBranch.recentMilestones
    : data.company.recentMilestones;

  const accordionDetails = activeTM
    ? activeTM.details
    : activeTL
    ? activeTL.details
    : activeHOD
    ? activeHOD.details
    : {
        employeeId: activeBranch ? `BR-${activeBranch.code}` : "HQ-ALL",
        branch: activeBranch ? activeBranch.name : "Multi-Branch Org",
        employmentType: "Permanent Corporate",
        dateOfJoining: "Established 2024",
        shift: "Core Operations (09:30 AM - 06:30 PM)",
        casualLeaveRemaining: 12,
        sickLeaveRemaining: 8,
        monthlyTarget: targetAmount,
        commissionSplit: "Multi-Tier Split Active",
      };

  // Subordinate roster (for HOD / TL / Branch)
  const roster: BentoRosterMember[] = activeTL
    ? activeTL.subordinateRoster
    : activeHOD
    ? activeHOD.subordinateRoster
    : activeBranch
    ? activeBranch.hods.flatMap((h) => h.subordinateRoster)
    : data.branches.flatMap((b) => b.hods.flatMap((h) => h.subordinateRoster));

  // Helpers to convert Bento hierarchy models to Telemetry & Modal types
  const hodToIndividualTelemetry = (h: BentoHODData): IndividualTelemetryData => ({
    id: h.id,
    employeeId: h.employeeId,
    name: h.name,
    email: h.email,
    avatarUrl: h.avatarUrl,
    designation: h.designation,
    department: h.department,
    branch: h.branch,
    systemRole: h.systemRole,
    tier: "HOD",
    bookedRevenue: h.personalBookedRevenue,
    dealsClosedCount: h.personalDealsWon,
    targetAmount: h.details?.monthlyTarget || 0,
    attainmentRate: h.details?.monthlyTarget
      ? Math.round((h.personalBookedRevenue / h.details.monthlyTarget) * 100)
      : 0,
    attendanceStatus: h.attendanceStatus,
    isOnline: h.isOnline,
    formattedActiveHours: h.formattedActiveHours,
    monthlyAttendanceRate: h.monthlyAttendanceRate,
    details: h.details,
  });

  const hodToTeamRollUp = (h: BentoHODData): TeamRollUpData => ({
    leaderId: h.id,
    leaderName: h.name,
    leaderDesignation: h.designation,
    leaderBranch: h.branch,
    leaderTier: "HOD",
    teamBookedRevenue: h.teamBookedRevenue,
    teamReceivedRevenue: h.teamReceivedRevenue,
    teamPendingReceivables: h.teamPendingReceivables,
    teamTargetAmount: h.teamTargetAmount,
    teamAttainmentRate: h.teamAttainmentRate,
    teamActiveStaffCount: h.teamActiveStaffCount,
    teamTotalStaffCount: h.teamTotalStaffCount,
    teamDealsClosedCount: h.teamDealsClosedCount,
    teamTotalDealsCount: h.teamTotalDealsCount,
    subordinates: h.teamLeaders.map((tl) => ({
      id: tl.id,
      name: tl.name,
      designation: tl.designation,
      tier: "TL" as const,
      bookedRevenue: tl.teamBookedRevenue,
      targetAmount: tl.teamTargetAmount,
      attainmentRate: tl.teamAttainmentRate,
      attendanceStatus: tl.attendanceStatus,
      isOnline: tl.isOnline,
      dealsClosedCount: tl.teamDealsClosedCount,
    })),
  });

  const tlToIndividualTelemetry = (tl: BentoTLData): IndividualTelemetryData => ({
    id: tl.id,
    employeeId: tl.employeeId,
    name: tl.name,
    email: tl.email,
    avatarUrl: tl.avatarUrl,
    designation: tl.designation,
    department: tl.department,
    branch: tl.branch,
    systemRole: tl.systemRole,
    tier: "TL",
    bookedRevenue: tl.personalBookedRevenue,
    dealsClosedCount: tl.personalDealsWon,
    targetAmount: tl.details?.monthlyTarget || 0,
    attainmentRate: tl.details?.monthlyTarget
      ? Math.round((tl.personalBookedRevenue / tl.details.monthlyTarget) * 100)
      : 0,
    attendanceStatus: tl.attendanceStatus,
    isOnline: tl.isOnline,
    formattedActiveHours: tl.formattedActiveHours,
    monthlyAttendanceRate: tl.monthlyAttendanceRate,
    details: tl.details,
  });

  const tlToTeamRollUp = (tl: BentoTLData): TeamRollUpData => ({
    leaderId: tl.id,
    leaderName: tl.name,
    leaderDesignation: tl.designation,
    leaderBranch: tl.branch,
    leaderTier: "TL",
    teamBookedRevenue: tl.teamBookedRevenue,
    teamReceivedRevenue: tl.teamReceivedRevenue,
    teamPendingReceivables: tl.teamPendingReceivables,
    teamTargetAmount: tl.teamTargetAmount,
    teamAttainmentRate: tl.teamAttainmentRate,
    teamActiveStaffCount: tl.teamActiveStaffCount,
    teamTotalStaffCount: tl.teamTotalStaffCount,
    teamDealsClosedCount: tl.teamDealsClosedCount,
    teamTotalDealsCount: tl.teamTotalDealsCount,
    subordinates: tl.teamMembers.map((tm) => ({
      id: tm.id,
      name: tm.name,
      designation: tm.designation,
      tier: "TM" as const,
      bookedRevenue: tm.bookedRevenue,
      targetAmount: tm.targetAmount,
      attainmentRate: tm.attainmentRate,
      attendanceStatus: tm.attendanceStatus,
      isOnline: tm.isOnline,
      dealsClosedCount: tm.dealsClosedCount,
    })),
  });

  const tmToIndividualTelemetry = (tm: BentoTMData): IndividualTelemetryData => ({
    id: tm.id,
    employeeId: tm.employeeId,
    name: tm.name,
    email: tm.email,
    avatarUrl: tm.avatarUrl,
    designation: tm.designation,
    department: tm.department,
    branch: tm.branch,
    systemRole: tm.systemRole,
    tier: "TM",
    bookedRevenue: tm.bookedRevenue,
    dealsClosedCount: tm.dealsClosedCount,
    targetAmount: tm.targetAmount,
    attainmentRate: tm.attainmentRate,
    attendanceStatus: tm.attendanceStatus,
    isOnline: tm.isOnline,
    formattedActiveHours: tm.formattedActiveHours,
    monthlyAttendanceRate: tm.monthlyAttendanceRate,
    details: tm.details,
    activeDealsChecklist: tm.activeDealsChecklist,
  });

  const hodToRosterMember = (h: BentoHODData): BentoRosterMember => ({
    id: h.id,
    employeeId: h.employeeId,
    name: h.name,
    designation: h.designation,
    branch: h.branch,
    tier: "HOD",
    bookedRevenue: h.personalBookedRevenue,
    targetAmount: h.details?.monthlyTarget || 0,
    attainmentRate: h.details?.monthlyTarget ? Math.round((h.personalBookedRevenue / h.details.monthlyTarget) * 100) : 0,
    attendanceStatus: h.attendanceStatus,
    isOnline: h.isOnline,
    avatarUrl: h.avatarUrl,
  });

  const tlToRosterMember = (t: BentoTLData): BentoRosterMember => ({
    id: t.id,
    employeeId: t.employeeId,
    name: t.name,
    designation: t.designation,
    branch: t.branch,
    tier: "TL",
    bookedRevenue: t.personalBookedRevenue,
    targetAmount: t.teamTargetAmount || t.details?.monthlyTarget || 0,
    attainmentRate: t.details?.monthlyTarget ? Math.round((t.personalBookedRevenue / t.details.monthlyTarget) * 100) : 0,
    attendanceStatus: t.attendanceStatus,
    isOnline: t.isOnline,
    avatarUrl: t.avatarUrl,
  });

  const tmToRosterMember = (m: BentoTMData): BentoRosterMember => ({
    id: m.id,
    employeeId: m.employeeId,
    name: m.name,
    designation: m.designation,
    branch: m.branch,
    tier: "TM",
    bookedRevenue: m.bookedRevenue,
    targetAmount: m.targetAmount || m.details?.monthlyTarget || 0,
    attainmentRate: m.attainmentRate,
    attendanceStatus: m.attendanceStatus,
    isOnline: m.isOnline,
    avatarUrl: m.avatarUrl,
  });

  // Checklist for TM
  const tmChecklist = activeTM ? activeTM.activeDealsChecklist : [];

  // Segmented progress calculations
  const totalFinancialBase = Math.max(targetAmount, bookedRevenue + pendingReceivables, 1);
  const receivedPct = Math.min(100, Math.round((receivedRevenue / totalFinancialBase) * 100));
  const pendingPct = Math.min(100 - receivedPct, Math.round((pendingReceivables / totalFinancialBase) * 100));
  const gapPct = Math.max(0, 100 - (receivedPct + pendingPct));

  return (
    <div className="space-y-4">
      {/* =========================================================================
          TOP SUMMARY STRIP (Crextio Header: Segmented Bar + 3 Large Counters)
         ========================================================================= */}
      <div className="p-4 md:p-5 rounded-3xl bg-white/60 backdrop-blur-xl border border-white/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_8px_28px_rgba(15,23,42,0.05)] flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left: Segmented Progress Bar */}
        <div className="flex-1 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-800 tracking-tight">
                Financial Telemetry Split
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                ({selection.tier === "all" ? "Organization" : profileName})
              </span>
            </div>
            <span className="text-[11px] font-bold text-slate-500">
              Target: {formatCompactINR(targetAmount)}
            </span>
          </div>

          {/* Segmented Bar */}
          <div className="h-4 w-full rounded-full bg-slate-100 p-0.5 flex gap-1 overflow-hidden shadow-inner">
            <div
              style={{ width: `${Math.max(receivedPct, 5)}%` }}
              className="h-full rounded-full bg-emerald-500 transition-all duration-700 ease-out flex items-center justify-center text-[9px] font-black text-white px-1 shadow-xs"
              title={`Verified Received: ${formatINR(receivedRevenue)} (${receivedPct}%)`}
            >
              {receivedPct > 10 ? `${receivedPct}%` : ""}
            </div>
            <div
              style={{ width: `${Math.max(pendingPct, 4)}%` }}
              className="h-full rounded-full bg-[#E86C2C] transition-all duration-700 ease-out flex items-center justify-center text-[9px] font-black text-white px-1 shadow-xs"
              title={`Pending Receivables: ${formatINR(pendingReceivables)} (${pendingPct}%)`}
            >
              {pendingPct > 10 ? `${pendingPct}%` : ""}
            </div>
            <div
              style={{ width: `${Math.max(gapPct, 3)}%` }}
              className="h-full rounded-full bg-slate-200/90 transition-all duration-700 ease-out flex items-center justify-center text-[9px] font-bold text-slate-500 px-1"
              title={`Target Gap: ${gapPct}%`}
            >
              {gapPct > 12 ? `Gap ${gapPct}%` : ""}
            </div>
          </div>

          {/* Legend Badges */}
          <div className="flex items-center flex-wrap gap-4 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-500 font-medium">Verified Received:</span>
              <span className="font-bold text-slate-800">{formatCompactINR(receivedRevenue)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E86C2C]" />
              <span className="text-slate-500 font-medium">Pending Receivables:</span>
              <span className="font-bold text-slate-800">{formatCompactINR(pendingReceivables)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              <span className="text-slate-500 font-medium">Target Gap:</span>
              <span className="font-bold text-slate-800">{gapPct}%</span>
            </div>
          </div>
        </div>

        {/* Right: 3 Large Summary Stat Counters (Crextio right header stats) */}
        <div className="flex items-center gap-6 lg:border-l lg:border-slate-200/70 lg:pl-8 shrink-0">
          {/* Stat 1: Booked Revenue */}
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <IndianRupee className="w-3.5 h-3.5 text-[#E86C2C]" />
              <span>Booked Revenue</span>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {formatCompactINR(bookedRevenue)}
            </div>
            <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>{Math.round((bookedRevenue / Math.max(targetAmount, 1)) * 100)}% of Target</span>
            </div>
          </div>

          {/* Stat 2: Deals Closed */}
          <div className="space-y-0.5 border-l border-slate-100 pl-6">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <Briefcase className="w-3.5 h-3.5 text-blue-500" />
              <span>Deals Closed</span>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {dealsClosed} <span className="text-xs font-semibold text-slate-400">/ {totalDeals}</span>
            </div>
            <div className="text-[10px] text-slate-500 font-semibold">
              {totalDeals > 0 ? Math.round((dealsClosed / totalDeals) * 100) : 0}% Conversion
            </div>
          </div>

          {/* Stat 3: Active Staff */}
          <div className="space-y-0.5 border-l border-slate-100 pl-6">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <Users className="w-3.5 h-3.5 text-emerald-500" />
              <span>Active Staff</span>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {activeStaff} <span className="text-xs font-semibold text-slate-400">/ {totalStaff}</span>
            </div>
            <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{totalStaff > 0 ? Math.round((activeStaff / totalStaff) * 100) : 100}% Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MAIN BENTO GRID (Cards 1, 2, 3 + Card 4 Dark Charcoal Right Card)
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT & CENTER 8-COLUMN AREA (Holds Card 1, Card 2, Card 3 + Bottom Row) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Top Row: Cards 1, 2, 3 */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* -------------------------------------------------------------
                CARD 1 — Executive Portrait Card (4 Cols - Crextio Reference Image 1)
               ------------------------------------------------------------- */}
            <div className="md:col-span-4 rounded-3xl overflow-hidden relative p-5 bg-gradient-to-b from-sky-100/35 via-white/60 to-white/50 backdrop-blur-xl border border-white/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_8px_28px_rgba(15,23,42,0.05)] flex flex-col justify-between min-h-[300px]">
              {/* Background ambient lighting */}
              <div className="pointer-events-none absolute -top-10 -right-10 w-44 h-44 bg-[#ACCAD5]/30 rounded-full blur-3xl" />
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-slate-900/5 to-transparent" />

              {/* Top Profile Avatar & Status Pill */}
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-700 text-white flex items-center justify-center text-2xl font-black shadow-lg ring-4 ring-white/90">
                      {isBranch ? (
                        <Building2 className="w-8 h-8 text-[#E86C2C]" />
                      ) : (
                        profileName.charAt(0)
                      )}
                    </div>
                    {/* Live Online Beacon */}
                    <span
                      className={cn(
                        "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center shadow-xs",
                        attendanceStatus === "ACTIVE"
                          ? "bg-emerald-500"
                          : attendanceStatus === "IDLE"
                          ? "bg-amber-500"
                          : "bg-slate-400"
                      )}
                    />
                  </div>

                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md border border-slate-200 text-slate-700 shadow-xs flex items-center gap-1.5">
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        isBranch ? "bg-[#E86C2C]" : isHOD ? "bg-purple-500" : isTL ? "bg-amber-500" : "bg-blue-500"
                      )}
                    />
                    <span>{isBranch ? "Branch Hub" : isHOD ? "HOD" : isTL ? "Team Lead" : "Member"}</span>
                  </span>
                </div>

                <div className="mt-5">
                  <h3 className="text-lg font-black text-slate-900 tracking-tight leading-snug">
                    {profileName}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1 line-clamp-2">
                    {profileSubtitle}
                  </p>
                </div>
              </div>

              {/* Bottom Frosted Glass Pill Badge: Booked Revenue (Reference Image 1 floating pill style) */}
              <div className="relative z-10 mt-6 pt-3 border-t border-slate-100/90 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                    Booked Revenue
                  </span>
                  <div className="text-base font-black text-slate-900 tracking-tight">
                    {formatINR(bookedRevenue)}
                  </div>
                </div>

                {/* Translucent Frosted Glass Pill Badge ($1,500 style in Crextio) */}
                <div className="px-3.5 py-1.5 rounded-2xl bg-white/80 backdrop-blur-xl border border-white/80 text-xs font-black text-slate-900 shadow-[0_4px_16px_rgba(0,0,0,0.06)] ring-1 ring-slate-900/5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>{formatCompactINR(bookedRevenue)}</span>
                </div>
              </div>
            </div>

            {/* -------------------------------------------------------------
                CARD 2 — Sales & Activity Bar Chart Card (4 Cols)
               ------------------------------------------------------------- */}
            <div className="md:col-span-4 rounded-3xl p-5 bg-white/60 backdrop-blur-xl border border-white/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_8px_28px_rgba(15,23,42,0.05)] flex flex-col justify-between min-h-[290px]">
              {/* Header */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Progress
                  </span>
                  <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:text-slate-900">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-xl font-black text-slate-900 tracking-tight">
                    {formatCompactINR(bookedRevenue)}
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium">
                    Activity & pipeline conversions
                  </div>
                </div>
              </div>

              {/* Vertical Pill Bar Chart */}
              <div className="mt-4 flex items-end justify-between gap-1.5 h-28 pt-4">
                {timelineBars.map((bar, idx) => {
                  const maxVal = Math.max(...timelineBars.map((b) => b.value), 1);
                  const heightPct = Math.max(15, Math.round((bar.value / maxVal) * 100));

                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group relative"
                    >
                      {/* Floating Peak Callout */}
                      {bar.isPeak && (
                        <div className="absolute -top-6 bg-[#18181B] text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-md whitespace-nowrap z-10 animate-bounce">
                          {formatCompactINR(bar.value)}
                        </div>
                      )}

                      {/* Bar Pill */}
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={cn(
                          "w-full rounded-full transition-all duration-500 ease-out cursor-pointer",
                          bar.isPeak
                            ? "bg-[#18181B] shadow-md shadow-slate-900/20"
                            : "bg-[#ACCAD5]/70 hover:bg-[#ACCAD5] group-hover:scale-105"
                        )}
                        title={`${bar.label}: ${formatINR(bar.value)} (${bar.count} events)`}
                      />

                      {/* Day Label */}
                      <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-900 transition-colors">
                        {bar.label.charAt(0)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* -------------------------------------------------------------
                CARD 3 — Live Attendance & Work Time Dial Card (4 Cols)
               ------------------------------------------------------------- */}
            <div className="md:col-span-4 rounded-3xl p-5 bg-white/60 backdrop-blur-xl border border-white/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_8px_28px_rgba(15,23,42,0.05)] flex flex-col justify-between min-h-[290px]">
              {/* Header */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Time Tracker
                </span>
                <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:text-slate-900">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>

              {/* Radial Dial */}
              <div className="flex flex-col items-center justify-center my-1">
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90">
                    {/* Dotted / Background Ring */}
                    <circle
                      cx="56"
                      cy="56"
                      r="44"
                      className="stroke-slate-100"
                      strokeWidth="7"
                      strokeDasharray="4 4"
                      fill="transparent"
                    />
                    {/* Active Progress Arc */}
                    <circle
                      cx="56"
                      cy="56"
                      r="44"
                      stroke="#0284C7"
                      strokeWidth="7"
                      strokeDasharray={2 * Math.PI * 44}
                      strokeDashoffset={2 * Math.PI * 44 * (1 - attendanceRate / 100)}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>

                  {/* Center Time Display */}
                  <div className="absolute text-center">
                    <div className="text-lg font-black text-slate-900 tracking-tight">
                      {attendanceHours}
                    </div>
                    <div className="text-[9px] uppercase font-bold text-slate-400">
                      Work Time
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Controls & Status Badge */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                    <Play className="w-3 h-3 fill-slate-600" />
                  </div>
                  <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                    <Pause className="w-3 h-3" />
                  </div>
                </div>

                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-[10px] font-extrabold text-emerald-700 border border-emerald-200/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{attendanceRate}% Present</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row: Accordion Details & Activity Timeline */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* -------------------------------------------------------------
                BOTTOM-LEFT: Expandable Accordion Rows (5 Cols)
               ------------------------------------------------------------- */}
            <div className="md:col-span-5 rounded-3xl p-5 bg-white/60 backdrop-blur-xl border border-white/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_8px_28px_rgba(15,23,42,0.05)] space-y-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                Operational Credentials & Split
              </span>

              <div className="space-y-2">
                {/* Accordion 1: Employee ID & Branch */}
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 overflow-hidden">
                  <button
                    onClick={() =>
                      setExpandedAccordion(
                        expandedAccordion === "id-branch" ? null : "id-branch"
                      )
                    }
                    className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-slate-800 hover:bg-slate-100/60 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#E86C2C]" />
                      <span>Employee ID & Branch</span>
                    </div>
                    <ChevronDown
                      className={cn(
                        "w-3.5 h-3.5 text-slate-400 transition-transform duration-200",
                        expandedAccordion === "id-branch" && "rotate-180 text-slate-700"
                      )}
                    />
                  </button>
                  {expandedAccordion === "id-branch" && (
                    <div className="px-3.5 pb-3 text-xs text-slate-600 space-y-1.5 border-t border-slate-200/50 pt-2 bg-white">
                      <div className="flex justify-between">
                        <span className="text-slate-400">ID:</span>
                        <strong className="text-slate-900 font-mono">
                          {accordionDetails.employeeId}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Branch:</span>
                        <span className="font-semibold">{accordionDetails.branch}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Type:</span>
                        <span className="font-semibold">{accordionDetails.employmentType}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Accordion 2: Shift & Leave Balance */}
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 overflow-hidden">
                  <button
                    onClick={() =>
                      setExpandedAccordion(
                        expandedAccordion === "shift-leave" ? null : "shift-leave"
                      )
                    }
                    className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-slate-800 hover:bg-slate-100/60 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-blue-500" />
                      <span>Shift & Leave Balance</span>
                    </div>
                    <ChevronDown
                      className={cn(
                        "w-3.5 h-3.5 text-slate-400 transition-transform duration-200",
                        expandedAccordion === "shift-leave" && "rotate-180 text-slate-700"
                      )}
                    />
                  </button>
                  {expandedAccordion === "shift-leave" && (
                    <div className="px-3.5 pb-3 text-xs text-slate-600 space-y-1.5 border-t border-slate-200/50 pt-2 bg-white">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Shift:</span>
                        <span className="font-semibold text-slate-800">{accordionDetails.shift}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Casual Leave:</span>
                        <span className="font-bold text-emerald-600">
                          {accordionDetails.casualLeaveRemaining} days left
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Sick Leave:</span>
                        <span className="font-bold text-amber-600">
                          {accordionDetails.sickLeaveRemaining} days left
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Accordion 3: Commission & Target Split */}
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 overflow-hidden">
                  <button
                    onClick={() =>
                      setExpandedAccordion(
                        expandedAccordion === "target-split" ? null : "target-split"
                      )
                    }
                    className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-slate-800 hover:bg-slate-100/60 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <BadgePercent className="w-3.5 h-3.5 text-purple-500" />
                      <span>Commission & Target Split</span>
                    </div>
                    <ChevronDown
                      className={cn(
                        "w-3.5 h-3.5 text-slate-400 transition-transform duration-200",
                        expandedAccordion === "target-split" && "rotate-180 text-slate-700"
                      )}
                    />
                  </button>
                  {expandedAccordion === "target-split" && (
                    <div className="px-3.5 pb-3 text-xs text-slate-600 space-y-1.5 border-t border-slate-200/50 pt-2 bg-white">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Target:</span>
                        <span className="font-black text-slate-900">
                          {formatINR(accordionDetails.monthlyTarget)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Policy:</span>
                        <span className="font-semibold text-slate-800">{accordionDetails.commissionSplit}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* -------------------------------------------------------------
                BOTTOM-RIGHT: Horizontal Activity Timeline Strip (7 Cols)
               ------------------------------------------------------------- */}
            <div className="md:col-span-7 rounded-3xl p-5 bg-white/60 backdrop-blur-xl border border-white/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_8px_28px_rgba(15,23,42,0.05)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Recent Activity & Milestones
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  Deals • Quotations • Milestones
                </span>
              </div>

              {/* Horizontal Scrollable Timeline */}
              <div className="space-y-2 max-h-[175px] overflow-y-auto pr-1">
                {recentMilestones.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400">
                    No activity recorded in this period.
                  </div>
                ) : (
                  recentMilestones.map((m) => (
                    <div
                      key={m.id}
                      className="p-2.5 rounded-2xl bg-slate-50/70 border border-slate-200/60 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={cn(
                            "w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold",
                            m.type === "DEAL_WON"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-blue-100 text-blue-800"
                          )}
                        >
                          {m.type === "DEAL_WON" ? (
                            <IndianRupee className="w-3.5 h-3.5" />
                          ) : (
                            <Clock className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {m.title}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {m.subtitle}
                          </div>
                        </div>
                      </div>

                      {m.value ? (
                        <div className="text-right shrink-0">
                          <span className="text-xs font-black text-slate-900">
                            {formatCompactINR(m.value)}
                          </span>
                          <span className="text-[9px] uppercase font-bold text-emerald-600 block">
                            Won
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500 shrink-0">
                          {m.timestamp}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            CARD 4 — Team Hierarchy & Roll-Up Card (HIGH-CONTRAST DARK CHARCOAL #18181B)
           ========================================================================= */}
        <div className="lg:col-span-4 rounded-3xl p-5 bg-[#18181B]/95 backdrop-blur-xl text-white shadow-[0_20px_50px_rgba(0,0,0,0.25),inset_0_1px_0_0_rgba(255,255,255,0.15)] border border-slate-800 ring-1 ring-white/[0.05] flex flex-col justify-between min-h-[500px]">
          {/* Top Section */}
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {isIndividualTM ? "Personal Checklist" : "Hierarchy Roll-Up"}
                </span>
                <h4 className="text-sm font-bold text-white mt-0.5">
                  {isIndividualTM ? "Active Deals & Quotations" : "Subordinate Team Roster"}
                </h4>
              </div>

              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/10 text-[#F0944D] border border-white/10">
                {isIndividualTM
                  ? `${tmChecklist.filter((c) => c.isClosed).length}/${tmChecklist.length} Closed`
                  : `${roster.length} Staff`}
              </span>
            </div>

            {/* If HOD or TL: Summary Badges */}
            {!isIndividualTM && (
              <div className="grid grid-cols-3 gap-2 my-3.5">
                <div className="p-2.5 rounded-2xl bg-white/5 border border-white/5 text-center">
                  <div className="text-[9px] text-slate-400 uppercase font-bold">Revenue</div>
                  <div className="text-xs font-black text-white mt-0.5">
                    {formatCompactINR(bookedRevenue)}
                  </div>
                </div>
                <div className="p-2.5 rounded-2xl bg-white/5 border border-white/5 text-center">
                  <div className="text-[9px] text-slate-400 uppercase font-bold">Attainment</div>
                  <div className="text-xs font-black text-[#F0944D] mt-0.5">
                    {Math.round((bookedRevenue / Math.max(targetAmount, 1)) * 100)}%
                  </div>
                </div>
                <div className="p-2.5 rounded-2xl bg-white/5 border border-white/5 text-center">
                  <div className="text-[9px] text-slate-400 uppercase font-bold">Online</div>
                  <div className="text-xs font-black text-emerald-400 mt-0.5">
                    {activeStaff}/{totalStaff}
                  </div>
                </div>
              </div>
            )}

            {/* List / Checklist Container (No bulky scrollbar - scrollbar-none matching Image 4) */}
            <div className="mt-2 space-y-2 max-h-[380px] overflow-y-auto pr-1 scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {isIndividualTM ? (
                /* Checklist for TM */
                tmChecklist.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-400">
                    No active deals in this period.
                  </div>
                ) : (
                  tmChecklist.map((deal) => (
                    <div
                      key={deal.id}
                      className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-between gap-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={cn(
                            "w-5 h-5 rounded-full border flex items-center justify-center shrink-0",
                            deal.isClosed
                              ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                              : "border-slate-500 text-transparent"
                          )}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">
                            {deal.title}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {deal.companyName} • {deal.dealNumber}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-black text-white">
                          {formatCompactINR(deal.value)}
                        </div>
                        <span
                          className={cn(
                            "text-[8px] font-black uppercase px-1.5 py-0.2 rounded-md",
                            deal.isClosed
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-blue-500/20 text-blue-400"
                          )}
                        >
                          {deal.stage}
                        </span>
                      </div>
                    </div>
                  ))
                )
              ) : (
                /* Progressive Tree: Branch -> HOD -> TL -> TM (Styled like Reference Image 4) */
                (() => {
                  const displayHODs =
                    selection.tier !== "all" && activeBranch
                      ? activeBranch.hods
                      : data.branches.flatMap((b) => b.hods);

                  if (displayHODs.length === 0) {
                    return (
                      <div className="text-center py-10 text-xs text-slate-400">
                        No department heads registered for this branch.
                      </div>
                    );
                  }

                  return displayHODs.map((hod) => {
                    const isHODExpanded = expandedNodes.has(hod.id);

                    return (
                      <div key={hod.id} className="space-y-1.5">
                        {/* HOD Row (Reference Image 4 styling) */}
                        <div className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all flex items-center justify-between gap-2 group/hod">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Circular White Action Button (Self Telemetry Trigger) */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedIndividual(hodToIndividualTelemetry(hod));
                              }}
                              title="View Personal Telemetry"
                              className="w-7 h-7 rounded-full bg-white text-slate-900 shadow-md flex items-center justify-center hover:bg-[#E86C2C] hover:text-white transition-all shrink-0 cursor-pointer group-hover/hod:scale-105"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Circular Avatar with Online Beacon */}
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedIndividual(hodToIndividualTelemetry(hod));
                              }}
                              className="relative cursor-pointer shrink-0"
                              title="View Personal Telemetry"
                            >
                              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-700 to-slate-800 text-white font-black text-xs flex items-center justify-center ring-2 ring-white/10 hover:ring-[#E86C2C]/50 transition-all">
                                {hod.name.charAt(0)}
                              </div>
                              <span
                                className={cn(
                                  "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-[#18181B]",
                                  hod.attendanceStatus === "ACTIVE"
                                    ? "bg-emerald-400"
                                    : hod.attendanceStatus === "IDLE"
                                    ? "bg-amber-400"
                                    : "bg-slate-500"
                                )}
                              />
                            </div>

                            {/* Name & Role (Clicking drills into Bento) */}
                            <div
                              onClick={() => onSelectSubordinate(hodToRosterMember(hod))}
                              className="min-w-0 cursor-pointer group/title"
                              title="Drill into Bento Grid"
                            >
                              <div className="text-xs font-bold text-white truncate flex items-center gap-1.5 group-hover/title:text-[#F0944D] transition-colors">
                                <span className="truncate">{hod.name}</span>
                                <span className="text-[8px] px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 font-extrabold uppercase border border-purple-500/30 shrink-0">
                                  HOD
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {hod.designation} • {hod.branch}
                              </div>
                            </div>
                          </div>

                          {/* Right Controls: Team Button + Revenue + Expand Chevron */}
                          <div className="flex items-center gap-2 text-right shrink-0">
                            {/* Team Roll-Up Trigger */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTeam(hodToTeamRollUp(hod));
                              }}
                              title="View Team Roll-Up Telemetry"
                              className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-[#E86C2C] text-[10px] font-bold text-slate-200 hover:text-white border border-white/15 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                            >
                              <Users className="w-3 h-3 text-[#F0944D] group-hover:text-white" />
                              <span>Team ({hod.teamLeaders.length})</span>
                            </button>

                            {/* Revenue & Attainment */}
                            <div className="min-w-[58px]">
                              <div className="text-xs font-black text-white">
                                {formatCompactINR(hod.teamBookedRevenue)}
                              </div>
                              <div className="text-[9px] font-medium text-slate-400">
                                {hod.teamAttainmentRate}% Target
                              </div>
                            </div>

                            {/* Expand / Collapse Chevron */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleNode(hod.id);
                              }}
                              title={isHODExpanded ? "Collapse Team Leads" : "Expand Team Leads"}
                              className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/15 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                            >
                              <ChevronDown
                                className={cn(
                                  "w-3.5 h-3.5 transition-transform duration-200",
                                  isHODExpanded && "rotate-180 text-white"
                                )}
                              />
                            </button>
                          </div>
                        </div>

                        {/* When HOD is expanded: render reporting Team Leads */}
                        {isHODExpanded && (
                          <div className="pl-6 ml-3.5 border-l border-white/15 space-y-1.5 pt-1.5 pb-1">
                            {hod.teamLeaders.length === 0 ? (
                              <div className="text-[11px] text-slate-500 italic py-1 pl-2">
                                No direct reporting Team Leads under this HOD.
                              </div>
                            ) : (
                              hod.teamLeaders.map((tl) => {
                                const isTLExpanded = expandedNodes.has(tl.id);

                                return (
                                  <div key={tl.id} className="space-y-1.5">
                                    {/* TL Row */}
                                    <div className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/5 flex items-center justify-between gap-2 transition-all group/tl">
                                      <div className="flex items-center gap-2 min-w-0">
                                        {/* TL Self Button */}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedIndividual(tlToIndividualTelemetry(tl));
                                          }}
                                          title="View TL Individual Telemetry"
                                          className="w-6 h-6 rounded-full bg-white text-slate-900 shadow-sm flex items-center justify-center hover:bg-[#E86C2C] hover:text-white transition-all shrink-0 cursor-pointer"
                                        >
                                          <Eye className="w-3 h-3" />
                                        </button>

                                        {/* Circular Avatar */}
                                        <div
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedIndividual(tlToIndividualTelemetry(tl));
                                          }}
                                          className="relative cursor-pointer shrink-0"
                                          title="View TL Individual Telemetry"
                                        >
                                          <div className="w-7 h-7 rounded-full bg-slate-800 text-white font-bold text-[10px] flex items-center justify-center ring-1 ring-white/15">
                                            {tl.name.charAt(0)}
                                          </div>
                                          <span
                                            className={cn(
                                              "absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#18181B]",
                                              tl.attendanceStatus === "ACTIVE"
                                                ? "bg-emerald-400"
                                                : tl.attendanceStatus === "IDLE"
                                                ? "bg-amber-400"
                                                : "bg-slate-500"
                                            )}
                                          />
                                        </div>

                                        {/* TL Name & Title */}
                                        <div
                                          onClick={() => onSelectSubordinate(tlToRosterMember(tl))}
                                          className="min-w-0 cursor-pointer group/title"
                                          title="Drill into Bento Grid"
                                        >
                                          <div className="text-xs font-bold text-white truncate flex items-center gap-1.5 group-hover/title:text-[#F0944D] transition-colors">
                                            <span className="truncate">{tl.name}</span>
                                            <span className="text-[7px] px-1 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-black uppercase border border-amber-500/30 shrink-0">
                                              TL
                                            </span>
                                          </div>
                                          <div className="text-[10px] text-slate-400 truncate">
                                            {tl.designation}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2 text-right shrink-0">
                                        {/* TL Team Info Button */}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedTeam(tlToTeamRollUp(tl));
                                          }}
                                          title="View Team Members Roll-Up"
                                          className="px-2 py-0.5 rounded-full bg-white/10 hover:bg-[#E86C2C] text-[9px] font-bold text-slate-300 hover:text-white border border-white/10 flex items-center gap-1 transition-all cursor-pointer"
                                        >
                                          <Users className="w-2.5 h-2.5 text-[#F0944D]" />
                                          <span>Team ({tl.teamMembers.length})</span>
                                        </button>

                                        <div className="min-w-[50px]">
                                          <div className="text-[11px] font-black text-white">
                                            {formatCompactINR(tl.teamBookedRevenue)}
                                          </div>
                                          <div className="text-[8px] font-medium text-slate-400">
                                            {tl.teamAttainmentRate}% Target
                                          </div>
                                        </div>

                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleNode(tl.id);
                                          }}
                                          title={isTLExpanded ? "Collapse Team Members" : "Expand Team Members"}
                                          className="w-5 h-5 rounded-md bg-white/5 hover:bg-white/15 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                                        >
                                          <ChevronDown
                                            className={cn(
                                              "w-3 h-3 transition-transform duration-200",
                                              isTLExpanded && "rotate-180 text-white"
                                            )}
                                          />
                                        </button>
                                      </div>
                                    </div>

                                    {/* When TL is expanded: render reporting Team Members */}
                                    {isTLExpanded && (
                                      <div className="pl-5 ml-3 border-l border-white/15 space-y-1 py-1">
                                        {tl.teamMembers.length === 0 ? (
                                          <div className="text-[10px] text-slate-500 italic py-0.5 pl-2">
                                            No direct reporting Team Members.
                                          </div>
                                        ) : (
                                          tl.teamMembers.map((tm) => (
                                            <div
                                              key={tm.id}
                                              onClick={() => setSelectedIndividual(tmToIndividualTelemetry(tm))}
                                              className="p-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 flex items-center justify-between gap-2 transition-all cursor-pointer group/tm"
                                              title="Click to view Individual Telemetry"
                                            >
                                              <div className="flex items-center gap-2 min-w-0">
                                                <div className="w-5 h-5 rounded-full bg-white text-slate-900 shadow-sm flex items-center justify-center group-hover/tm:bg-[#E86C2C] group-hover/tm:text-white transition-all shrink-0">
                                                  <User className="w-2.5 h-2.5" />
                                                </div>

                                                <div className="relative shrink-0">
                                                  <div className="w-6 h-6 rounded-full bg-slate-800 text-white font-bold text-[9px] flex items-center justify-center ring-1 ring-white/15">
                                                    {tm.name.charAt(0)}
                                                  </div>
                                                  <span
                                                    className={cn(
                                                      "absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-[#18181B]",
                                                      tm.attendanceStatus === "ACTIVE"
                                                        ? "bg-emerald-400"
                                                        : tm.attendanceStatus === "IDLE"
                                                        ? "bg-amber-400"
                                                        : "bg-slate-500"
                                                    )}
                                                  />
                                                </div>

                                                <div className="min-w-0">
                                                  <div className="text-[11px] font-bold text-white truncate flex items-center gap-1 group-hover/tm:text-[#F0944D] transition-colors">
                                                    <span className="truncate">{tm.name}</span>
                                                    <span className="text-[7px] px-1 py-0.1 rounded-full bg-blue-500/20 text-blue-300 font-black uppercase border border-blue-500/30 shrink-0">
                                                      TM
                                                    </span>
                                                  </div>
                                                  <div className="text-[9px] text-slate-400 truncate">
                                                    {tm.designation}
                                                  </div>
                                                </div>
                                              </div>

                                              <div className="text-right shrink-0">
                                                <div className="text-[11px] font-black text-white">
                                                  {formatCompactINR(tm.bookedRevenue)}
                                                </div>
                                                <div className="text-[8px] font-bold text-emerald-400">
                                                  {tm.dealsClosedCount} Won • {tm.attainmentRate}%
                                                </div>
                                              </div>
                                            </div>
                                          ))
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()
              )}
            </div>
          </div>

          {/* Bottom Footnote on Dark Card */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400">
            <span>Select avatar for Self Telemetry • Click Team for roll-up</span>
            <span className="text-white font-mono flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live PostgreSQL Stream
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          TELEMETRY MODALS (Self Telemetry Modal + Team Roll-Up Modal)
         ========================================================================= */}
      <IndividualTelemetryModal
        isOpen={!!selectedIndividual}
        onClose={() => setSelectedIndividual(null)}
        person={selectedIndividual}
      />

      <TeamRollUpModal
        isOpen={!!selectedTeam}
        onClose={() => setSelectedTeam(null)}
        team={selectedTeam}
        onSelectMember={(memberId) => {
          // Find member across branches and open their individual telemetry
          for (const branch of data.branches) {
            for (const hod of branch.hods) {
              if (hod.id === memberId) {
                setSelectedTeam(null);
                setSelectedIndividual(hodToIndividualTelemetry(hod));
                return;
              }
              for (const tl of hod.teamLeaders) {
                if (tl.id === memberId) {
                  setSelectedTeam(null);
                  setSelectedIndividual(tlToIndividualTelemetry(tl));
                  return;
                }
                for (const tm of tl.teamMembers) {
                  if (tm.id === memberId) {
                    setSelectedTeam(null);
                    setSelectedIndividual(tmToIndividualTelemetry(tm));
                    return;
                  }
                }
              }
            }
          }
        }}
      />
    </div>
  );
}
