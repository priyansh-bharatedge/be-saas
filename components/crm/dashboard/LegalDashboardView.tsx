"use client";

import {
  FileText,
  Clock,
  Send,
  Download,
  GitBranch,
  ShieldCheck,
  Building2,
  ArrowRight,
  User,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LegalDashboardMetrics } from "@/lib/validations/dashboard";

interface LegalDashboardViewProps {
  metrics: LegalDashboardMetrics;
}

export default function LegalDashboardView({
  metrics,
}: LegalDashboardViewProps) {
  return (
    <div className="space-y-6">
      {/* 1. LEGAL PIPELINE METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Legal Review */}
        <Card className="bg-white/70 backdrop-blur-md border-slate-200/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Pending Legal Review
              </p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1">
                {metrics.dealsPendingReviewCount}
              </h3>
              <p className="text-[11px] text-amber-600 font-medium mt-0.5">
                Awaiting contract / NDA drafting
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Legal Docs Sent */}
        <Card className="bg-white/70 backdrop-blur-md border-slate-200/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Agreements Dispatched
              </p>
              <h3 className="text-2xl font-bold text-sky-600 mt-1">
                {metrics.legalDocsSentCount}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Sent to client for signature
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600">
              <Send className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Legal Docs Received */}
        <Card className="bg-white/70 backdrop-blur-md border-slate-200/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Executed Documents In
              </p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">
                {metrics.legalDocsReceivedCount}
              </h3>
              <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
                Signed agreements received
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Forwarded to Operations */}
        <Card className="bg-white/70 backdrop-blur-md border-slate-200/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Forwarded to Operations
              </p>
              <h3 className="text-2xl font-bold text-[#F0944D] mt-1">
                {metrics.dealsForwardedToOperationsCount}
              </h3>
              <p className="text-[11px] text-[#F0944D] font-medium mt-0.5">
                Spawned operational workflows
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-[#F0944D]/20 flex items-center justify-center text-[#F0944D]">
              <GitBranch className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. RECENT LEGAL DEALS QUEUE */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-[#F0944D]" />
            Active Commercial Deals & Legal Status
          </h4>
          <Link href="/crm/deals?accountsStatus=SENT_TO_LEGAL">
            <Button variant="ghost" size="sm" className="h-7 text-xs text-slate-600 hover:text-slate-900 gap-1">
              View Legal Handover Queue
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
                  <th className="py-3 px-4">Company & Client</th>
                  <th className="py-3 px-4">Deal Value</th>
                  <th className="py-3 px-4">Accounts Stage</th>
                  <th className="py-3 px-4">Legal Status</th>
                  <th className="py-3 px-4">Booking Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics.recentLegalDeals.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No legal deals in queue.
                    </td>
                  </tr>
                ) : (
                  metrics.recentLegalDeals.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {d.dealNumber}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 block truncate max-w-[180px]">
                          {d.companyName}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate max-w-[180px] block">
                          {d.clientName}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        ₹{d.totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className={
                            d.accountsStatus === "SENT_TO_LEGAL"
                              ? "bg-sky-50 text-sky-800 border-sky-300 font-bold"
                              : d.accountsStatus === "SENT_TO_OPERATION"
                              ? "bg-amber-50 text-amber-800 border-amber-300"
                              : "bg-slate-100 text-slate-700"
                          }
                        >
                          {d.accountsStatus}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className={
                            d.internalLegalStatus === "EXECUTED"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold"
                              : d.internalLegalStatus === "UNDER_REVIEW"
                              ? "bg-amber-50 text-amber-800 border-amber-300 font-bold"
                              : "bg-slate-100 text-slate-700"
                          }
                        >
                          {d.internalLegalStatus}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{d.bookingDate}</td>
                      <td className="py-3 px-4 text-right">
                        <Link href={`/crm/deals?openDealId=${d.id}`}>
                          <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1">
                            Review Deal
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </Link>
                      </td>
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
