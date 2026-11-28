"use client";

import { useEffect } from "react";
import {
  X,
  Clock,
  IndianRupee,
  Briefcase,
  CheckCircle2,
  Calendar,
  ShieldCheck,
  TrendingUp,
  MapPin,
  User,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatINR, formatCompactINR } from "./bento-utils";

export interface IndividualTelemetryData {
  id: string;
  employeeId: string;
  name: string;
  email?: string;
  avatarUrl?: string | null;
  designation: string;
  department?: string;
  branch: string;
  systemRole?: string;
  tier: "HOD" | "TL" | "TM";
  bookedRevenue: number;
  dealsClosedCount: number;
  targetAmount: number;
  attainmentRate: number;
  attendanceStatus: string;
  isOnline: boolean;
  formattedActiveHours: string;
  monthlyAttendanceRate: number;
  details?: {
    employeeId: string;
    branch: string;
    employmentType: string;
    dateOfJoining: string;
    shift: string;
    casualLeaveRemaining: number;
    sickLeaveRemaining: number;
    monthlyTarget: number;
    commissionSplit: string;
  };
  activeDealsChecklist?: Array<{
    id: string;
    dealNumber: string;
    title: string;
    companyName: string;
    value: number;
    stage: string;
    isClosed: boolean;
  }>;
}

interface IndividualTelemetryModalProps {
  isOpen: boolean;
  onClose: () => void;
  person: IndividualTelemetryData | null;
}

export function IndividualTelemetryModal({
  isOpen,
  onClose,
  person,
}: IndividualTelemetryModalProps) {
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

  if (!isOpen || !person) return null;

  const isOnline = person.attendanceStatus === "ACTIVE";

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
          className="relative z-10 w-full max-w-lg bg-white/90 backdrop-blur-2xl border border-white/95 rounded-3xl shadow-[0_20px_60px_rgba(15,23,42,0.15)] p-6 space-y-5 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-slate-200/70">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="relative shrink-0">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-700 text-white flex items-center justify-center text-xl font-black shadow-md ring-2 ring-white">
                  {person.name.charAt(0)}
                </div>
                <span
                  className={cn(
                    "absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs",
                    isOnline ? "bg-emerald-500" : "bg-slate-400"
                  )}
                />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-slate-900 truncate">
                    {person.name}
                  </h3>
                  <span
                    className={cn(
                      "text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0",
                      person.tier === "HOD" && "bg-purple-100 text-purple-700",
                      person.tier === "TL" && "bg-amber-100 text-amber-700",
                      person.tier === "TM" && "bg-blue-100 text-blue-700"
                    )}
                  >
                    {person.tier}
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {person.designation} • {person.branch} Hub
                </p>
                <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-slate-400">
                  <span>ID: {person.employeeId}</span>
                  {person.email && <span>• {person.email}</span>}
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

          {/* 4-Stat Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Stat 1: Work Time Today */}
            <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200/80 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  Today's Hours
                </span>
                <Clock className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <div className="text-xl font-black text-slate-900">
                {person.formattedActiveHours || "00:00"}
              </div>
              <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>{person.attendanceStatus}</span>
              </div>
            </div>

            {/* Stat 2: Attendance Rate */}
            <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200/80 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  Monthly Rate
                </span>
                <Calendar className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="text-xl font-black text-slate-900">
                {person.monthlyAttendanceRate}%
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                Active monthly presence
              </div>
            </div>

            {/* Stat 3: Booked Revenue */}
            <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200/80 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  Booked Revenue
                </span>
                <IndianRupee className="w-3.5 h-3.5 text-[#E86C2C]" />
              </div>
              <div className="text-xl font-black text-slate-900">
                {formatCompactINR(person.bookedRevenue)}
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                {formatINR(person.bookedRevenue)}
              </div>
            </div>

            {/* Stat 4: Deals Closed & Attainment */}
            <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200/80 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  Deals Closed
                </span>
                <Briefcase className="w-3.5 h-3.5 text-purple-500" />
              </div>
              <div className="text-xl font-black text-slate-900">
                {person.dealsClosedCount} <span className="text-xs text-slate-400 font-semibold">Won</span>
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                {person.attainmentRate}% of monthly target
              </div>
            </div>
          </div>

          {/* Operational Details Strip */}
          {person.details && (
            <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Shift Schedule:</span>
                <span className="font-bold text-slate-800">{person.details.shift}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Leave Remaining:</span>
                <span className="font-semibold text-slate-700">
                  {person.details.casualLeaveRemaining} Casual • {person.details.sickLeaveRemaining} Sick days
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Monthly Target:</span>
                <span className="font-extrabold text-slate-900">
                  {formatINR(person.details.monthlyTarget)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Commission Split:</span>
                <span className="font-semibold text-emerald-700">
                  {person.details.commissionSplit}
                </span>
              </div>
            </div>
          )}

          {/* Active Deals Checklist (for TM) */}
          {person.activeDealsChecklist && person.activeDealsChecklist.length > 0 && (
            <div className="space-y-2 pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Active Pipelines ({person.activeDealsChecklist.length})
              </span>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 scrollbar-none">
                {person.activeDealsChecklist.map((deal) => (
                  <div
                    key={deal.id}
                    className="p-2 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2
                        className={cn(
                          "w-3.5 h-3.5 shrink-0",
                          deal.isClosed ? "text-emerald-500" : "text-slate-300"
                        )}
                      />
                      <span className="truncate font-semibold text-slate-800">{deal.title}</span>
                    </div>
                    <span className="font-extrabold text-slate-900 shrink-0 pl-2">
                      {formatCompactINR(deal.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Close Action */}
          <div className="pt-2 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-[#18181B] text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
