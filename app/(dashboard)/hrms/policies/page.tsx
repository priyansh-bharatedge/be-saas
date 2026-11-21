import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getCompanyPoliciesAction } from "@/lib/actions/policies";
import PageTransition from "@/components/animations/PageTransition";
import PolicyDirectoryView from "@/components/policies/PolicyDirectoryView";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Company Policies & Guidelines • BharatEdge HRMS",
  description: "Enterprise policies, compliance regulations, safety standards, and downloadable staff handbooks",
};

export default async function HRMSPoliciesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const policiesRes = await getCompanyPoliciesAction();
  const initialPolicies = policiesRes.success && policiesRes.data ? policiesRes.data.policies : [];
  const initialCategories = policiesRes.success && policiesRes.data ? policiesRes.data.categories : [];
  const isHRAdmin = policiesRes.success && policiesRes.data ? policiesRes.data.isHRAdmin : false;

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Company Policies &amp; Guidelines
              </h1>
              <span className="text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full bg-[#EBF3F6] text-[#588594] border border-[#ACCAD5]/50 font-semibold">
                Statutory Compliance
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Enterprise conduct rules, leave guidelines, IT security mandates, and employee handbooks.
            </p>
          </div>
        </div>

        {/* Policy Directory View */}
        <PolicyDirectoryView
          initialPolicies={initialPolicies}
          initialCategories={initialCategories}
          isHRAdmin={isHRAdmin}
        />
      </div>
    </PageTransition>
  );
}
