"use client";

import {
  ShieldCheck,
  MessageSquare,
  Users,
  Building2,
  Lock,
  Layers,
  Search,
  CheckCircle2,
  Database,
  ArrowRight,
  Eye,
  FileCheck2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuditStatsSummary } from "@/lib/actions/chat-audit";

interface AuditOversightDashboardProps {
  stats: AuditStatsSummary | null;
  isLoading: boolean;
  onFilterType: (type: "ALL" | "DMS" | "GROUPS") => void;
  onFilterDepartment: (dept: string) => void;
  onClearFilters: () => void;
  activeTypeFilter: "ALL" | "DMS" | "GROUPS";
  activeDeptFilter: string;
}

export function AuditOversightDashboard({
  stats,
  isLoading,
  onFilterType,
  onFilterDepartment,
  onClearFilters,
  activeTypeFilter,
  activeDeptFilter,
}: AuditOversightDashboardProps) {
  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-b from-[#FCFAF7]/95 via-[#F7FAFC]/90 to-[#EBF3F6]/70 p-6 sm:p-8 lg:p-10 overflow-y-auto min-h-0 relative select-none">
      {/* Soft Ambient Blurs */}
      <div className="pointer-events-none absolute w-96 h-96 rounded-full bg-[#ACCAD5]/20 blur-3xl -top-20 -right-20" />
      <div className="pointer-events-none absolute w-96 h-96 rounded-full bg-[#F0944D]/15 blur-3xl -bottom-20 -left-20" />

      <div className="relative z-10 max-w-4xl mx-auto w-full space-y-6">
        {/* Top Header Card */}
        <div className="p-6 rounded-3xl bg-white/80 backdrop-blur-xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#ACCAD5] via-[#588594] to-[#3D6472] text-white flex items-center justify-center shadow-md shadow-[#588594]/20 shrink-0">
              <ShieldCheck className="h-7 w-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                  Super Admin Organization Chat Oversight
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-300">
                  Read Only
                </span>
              </div>
              <p className="text-xs text-slate-500 max-w-lg leading-relaxed">
                Centralized audit trail across all direct messages and group conversations with zero employee visibility, read-receipt side effects, or roster modifications.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={onClearFilters}
              className="h-8 px-3 rounded-xl border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-semibold shadow-2xs"
            >
              Reset Filters
            </Button>
          </div>
        </div>

        {/* 4 Sleek Glassmorphic KPI Cards (Inspired by Image 2) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Conversations */}
          <div
            onClick={() => onFilterType("ALL")}
            className="p-4 rounded-2xl bg-white/80 backdrop-blur-md border border-slate-200/80 hover:border-[#ACCAD5] transition-all cursor-pointer shadow-xs group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Total Chats
              </span>
              <div className="w-7 h-7 rounded-lg bg-[#EBF3F6] text-[#3D6472] flex items-center justify-center group-hover:scale-110 transition-transform">
                <MessageSquare className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
              {isLoading ? "..." : stats?.totalConversations ?? 0}
            </div>
            <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5">
              <span>{stats?.dmConversations ?? 0} DMs</span>
              <span>•</span>
              <span>{stats?.groupConversations ?? 0} Groups</span>
            </div>
          </div>

          {/* 1-on-1 Direct Messages */}
          <div
            onClick={() => onFilterType("DMS")}
            className={`p-4 rounded-2xl bg-white/80 backdrop-blur-md border transition-all cursor-pointer shadow-xs group ${
              activeTypeFilter === "DMS"
                ? "border-[#588594] ring-2 ring-[#588594]/20 bg-[#EBF3F6]/50"
                : "border-slate-200/80 hover:border-[#ACCAD5]"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                1-on-1 DMs
              </span>
              <div className="w-7 h-7 rounded-lg bg-[#FDEFE6] text-[#C66318] flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
              {isLoading ? "..." : stats?.dmConversations ?? 0}
            </div>
            <div className="text-[10px] text-[#C66318] font-medium mt-1">
              Filter Direct Messages →
            </div>
          </div>

          {/* Group Channels */}
          <div
            onClick={() => onFilterType("GROUPS")}
            className={`p-4 rounded-2xl bg-white/80 backdrop-blur-md border transition-all cursor-pointer shadow-xs group ${
              activeTypeFilter === "GROUPS"
                ? "border-[#588594] ring-2 ring-[#588594]/20 bg-[#EBF3F6]/50"
                : "border-slate-200/80 hover:border-[#ACCAD5]"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Group Channels
              </span>
              <div className="w-7 h-7 rounded-lg bg-[#EBF3F6] text-[#588594] flex items-center justify-center group-hover:scale-110 transition-transform">
                <Layers className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
              {isLoading ? "..." : stats?.groupConversations ?? 0}
            </div>
            <div className="text-[10px] text-[#588594] font-medium mt-1">
              Filter Team Groups →
            </div>
          </div>

          {/* Total Messages Archived */}
          <div className="p-4 rounded-2xl bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Messages Logged
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Database className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
              {isLoading ? "..." : stats?.totalMessages ?? 0}
            </div>
            <div className="text-[10px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <FileCheck2 className="h-3 w-3" />
              <span>Full PostgreSQL retention</span>
            </div>
          </div>
        </div>

        {/* Department Cluster & Distribution (Inspired by concentric hierarchy in Image 1) */}
        {stats?.departmentBreakdown && stats.departmentBreakdown.length > 0 && (
          <div className="p-5 rounded-3xl bg-white/80 backdrop-blur-xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#588594]" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Filter by Department Cluster
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">
                Click a department to isolate threads
              </span>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => onFilterDepartment("ALL")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  activeDeptFilter === "ALL"
                    ? "bg-[#588594] text-white border-[#588594] shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:border-[#ACCAD5]"
                }`}
              >
                All Departments
              </button>

              {stats.departmentBreakdown.map((dept) => {
                const isSelected = activeDeptFilter.toLowerCase() === dept.department.toLowerCase();
                return (
                  <button
                    key={dept.department}
                    type="button"
                    onClick={() => onFilterDepartment(dept.department)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-[#588594] text-white border-[#588594] shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:border-[#ACCAD5] hover:bg-[#EBF3F6]/40"
                    }`}
                  >
                    <span>{dept.department}</span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-slate-100 text-slate-500 font-bold"
                      }`}
                    >
                      {dept.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Audit Compliance & Security Framework Guarantee */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-[#EBF3F6]/60 via-white/80 to-[#FCFAF7]/70 backdrop-blur-xl border border-[#ACCAD5]/50 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-[#588594]" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Super Admin Audit Compliance Guarantees
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-600">
            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/70 border border-slate-200/60">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800">100% Silent Inspection</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Opening any conversation does not alter employee read receipts, delivery ticks, or unread notification counters.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/70 border border-slate-200/60">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800">Zero Roster Footprint</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  The Super Admin is never added as a participant in audited rooms and never appears in group member lists.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/70 border border-slate-200/60">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800">Complete Historical Audit Trail</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  All messages, soft-deleted texts (<span className="text-rose-600 italic font-mono text-[10px]">Deleted by sender</span>), and Cloudflare R2 attachments remain visible for corporate compliance.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/70 border border-slate-200/60">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800">Enforced Write Protection</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  The message composer and emoji reactions are locked in oversight mode to eliminate accidental messages.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Prompt to select a chat from left pane */}
        <div className="text-center py-2 text-xs text-slate-500 font-medium flex items-center justify-center gap-1.5">
          <span>👈 Select any conversation from the left monitor list to begin review</span>
        </div>
      </div>
    </div>
  );
}
