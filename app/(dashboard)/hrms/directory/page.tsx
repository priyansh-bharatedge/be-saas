import { Suspense } from "react";
import { getEmployeesAction } from "@/lib/actions/employee";
import { EmployeeListView } from "@/components/hrms/EmployeeListView";
import { getCurrentUser } from "@/lib/auth/session";
import { canCreateEmployee } from "@/lib/auth/rbac";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Employee Directory • BharatEdge HRMS",
  description: "Workforce directory, profiles, departments, and statutory records.",
};

export default async function HRMSDirectoryPage() {
  const user = await getCurrentUser();
  const canCreate = canCreateEmployee(user);
  const isSuperAdmin = user?.systemRole === "SUPER_ADMIN";

  const res = await getEmployeesAction({ page: 1, pageSize: 20 });
  const employees = res.success && res.data ? res.data.employees : [];
  const totalCount = res.success && res.data ? res.data.total : 0;

  return (
    <div className="space-y-6 w-full">
      {/* Top Header matching Reference Image 1 */}
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="font-editorial text-2xl sm:text-3xl text-slate-900 font-bold tracking-tight">
            Workforce Directory
          </h1>

        </div>
        <p className="text-xs text-slate-500 mt-1 max-w-2xl">
          Enterprise employee directory, department designations, contact cards, and statutory compliance.
        </p>
      </div>

      {/* Main Responsive Data Table Component */}
      <Suspense fallback={<div className="p-12 text-center text-slate-400 font-mono text-xs">Loading Workforce Directory...</div>}>
        <EmployeeListView
          initialEmployees={employees as any}
          totalCount={totalCount}
          canCreate={canCreate}
          isSuperAdmin={isSuperAdmin}
        />
      </Suspense>
    </div>
  );
}
