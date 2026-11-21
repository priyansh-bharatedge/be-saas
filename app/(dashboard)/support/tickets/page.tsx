import DepartmentHeader from "@/components/layout/DepartmentHeader";
import PageTransition from "@/components/animations/PageTransition";
import SupportTicketsView from "@/components/support/SupportTicketsView";
import { getTicketsAction } from "@/lib/actions/support";

export const metadata = {
  title: "Support Tickets | BharatEdge Support",
  description: "Enterprise ticketing queue with dynamic RBAC routing and SLA tracking.",
};

export default async function SupportTicketsPage() {
  const result = await getTicketsAction({ page: 1, pageSize: 20 });

  const tickets = result.success && result.data ? (result.data.tickets as any) : [];
  const total = result.success && result.data ? result.data.total : 0;
  const userScope = result.success && result.data ? result.data.userScope : { canManageAll: false, isQualityDept: false };

  return (
    <PageTransition>
      <DepartmentHeader
        title="Support Tickets"
        description="Omnichannel ticketing lifecycle, priority routing, customer conversations, and SLAs."
        departmentBadge="SUPPORT-TICKETS"
      />
      <SupportTicketsView
        initialTickets={tickets}
        total={total}
        userScope={userScope}
      />
    </PageTransition>
  );
}
