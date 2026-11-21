import DepartmentHeader from "@/components/layout/DepartmentHeader";
import PageTransition from "@/components/animations/PageTransition";
import QuotationsView from "@/components/crm/QuotationsView";
import {
  getQuotationsAction,
  getQuotationMasterDataAction,
} from "@/lib/actions/quotations";

export const dynamic = "force-dynamic";

export default async function CRMQuotationsPage() {
  const [quotationsRes, masterDataRes] = await Promise.all([
    getQuotationsAction(),
    getQuotationMasterDataAction(),
  ]);

  const quotations = quotationsRes.data?.quotations || [];
  const canManageAll = quotationsRes.data?.canManageAll ?? false;
  const masterData = masterDataRes.data || {
    services: [],
    clients: [],
    companies: [],
  };

  return (
    <PageTransition>
      <DepartmentHeader
        title="Quotations Engine & Proposals"
        description="Dynamic service decomposition, automated 18% GST calculations, branded PDF generation, and direct client email delivery."
        departmentBadge="CRM COMMERCIAL"
      />

      <QuotationsView
        initialQuotations={quotations}
        masterData={masterData}
        canManageAll={canManageAll}
      />
    </PageTransition>
  );
}
