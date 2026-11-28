import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getScopeFilter } from "@/lib/auth/rbac";
import PageTransition from "@/components/animations/PageTransition";
import ReimbursementsView from "@/components/reimbursements/ReimbursementsView";
import {
  getMyReimbursementsAction,
  getAllReimbursementsAction,
} from "@/lib/actions/reimbursement";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Reimbursements & Claims • BharatEdge HRMS",
  description: "Employee expense claims, invoice receipt verification, and reimbursement payouts",
};

export default async function HRMSReimbursementsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const scope = await getScopeFilter(user, "hrms");
  const isReviewer = scope.isHrAdmin || scope.isSuperAdmin || scope.isHod;

  const [myRes, allRes] = await Promise.all([
    getMyReimbursementsAction(),
    isReviewer ? getAllReimbursementsAction() : Promise.resolve({ success: true, data: [] }),
  ]);

  const initialMyRecords = myRes.success && myRes.data ? myRes.data : [];
  const initialAllRecords = allRes.success && allRes.data ? allRes.data : [];

  return (
    <PageTransition>
      <ReimbursementsView
        initialMyRecords={initialMyRecords}
        initialAllRecords={initialAllRecords}
        isReviewer={isReviewer}
      />
    </PageTransition>
  );
}
