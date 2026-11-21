import DepartmentHeader from "@/components/layout/DepartmentHeader";
import PageTransition from "@/components/animations/PageTransition";
import ServicesView from "@/components/crm/ServicesView";
import { getServicesAction } from "@/lib/actions/crm";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const res = await getServicesAction();
  const services = res.data?.services || [];
  const categories = res.data?.categories || [];

  return (
    <PageTransition>
      <DepartmentHeader
        title="Services Catalog & Pricing Matrix"
        description="Standardized enterprise service registry, minimum pricing safeguards, and outsourcing cost margins."
        departmentBadge="CRM MASTER"
      />

      <ServicesView initialServices={services} initialCategories={categories} />
    </PageTransition>
  );
}
