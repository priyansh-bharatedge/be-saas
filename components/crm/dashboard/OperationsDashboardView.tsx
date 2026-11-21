"use client";

import {
  GitBranch,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Award,
  Users,
  Building2,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { OperationsDashboardMetrics } from "@/lib/validations/dashboard";

interface OperationsDashboardViewProps {
  metrics: OperationsDashboardMetrics;
}

export default function OperationsDashboardView({
  metrics,
}: OperationsDashboardViewProps) {
  const teams = [
    { key: "Team Incorporation", name: "Incorporation & Corporate Affairs", color: "sky" },
    { key: "Team Funding", name: "Investment & VC Funding", color: "amber" },
    { key: "Team Compliance", name: "Statutory ROC & Tax Compliance", color: "purple" },
    { key: "Team Digital Marketing", name: "Digital Strategy & Growth", color: "emerald" },
  ];

  return (
    <div className="space-y-6">
      {/* 1. OPERATIONS TOP-LEVEL METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Active Operations */}
        <Card className="bg-white/70 backdrop-blur-md border-slate-200/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Active Execution Files
              </p>
              <h3 className="text-2xl font-bold text-[#F0944D] mt-1">
                {metrics.activeFilesCount}
              </h3>
              <p className="text-[11px] text-[#F0944D] font-medium mt-0.5">
                Stage: Operations TM / TL
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-[#F0944D]/20 flex items-center justify-center text-[#F0944D]">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Completed Operations */}
        <Card className="bg-white/70 backdrop-blur-md border-slate-200/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Completed Deliverables
              </p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">
                {metrics.completedFilesCount}
              </h3>
              <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
                Passed Quality audit
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Unassigned Queue */}
        <Card className="bg-white/70 backdrop-blur-md border-slate-200/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Unassigned Tasks
              </p>
              <h3 className="text-2xl font-bold text-rose-600 mt-1">
                {metrics.unassignedQueueCount}
              </h3>
              <p className="text-[11px] text-rose-600 font-medium mt-0.5">
                Pending TL / TM assignment
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Total Decomposed Operations */}
        <Card className="bg-white/70 backdrop-blur-md border-slate-200/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Total Child Operations
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {metrics.activeFilesCount + metrics.completedFilesCount}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Auto-spawned from deals</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <GitBranch className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. TEAM-TYPE-WISE WORKLOAD BREAKDOWN */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <Users className="h-4 w-4 text-[#F0944D]" />
          Departmental Workload Distribution by Vertical
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {teams.map((t) => {
            const data = metrics.workloadByTeam[t.key] || {
              total: 0,
              active: 0,
              quality: 0,
              completed: 0,
            };

            return (
              <div
                key={t.key}
                className="p-4 rounded-2xl bg-white/80 border border-slate-200/80 shadow-xs space-y-3"
              >
                <div>
                  <Badge variant="outline" className="text-[10px] font-bold mb-1">
                    {t.key}
                  </Badge>
                  <h4 className="text-xs font-bold text-slate-800">{t.name}</h4>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Active</span>
                    <span className="font-extrabold text-[#F0944D] text-sm">
                      {data.active}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Quality</span>
                    <span className="font-extrabold text-purple-700 text-sm">
                      {data.quality}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Completed</span>
                    <span className="font-extrabold text-emerald-600 text-sm">
                      {data.completed}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. RECENT OPERATIONS FILES */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <GitBranch className="h-4 w-4 text-[#ACCAD5]" />
            Recent Service Fulfillment Files
          </h4>
          <Link href="/crm/operations">
            <Button variant="ghost" size="sm" className="h-7 text-xs text-slate-600 hover:text-slate-900 gap-1">
              Go to Operations Hub
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>

        <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Operation #</th>
                  <th className="py-3 px-4">Parent Deal</th>
                  <th className="py-3 px-4">Service & Team Type</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Internal Stage</th>
                  <th className="py-3 px-4">Assigned TL & TM</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics.recentOperations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No operational files in progress.
                    </td>
                  </tr>
                ) : (
                  metrics.recentOperations.map((op) => (
                    <tr key={op.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {op.operationNumber}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {op.dealNumber}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 block truncate max-w-[180px]">
                          {op.serviceName}
                        </span>
                        <Badge
                          variant="outline"
                          className="bg-amber-50 text-amber-800 border-amber-300 text-[9px] font-bold mt-0.5"
                        >
                          {op.teamType}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className={
                            op.stage === "QUALITY"
                              ? "bg-purple-50 text-purple-800 border-purple-300 font-bold"
                              : "bg-sky-50 text-sky-800 border-sky-300 font-bold"
                          }
                        >
                          {op.stage}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-700 truncate max-w-[150px]">
                        {op.internalStage}
                      </td>
                      <td className="py-3 px-4">
                        <span className="block text-[11px] text-slate-700 font-medium">
                          TL: {op.assignedTlName || "Unassigned"}
                        </span>
                        <span className="block text-[11px] text-slate-700 font-medium">
                          TM: {op.assignedTmName || "Unassigned"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className={
                            op.status === "COMPLETED"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                              : op.status === "REJECTED"
                              ? "bg-rose-50 text-rose-800 border-rose-300"
                              : "bg-sky-50 text-sky-800 border-sky-300"
                          }
                        >
                          {op.status}
                        </Badge>
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
