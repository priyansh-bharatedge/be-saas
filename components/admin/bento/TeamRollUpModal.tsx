"use client";

import { useEffect } from "react";
import {
  X,
  Users,
  IndianRupee,
  TrendingUp,
  CheckCircle2,
  Briefcase,
  ShieldCheck,
  Building2,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatINR, formatCompactINR } from "./bento-utils";

export interface TeamSubordinateMember {
  id: string;
  name: string;
  designation: string;
  tier: "TL" | "TM";
  bookedRevenue: number;
  targetAmount?: number;
  attainmentRate?: number;
  attendanceStatus: string;
  isOnline: boolean;
  dealsClosedCount?: number;
}

export interface TeamRollUpData {
  leaderId: string;
  leaderName: string;
  leaderDesignation: string;
  leaderBranch: string;
  leaderTier: "HOD" | "TL";
  teamBookedRevenue: number;
  teamReceivedRevenue: number;
  teamPendingReceivables: number;
  teamTargetAmount: number;
  teamAttainmentRate: number;
  teamActiveStaffCount: number;
  teamTotalStaffCount: number;
  teamDealsClosedCount: number;
  teamTotalDealsCount: number;
  subordinates: TeamSubordinateMember[];
}

interface TeamRollUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: TeamRollUpData | null;
  onSelectMember?: (memberId: string) => void;
}

export function TeamRollUpModal({
  isOpen,
  onClose,
  team,
  onSelectMember,
}: TeamRollUpModalProps) {
  // WhatsApp-style Esc key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, onClose]);

  if (!isOpen || !team) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md">
        {/* Backdrop click dismiss */}
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative z-10 w-full max-w-2xl bg-white/90 backdrop-blur-2xl border border-white/95 rounded-3xl shadow-[0_20px_60px_rgba(15,23,42,0.15)] p-6 space-y-5 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-slate-200/70">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-14 h-14 rounded-2xl bg-[#18181B] text-white flex items-center justify-center text-xl font-black shadow-md ring-2 ring-white shrink-0">
                <Users className="w-6 h-6 text-[#E86C2C]" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-slate-900 truncate">
                    {team.leaderName}&apos;s Team Roll-Up
                  </h3>
                  <span
                    className={cn(
                      "text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0",
                      team.leaderTier === "HOD" ? "bg-purple-100 text-purple-700" : "bg-amber-100 text-amber-700"
                    )}
                  >
                    {team.leaderTier === "HOD" ? "Department Roster" : "Team Roster"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {team.leaderDesignation} • {team.leaderBranch} Hub
                </p>
                <div className="flex items-center gap-2 mt-1 text-[11px] font-medium text-slate-600">
                  <span className="flex items-center gap-1 text-emerald-600 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {team.teamActiveStaffCount} of {team.teamTotalStaffCount} Online
                  </span>
                  <span>• {team.subordinates.length} Direct Subordinates</span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 4-Stat Team Telemetry Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Stat 1: Combined Revenue */}
            <div className="p-3 rounded-2xl bg-white/70 border border-slate-200/80 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Team Revenue
              </span>
              <div className="text-lg font-black text-slate-900">
                {formatCompactINR(team.teamBookedRevenue)}
              </div>
              <div className="text-[10px] text-slate-500 truncate">
                {formatINR(team.teamBookedRevenue)}
              </div>
            </div>

            {/* Stat 2: Target Attainment */}
            <div className="p-3 rounded-2xl bg-white/70 border border-slate-200/80 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Attainment
              </span>
              <div className="text-lg font-black text-[#E86C2C]">
                {team.teamAttainmentRate}%
              </div>
              <div className="text-[10px] text-slate-500 truncate">
                of {formatCompactINR(team.teamTargetAmount)}
              </div>
            </div>

            {/* Stat 3: Verified Received */}
            <div className="p-3 rounded-2xl bg-white/70 border border-slate-200/80 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Received
              </span>
              <div className="text-lg font-black text-emerald-600">
                {formatCompactINR(team.teamReceivedRevenue)}
              </div>
              <div className="text-[10px] text-slate-500 truncate">
                Pending: {formatCompactINR(team.teamPendingReceivables)}
              </div>
            </div>

            {/* Stat 4: Deals Won */}
            <div className="p-3 rounded-2xl bg-white/70 border border-slate-200/80 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Deals Won
              </span>
              <div className="text-lg font-black text-slate-900">
                {team.teamDealsClosedCount}
                <span className="text-xs text-slate-400 font-semibold"> / {team.teamTotalDealsCount}</span>
              </div>
              <div className="text-[10px] text-slate-500 truncate">
                {team.teamTotalDealsCount > 0 ? Math.round((team.teamDealsClosedCount / team.teamTotalDealsCount) * 100) : 0}% Win Rate
              </div>
            </div>
          </div>

          {/* Subordinate Comparison Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
              <span>Subordinate Member Roster ({team.subordinates.length})</span>
              <span className="text-[11px] text-slate-400 font-normal">Click member to drill into Bento</span>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 scrollbar-none">
              {team.subordinates.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/70 rounded-2xl">
                  No subordinates assigned to this team.
                </div>
              ) : (
                team.subordinates.map((sub) => {
                  const isOnline = sub.attendanceStatus === "ACTIVE";
                  return (
                    <button
                      key={sub.id}
                      onClick={() => {
                        if (onSelectMember) {
                          onSelectMember(sub.id);
                          onClose();
                        }
                      }}
                      className="w-full p-2.5 rounded-2xl bg-white/80 hover:bg-slate-50 border border-slate-200/80 transition-all flex items-center justify-between text-left group shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-[#E86C2C] text-slate-700 group-hover:text-white flex items-center justify-center text-xs font-bold transition-colors">
                            {sub.name.charAt(0)}
                          </div>
                          <span
                            className={cn(
                              "absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white",
                              isOnline ? "bg-emerald-500" : "bg-slate-300"
                            )}
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {sub.name}
                            </span>
                            <span
                              className={cn(
                                "text-[8px] font-black uppercase px-1 py-0.2 rounded-md",
                                sub.tier === "TL" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                              )}
                            >
                              {sub.tier}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {sub.designation}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-right shrink-0">
                        <div>
                          <div className="text-xs font-black text-slate-900">
                            {formatCompactINR(sub.bookedRevenue)}
                          </div>
                          <div className="text-[9px] text-slate-400 font-medium">
                            {sub.attainmentRate !== undefined ? `${sub.attainmentRate}% Target` : `${sub.dealsClosedCount || 0} Won`}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer Action */}
          <div className="pt-2 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-[#18181B] text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
