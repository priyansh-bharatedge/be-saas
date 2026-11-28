"use client";

import { useMemo } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { BentoBranchData } from "@/lib/actions/super-admin-bento";
import { formatCompactINR } from "./bento-utils";

interface ArchitecturalCityBranchCardProps {
  branch: BentoBranchData;
  isSelected: boolean;
  onSelect: () => void;
}

export function ArchitecturalCityBranchCard({
  branch,
  isSelected,
  onSelect,
}: ArchitecturalCityBranchCardProps) {
  const cityKey = branch.id.toLowerCase();

  // City configuration: landmark photography & metadata
  const cityMeta = useMemo(() => {
    if (cityKey.includes("jaipur") || branch.code === "JAI") {
      return {
        name: "Jaipur",
        code: "JAI",
        landmark: "Hawa Mahal Facade",
        photoUrl: "/landmarks/jaipur-hawa-mahal.jpg",
        objectPosition: "object-[center_35%]",
      };
    }
    if (cityKey.includes("ahmedabad") || branch.code === "AMD") {
      return {
        name: "Ahmedabad",
        code: "AMD",
        landmark: "Sabarmati Riverfront & Atal Bridge",
        photoUrl: "/landmarks/ahmedabad-atal-bridge.jpg",
        objectPosition: "object-center",
      };
    }
    // Default Chennai
    return {
      name: "Chennai",
      code: "CHE",
      landmark: "Chennai Central Station",
      photoUrl: "/landmarks/chennai-central.jpg",
      objectPosition: "object-[center_40%]",
    };
  }, [cityKey, branch.code]);

  return (
    <div
      onClick={onSelect}
      className={cn(
        "group relative p-4 sm:p-5 rounded-2xl transition-all duration-300 cursor-pointer select-none overflow-hidden flex flex-col justify-between min-h-[175px]",
        "bg-white/60 backdrop-blur-xl border border-white/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_8px_28px_rgba(15,23,42,0.05)]",
        isSelected
          ? "border-[#E86C2C] ring-2 ring-[#E86C2C]/20 shadow-[0_12px_32px_-8px_rgba(232,108,44,0.18),inset_0_1px_1px_rgba(255,255,255,0.9)] scale-[1.01]"
          : "hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5"
      )}
    >
      {/* -------------------------------------------------------------------
          1. FULL-CARD LANDMARK PHOTOGRAPHY & CLEAN DIRECTIONAL GLASS GRADIENT
         ------------------------------------------------------------------- */}
      <div className="pointer-events-none absolute inset-0 w-full h-full overflow-hidden z-0 rounded-2xl">
        {/* Full-card architectural photograph covering 100% of card width */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cityMeta.photoUrl}
          alt={cityMeta.landmark}
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-out contrast-110 saturate-125",
            cityMeta.objectPosition,
            isSelected
              ? "opacity-90 scale-105"
              : "opacity-75 group-hover:opacity-90 group-hover:scale-105"
          )}
        />

        {/* Clean directional white gradient: keeps left text area crisp while right 65% shows through vividly */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/70 to-white/15" />
      </div>

      {/* -------------------------------------------------------------------
          2. TOP ROW: Minimal City Title + Tag & Live Online Pill
         ------------------------------------------------------------------- */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            {branch.name}
          </h3>
          <span className="text-[10px] font-bold text-slate-600 bg-white/90 border border-slate-200/60 px-1.5 py-0.5 rounded-md uppercase tracking-wider backdrop-blur-sm shadow-xs">
            {cityMeta.code}
          </span>
          {isSelected && (
            <span className="text-[9px] font-black uppercase text-[#E86C2C] bg-[#E86C2C]/10 border border-[#E86C2C]/20 px-1.5 py-0.5 rounded-md flex items-center gap-1 backdrop-blur-sm shadow-xs">
              <Check className="w-2.5 h-2.5" />
              <span>Active</span>
            </span>
          )}
        </div>

        {/* Live Online Badge (with subtle frosted pill backdrop-blur-md) */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/85 backdrop-blur-md border border-emerald-200/80 text-[10px] font-bold text-emerald-700 shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>{branch.activeStaffCount} online</span>
        </div>
      </div>

      {/* -------------------------------------------------------------------
          3. MIDDLE METRIC: Clean Tabular Booked Revenue & Staff Count
         ------------------------------------------------------------------- */}
      <div className="relative z-10 my-3">
        <div className="text-2xl font-black text-slate-900 tracking-tight drop-shadow-xs">
          {formatCompactINR(branch.bookedRevenue)}
        </div>
        <div className="text-xs text-slate-600 font-medium mt-0.5">
          {branch.hods.length} HOD • {branch.totalStaffCount} Staff
        </div>
      </div>

      {/* -------------------------------------------------------------------
          4. BOTTOM MICRO-BAR: Slim 4px Attendance Progress Bar
         ------------------------------------------------------------------- */}
      <div className="relative z-10 space-y-1 pt-1">
        <div className="flex items-center justify-between text-[11px] font-semibold">
          <span className="text-slate-600 font-medium">Attendance</span>
          <span className="text-slate-900 font-bold bg-white/85 backdrop-blur-md px-2 py-0.5 rounded-full border border-slate-200/60 shadow-xs">
            {branch.attendancePercent}%
          </span>
        </div>

        {/* Slim 4px Bar */}
        <div className="h-1 w-full bg-slate-200/80 rounded-full overflow-hidden">
          <div
            style={{ width: `${Math.min(100, Math.max(0, branch.attendancePercent))}%` }}
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
          />
        </div>
      </div>
    </div>
  );
}
