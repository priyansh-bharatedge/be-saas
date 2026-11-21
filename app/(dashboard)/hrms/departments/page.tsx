import DepartmentHeader from "@/components/layout/DepartmentHeader";
import PageTransition from "@/components/animations/PageTransition";
import DepartmentHierarchyView from "@/components/hrms/DepartmentHierarchyView";
import { getDepartmentHierarchyAction } from "@/lib/actions/employee";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Department Hierarchy | BharatEdge HRMS",
  description: "Enterprise department trees, managerial reporting chains, and live workforce visibility.",
};

export default async function HRMSDepartmentsPage() {
  const result = await getDepartmentHierarchyAction();

  if (!result.success || !result.data) {
    return (
      <PageTransition>
        <DepartmentHeader
          title="Department & Access Control"
          description="View organizational reporting structures, manager chains, and departmental attendance."
          departmentBadge="HRMS-HIERARCHY"
        />
        <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-red-200 dark:border-red-900/40">
          <CardContent className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-2">
              Unable to Load Department Hierarchy
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
              {result.error || "You may lack sufficient RBAC permissions to view managerial chains."}
            </p>
            <Link href="/hrms">
              <Button variant="outline">Return to HRMS Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <DepartmentHeader
        title="Department & Access Control"
        description="Configure department boundaries, hierarchy, managerial chains, and module policies."
        departmentBadge="HRMS-RBAC"
      />
      <DepartmentHierarchyView initialData={result.data} />
    </PageTransition>
  );
}
