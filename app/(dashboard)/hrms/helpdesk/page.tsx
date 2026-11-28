import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getScopeFilter } from "@/lib/auth/rbac";
import PageTransition from "@/components/animations/PageTransition";
import HelpdeskView from "@/components/helpdesk/HelpdeskView";
import {
  getMyHelpdeskTicketsAction,
  getAllHelpdeskTicketsAction,
} from "@/lib/actions/helpdesk";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "HRMS Helpdesk • BharatEdge HRMS",
  description: "Internal staff support desk for HR, IT, Payroll, and Facilities inquiries",
};

export default async function HRMSHelpdeskPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const scope = await getScopeFilter(user, "hrms");
  const isSupportStaff = scope.isHrAdmin || scope.isSuperAdmin || scope.isHod;

  const [myRes, allRes] = await Promise.all([
    getMyHelpdeskTicketsAction(),
    isSupportStaff ? getAllHelpdeskTicketsAction() : Promise.resolve({ success: true, data: [] }),
  ]);

  const initialMyTickets = myRes.success && myRes.data ? myRes.data : [];
  const initialAllTickets = allRes.success && allRes.data ? allRes.data : [];

  return (
    <PageTransition>
      <HelpdeskView
        initialMyTickets={initialMyTickets}
        initialAllTickets={initialAllTickets}
        isSupportStaff={isSupportStaff}
      />
    </PageTransition>
  );
}
