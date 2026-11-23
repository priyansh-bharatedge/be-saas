import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { canCreateEmployee } from "@/lib/auth/rbac";
import { getHierarchyManagersAction } from "@/lib/actions/employee";
import { EmployeeWizard } from "@/components/hrms/EmployeeWizard";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "New Employee Registration • BharatEdge HRMS",
  description: "Register new staff member into enterprise HRMS database.",
};

export default async function NewEmployeePage() {
  const user = await getCurrentUser();
  if (!user || !canCreateEmployee(user)) {
    redirect("/hrms/directory?denied=create");
  }

  const leadersRes = await getHierarchyManagersAction();
  const leaders = leadersRes.success && leadersRes.data ? leadersRes.data : [];

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <Link
          href="/hrms/directory"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors px-3 py-1.5 rounded-full hover:bg-white/80"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Directory</span>
        </Link>
        <span className="font-mono text-xs text-slate-400">
          BharatEdge Services • HRMS Onboarding Portal
        </span>
      </div>

      <Suspense fallback={<div className="p-12 text-center text-slate-400 font-mono text-xs">Loading Wizard Form...</div>}>
        <EmployeeWizard leaders={leaders as any} />
      </Suspense>
    </div>
  );
}
