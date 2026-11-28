"use client";

import { useState } from "react";
import {
  Calendar as CalendarIcon,
  RotateCw,
  SlidersHorizontal,
  ChevronDown,
  CalendarDays,
  Clock,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ExecutiveDateFilterBarProps {
  currentRange: string;
  startDate?: string;
  endDate?: string;
  label: string;
  isLoading: boolean;
  onFilterChange: (params: { range: string; from?: string; to?: string }) => void;
  onRefresh: () => void;
}

const PRESETS = [
  { id: "daily", label: "Daily (Today)", icon: Clock },
  { id: "weekly", label: "Weekly (7D)", icon: CalendarDays },
  { id: "monthly", label: "Monthly (30D)", icon: CalendarIcon },
  { id: "quarterly", label: "Quarterly (90D)", icon: CalendarDays },
  { id: "yearly", label: "Yearly (1Y)", icon: Sparkles },
];

export function ExecutiveDateFilterBar({
  currentRange,
  startDate,
  endDate,
  label,
  isLoading,
  onFilterChange,
  onRefresh,
}: ExecutiveDateFilterBarProps) {
  const [showCustomRange, setShowCustomRange] = useState(currentRange === "custom");
  const [customFrom, setCustomFrom] = useState(
    startDate ? new Date(startDate).toISOString().slice(0, 10) : ""
  );
  const [customTo, setCustomTo] = useState(
    endDate ? new Date(endDate).toISOString().slice(0, 10) : ""
  );

  const handlePresetClick = (presetId: string) => {
    setShowCustomRange(false);
    onFilterChange({ range: presetId });
  };

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (customFrom && customTo) {
      onFilterChange({
        range: "custom",
        from: customFrom,
        to: customTo,
      });
    }
  };

  return (
    <div className="sticky top-0 z-20 mb-6 bg-white/60 backdrop-blur-xl border border-white/90 rounded-2xl p-3 sm:p-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_8px_28px_rgba(15,23,42,0.05)] transition-all">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left: Active Period Label & Refresh Status */}
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#ACCAD5]/30 to-[#F0944D]/20 flex items-center justify-center border border-[#ACCAD5]/40 text-slate-800 shrink-0">
            <CalendarIcon className="h-4 w-4 text-slate-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Active Period
              </span>
              {isLoading && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#F0944D] animate-pulse">
                  <RotateCw className="h-3 w-3 animate-spin" /> Updating...
                </span>
              )}
            </div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              {label}
            </h2>
          </div>
        </div>

        {/* Right: Quick Presets & Custom Picker */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {PRESETS.map((preset) => {
            const isActive = currentRange === preset.id && !showCustomRange;
            const Icon = preset.icon;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePresetClick(preset.id)}
                disabled={isLoading}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 disabled:opacity-50",
                  isActive
                    ? "bg-[#18181B] text-white shadow-xs"
                    : "bg-white/50 backdrop-blur-md hover:bg-white/80 text-slate-700 border border-white/80 shadow-xs"
                )}
              >
                <Icon className={cn("h-3.5 w-3.5", isActive ? "text-[#F0944D]" : "text-slate-500")} />
                <span>{preset.label}</span>
              </button>
            );
          })}

          {/* Custom Date Range Toggle */}
          <button
            type="button"
            onClick={() => setShowCustomRange(!showCustomRange)}
            disabled={isLoading}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150",
              currentRange === "custom" || showCustomRange
                ? "bg-gradient-to-r from-[#ACCAD5] to-[#F0944D] text-slate-900 font-bold shadow-xs"
                : "bg-white/50 backdrop-blur-md hover:bg-white/80 text-slate-700 border border-white/80 shadow-xs"
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Custom</span>
            <ChevronDown
              className={cn(
                "h-3 w-3 transition-transform duration-200",
                showCustomRange ? "rotate-180" : ""
              )}
            />
          </button>

          {/* Quick Refresh Button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            title="Refresh Live Data"
            className="p-1.5 rounded-xl bg-white/50 backdrop-blur-md hover:bg-white/80 text-slate-600 hover:text-slate-900 border border-white/80 shadow-xs transition-all disabled:opacity-50"
          >
            <RotateCw className={cn("h-4 w-4", isLoading ? "animate-spin text-[#F0944D]" : "")} />
          </button>
        </div>
      </div>

      {/* Expandable Custom Range Drawer */}
      {showCustomRange && (
        <form
          onSubmit={handleApplyCustom}
          className="mt-3 pt-3 border-t border-slate-200/60 flex flex-wrap items-center gap-3 animate-in fade-in slide-in-from-top-1 duration-200"
        >
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-600">From:</span>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              required
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#F0944D]/50 focus:border-[#F0944D]"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-600">To:</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              required
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#F0944D]/50 focus:border-[#F0944D]"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !customFrom || !customTo}
            className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
          >
            Apply Range
          </button>
        </form>
      )}
    </div>
  );
}
