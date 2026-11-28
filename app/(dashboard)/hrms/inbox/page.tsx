import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getScopeFilter } from "@/lib/auth/rbac";
import PageTransition from "@/components/animations/PageTransition";
import HrInboxView from "@/components/inbox/HrInboxView";
import { getHrInboxDataAction } from "@/lib/actions/inbox";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "HR Admin Inbox • BharatEdge HRMS",
  description:
    "Unified 10-category action center with AI Daily HR Brief and inline one-click approvals",
};

export default async function HRInboxPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Strict RBAC: Accessible only by HR Admin or Super Admin
  const scope = await getScopeFilter(user, "hrms");
  if (!scope.isHrAdmin && !scope.isSuperAdmin) {
    redirect("/hrms");
  }

  const inboxRes = await getHrInboxDataAction();
  if (!inboxRes.success || !inboxRes.data) {
    return (
      <PageTransition>
        <div className="p-8 text-center text-slate-500">
          Failed to load HR Inbox: {inboxRes.error || "Unknown error"}
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <HrInboxView initialData={inboxRes.data} />
    </PageTransition>
  );
}
