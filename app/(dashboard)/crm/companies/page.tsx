import DepartmentHeader from "@/components/layout/DepartmentHeader";
import PageTransition from "@/components/animations/PageTransition";
import CompaniesView from "@/components/crm/CompaniesView";
import { getCompaniesAction } from "@/lib/actions/crm";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const res = await getCompaniesAction();
  const companies = res.data?.companies || [];
  const canManageAll = res.data?.canManageAll ?? false;

  return (
    <PageTransition>
      <DepartmentHeader
        title="Companies Directory"
        description="Corporate registry, industry categorizations, statutory GST/PAN details, and multi-deal accounts."
        departmentBadge="CRM MASTER"
      />

      <CompaniesView initialCompanies={companies} canManageAll={canManageAll} />
    </PageTransition>
  );
}
