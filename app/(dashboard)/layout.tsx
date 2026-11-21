import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen w-full bg-[#E8EAEF] flex items-center justify-center p-2 sm:p-2.5 lg:p-3 overflow-hidden">
      {/* 1. Global App Container: Dynamically scales to maximize width while maintaining the floating card inset */}
      <div className="w-full h-[calc(100vh-1rem)] sm:h-[calc(100vh-1.25rem)] lg:h-[calc(100vh-1.5rem)] rounded-[24px] sm:rounded-[28px] lg:rounded-[32px] bg-white shadow-[0_20px_70px_rgba(0,0,0,0.08)] border border-slate-200/80 flex overflow-hidden relative">
        {/* 2. Fixed-Width Left Navigation Sidebar */}
        <div className="hidden md:flex h-full shrink-0">
          <Sidebar user={user} />
        </div>

        {/* 3. Main Content Area Structure: Flexes dynamically to occupy all available space */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white">
          {/* Top Navigation / Breadcrumb Header */}
          <Navbar user={user} />

          {/* Flexible, Scrollable Content Canvas */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7 bg-white">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
