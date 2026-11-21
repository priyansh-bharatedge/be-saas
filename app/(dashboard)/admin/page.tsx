import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getSuperAdminDashboardData } from "@/lib/actions/super-admin";
import { SuperAdminDashboardClient } from "@/components/admin/SuperAdminDashboardClient";
import { Role, SystemRole } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Super Admin Command Center | BharatEdge Enterprise",
  description: "Cross-platform executive command dashboard aggregating CRM, HRMS, and Support Desk analytics.",
};

interface AdminPageProps {
  searchParams: Promise<{
    range?: string;
    from?: string;
    to?: string;
    tab?: string;
  }>;
}

export default async function SuperAdminDashboardPage({
  searchParams,
}: AdminPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const isSuperAdmin =
    user.role === Role.Admin ||
    user.systemRole === SystemRole.SUPER_ADMIN ||
    (user as any).isSuperAdmin === true;

  if (!isSuperAdmin) {
    // Non-Super Admin roles are strictly blocked
    redirect("/portal?denied=admin");
  }

  const resolvedParams = await searchParams;
  const range = (resolvedParams.range || "monthly") as any;
  const from = resolvedParams.from;
  const to = resolvedParams.to;

  const initialData = await getSuperAdminDashboardData({
    range,
    from,
    to,
  });

  return <SuperAdminDashboardClient initialData={initialData} user={user} />;
}
