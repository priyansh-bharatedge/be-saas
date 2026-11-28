import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getScopeFilter } from "@/lib/auth/rbac";
import PageTransition from "@/components/animations/PageTransition";
import PerformanceView from "@/components/performance/PerformanceView";
import {
  getMyAppraisalsAction,
  getAllAppraisalsAction,
} from "@/lib/actions/performance";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Performance & Appraisals • BharatEdge HRMS",
  description: "Employee self-evaluation, manager performance calibration, and HR promotion sign-offs",
};

export default async function HRMSPerformancePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const scope = await getScopeFilter(user, "hrms");
  const isReviewer = scope.isHrAdmin || scope.isSuperAdmin || scope.isHod;

  const [myRes, allRes] = await Promise.all([
    getMyAppraisalsAction(),
    isReviewer ? getAllAppraisalsAction() : Promise.resolve({ success: true, data: [] }),
  ]);

  const initialMyRecords = myRes.success && myRes.data ? myRes.data : [];
  const initialAllRecords = allRes.success && allRes.data ? allRes.data : [];

  return (
    <PageTransition>
      <PerformanceView
        initialMyRecords={initialMyRecords}
        initialAllRecords={initialAllRecords}
        isReviewer={isReviewer}
      />
    </PageTransition>
  );
}
