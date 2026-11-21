import { getCurrentUser } from "@/lib/auth/session";
import DepartmentHeader from "@/components/layout/DepartmentHeader";
import PageTransition from "@/components/animations/PageTransition";
import CrmDashboardClient from "@/components/crm/dashboard/CrmDashboardClient";
import { getDashboardDataAction } from "@/lib/actions/dashboard";
import { Button } from "@/components/ui/button";
import { Plus, Briefcase, Users, FileText } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    month?: string;
    year?: string;
  }>;
}

export default async function CRMOverviewPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const resolvedParams = await searchParams;
  const month = resolvedParams.month ? parseInt(resolvedParams.month) : undefined;
  const year = resolvedParams.year ? parseInt(resolvedParams.year) : undefined;

  const res = await getDashboardDataAction({ month, year });

  if (!res.success || !res.data) {
    return (
      <PageTransition>
        <div className="p-8 text-center text-rose-600 bg-rose-50 border border-rose-200 rounded-2xl">
          <p className="font-bold">Failed to load CRM Dashboard metrics.</p>
          <p className="text-xs text-rose-500 mt-1">{res.error || "Database error"}</p>
        </div>
      </PageTransition>
    );
  }

  const data = res.data;

  return (
    <PageTransition>
      <DepartmentHeader
        title="Customer Relationship Management (CRM)"
        description={`Live department & role-based performance overview for ${data.userName} (${data.userDepartment} • ${data.userSystemRole}).`}
        departmentBadge="PHASE 6 SUITE"
        actions={
          <div className="flex items-center gap-2">
            <Link href="/crm/leads">
              <Button variant="outline" className="h-8 text-xs font-semibold">
                <Users className="h-3.5 w-3.5 mr-1 text-slate-500" />
                Leads
              </Button>
            </Link>
            <Link href="/crm/deals">
              <Button className="h-8 text-xs font-semibold bg-[#F0944D] hover:bg-[#d87c35] text-white shadow-xs">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Create Deal
              </Button>
            </Link>
          </div>
        }
      />

      <CrmDashboardClient initialData={data} />
    </PageTransition>
  );
}
