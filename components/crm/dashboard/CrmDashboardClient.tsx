"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  DollarSign,
  Landmark,
  GitBranch,
  FileText,
  Award,
  Target,
  Calendar,
  Filter,
  Loader2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { DashboardData, SalesTargetFormData } from "@/lib/validations/dashboard";
import {
  getDashboardDataAction,
  upsertSalesTargetAction,
} from "@/lib/actions/dashboard";
import SalesDashboardView from "@/components/crm/dashboard/SalesDashboardView";
import AccountsDashboardView from "@/components/crm/dashboard/AccountsDashboardView";
import LegalDashboardView from "@/components/crm/dashboard/LegalDashboardView";
import OperationsDashboardView from "@/components/crm/dashboard/OperationsDashboardView";
import QualityDashboardView from "@/components/crm/dashboard/QualityDashboardView";
import SalesTargetModal from "@/components/crm/dashboard/SalesTargetModal";

interface CrmDashboardClientProps {
  initialData: DashboardData;
}

export default function CrmDashboardClient({
  initialData,
}: CrmDashboardClientProps) {
  const router = useRouter();
  const [data, setData] = useState<DashboardData>(initialData);
  const [isPending, startTransition] = useTransition();

  // Determine initial active tab based on user's department
  const userDept = (data.userDepartment || "").toLowerCase();
  const defaultTab: "SALES" | "ACCOUNTS" | "OPERATIONS" | "LEGAL" | "QUALITY" =
    userDept.includes("account")
      ? "ACCOUNTS"
      : userDept.includes("operation")
      ? "OPERATIONS"
      : userDept.includes("legal")
      ? "LEGAL"
      : userDept.includes("quality")
      ? "QUALITY"
      : "SALES";

  const [activeTab, setActiveTab] = useState<
    "SALES" | "ACCOUNTS" | "OPERATIONS" | "LEGAL" | "QUALITY"
  >(defaultTab);

  const [selectedMonth, setSelectedMonth] = useState<number>(data.selectedMonth);
  const [selectedYear, setSelectedYear] = useState<number>(data.selectedYear);

  // Target modal state
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [isSubmittingTarget, setIsSubmittingTarget] = useState(false);

  // Handle Month / Year switch
  const handlePeriodChange = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);

    startTransition(async () => {
      const res = await getDashboardDataAction({ month, year });
      if (res.success && res.data) {
        setData(res.data);
      } else {
        toast.error(res.error || "Failed to load period data.");
      }
    });
  };

  // Handle Target Submit
  const handleTargetSubmit = async (formData: SalesTargetFormData) => {
    setIsSubmittingTarget(true);
    try {
      const res = await upsertSalesTargetAction(formData);
      if (res.success) {
        toast.success("Sales target assigned successfully!");
        setIsTargetModalOpen(false);

        // Refresh data
        const refreshRes = await getDashboardDataAction({
          month: selectedMonth,
          year: selectedYear,
        });
        if (refreshRes.success && refreshRes.data) {
          setData(refreshRes.data);
        }
      } else {
        toast.error(res.error || "Failed to assign sales target.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmittingTarget(false);
    }
  };

  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  const years = [2025, 2026, 2027];

  // Permissions
  const canSwitchDepartments =
    data.isSuperAdmin ||
    data.userSystemRole === "ADMIN_HOD" ||
    data.userSystemRole === "SUPER_ADMIN";

  return (
    <div className="space-y-6">
      {/* 1. TOP CONTROL BAR: Department Tabs & Period Filter */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/70 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        {/* Department Switcher Tabs (For Admin / HOD or Cross-department users) */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
          <button
            type="button"
            onClick={() => setActiveTab("SALES")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "SALES"
                ? "bg-slate-900 text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5 text-[#F0944D]" />
            Sales & Targets
          </button>

          {(canSwitchDepartments || userDept.includes("account")) && (
            <button
              type="button"
              onClick={() => setActiveTab("ACCOUNTS")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "ACCOUNTS"
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Landmark className="h-3.5 w-3.5 text-emerald-400" />
              Accounts & Cashflow
            </button>
          )}

          {(canSwitchDepartments || userDept.includes("operation")) && (
            <button
              type="button"
              onClick={() => setActiveTab("OPERATIONS")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "OPERATIONS"
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <GitBranch className="h-3.5 w-3.5 text-[#ACCAD5]" />
              Operations Fulfillment
            </button>
          )}

          {(canSwitchDepartments || userDept.includes("legal")) && (
            <button
              type="button"
              onClick={() => setActiveTab("LEGAL")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "LEGAL"
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <FileText className="h-3.5 w-3.5 text-sky-400" />
              Legal Handover
            </button>
          )}

          {(canSwitchDepartments || userDept.includes("quality")) && (
            <button
              type="button"
              onClick={() => setActiveTab("QUALITY")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "QUALITY"
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Award className="h-3.5 w-3.5 text-purple-400" />
              Quality Audits
            </button>
          )}
        </div>

        {/* Right side: Period Selectors (Month & Year) & Set Target Action */}
        <div className="flex items-center gap-2 self-end lg:self-auto">
          {isPending && (
            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 mr-1 animate-pulse">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Updating...</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/80">
            <Calendar className="h-3.5 w-3.5 text-slate-500 ml-1.5" />
            <select
              value={selectedMonth}
              onChange={(e) =>
                handlePeriodChange(Number(e.target.value), selectedYear)
              }
              className="h-7 rounded-lg bg-transparent px-2 text-xs font-semibold text-slate-800 border-none focus:outline-hidden cursor-pointer"
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) =>
                handlePeriodChange(selectedMonth, Number(e.target.value))
              }
              className="h-7 rounded-lg bg-transparent px-2 text-xs font-semibold text-slate-800 border-none focus:outline-hidden cursor-pointer"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {(data.isSalesHod || data.isSuperAdmin) && activeTab === "SALES" && (
            <Button
              size="sm"
              onClick={() => setIsTargetModalOpen(true)}
              className="h-8 text-xs font-semibold bg-[#F0944D] hover:bg-[#d87c35] text-white shadow-xs gap-1.5"
            >
              <Target className="h-3.5 w-3.5" />
              Set Targets
            </Button>
          )}
        </div>
      </div>

      {/* 2. TAB CONTENT VIEW */}
      <div>
        {activeTab === "SALES" && (
          <SalesDashboardView
            isSalesHod={data.isSalesHod}
            isSalesTl={data.isSalesTl}
            isSalesTm={data.isSalesTm}
            isSuperAdmin={data.isSuperAdmin}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            personalMetrics={data.salesData.personalMetrics}
            teamPerformance={data.salesData.teamPerformance}
            orgPerformance={data.salesData.orgPerformance}
            onOpenTargetModal={() => setIsTargetModalOpen(true)}
          />
        )}

        {activeTab === "ACCOUNTS" && (
          <AccountsDashboardView metrics={data.accountsData} />
        )}

        {activeTab === "OPERATIONS" && (
          <OperationsDashboardView metrics={data.operationsData} />
        )}

        {activeTab === "LEGAL" && (
          <LegalDashboardView metrics={data.legalData} />
        )}

        {activeTab === "QUALITY" && (
          <QualityDashboardView metrics={data.qualityData} />
        )}
      </div>

      {/* 3. SALES TARGET MODAL */}
      <SalesTargetModal
        open={isTargetModalOpen}
        onOpenChange={setIsTargetModalOpen}
        bdmsList={data.salesData.activeBdmsList}
        defaultMonth={selectedMonth}
        defaultYear={selectedYear}
        onSubmit={handleTargetSubmit}
        isSubmitting={isSubmittingTarget}
      />
    </div>
  );
}
