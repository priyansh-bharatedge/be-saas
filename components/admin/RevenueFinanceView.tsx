"use client";

import {
  IndianRupee,
  TrendingUp,
  CreditCard,
  Clock,
  Building,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Wallet,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { SuperAdminDashboardData } from "@/lib/actions/super-admin";

interface RevenueFinanceViewProps {
  financials: SuperAdminDashboardData["financials"];
}

// Format numbers in Indian Rupee format (e.g. ₹1,25,000)
export function formatINR(amount: number): string {
  return "₹" + amount.toLocaleString("en-IN");
}

export function RevenueFinanceView({ financials }: RevenueFinanceViewProps) {
  const collectionRate =
    financials.totalBookedRevenue > 0
      ? Math.min(
          100,
          Math.round((financials.totalReceivedRevenue / financials.totalBookedRevenue) * 100)
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* 1. TOP 6 FINANCIAL KPI COMMAND CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 sm:gap-4">
        {/* Card 1: Total Booked Revenue */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 shadow-sm border border-slate-700/60 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              Total Deal Pipeline
            </span>
            <div className="h-7 w-7 rounded-lg bg-white/10 flex items-center justify-center text-[#F0944D]">
              <IndianRupee className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black tracking-tight tabular-nums text-white">
              {formatINR(financials.totalBookedRevenue)}
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-300">
              <span>{financials.totalDealsCount} Deals Invoiced</span>
              <span className="font-semibold text-[#ACCAD5]">Cumulative</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Received Cash */}
        <div className="relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-md p-4 shadow-xs border border-emerald-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Total Received Cash
            </span>
            <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black tracking-tight tabular-nums text-emerald-700">
              {formatINR(financials.totalReceivedRevenue)}
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
              <span className="font-medium text-emerald-600">{collectionRate}% Realized</span>
              <span>{financials.verifiedPaymentsCount} Verified</span>
            </div>
          </div>
        </div>

        {/* Card 3: Pending Receivables */}
        <div className="relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-md p-4 shadow-xs border border-amber-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Pending Receivables
            </span>
            <div className="h-7 w-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black tracking-tight tabular-nums text-amber-700">
              {formatINR(financials.totalPendingReceivables)}
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
              <span>Awaiting Collection</span>
              <span className="font-semibold text-amber-600">Balance</span>
            </div>
          </div>
        </div>

        {/* Card 4: Booked Excl. GST & Total GST */}
        <div className="relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-md p-4 shadow-xs border border-slate-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Billed Net & GST
            </span>
            <div className="h-7 w-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Building className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-base sm:text-lg font-bold tracking-tight tabular-nums text-slate-900">
              {formatINR(financials.bookedWithoutGst)}
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
              <span>Excl. GST</span>
              <span className="font-semibold text-sky-700">
                +{formatINR(financials.bookedGstAmount)} GST
              </span>
            </div>
          </div>
        </div>

        {/* Card 5: Received Excl. GST & Received GST */}
        <div className="relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-md p-4 shadow-xs border border-slate-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Received Net & Tax
            </span>
            <div className="h-7 w-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-base sm:text-lg font-bold tracking-tight tabular-nums text-slate-900">
              {formatINR(financials.receivedWithoutGst)}
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
              <span>Net Cash</span>
              <span className="font-semibold text-teal-700">
                +{formatINR(financials.receivedGstAmount)} GST
              </span>
            </div>
          </div>
        </div>

        {/* Card 6: Total Outsource Cost */}
        <div className="relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-md p-4 shadow-xs border border-rose-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Outsource Cost
            </span>
            <div className="h-7 w-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black tracking-tight tabular-nums text-rose-600">
              {formatINR(financials.totalOutsourceCost)}
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
              <span>Vendor Fulfillment</span>
              <span className="font-semibold text-rose-600">Payables</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. REVENUE TREND TIMELINE & BANKING BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recharts Revenue Performance Timeline (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl bg-white/85 backdrop-blur-md border border-slate-200/80 p-5 shadow-xs flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#F0944D]" />
                Revenue Trajectory (Booked vs. Realized Cash)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Periodic booked deal volume contrasted against verified payment inflow
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <div className="flex items-center gap-1.5 text-slate-700">
                <span className="h-2.5 w-2.5 rounded-full bg-[#1e293b]" /> Booked Deals
              </div>
              <div className="flex items-center gap-1.5 text-emerald-700">
                <span className="h-2.5 w-2.5 rounded-full bg-[#10b981]" /> Realized Cash
              </div>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full">
            {financials.revenueTimeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={financials.revenueTimeline}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorBooked" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1e293b" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#1e293b" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="label"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "#e2e8f0" }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
                      fontSize: "12px",
                    }}
                    formatter={(val: any) => [formatINR(Number(val)), ""]}
                  />
                  <Area
                    type="monotone"
                    dataKey="booked"
                    name="Booked Revenue"
                    stroke="#1e293b"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorBooked)"
                  />
                  <Area
                    type="monotone"
                    dataKey="received"
                    name="Realized Cash"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorReceived)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No revenue records in the selected period.
              </div>
            )}
          </div>
        </div>

        {/* Right: Bank Entity Breakdown (BSPL vs BSAPL) (1 col) */}
        <div className="rounded-2xl bg-white/85 backdrop-blur-md border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-[#ACCAD5]" />
                Banking Entity Split
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Distribution between BSPL (Kotak) & BSAPL (ICICI) accounts
              </p>
            </div>

            {/* Split Progress Bar */}
            <div className="mb-5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
                <span>BSPL ({financials.bspl.percentage}%)</span>
                <span>BSAPL ({financials.bsapl.percentage}%)</span>
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex p-0.5 border border-slate-200/70">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-sky-600 rounded-l-full transition-all duration-500"
                  style={{ width: `${financials.bspl.percentage}%` }}
                />
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-[#F0944D] rounded-r-full transition-all duration-500"
                  style={{ width: `${financials.bsapl.percentage}%` }}
                />
              </div>
            </div>

            {/* Entity Cards */}
            <div className="space-y-3">
              {/* BSPL Entity */}
              <div className="p-3.5 rounded-xl bg-sky-50/60 border border-sky-200/70">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-sky-900">
                    BSPL (Kotak Mahindra Bank)
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-200/70 text-sky-800">
                    {financials.bspl.count} Receipts
                  </span>
                </div>
                <div className="text-lg font-black text-sky-950 tabular-nums">
                  {formatINR(financials.bspl.receivedAmount)}
                </div>
                <div className="text-[11px] text-sky-700 mt-0.5">
                  Unverified Queue: {formatINR(financials.bspl.pendingAmount)}
                </div>
              </div>

              {/* BSAPL Entity */}
              <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/70">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-amber-900">
                    BSAPL (ICICI Bank)
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200/70 text-amber-800">
                    {financials.bsapl.count} Receipts
                  </span>
                </div>
                <div className="text-lg font-black text-amber-950 tabular-nums">
                  {formatINR(financials.bsapl.receivedAmount)}
                </div>
                <div className="text-[11px] text-amber-700 mt-0.5">
                  Unverified Queue: {formatINR(financials.bsapl.pendingAmount)}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Verified Collections Only</span>
            <span className="font-semibold text-slate-700">
              Total {formatINR(financials.totalReceivedRevenue)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
