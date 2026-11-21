import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { PortalClient } from "@/components/portal/PortalClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Central Hub • BharatEdge Enterprise Portal",
  description: "Unified 3-Module Enterprise Gateway for BharatEdge Services",
};

export default async function PortalPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FCFAF7] flex items-center justify-center font-mono text-xs text-slate-500">Loading Central Gateway...</div>}>
      <PortalClient initialUser={user} />
    </Suspense>
  );
}
