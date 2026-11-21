import DepartmentHeader from "@/components/layout/DepartmentHeader";
import PageTransition from "@/components/animations/PageTransition";
import ClientsView from "@/components/crm/ClientsView";
import { getClientsAction, getCrmOptionsAction } from "@/lib/actions/crm";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const [clientsRes, optionsRes] = await Promise.all([
    getClientsAction(),
    getCrmOptionsAction(),
  ]);

  const clients = clientsRes.data?.clients || [];
  const canManageAll = clientsRes.data?.canManageAll ?? false;
  const companies = optionsRes.data?.companies || [];
  const employees = optionsRes.data?.employees || [];

  return (
    <PageTransition>
      <DepartmentHeader
        title="Clients Directory"
        description="Master client directory with unique verified phone numbers, corporate tax IDs, and deal histories."
        departmentBadge="CRM MASTER"
      />

      <ClientsView
        initialClients={clients}
        companies={companies}
        employees={employees}
        canManageAll={canManageAll}
      />
    </PageTransition>
  );
}
