import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getScopeFilter } from "@/lib/auth/rbac";
import PageTransition from "@/components/animations/PageTransition";
import ResignationsView from "@/components/resignations/ResignationsView";
import {
  getMyResignationAction,
  getAllResignationsAction,
} from "@/lib/actions/resignation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Resignations & Exit • BharatEdge HRMS",
  description: "Official resignation notices, last working day confirmation, and offboarding workflows",
};

export default async function HRMSResignationsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const scope = await getScopeFilter(user, "hrms");
  const isReviewer = scope.isHrAdmin || scope.isSuperAdmin || scope.isHod;

  const [myRes, allRes] = await Promise.all([
    getMyResignationAction(),
    isReviewer ? getAllResignationsAction() : Promise.resolve({ success: true, data: [] }),
  ]);

  const myResignation = myRes.success ? myRes.data : null;
  const allResignations = allRes.success && allRes.data ? allRes.data : [];

  return (
    <PageTransition>
      <ResignationsView
        myResignation={myResignation}
        allResignations={allResignations}
        isReviewer={isReviewer}
      />
    </PageTransition>
  );
}
