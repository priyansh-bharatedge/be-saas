import { getCurrentUser } from "@/lib/auth/session";
import DepartmentHeader from "@/components/layout/DepartmentHeader";
import PageTransition from "@/components/animations/PageTransition";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import OperationsView from "@/components/crm/OperationsView";
import {
  getOperationsAction,
  getOperationMasterDataAction,
} from "@/lib/actions/operations";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    tab?: "ALL" | "COMPLETED" | "PENDING";
    teamType?: string;
    search?: string;
  }>;
}

export default async function OperationsPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  const userDept = (user?.department || "").toLowerCase();

  // Strict isolation guard: Sales department is blocked from Internal Operations
  if (userDept.includes("sales")) {
    return (
      <PageTransition>
        <div className="min-h-[500px] flex flex-col items-center justify-center p-8 text-center space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center shadow-xs">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Department Restricted Area</h2>
          <p className="text-sm text-slate-500 max-w-md">
            Internal Operations workflows and service fulfillment tracking are strictly restricted from the Sales department.
          </p>
          <Link href="/crm">
            <Button variant="outline" className="text-xs">
              Return to CRM Dashboard
            </Button>
          </Link>
        </div>
      </PageTransition>
    );
  }

  const resolvedParams = await searchParams;

  const [opsRes, masterRes] = await Promise.all([
    getOperationsAction({
      tab: resolvedParams.tab,
      teamType: resolvedParams.teamType,
      search: resolvedParams.search,
    }),
    getOperationMasterDataAction(),
  ]);

  const operations = opsRes.success && opsRes.data ? opsRes.data.operations : [];
  const isOperationHod = opsRes.success && opsRes.data ? opsRes.data.isOperationHod : false;
  const isOperationTl = opsRes.success && opsRes.data ? opsRes.data.isOperationTl : false;
  const isQualityUser = opsRes.success && opsRes.data ? opsRes.data.isQualityUser : false;
  const canManageAll = opsRes.success && opsRes.data ? opsRes.data.canManageAll : false;

  const masterData =
    masterRes.success && masterRes.data
      ? masterRes.data
      : { teamLeaders: [], teamMembers: [], qualityAuditors: [] };

  return (
    <PageTransition>
      <DepartmentHeader
        title="Internal Operations & Quality Fulfillment"
        description="1-per-service task routing, stage workflows, and handover between Operations and Quality verification."
        departmentBadge="PHASE 5 ENGINE"
      />

      <OperationsView
        initialOperations={operations}
        masterData={masterData}
        isOperationHod={isOperationHod}
        isOperationTl={isOperationTl}
        isQualityUser={isQualityUser}
        canManageAll={canManageAll}
      />
    </PageTransition>
  );
}
