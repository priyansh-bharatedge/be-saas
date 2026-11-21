import DepartmentHeader from "@/components/layout/DepartmentHeader";
import PageTransition from "@/components/animations/PageTransition";
import PaymentsView from "@/components/crm/PaymentsView";
import {
  getPaymentRecordsAction,
  getPaymentMasterDataAction,
} from "@/lib/actions/payments";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const [paymentsRes, masterDataRes] = await Promise.all([
    getPaymentRecordsAction(),
    getPaymentMasterDataAction(),
  ]);

  const payments = paymentsRes.data?.payments || [];
  const isAccountsUser = paymentsRes.data?.isAccountsUser ?? false;
  const canManageAll = paymentsRes.data?.canManageAll ?? false;
  const masterData = masterDataRes.data || { clients: [], deals: [] };

  return (
    <PageTransition>
      <DepartmentHeader
        title="Payment Records & Accounts Verification"
        description="Dual entity bank segregation (BSPL / BSAPL), first vs remaining payment tracking, Cloudflare R2 screenshot storage, and accounts verification queue."
        departmentBadge="CRM FINANCIAL"
      />

      <PaymentsView
        initialPayments={payments}
        masterData={masterData}
        isAccountsUser={isAccountsUser}
        canManageAll={canManageAll}
      />
    </PageTransition>
  );
}
