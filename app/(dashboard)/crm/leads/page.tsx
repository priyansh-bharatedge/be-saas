import DepartmentHeader from "@/components/layout/DepartmentHeader";
import PageTransition from "@/components/animations/PageTransition";
import LeadsView from "@/components/crm/LeadsView";
import { getLeadsAction, getCrmOptionsAction } from "@/lib/actions/crm";

export const dynamic = "force-dynamic";

export default async function CRMLeadsPage() {
  const [leadsRes, optionsRes] = await Promise.all([
    getLeadsAction(),
    getCrmOptionsAction(),
  ]);

  const leads = leadsRes.data?.leads || [];
  const canManageAll = leadsRes.data?.canManageAll ?? false;
  const employees = optionsRes.data?.employees || [];

  return (
    <PageTransition>
      <DepartmentHeader
        title="Leads Registry & Opportunities"
        description="Omnichannel lead capture, qualification stages, and sales executive assignment."
        departmentBadge="CRM MASTER"
      />

      <LeadsView
        initialLeads={leads}
        employees={employees}
        canManageAll={canManageAll}
      />
    </PageTransition>
  );
}
