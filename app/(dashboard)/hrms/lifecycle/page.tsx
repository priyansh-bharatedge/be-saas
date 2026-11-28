import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getScopeFilter } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import PageTransition from "@/components/animations/PageTransition";
import LifecycleChecklistsView from "@/components/lifecycle/LifecycleChecklistsView";
import { getChecklistsAction } from "@/lib/actions/lifecycle";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Lifecycle Checklists • BharatEdge HRMS",
  description: "Onboarding and Exit checklist management, task assignments, and progress tracking",
};

export default async function HRMSLifecyclePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const scope = await getScopeFilter(user, "hrms");

  const [checklistsRes, employees] = await Promise.all([
    getChecklistsAction(),
    scope.isHrAdmin || scope.isSuperAdmin
      ? db.employee.findMany({
          where: { status: "ACTIVE" },
          select: { id: true, firstName: true, lastName: true, employeeId: true, department: true },
          orderBy: { firstName: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const checklists = checklistsRes.success && checklistsRes.data ? checklistsRes.data : [];
  const allEmployees = employees.map((e) => ({
    id: e.id,
    name: `${e.firstName} ${e.lastName}`,
    employeeId: e.employeeId,
    department: e.department,
  }));

  return (
    <PageTransition>
      <LifecycleChecklistsView
        initialChecklists={checklists}
        allEmployees={allEmployees}
        isHrAdmin={scope.isHrAdmin || scope.isSuperAdmin}
      />
    </PageTransition>
  );
}
