"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthUser } from "@/lib/auth/session";
import { canAccessModule, ModuleCode } from "@/lib/auth/rbac";
import { logoutAction } from "@/lib/auth/actions";
import {
  Building2,
  Users,
  Headphones,
  Lock,
  ArrowRight,
  ArrowUpRight,
  LogOut,
  AlertOctagon,
  ShieldCheck,
} from "lucide-react";
import { motion } from "framer-motion";

interface PortalClientProps {
  initialUser: AuthUser;
}

export function PortalClient({ initialUser }: PortalClientProps) {
  const searchParams = useSearchParams();
  const deniedParam = searchParams.get("denied");
  const user = initialUser;

  const handleLogout = async () => {
    await logoutAction();
  };

  // Determine RBAC permissions for the 3 modules based strictly on unified employee permissions
  const isSuperAdmin =
    user.role === "Admin" ||
    user.systemRole === "SUPER_ADMIN" ||
    (user as any).isSuperAdmin === true;
  const crmAllowed = canAccessModule(user, "crm");
  const hrmsAllowed = canAccessModule(user, "hrms");
  const supportAllowed = canAccessModule(user, "support");

  const gateways = [
    {
      code: "crm" as ModuleCode,
      title: "CRM",
      subtitle: "Customer Relationship Management",
      description: "Deals, pipelines, and revenue workflows",
      href: "/crm",
      isAllowed: crmAllowed,
      icon: Building2,
      accentColor: "#F0944D", // Brand orange
      iconBg: "bg-gradient-to-br from-[#FDEFE6] to-[#F7BA8C]/40 text-[#C66318] border border-[#F0944D]/20",
      hoverBorder: "hover:border-[#F0944D]/60 hover:shadow-[#F0944D]/10",
      requiredRoles: "Admin, CRM",
    },
    {
      code: "hrms" as ModuleCode,
      title: "HRMS",
      subtitle: "Human Resource Management",
      description: "Directory, attendance, and employee operations",
      href: "/hrms",
      isAllowed: hrmsAllowed,
      icon: Users,
      accentColor: "#ACCAD5", // Brand cyan
      iconBg: "bg-gradient-to-br from-[#EBF3F6] to-[#CBDDE4]/50 text-[#4A7A8A] border border-[#ACCAD5]/30",
      hoverBorder: "hover:border-[#ACCAD5] hover:shadow-[#ACCAD5]/20",
      requiredRoles: "Admin, HRMS",
    },
    {
      code: "support" as ModuleCode,
      title: "Support Desk",
      subtitle: "Quality & Ticketing Desk",
      description: "Ticketing queues, resolution SLA, and quality audits",
      href: "/support",
      isAllowed: supportAllowed,
      icon: Headphones,
      accentColor: "#C66318", // Dark orange / amber
      iconBg: "bg-gradient-to-br from-[#FDEFE6] to-[#E4B592]/40 text-[#C66318] border border-[#F0944D]/20",
      hoverBorder: "hover:border-[#C66318]/50 hover:shadow-[#F0944D]/10",
      requiredRoles: "Admin, Support",
    },
  ];

  return (
    <div className="relative min-h-screen bg-[#FCFAF7] text-slate-900 flex flex-col overflow-hidden">
      {/* Ambient background glowing gradients for glassmorphism depth (Ref: Image 2) */}
      <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#ACCAD5]/30 blur-3xl opacity-70" />
      <div className="pointer-events-none absolute top-1/3 -right-24 w-[460px] h-[460px] rounded-full bg-[#F0944D]/20 blur-3xl opacity-60" />
      <div className="pointer-events-none absolute -bottom-32 left-1/3 w-[520px] h-[520px] rounded-full bg-[#ACCAD5]/20 blur-3xl opacity-50" />

      {/* Top Navigation & Profile Bar */}
      <header className="sticky top-0 z-30 bg-white/75 border-b border-slate-200/60 backdrop-blur-xl px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center">
            <img
              src="/be-logo.png"
              alt="BharatEdge Logo"
              className="h-9 w-auto max-w-[170px] object-contain"
            />
          </div>

          {/* User Profile Badge & Sign Out */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 bg-white/80 border border-slate-200/80 px-3.5 py-1.5 rounded-2xl shadow-xs backdrop-blur-md">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#ACCAD5] to-[#F0944D] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {user.name ? user.name.charAt(0) : "U"}
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">{user.name}</span>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/60">
                    {user.role}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate max-w-[200px]">
                  {user.email}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Sign out of enterprise session"
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-red-100"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-6 py-12 flex flex-col justify-center">
        {/* Route Denied Notification Banner */}
        {deniedParam && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 rounded-2xl bg-red-50/90 border border-red-200 text-red-800 flex items-start gap-3 shadow-sm backdrop-blur-md"
          >
            <AlertOctagon className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-sm">Access Denied to /{deniedParam.toUpperCase()}</p>
              <p className="mt-0.5 text-red-700">
                Your role (<span className="font-mono font-semibold">{user.role}</span>) does not hold the required permissions to access the {deniedParam.toUpperCase()} workspace.
              </p>
            </div>
          </motion.div>
        )}

        {/* Welcome Section */}
        <div className="mb-8 text-center sm:text-left">
          <h2 className="font-editorial text-3xl sm:text-4xl text-slate-950 font-normal">
            Welcome, <span className="italic font-serif font-semibold text-[#C66318]">{user.name}</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1 max-w-xl">
            Select an enterprise module below to launch your departmental workspace.
          </p>
        </div>

        {/* Super Admin Executive Command Center Gateway Card */}
        {isSuperAdmin && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 max-w-5xl mx-auto w-full p-5 sm:p-6 rounded-[28px] bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl border border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative overflow-hidden"
          >
            <div className="pointer-events-none absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-[#F0944D]/15 blur-2xl" />
            <div className="relative z-10 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#F0944D]/20 border border-[#F0944D]/40 flex items-center justify-center text-[#F0944D] shrink-0 shadow-inner">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F0944D]/30 text-[#F0944D] border border-[#F0944D]/40">
                    EXECUTIVE HQ
                  </span>
                  <span className="text-xs text-slate-400 font-medium">Unrestricted Platform Scope</span>
                </div>
                <h3 className="text-lg font-bold text-white mt-1">
                  Super Admin Executive Command Center
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Real-time PostgreSQL financial telemetry, sales funnel conversion, audit feeds, and attendance.
                </p>
              </div>
            </div>
            <Link
              href="/admin"
              className="relative z-10 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#ACCAD5] to-[#F0944D] text-slate-950 text-xs font-bold shadow-md hover:opacity-95 transition-all shrink-0 self-start sm:self-auto"
            >
              <span>Launch Command Center</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        )}

        {/* Sleek Rounded Square Grid Cards (Ref: Modern Bento/Squircle Layout) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto w-full">
          {gateways.map((gate, index) => {
            const Icon = gate.icon;

            // Authorized Card Component: Wrapped in Next.js Link with Hover Animations
            if (gate.isAllowed) {
              return (
                <motion.div
                  key={gate.code}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  whileHover={{ scale: 1.03, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  className="h-full"
                >
                  <Link
                    href={gate.href}
                    className={`group relative flex flex-col justify-between aspect-square w-full p-8 rounded-[32px] bg-white/80 backdrop-blur-xl border border-white/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] transition-all duration-300 ${gate.hoverBorder} focus:outline-none`}
                  >
                    {/* Top Row: Icon + ArrowUpRight Action Indicator */}
                    <div className="flex items-center justify-between">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-xs ${gate.iconBg}`}>
                        <Icon className="h-7 w-7 transition-transform duration-300 group-hover:scale-110" />
                      </div>
                      <div className="w-10 h-10 rounded-full bg-slate-100/70 border border-slate-200/60 flex items-center justify-center text-slate-600 group-hover:bg-slate-900 group-hover:text-white transition-all duration-300">
                        <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </div>
                    </div>

                    {/* Middle: Prominent Title & Minimal Description */}
                    <div>
                      <h3 className="text-2xl font-bold tracking-tight text-slate-900 group-hover:text-black transition-colors mb-1">
                        {gate.title}
                      </h3>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        {gate.subtitle}
                      </p>
                      <p className="text-xs text-slate-600 line-clamp-2">
                        {gate.description}
                      </p>
                    </div>

                    {/* Bottom Row: Minimal Action Indicator */}
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-500 group-hover:text-slate-900 transition-colors flex items-center gap-1.5">
                        Click To Open
                        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50/80 border border-emerald-200/60 px-2.5 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Unlocked
                      </span>
                    </div>
                  </Link>
                </motion.div>
              );
            }

            // Restricted Card Component (RBAC Enforced: Non-clickable, locked state)
            return (
              <motion.div
                key={gate.code}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="h-full"
              >
                <div
                  className="relative flex flex-col justify-between aspect-square w-full p-8 rounded-[32px] bg-slate-100/50 backdrop-blur-md border border-slate-200/60 shadow-xs opacity-60 grayscale-[40%] cursor-not-allowed select-none"
                  aria-disabled="true"
                >
                  {/* Top Row: Icon + Lock */}
                  <div className="flex items-center justify-between">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-slate-200/80 text-slate-400 border border-slate-300/40">
                      <Icon className="h-7 w-7" />
                    </div>
                    <div className="w-10 h-10 rounded-full bg-slate-200/60 border border-slate-300/60 flex items-center justify-center text-slate-400">
                      <Lock className="h-4 w-4" />
                    </div>
                  </div>

                  {/* Middle: Title & Description */}
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight text-slate-600 mb-1">
                      {gate.title}
                    </h3>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      {gate.subtitle}
                    </p>
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {gate.description}
                    </p>
                  </div>

                  {/* Bottom Row: Restricted Badge */}
                  <div className="pt-4 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-400">
                    <span className="font-medium flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5" />
                      Access Restricted
                    </span>
                    <span className="text-[10px] font-mono">
                      Role: {gate.requiredRoles}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

export default PortalClient;
