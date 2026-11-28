import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getScopeFilter } from "@/lib/auth/rbac";
import PageTransition from "@/components/animations/PageTransition";
import WorkflowsView from "@/components/hrms/WorkflowsView";
import { getHrmsWorkflowsAction } from "@/lib/actions/workflow";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Workflow Engine • BharatEdge HRMS",
  description:
    "Dynamic multi-tier approval chains, custom notifications, and automated governance rules",
};

export default async function HRMSWorkflowsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Strict RBAC: Accessible only by HR Admin or Super Admin
  const scope = await getScopeFilter(user, "hrms");
  if (!scope.isHrAdmin && !scope.isSuperAdmin) {
    redirect("/hrms");
  }

  const workflowsRes = await getHrmsWorkflowsAction();
  const workflows = workflowsRes.success && workflowsRes.data ? workflowsRes.data : [];

  return (
    <PageTransition>
      <WorkflowsView initialWorkflows={workflows} />
    </PageTransition>
  );
}
