"use client";

import {
  Target,
  TrendingUp,
  DollarSign,
  Briefcase,
  FileText,
  CreditCard,
  Clock,
  AlertTriangle,
  Users,
  Award,
  Sparkles,
  ArrowUpRight,
  Layers,
  ChevronRight,
  PieChart,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  SalesKpiMetrics,
  TlTeamPerformance,
  BdmPerformanceSummary,
} from "@/lib/validations/dashboard";

interface SalesDashboardViewProps {
  isSalesHod: boolean;
  isSalesTl: boolean;
  isSalesTm: boolean;
  isSuperAdmin: boolean;
  selectedMonth: number;
  selectedYear: number;
  personalMetrics?: SalesKpiMetrics;
  teamPerformance?: TlTeamPerformance;
  orgPerformance?: {
    summary: SalesKpiMetrics;
    teams: TlTeamPerformance[];
    allBdms: BdmPerformanceSummary[];
  };
  onOpenTargetModal?: () => void;
}

export default function SalesDashboardView({
  isSalesHod,
  isSalesTl,
  isSalesTm,
  isSuperAdmin,
  selectedMonth,
  selectedYear,
  personalMetrics,
  teamPerformance,
  orgPerformance,
  onOpenTargetModal,
}: SalesDashboardViewProps) {
  // Determine active primary metrics based on hierarchy role
  const metrics: SalesKpiMetrics =
    (isSalesHod || isSuperAdmin) && orgPerformance
      ? orgPerformance.summary
      : isSalesTl && teamPerformance
      ? teamPerformance.teamTotals
      : personalMetrics || {
          totalQuotations: 0,
          totalPaymentRecords: 0,
          totalRevenue: 0,
          verifiedRevenue: 0,
          unverifiedRevenue: 0,
          crmPendingCount: 0,
          bookedDealAmount: 0,
          totalGst: 0,
          totalWithoutGst: 0,
          receivedGst: 0,
          receivedWithoutGst: 0,
          totalOutsourceCost: 0,
          targetAmount: 0,
          targetDealsCount: 0,
          achievedAmount: 0,
          achievedDealsCount: 0,
          shortfallAmount: 0,
          achievementRate: 0,
        };

  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  const monthName = monthNames[selectedMonth - 1] || "Month";

  return (
    <div className="space-y-6">
      {/* 1. TARGET ATTAINMENT & KEY PERFORMANCE BANNER */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-amber-500/10 via-[#ACCAD5]/20 to-sky-500/10 border border-slate-200/80 backdrop-blur-md shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="bg-[#F0944D]/15 text-[#c66518] border-[#F0944D]/30 text-[10px] font-extrabold uppercase tracking-wider"
              >
                {isSalesHod || isSuperAdmin
                  ? "Organization Sales Attainment"
                  : isSalesTl
                  ? "Team Attainment"
                  : "Personal Target Attainment"}
              </Badge>
              <span className="text-xs font-semibold text-slate-500">
                Period: {monthName} {selectedYear}
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              ₹{metrics.achievedAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}{" "}
              <span className="text-sm font-semibold text-slate-500">
                achieved of ₹{metrics.targetAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })} target
              </span>
            </h3>

            {/* Target Progress Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="w-full h-3 rounded-full bg-slate-200/80 overflow-hidden flex shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-[#ACCAD5] via-[#F0944D] to-emerald-500 transition-all duration-1000 rounded-full"
                  style={{ width: `${Math.min(100, metrics.achievementRate)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                  {metrics.achievementRate}% Target Realized
                </span>
                <span className="text-slate-500 font-medium">
                  {metrics.shortfallAmount > 0 ? (
                    <span className="text-rose-600 font-bold">
                      Shortfall: ₹{metrics.shortfallAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </span>
                  ) : (
                    <span className="text-emerald-600 font-bold">Target Surpassed!</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action / Target Setting Button */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-center gap-2.5 shrink-0">
            <div className="text-left lg:text-right">
              <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                Booked Deals Won
              </span>
              <p className="text-lg font-bold text-slate-800">
                {metrics.achievedDealsCount} {metrics.achievedDealsCount === 1 ? "Deal" : "Deals"} Won
              </p>
            </div>

            {(isSalesHod || isSuperAdmin) && onOpenTargetModal && (
              <Button
                onClick={onOpenTargetModal}
                className="h-9 text-xs font-semibold bg-[#F0944D] hover:bg-[#d87c35] text-white shadow-xs gap-1.5"
              >
                <Target className="h-4 w-4" />
                Assign BDM Monthly Targets
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 2. REVENUE, GST & CASHFLOW METRICS (50%-50% Split Factored In) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <DollarSign className="h-4 w-4 text-[#F0944D]" />
            Commercial Deal Revenue (50%–50% Split Factored)
          </h4>
          <span className="text-[11px] font-medium text-slate-400">
            *Partner BDM deals split 50% revenue & taxes strictly
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {/* Booked Deal Amount */}
          <Card className="bg-white/70 backdrop-blur-md border-slate-200/80 shadow-xs">
            <CardContent className="p-3.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Booked Deals Value
              </p>
              <h4 className="text-lg font-extrabold text-slate-900 mt-0.5">
                ₹{metrics.bookedDealAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Total pipeline value</p>
            </CardContent>
          </Card>

          {/* Total Without GST */}
          <Card className="bg-white/70 backdrop-blur-md border-slate-200/80 shadow-xs">
            <CardContent className="p-3.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Excl. GST Amount
              </p>
              <h4 className="text-lg font-extrabold text-slate-800 mt-0.5">
                ₹{metrics.totalWithoutGst.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Net commercial base</p>
            </CardContent>
          </Card>

          {/* Total GST */}
          <Card className="bg-white/70 backdrop-blur-md border-slate-200/80 shadow-xs">
            <CardContent className="p-3.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Total GST (18%)
              </p>
              <h4 className="text-lg font-extrabold text-[#F0944D] mt-0.5">
                ₹{metrics.totalGst.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Indian statutory tax</p>
            </CardContent>
          </Card>

          {/* Received Without GST */}
          <Card className="bg-white/70 backdrop-blur-md border-slate-200/80 shadow-xs">
            <CardContent className="p-3.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Received Excl. GST
              </p>
              <h4 className="text-lg font-extrabold text-emerald-700 mt-0.5">
                ₹{metrics.receivedWithoutGst.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </h4>
              <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Realized base cash</p>
            </CardContent>
          </Card>

          {/* Received GST */}
          <Card className="bg-white/70 backdrop-blur-md border-slate-200/80 shadow-xs">
            <CardContent className="p-3.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Received GST
              </p>
              <h4 className="text-lg font-extrabold text-emerald-700 mt-0.5">
                ₹{metrics.receivedGst.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </h4>
              <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Tax deposited</p>
            </CardContent>
          </Card>

          {/* Outsource Cost */}
          <Card className="bg-white/70 backdrop-blur-md border-slate-200/80 shadow-xs">
            <CardContent className="p-3.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Outsource Cost
              </p>
              <h4 className="text-lg font-extrabold text-purple-700 mt-0.5">
                ₹{metrics.totalOutsourceCost.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </h4>
              <p className="text-[10px] text-purple-600 font-medium mt-0.5">Third-party cost</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 3. PAYMENT RECEIPTS, QUOTATIONS & CRM PENDING STATUS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Payments Recorded */}
        <Card className="bg-white/70 backdrop-blur-md border-slate-200/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Payment Records
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {metrics.totalPaymentRecords}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                ₹{metrics.totalRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })} collected
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <CreditCard className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Verified vs Unverified Payments */}
        <Card className="bg-white/70 backdrop-blur-md border-slate-200/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Accounts Verified
              </p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">
                ₹{metrics.verifiedRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </h3>
              <p className="text-[11px] text-amber-600 font-medium mt-0.5">
                Unverified: ₹{metrics.unverifiedRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <Award className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* CRM Pending (First Payments not converted to Deal) */}
        <Card className="bg-white/70 backdrop-blur-md border-slate-200/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                CRM Pending First Pay
              </p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1">
                {metrics.crmPendingCount}
              </h3>
              <p className="text-[11px] text-amber-600 font-medium mt-0.5">
                Awaiting deal conversion
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Total Quotations Created */}
        <Card className="bg-white/70 backdrop-blur-md border-slate-200/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Proposals Dispatched
              </p>
              <h3 className="text-2xl font-bold text-sky-600 mt-1">
                {metrics.totalQuotations}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Formal client quotations</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600">
              <FileText className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. TEAM LEADER OR HOD BDM BREAKDOWN TABLE */}
      {(isSalesTl || isSalesHod || isSuperAdmin) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Users className="h-4 w-4 text-[#F0944D]" />
              {isSalesTl ? "Team Members Performance Breakdown" : "Organization BDM / CDM Leaderboard"}
            </h4>
            <span className="text-[11px] text-slate-400 font-medium">
              Showing active representatives
            </span>
          </div>

          <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Sales Representative</th>
                    <th className="py-3 px-4">Team Leader</th>
                    <th className="py-3 px-4">Target (₹)</th>
                    <th className="py-3 px-4">Achieved (₹)</th>
                    <th className="py-3 px-4">Deals Won</th>
                    <th className="py-3 px-4">Attainment %</th>
                    <th className="py-3 px-4">Shortfall (₹)</th>
                    <th className="py-3 px-4">Quotations</th>
                    <th className="py-3 px-4">CRM Pending</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(() => {
                    const list =
                      (isSalesHod || isSuperAdmin) && orgPerformance
                        ? orgPerformance.allBdms
                        : teamPerformance
                        ? teamPerformance.teamMembers
                        : [];

                    if (list.length === 0) {
                      return (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-slate-400">
                            No team member metrics available.
                          </td>
                        </tr>
                      );
                    }

                    return list.map((bdm) => {
                      const m = bdm.metrics;
                      return (
                        <tr key={bdm.bdmId} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900 block">{bdm.bdmName}</span>
                            <span className="text-[10px] text-slate-400">{bdm.bdmEmail}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-medium">
                            {bdm.tlName || "Direct / HOD"}
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                            ₹{m.targetAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                            ₹{m.achievedAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                          </td>
                          <td className="py-3 px-4 text-slate-700 font-medium">
                            {m.achievedDealsCount}
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant="outline"
                              className={
                                m.achievementRate >= 100
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold"
                                  : m.achievementRate >= 60
                                  ? "bg-amber-50 text-amber-800 border-amber-300 font-bold"
                                  : "bg-rose-50 text-rose-800 border-rose-300 font-bold"
                              }
                            >
                              {m.achievementRate}%
                            </Badge>
                          </td>
                          <td className="py-3 px-4 font-mono">
                            {m.shortfallAmount > 0 ? (
                              <span className="text-rose-600 font-semibold">
                                -₹{m.shortfallAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                              </span>
                            ) : (
                              <span className="text-emerald-600 font-semibold">Surpassed</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-medium">
                            {m.totalQuotations}
                          </td>
                          <td className="py-3 px-4">
                            {m.crmPendingCount > 0 ? (
                              <Badge
                                variant="outline"
                                className="bg-amber-50 text-amber-800 border-amber-300"
                              >
                                {m.crmPendingCount} Pending
                              </Badge>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
