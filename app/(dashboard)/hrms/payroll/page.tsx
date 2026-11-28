import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getScopeFilter } from "@/lib/auth/rbac";
import PageTransition from "@/components/animations/PageTransition";
import PayrollView from "@/components/payroll/PayrollView";
import {
  getMyPayrollsAction,
  getAllPayrollsAction,
} from "@/lib/actions/payroll";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Payroll & Salaries • BharatEdge HRMS",
  description: "Monthly salary generation, deductions, approved reimbursement additions, and payslip downloads",
};

export default async function HRMSPayrollPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const scope = await getScopeFilter(user, "hrms");
  const isHrAdmin = scope.isHrAdmin || scope.isSuperAdmin;

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [myRes, allRes] = await Promise.all([
    getMyPayrollsAction(),
    isHrAdmin ? getAllPayrollsAction({ month: currentMonth, year: currentYear }) : Promise.resolve({ success: true, data: [] }),
  ]);

  const initialMyRecords = myRes.success && myRes.data ? myRes.data : [];
  const initialAllRecords = allRes.success && allRes.data ? allRes.data : [];

  return (
    <PageTransition>
      <PayrollView
        initialMyRecords={initialMyRecords}
        initialAllRecords={initialAllRecords}
        isHrAdmin={isHrAdmin}
        currentMonth={currentMonth}
        currentYear={currentYear}
      />
    </PageTransition>
  );
}
