import DepartmentHeader from "@/components/layout/DepartmentHeader";
import PageTransition from "@/components/animations/PageTransition";
import HoverCard from "@/components/animations/HoverCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Headphones, CheckCircle2, Clock, AlertTriangle, Plus, FileCheck, ArrowRight } from "lucide-react";
import Link from "next/link";
import { getTicketsAction, getQualityAuditDashboardAction } from "@/lib/actions/support";

export const metadata = {
  title: "Support Desk & Quality | BharatEdge",
  description: "Customer ticketing operations and independent quality compliance audits.",
};

export default async function SupportOverviewPage() {
  const [ticketsRes, qualityRes] = await Promise.all([
    getTicketsAction({ page: 1, pageSize: 5 }),
    getQualityAuditDashboardAction(),
  ]);

  const ticketsData = ticketsRes.success && ticketsRes.data ? ticketsRes.data : { tickets: [], total: 0 };
  const qualityData = qualityRes.success && qualityRes.data ? qualityRes.data : {
    totalTickets: 0,
    auditedCount: 0,
    unauditedCount: 0,
    escalatedCount: 0,
    averageScore: 0,
    recentAudits: [],
  };

  const metrics = [
    {
      title: "Scoped Support Tickets",
      value: ticketsData.total.toString(),
      change: `${ticketsData.tickets.filter((t: any) => t.status === "OPEN").length} currently open`,
      icon: Headphones,
    },
    {
      title: "Avg First Response Time",
      value: "11 mins",
      change: "-4 mins vs SLA target",
      icon: Clock,
    },
    {
      title: "Quality Audit Score",
      value: `${qualityData.averageScore}/100`,
      change: `${qualityData.auditedCount} audited tickets`,
      icon: CheckCircle2,
    },
    {
      title: "Quality Escalations",
      value: qualityData.escalatedCount.toString(),
      change: "Flagged for HOD review",
      icon: AlertTriangle,
    },
  ];

  return (
    <PageTransition>
      <DepartmentHeader
        title="Customer Support Desk & Quality"
        description="Unified ticketing integrated with website inquiries, audited by the Quality Department."
        departmentBadge="DEPT-SUPPORT-QUALITY"
        actions={
          <div className="flex gap-2">
            <Link href="/support/quality">
              <Button variant="outline">
                <FileCheck className="h-4 w-4 mr-1 text-indigo-600" />
                Quality Desk
              </Button>
            </Link>
            <Link href="/support/tickets">
              <Button className="bg-[#F0944D] hover:bg-[#F0944D]/90 text-white">
                <Plus className="h-4 w-4 mr-1" /> New Ticket
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {metrics.map((item) => {
          const Icon = item.icon;
          return (
            <HoverCard key={item.title}>
              <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-white/40 dark:border-slate-800 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {item.title}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-[#F0944D]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{item.value}</div>
                  <p className="text-xs text-emerald-600 font-medium mt-1">{item.change}</p>
                </CardContent>
              </Card>
            </HoverCard>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ticket Queue Card */}
        <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-white/40 dark:border-slate-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-bold">Active Ticket Queue</CardTitle>
              <CardDescription className="text-xs">Inbound customer support inquiries scoped to your team</CardDescription>
            </div>
            <Link href="/support/tickets">
              <Button variant="ghost" size="sm" className="text-xs text-[#F0944D]">
                View All <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {ticketsData.tickets.length === 0 ? (
              <div className="p-8 border border-dashed border-slate-300 dark:border-slate-800 rounded-lg text-center text-slate-500 text-xs">
                No active tickets in your scoped queue.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {ticketsData.tickets.map((t: any) => (
                  <div key={t.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#F0944D]">{t.ticketNumber}</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{t.subject}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {t.customerName} · {t.customerEmail}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quality Audit Supervision Card */}
        <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-white/40 dark:border-slate-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-bold">Quality Department Oversight</CardTitle>
              <CardDescription className="text-xs">SLA adherence, resolution audits, and escalation compliance</CardDescription>
            </div>
            <Link href="/support/quality">
              <Button variant="ghost" size="sm" className="text-xs text-indigo-600">
                Audit Desk <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {qualityData.recentAudits.length === 0 ? (
              <div className="p-8 border border-dashed border-slate-300 dark:border-slate-800 rounded-lg text-center text-slate-500 text-xs">
                No quality audits logged yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {qualityData.recentAudits.slice(0, 4).map((a: any) => (
                  <div key={a.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-indigo-600">{a.ticket.ticketNumber}</span>
                        <span className="font-bold text-emerald-600">Score: {a.qualityScore}/100</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        "{a.feedbackComments}"
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {new Date(a.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
