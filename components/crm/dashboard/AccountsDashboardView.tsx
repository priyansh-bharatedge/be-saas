"use client";

import {
  DollarSign,
  TrendingUp,
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Landmark,
  FileCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AccountsDashboardMetrics } from "@/lib/validations/dashboard";

interface AccountsDashboardViewProps {
  metrics: AccountsDashboardMetrics;
}

export default function AccountsDashboardView({
  metrics,
}: AccountsDashboardViewProps) {
  return (
    <div className="space-y-6">
      {/* 1. PRIMARY CASHFLOW METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white/70 backdrop-blur-md border-slate-200/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Total Deal Pipeline
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                ₹{metrics.totalRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Cumulative invoiced value</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-md border-slate-200/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Total Received Cash
              </p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">
                ₹{metrics.receivedAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </h3>
              <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
                {metrics.totalRevenue > 0
                  ? `${Math.round((metrics.receivedAmount / metrics.totalRevenue) * 100)}% realized`
                  : "0% realized"}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-md border-slate-200/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Pending Receivables
              </p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1">
                ₹{metrics.pendingAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </h3>
              <p className="text-[11px] text-amber-600 font-medium mt-0.5">Awaiting collection</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-md border-slate-200/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Unverified Queue
              </p>
              <h3 className="text-2xl font-bold text-rose-600 mt-1">
                {metrics.unverifiedPaymentsCount}
              </h3>
              <p className="text-[11px] text-rose-600 font-medium mt-0.5">
                ₹{metrics.unverifiedPaymentsAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })} unconfirmed
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. COMMERCIAL TAX & OUTSOURCE BREAKDOWN */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="bg-white/70 backdrop-blur-md border-slate-200/80 shadow-xs">
          <CardContent className="p-3.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Excl. GST (Without Tax)
            </p>
            <h4 className="text-lg font-bold text-slate-900 mt-0.5">
              ₹{metrics.withoutGst.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </h4>
            <p className="text-[10px] text-slate-400 mt-0.5">Base commercial revenue</p>
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-md border-slate-200/80 shadow-xs">
          <CardContent className="p-3.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Total 18% GST Billed
            </p>
            <h4 className="text-lg font-bold text-[#F0944D] mt-0.5">
              ₹{metrics.totalGst.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </h4>
            <p className="text-[10px] text-slate-400 mt-0.5">Statutory tax liability</p>
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-md border-slate-200/80 shadow-xs">
          <CardContent className="p-3.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Received Excl. GST
            </p>
            <h4 className="text-lg font-bold text-emerald-700 mt-0.5">
              ₹{metrics.receivedWithoutGst.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </h4>
            <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Net cash in hand</p>
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-md border-slate-200/80 shadow-xs">
          <CardContent className="p-3.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Received GST Tax
            </p>
            <h4 className="text-lg font-bold text-emerald-700 mt-0.5">
              ₹{metrics.receivedGst.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </h4>
            <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Collected tax buffer</p>
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-md border-slate-200/80 shadow-xs">
          <CardContent className="p-3.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Total Outsource Cost
            </p>
            <h4 className="text-lg font-bold text-purple-700 mt-0.5">
              ₹{metrics.totalOutsourceCost.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </h4>
            <p className="text-[10px] text-purple-600 font-medium mt-0.5">Vendor fulfillment cost</p>
          </CardContent>
        </Card>
      </div>

      {/* 3. BANK-TYPE-WISE BREAKDOWN (BSPL vs BSAPL) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* BSPL Entity Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-white/90 to-sky-50/50 border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-sky-100 border border-sky-200 flex items-center justify-center text-sky-800">
                <Landmark className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  BSPL Entity (Kotak Mahindra Bank)
                </h4>
                <p className="text-[11px] text-slate-500">BharatEdge Solutions Private Limited</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-sky-50 text-sky-800 border-sky-300">
              BSPL
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-200/80 text-xs">
            <div>
              <span className="text-slate-400 font-medium">Verified Inflow:</span>
              <p className="font-bold text-slate-900 text-sm mt-0.5">
                ₹{metrics.bsplReceived.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Pending Unverified:</span>
              <p className="font-bold text-amber-600 text-sm mt-0.5">
                ₹{metrics.bsplPending.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Distinct Deals:</span>
              <p className="font-bold text-slate-800 text-sm mt-0.5">
                {metrics.bsplDealsCount} Deals
              </p>
            </div>
          </div>
        </div>

        {/* BSAPL Entity Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-white/90 to-amber-50/50 border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-800">
                <Landmark className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  BSAPL Entity (ICICI Bank)
                </h4>
                <p className="text-[11px] text-slate-500">BharatEdge Advisory Private Limited</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300">
              BSAPL
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-200/80 text-xs">
            <div>
              <span className="text-slate-400 font-medium">Verified Inflow:</span>
              <p className="font-bold text-slate-900 text-sm mt-0.5">
                ₹{metrics.bsaplReceived.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Pending Unverified:</span>
              <p className="font-bold text-amber-600 text-sm mt-0.5">
                ₹{metrics.bsaplPending.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Distinct Deals:</span>
              <p className="font-bold text-slate-800 text-sm mt-0.5">
                {metrics.bsaplDealsCount} Deals
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. RECENT PAYMENT RECORDS QUEUE */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <CreditCard className="h-4 w-4 text-[#F0944D]" />
            Recent Incoming Payment Receipts
          </h4>
          <Link href="/crm/payments">
            <Button variant="ghost" size="sm" className="h-7 text-xs text-slate-600 hover:text-slate-900 gap-1">
              Go to Payment Desk
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>

        <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Receipt #</th>
                  <th className="py-3 px-4">Client Name</th>
                  <th className="py-3 px-4">Amount (₹)</th>
                  <th className="py-3 px-4">Bank Entity</th>
                  <th className="py-3 px-4">Payment Type</th>
                  <th className="py-3 px-4">Verification Status</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics.recentPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No payment records found.
                    </td>
                  </tr>
                ) : (
                  metrics.recentPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {p.receiptNumber}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {p.clientName}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        ₹{p.amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className={
                            p.bankType === "BSPL"
                              ? "bg-sky-50 text-sky-800 border-sky-300 font-semibold"
                              : "bg-amber-50 text-amber-800 border-amber-300 font-semibold"
                          }
                        >
                          {p.bankType}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {p.paymentType === "FIRST_PAYMENT" ? "First Payment" : "Installment"}
                      </td>
                      <td className="py-3 px-4">
                        {p.status === "VERIFIED" ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300">
                            Verified
                          </Badge>
                        ) : p.status === "REJECTED" ? (
                          <Badge variant="outline" className="bg-rose-50 text-rose-800 border-rose-300">
                            Rejected
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 font-bold">
                            Pending Verification
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{p.date}</td>
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
