"use client";

import {
  Award,
  CheckCircle2,
  Clock,
  RotateCcw,
  Sparkles,
  Building2,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { QualityDashboardMetrics } from "@/lib/validations/dashboard";

interface QualityDashboardViewProps {
  metrics: QualityDashboardMetrics;
}

export default function QualityDashboardView({
  metrics,
}: QualityDashboardViewProps) {
  return (
    <div className="space-y-6">
      {/* 1. QUALITY SUMMARY METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Quality Audit */}
        <Card className="bg-white/70 backdrop-blur-md border-slate-200/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Pending Quality Audit
              </p>
              <h3 className="text-2xl font-bold text-purple-700 mt-1">
                {metrics.pendingAuditCount}
              </h3>
              <p className="text-[11px] text-purple-600 font-medium mt-0.5">
                Ready for auditor review & score
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Average Compliance Score */}
        <Card className="bg-white/70 backdrop-blur-md border-slate-200/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Average Quality Score
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {metrics.averageScore > 0 ? `${metrics.averageScore}/100` : "N/A"}
              </h3>
              <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
                {metrics.highQualityCount} files scoring $\ge$ 80
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <Award className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Certified / Completed Audits */}
        <Card className="bg-white/70 backdrop-blur-md border-slate-200/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Certified & Completed
              </p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">
                {metrics.completedAuditCount}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Approved deliverable files</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Returned for Revision */}
        <Card className="bg-white/70 backdrop-blur-md border-slate-200/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Returned for Revision
              </p>
              <h3 className="text-2xl font-bold text-rose-600 mt-1">
                {metrics.returnedForRevisionCount}
              </h3>
              <p className="text-[11px] text-rose-600 font-medium mt-0.5">
                Sent back to Operations TM
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
              <RotateCcw className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. RECENT DEALS REACHING QUALITY REVIEW */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Award className="h-4 w-4 text-purple-600" />
            Parent Deals In Quality Review Queue
          </h4>
          <Link href="/crm/operations?tab=COMPLETED">
            <Button variant="ghost" size="sm" className="h-7 text-xs text-purple-700 hover:text-purple-900 gap-1">
              Audit Operations Desk
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>

        <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Deal #</th>
                  <th className="py-3 px-4">Company Name</th>
                  <th className="py-3 px-4">Deal Value</th>
                  <th className="py-3 px-4">Quality Certification</th>
                  <th className="py-3 px-4">Auditor Remarks</th>
                  <th className="py-3 px-4">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics.recentQualityDeals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No parent deals awaiting quality certification.
                    </td>
                  </tr>
                ) : (
                  metrics.recentQualityDeals.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {d.dealNumber}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {d.companyName}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        ₹{d.totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-3 px-4">
                        {d.isQualityPassed ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold">
                            Certified Passed
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-purple-50 text-purple-800 border-purple-300 font-bold">
                            Under Quality Audit
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-[200px] truncate">
                        {d.qualityRemarks || "—"}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{d.updatedAt}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
