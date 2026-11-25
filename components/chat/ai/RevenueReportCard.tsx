"use client";

import { TrendingUp, DollarSign, Building, AlertTriangle, UserX, CheckCircle } from "lucide-react";

export interface ZeroRevenuePerson {
  id: string;
  name: string;
  teamLeader: string;
  attendanceStatus: string;
  activeHours: number;
}

export interface RevenueReportMetadata {
  date: string;
  title: string;
  totalRevenue: number;
  verifiedRevenue: number;
  unverifiedRevenue: number;
  bsplRevenue: number;
  bsaplRevenue: number;
  totalDealsClosed: number;
  zeroRevenueSalespeople: ZeroRevenuePerson[];
}

export function RevenueReportCard({ metadata }: { metadata: RevenueReportMetadata }) {
  if (!metadata) return null;

  return (
    <div className="w-full max-w-2xl rounded-2xl bg-white/95 border border-[#F0944D]/40 shadow-sm overflow-hidden text-xs my-2">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-orange-50 via-white to-[#ACCAD5]/20 border-b border-[#F0944D]/20 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-[#F0944D] to-[#ACCAD5] flex items-center justify-center text-white shadow-xs">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              {metadata.title || "Daily Revenue & BDM Performance Report"}
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-white border border-[#F0944D]/40 text-[#C66318]">
                {metadata.date}
              </span>
            </h4>
            <p className="text-[11px] text-slate-500">Live PostgreSQL Financial Audit & BDM Pulse</p>
          </div>
        </div>
      </div>

      {/* KPI Chips Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-50/70 border-b border-slate-200/60">
        <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-semibold text-slate-400 block uppercase">Total Inflow</span>
          <span className="text-base font-bold text-slate-900">
            ₹{metadata.totalRevenue.toLocaleString("en-IN")}
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200 shadow-2xs">
          <span className="text-[10px] font-semibold text-emerald-600 block uppercase">Verified (Accounts)</span>
          <span className="text-base font-bold text-emerald-700">
            ₹{metadata.verifiedRevenue.toLocaleString("en-IN")}
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 shadow-2xs">
          <span className="text-[10px] font-semibold text-amber-600 block uppercase">Pending Verification</span>
          <span className="text-base font-bold text-amber-700">
            ₹{metadata.unverifiedRevenue.toLocaleString("en-IN")}
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-sky-50/80 border border-sky-200 shadow-2xs">
          <span className="text-[10px] font-semibold text-sky-600 block uppercase">Bank Entities</span>
          <div className="text-[11px] font-bold text-slate-700 mt-0.5">
            <span>BSPL: ₹{metadata.bsplRevenue.toLocaleString("en-IN")}</span>
            <br />
            <span>BSAPL: ₹{metadata.bsaplRevenue.toLocaleString("en-IN")}</span>
          </div>
        </div>
      </div>

      {/* Zero Revenue BDM Tracking Table */}
      <div className="p-3.5">
        <div className="flex items-center justify-between mb-2">
          <h5 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
            <UserX className="h-3.5 w-3.5 text-rose-500" />
            Active Sales BDMs/CDMs at ₹0 Revenue Today ({metadata.zeroRevenueSalespeople?.length || 0})
          </h5>
          <span className="text-[10px] text-slate-400">Excludes employees on leave/absent</span>
        </div>

        {metadata.zeroRevenueSalespeople && metadata.zeroRevenueSalespeople.length > 0 ? (
          <div className="rounded-xl border border-rose-200/80 overflow-hidden bg-rose-50/20">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead className="bg-rose-100/60 text-rose-900 font-semibold uppercase text-[10px] tracking-wider border-b border-rose-200">
                <tr>
                  <th className="py-2 px-3">Salesperson Name</th>
                  <th className="py-2 px-3">Reporting TL</th>
                  <th className="py-2 px-3 text-center">Attendance Tracker</th>
                  <th className="py-2 px-3 text-right">Active Shift</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-100/70">
                {metadata.zeroRevenueSalespeople.map((person) => (
                  <tr key={person.id} className="hover:bg-rose-50/50">
                    <td className="py-2 px-3 font-semibold text-slate-800">{person.name}</td>
                    <td className="py-2 px-3 text-slate-600">{person.teamLeader || "Direct"}</td>
                    <td className="py-2 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {person.attendanceStatus || "CLOCKED IN"}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-600">
                      {person.activeHours?.toFixed(1) || "0.0"} hrs
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 text-emerald-800 text-[11px] flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Outstanding! All active sales staff have recorded non-zero client collections today.</span>
          </div>
        )}
      </div>
    </div>
  );
}
