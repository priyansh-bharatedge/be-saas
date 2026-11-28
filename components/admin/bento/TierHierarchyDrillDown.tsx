"use client";

import { useState, useMemo } from "react";
import {
  Building2,
  ChevronRight,
  Search,
  Users,
  Briefcase,
  CheckCircle2,
  Clock,
  Sparkles,
  TrendingUp,
  MapPin,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SuperAdminBentoData,
  BentoBranchData,
  BentoHODData,
  BentoTLData,
  BentoTMData,
} from "@/lib/actions/super-admin-bento";
import { formatCompactINR } from "./bento-utils";
import { ArchitecturalCityBranchCard } from "./ArchitecturalCityBranchCard";

export type BentoHierarchySelection =
  | { tier: "all" }
  | { tier: "branch"; branchId: string }
  | { tier: "hod"; branchId: string; hodId: string }
  | { tier: "tl"; branchId: string; hodId: string; tlId: string }
  | { tier: "tm"; branchId: string; hodId: string; tlId: string; tmId: string };

interface TierHierarchyDrillDownProps {
  data: SuperAdminBentoData;
  selection: BentoHierarchySelection;
  onSelect: (selection: BentoHierarchySelection) => void;
}

export function TierHierarchyDrillDown({
  data,
  selection,
  onSelect,
}: TierHierarchyDrillDownProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Active Branch
  const activeBranch = useMemo(() => {
    if (selection.tier === "all") return null;
    return data.branches.find((b) => b.id === selection.branchId) || null;
  }, [selection, data.branches]);

  // Active HOD
  const activeHOD = useMemo(() => {
    if (selection.tier === "all" || selection.tier === "branch") return null;
    if (!activeBranch) return null;
    return activeBranch.hods.find((h) => h.id === selection.hodId) || null;
  }, [selection, activeBranch]);

  // Active TL
  const activeTL = useMemo(() => {
    if (selection.tier !== "tl" && selection.tier !== "tm") return null;
    if (!activeHOD) return null;
    return activeHOD.teamLeaders.find((t) => t.id === selection.tlId) || null;
  }, [selection, activeHOD]);

  // Active TM
  const activeTM = useMemo(() => {
    if (selection.tier !== "tm") return null;
    if (!activeTL) return null;
    return activeTL.teamMembers.find((m) => m.id === selection.tmId) || null;
  }, [selection, activeTL]);

  // Filtered search list
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return data.allEmployeesLookup
      .filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.designation.toLowerCase().includes(q) ||
          e.branch.toLowerCase().includes(q) ||
          e.systemRole.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [searchQuery, data.allEmployeesLookup]);

  const handleSelectSearchResult = (item: (typeof data.allEmployeesLookup)[0]) => {
    if (item.tier === "HOD") {
      onSelect({
        tier: "hod",
        branchId: item.branchId,
        hodId: item.id,
      });
    } else if (item.tier === "TL") {
      onSelect({
        tier: "tl",
        branchId: item.branchId,
        hodId: item.hodId || "hod-default",
        tlId: item.id,
      });
    } else if (item.tier === "TM") {
      onSelect({
        tier: "tm",
        branchId: item.branchId,
        hodId: item.hodId || "hod-default",
        tlId: item.tlId || "tl-default",
        tmId: item.id,
      });
    }
    setSearchQuery("");
    setIsSearchFocused(false);
  };

  return (
    <div className="space-y-4">
      {/* Top Header: Breadcrumbs & Quick Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white/60 backdrop-blur-xl border border-white/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_8px_28px_rgba(15,23,42,0.05)] rounded-2xl p-3">
        {/* Breadcrumb Bar */}
        <div className="flex items-center flex-wrap gap-1.5 text-xs">
          <button
            onClick={() => onSelect({ tier: "all" })}
            className={cn(
              "px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5",
              selection.tier === "all"
                ? "bg-[#18181B] text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <Building2 className="w-3.5 h-3.5 text-[#E86C2C]" />
            <span>All Branches</span>
          </button>

          {activeBranch && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <button
                onClick={() =>
                  onSelect({
                    tier: "branch",
                    branchId: activeBranch.id,
                  })
                }
                className={cn(
                  "px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5",
                  selection.tier === "branch"
                    ? "bg-[#18181B] text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <MapPin className="w-3.5 h-3.5 text-[#E86C2C]" />
                <span>{activeBranch.name} Hub</span>
              </button>
            </>
          )}

          {activeHOD && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <button
                onClick={() =>
                  onSelect({
                    tier: "hod",
                    branchId: activeBranch!.id,
                    hodId: activeHOD.id,
                  })
                }
                className={cn(
                  "px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5",
                  selection.tier === "hod"
                    ? "bg-[#18181B] text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-slate-400 font-medium">HOD:</span>
                <span>{activeHOD.name}</span>
              </button>
            </>
          )}

          {activeTL && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <button
                onClick={() =>
                  onSelect({
                    tier: "tl",
                    branchId: activeBranch!.id,
                    hodId: activeHOD!.id,
                    tlId: activeTL.id,
                  })
                }
                className={cn(
                  "px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5",
                  selection.tier === "tl"
                    ? "bg-[#18181B] text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span className="text-slate-400 font-medium">TL:</span>
                <span>{activeTL.name}</span>
              </button>
            </>
          )}

          {activeTM && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <div className="px-3 py-1.5 rounded-xl font-bold bg-[#E86C2C] text-white shadow-xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                <span className="opacity-80 font-medium">TM:</span>
                <span>{activeTM.name}</span>
              </div>
            </>
          )}
        </div>

        {/* Right side: Live Telemetry Status & Quick Search */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <span className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-emerald-50/80 text-emerald-800 border border-white/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_4px_12px_rgba(0,0,0,0.03)] backdrop-blur-xl shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live PostgreSQL Telemetry
          </span>

          <div className="relative w-full md:w-72">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                placeholder="Search employee by name or role..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white/60 backdrop-blur-md border border-slate-200/80 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#E86C2C]/30 focus:border-[#E86C2C] placeholder:text-slate-400 font-medium transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Search Dropdown */}
            {isSearchFocused && searchResults.length > 0 && (
              <div className="absolute right-0 mt-1.5 w-80 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-xl p-2 z-50 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                  Hierarchy Matches ({searchResults.length})
                </div>
                {searchResults.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelectSearchResult(item)}
                    className="w-full p-2 rounded-xl text-left hover:bg-slate-50 flex items-center justify-between group transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-700 shrink-0">
                        {item.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {item.designation} • {item.branch}
                        </div>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md shrink-0",
                        item.tier === "HOD" && "bg-purple-100 text-purple-700",
                        item.tier === "TL" && "bg-amber-100 text-amber-700",
                        item.tier === "TM" && "bg-blue-100 text-blue-700"
                      )}
                    >
                      {item.tier}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Level 1 — Branches (Always Visible: Jaipur, Ahmedabad, Chennai) */}
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Level 1 — Operational Branches
            </span>
            <span className="text-[10px] bg-slate-100/90 text-slate-600 px-1.5 py-0.5 rounded-full font-bold">
              Always Active
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            Click branch to filter hierarchy tree below
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.branches.map((b) => {
            const isSelected =
              selection.tier !== "all" && selection.branchId === b.id;

            return (
              <ArchitecturalCityBranchCard
                key={b.id}
                branch={b}
                isSelected={isSelected}
                onSelect={() =>
                  onSelect({
                    tier: "branch",
                    branchId: b.id,
                  })
                }
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
