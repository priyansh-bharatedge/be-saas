import DepartmentHeader from "@/components/layout/DepartmentHeader";
import PageTransition from "@/components/animations/PageTransition";
import ProspectsSpreadsheetView from "@/components/crm/ProspectsSpreadsheetView";
import { getProspectsDataAction } from "@/lib/actions/prospects";

export const dynamic = "force-dynamic";

interface ProspectsPageProps {
  searchParams: Promise<{ tabId?: string; sheetId?: string }>;
}

export default async function ProspectsPage({ searchParams }: ProspectsPageProps) {
  const resolvedParams = await searchParams;
  const res = await getProspectsDataAction({
    selectedTabId: resolvedParams?.tabId,
    selectedSheetId: resolvedParams?.sheetId,
  });

  if (!res.success || !res.data) {
    return (
      <PageTransition>
        <DepartmentHeader
          title="Prospect Master Sheets"
          description="Dynamic TL-wise & BDM/CDM sub-tabs with customizable column schemas and real-time cell tracking."
          departmentBadge="CRM PRE-SALES"
        />
        <div className="p-8 rounded-2xl bg-white/70 border border-red-200 text-center">
          <p className="text-sm font-medium text-rose-600">
            {res.error || "Failed to load prospect spreadsheets. Please contact system administrator."}
          </p>
        </div>
      </PageTransition>
    );
  }

  const {
    tabs,
    activeTab,
    activeSheet,
    columns,
    rows,
    canManageSchema,
    canManageTabs,
    availableEmployees,
  } = res.data;

  return (
    <PageTransition>
      <DepartmentHeader
        title="Prospect Master Sheets"
        description="Dynamic TL-wise & BDM/CDM sub-tabs with customizable column schemas and real-time cell tracking."
        departmentBadge="CRM PRE-SALES"
      />

      <ProspectsSpreadsheetView
        initialTabs={tabs}
        initialActiveTab={activeTab}
        initialActiveSheet={activeSheet}
        initialColumns={columns}
        initialRows={rows}
        canManageSchema={canManageSchema}
        canManageTabs={canManageTabs}
        availableEmployees={availableEmployees}
      />
    </PageTransition>
  );
}
