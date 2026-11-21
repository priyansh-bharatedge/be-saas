import DepartmentHeader from "@/components/layout/DepartmentHeader";
import PageTransition from "@/components/animations/PageTransition";
import QualityDeskView from "@/components/support/QualityDeskView";
import { getQualityAuditDashboardAction } from "@/lib/actions/support";

export const metadata = {
  title: "Quality Supervision Desk | BharatEdge Support",
  description: "Independent audit oversight, SLA adherence verification, and escalation governance.",
};

export default async function SupportQualityDeskPage() {
  const result = await getQualityAuditDashboardAction();

  const initialData = result.success && result.data ? (result.data as any) : {
    totalTickets: 0,
    auditedCount: 0,
    unauditedCount: 0,
    escalatedCount: 0,
    averageScore: 0,
    recentAudits: [],
  };

  return (
    <PageTransition>
      <DepartmentHeader
        title="Quality Department Supervision Desk"
        description="Independent audit oversight, SLA adherence verification, and escalation governance."
        departmentBadge="QUALITY-DEPT"
      />
      <QualityDeskView initialData={initialData} />
    </PageTransition>
  );
}
