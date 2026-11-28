import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getScopeFilter } from "@/lib/auth/rbac";
import PageTransition from "@/components/animations/PageTransition";
import SurveysView from "@/components/surveys/SurveysView";
import {
  getActiveSurveysAction,
  getAllSurveysAction,
} from "@/lib/actions/surveys";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Employee Surveys • BharatEdge HRMS",
  description: "Company pulse surveys, culture feedback, and satisfaction calibration",
};

export default async function HRMSSurveysPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const scope = await getScopeFilter(user, "hrms");
  const isHrAdmin = scope.isHrAdmin || scope.isSuperAdmin;

  const [activeRes, adminRes] = await Promise.all([
    getActiveSurveysAction(),
    isHrAdmin ? getAllSurveysAction() : Promise.resolve({ success: true, data: [] }),
  ]);

  const initialActiveSurveys = activeRes.success && activeRes.data ? activeRes.data : [];
  const initialAdminSurveys = adminRes.success && adminRes.data ? adminRes.data : [];

  return (
    <PageTransition>
      <SurveysView
        initialActiveSurveys={initialActiveSurveys}
        initialAdminSurveys={initialAdminSurveys}
        isHrAdmin={isHrAdmin}
      />
    </PageTransition>
  );
}
