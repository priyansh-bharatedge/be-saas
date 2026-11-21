"use client";

import React, { useState } from "react";
import {
  createQualityAuditAction,
  getQualityAuditDashboardAction,
} from "@/lib/actions/support";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  FileCheck,
  ShieldAlert,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Search,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

interface AuditLogItem {
  id: string;
  ticketId: string;
  qualityScore: number;
  complianceStatus: string;
  feedbackComments: string;
  escalatedToHOD: boolean;
  createdAt: string;
  ticket: {
    ticketNumber: string;
    subject: string;
    status: string;
    priority: string;
    assignedEmployee: {
      firstName: string;
      lastName: string;
      department: string | null;
    } | null;
  };
  auditor: {
    firstName: string;
    lastName: string;
  };
}

interface DashboardData {
  totalTickets: number;
  auditedCount: number;
  unauditedCount: number;
  escalatedCount: number;
  averageScore: number;
  recentAudits: AuditLogItem[];
}

interface Props {
  initialData: DashboardData;
}

export default function QualityDeskView({ initialData }: Props) {
  const [data, setData] = useState<DashboardData>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    ticketId: "",
    qualityScore: 90,
    complianceStatus: "COMPLIANT",
    feedbackComments: "",
    escalatedToHOD: false,
  });

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const res = await getQualityAuditDashboardAction();
      if (res.success && res.data) {
        setData(res.data as any);
        toast.success("Quality audit metrics refreshed.");
      } else {
        toast.error(res.error || "Failed to refresh.");
      }
    } catch {
      toast.error("Error refreshing dashboard.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.ticketId || !formData.feedbackComments) {
      toast.error("Ticket ID and feedback comments are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createQualityAuditAction(formData);
      if (res.success) {
        toast.success("Quality audit report logged successfully!");
        setDialogOpen(false);
        setFormData({
          ticketId: "",
          qualityScore: 90,
          complianceStatus: "COMPLIANT",
          feedbackComments: "",
          escalatedToHOD: false,
        });
        refreshData();
      } else {
        toast.error(res.error || "Failed to log quality audit.");
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-white/40 dark:border-slate-800 shadow-sm">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-indigo-600" />
            Quality Control & Compliance Desk
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Independent audit oversight of customer ticketing SLAs, CSAT compliance, and resolution quality.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={isLoading}
            className="border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-[#F0944D] hover:bg-[#F0944D]/90 text-white">
                <Plus className="w-3.5 h-3.5 mr-1" />
                Log Quality Audit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800">
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-indigo-600" />
                  Log Ticket Quality Audit
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleAuditSubmit} className="space-y-3.5 mt-2">
                <div>
                  <Label className="text-xs">Ticket UUID *</Label>
                  <Input
                    placeholder="Paste Ticket ID..."
                    value={formData.ticketId}
                    onChange={(e) => setFormData({ ...formData, ticketId: e.target.value })}
                    className="h-8 text-xs mt-1 font-mono"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Quality Score (1-100)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={formData.qualityScore}
                      onChange={(e) => setFormData({ ...formData, qualityScore: parseInt(e.target.value) || 0 })}
                      className="h-8 text-xs mt-1"
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Compliance Status</Label>
                    <select
                      value={formData.complianceStatus}
                      onChange={(e) => setFormData({ ...formData, complianceStatus: e.target.value })}
                      className="w-full h-8 text-xs mt-1 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      <option value="COMPLIANT">Compliant</option>
                      <option value="MINOR_NON_COMPLIANCE">Minor Breach</option>
                      <option value="MAJOR_NON_COMPLIANCE">Major Breach</option>
                      <option value="SLA_VIOLATION">SLA Violation</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Feedback & Auditor Notes *</Label>
                  <Textarea
                    placeholder="Detailed feedback regarding ticket handling, resolution tone, accuracy..."
                    value={formData.feedbackComments}
                    onChange={(e) => setFormData({ ...formData, feedbackComments: e.target.value })}
                    className="text-xs min-h-[80px] mt-1"
                    required
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="escalateHOD"
                    checked={formData.escalatedToHOD}
                    onChange={(e) => setFormData({ ...formData, escalatedToHOD: e.target.checked })}
                    className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                  />
                  <Label htmlFor="escalateHOD" className="text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
                    Escalate to Assigned Employee's Department HOD
                  </Label>
                </div>

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDialogOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSubmitting}
                    className="bg-[#F0944D] hover:bg-[#F0944D]/90 text-white"
                  >
                    {isSubmitting ? "Logging..." : "Save Audit"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-white/40 dark:border-slate-800 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total System Tickets</p>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                {data.totalTickets}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Inbound support queue</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-white/40 dark:border-slate-800 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Audited Tickets</p>
              <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {data.auditedCount}
              </h3>
              <p className="text-[11px] text-emerald-600/80 font-medium mt-0.5">
                {data.totalTickets > 0 ? `${Math.round((data.auditedCount / data.totalTickets) * 100)}% audit coverage` : "0%"}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-white/40 dark:border-slate-800 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Avg Quality Score</p>
              <h3 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                {data.averageScore}/100
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Across verified tickets</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 flex items-center justify-center">
              <FileCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-white/40 dark:border-slate-800 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">HOD Escalations</p>
              <h3 className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                {data.escalatedCount}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Critical audit flags</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Audits Table */}
      <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-white/40 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardHeader className="p-4 border-b border-slate-200/60 dark:border-slate-800">
          <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100">
            Recent Quality Audit Inspections
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.recentAudits.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No quality audits logged yet. Use "Log Quality Audit" to inspect tickets.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.recentAudits.map((audit) => (
                <div key={audit.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#F0944D]">
                        {audit.ticket.ticketNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200">
                        Score: {audit.qualityScore}/100
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {audit.complianceStatus}
                      </Badge>
                      {audit.escalatedToHOD && (
                        <Badge className="bg-red-600 text-white text-[10px]">
                          Escalated to HOD
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                      "{audit.feedbackComments}"
                    </p>

                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                      <span>Subject: {audit.ticket.subject}</span>
                      {audit.ticket.assignedEmployee && (
                        <span>
                          · Assigned: {audit.ticket.assignedEmployee.firstName} {audit.ticket.assignedEmployee.lastName} ({audit.ticket.assignedEmployee.department})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right text-[11px] text-slate-400 shrink-0">
                    <p>Auditor: {audit.auditor.firstName} {audit.auditor.lastName}</p>
                    <p>{new Date(audit.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
