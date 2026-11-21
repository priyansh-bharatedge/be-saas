import DepartmentHeader from "@/components/layout/DepartmentHeader";
import PageTransition from "@/components/animations/PageTransition";
import DealsView from "@/components/crm/DealsView";
import { getDealsAction, getDealMasterDataAction } from "@/lib/actions/deals";

export const dynamic = "force-dynamic";

export default async function CRMDealsPage() {
  const [dealsRes, masterDataRes] = await Promise.all([
    getDealsAction(),
    getDealMasterDataAction(),
  ]);

  const deals = dealsRes.data?.deals || [];
  const isAccountsUser = dealsRes.data?.isAccountsUser ?? false;
  const isLegalUser = dealsRes.data?.isLegalUser ?? false;
  const isSalesUser = dealsRes.data?.isSalesUser ?? false;
  const canManageAll = dealsRes.data?.canManageAll ?? false;
  const masterData = masterDataRes.data || {
    services: [],
    clients: [],
    companies: [],
    employees: [],
  };

  return (
    <PageTransition>
      <DepartmentHeader
        title="Deals Pipeline & Commercial Agreements"
        description="Comprehensive deal lifecycle, 50-50 partner BDM revenue splits, master client/company record synchronization, and Accounts-to-Legal verification gates."
        departmentBadge="CRM COMMERCIAL"
      />

      <DealsView
        initialDeals={deals}
        masterData={masterData}
        isAccountsUser={isAccountsUser}
        isLegalUser={isLegalUser}
        isSalesUser={isSalesUser}
        canManageAll={canManageAll}
      />
    </PageTransition>
  );
}
