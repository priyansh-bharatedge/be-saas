"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Compass,
  Users,
  Clock,
  Calendar,
  CalendarCheck,
  BookText,
  Briefcase,
  GitBranch,
  MessageSquare,
  ShieldCheck,
  ShieldAlert,
  LayoutGrid,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  LayoutDashboard,
  UserPlus,
  Table2,
  FileText,
  IndianRupee,
  Building2,
  Layers,
  ArrowLeftRight,
  TrendingUp,
  Filter,
  Activity,
  Workflow,
  Inbox,
  Receipt,
  Award,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthUser } from "@/lib/auth/session";
import { logoutAction } from "@/lib/auth/actions";
import { UserProfilePhotoModal } from "@/components/profile/UserProfilePhotoModal";

interface SidebarProps {
  user?: AuthUser | null;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  shortcut?: string;
}

interface NavSection {
  section: string;
  items: NavItem[];
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null | undefined>(user?.avatarUrl);

  useEffect(() => {
    if (user?.avatarUrl !== undefined) {
      setAvatarUrl(user.avatarUrl);
    }
  }, [user?.avatarUrl]);

  // Sync avatar dynamically when updated anywhere across the app
  useEffect(() => {
    const handleAvatarUpdate = (e: Event) => {
      const customEvt = e as CustomEvent<{ employeeId: string; avatarUrl: string | null }>;
      if (customEvt.detail?.employeeId === user?.id) {
        setAvatarUrl(customEvt.detail.avatarUrl);
      }
    };
    window.addEventListener("be_avatar_updated", handleAvatarUpdate);
    return () => window.removeEventListener("be_avatar_updated", handleAvatarUpdate);
  }, [user?.id]);

  // Restore collapsed state preference from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("be_sidebar_collapsed");
      if (saved !== null) {
        setIsCollapsed(saved === "true");
      }
    } catch {
      // Ignore if localStorage unavailable
    }
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("be_sidebar_collapsed", String(next));
      } catch {
        // Ignore if localStorage unavailable
      }
      return next;
    });
  };

  const handleLogout = async () => {
    await logoutAction();
  };

  // Determine active product domain
  const isAdmin = pathname.startsWith("/admin");
  const isCRM = pathname.startsWith("/crm");
  const isHRMS = pathname.startsWith("/hrms");
  const isSupport = pathname.startsWith("/support");
  const isChat = pathname.startsWith("/chat");

  // Determine user permissions and department
  const userDept = (user?.department || "").toLowerCase();
  const isSalesDepartment = userDept.includes("sales");
  const isSuperAdmin =
    user?.role === "Admin" ||
    user?.systemRole === "SUPER_ADMIN" ||
    (user as any)?.isSuperAdmin === true;
  const canViewHierarchy =
    isSuperAdmin ||
    user?.systemRole === "ADMIN_HOD" ||
    user?.systemRole === "HR_ADMIN" ||
    user?.systemRole === "TEAM_LEADER";
  const isHrAdmin =
    isSuperAdmin ||
    user?.systemRole === "HR_ADMIN" ||
    userDept.includes("hr") ||
    user?.role === "HRMS";

  // Dynamic Navigation Sections based strictly on Active Product
  const getNavSections = (): NavSection[] => {
    if (isAdmin) {
      return [
        {
          section: "Executive Command",
          items: [
            { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
            { title: "Financial Overview", href: "/admin?tab=financials", icon: TrendingUp },
            { title: "Sales Funnel & BDM", href: "/admin?tab=funnel", icon: Filter },
            { title: "Activity Reports", href: "/admin?tab=activity", icon: Activity },
            { title: "Workforce Attendance", href: "/admin?tab=attendance", icon: Users },
          ],
        },
        {
          section: "Enterprise Modules",
          items: [
            { title: "CRM Suite", href: "/crm", icon: Briefcase },
            { title: "HRMS Portal", href: "/hrms", icon: Users },
            { title: "Support Desk", href: "/support", icon: MessageSquare },
            { title: "Team Chat", href: "/chat", icon: MessageSquare },
          ],
        },
        {
          section: "Settings and access",
          items: [
            { title: "Central Hub", href: "/portal", icon: LayoutGrid },
            { title: "Settings", href: "/portal", icon: Settings },
          ],
        },
      ];
    }

    if (isCRM) {
      const crmItems: NavItem[] = [
        {
          title: "Dashboard",
          href: isSuperAdmin ? "/admin" : "/crm",
          icon: LayoutDashboard,
          shortcut: "⌘D",
        },
        { title: "Leads", href: "/crm/leads", icon: UserPlus },
        { title: "Prospects", href: "/crm/prospects", icon: Table2 },
        { title: "Quotations", href: "/crm/quotations", icon: FileText },
        { title: "Payment Records", href: "/crm/payments", icon: IndianRupee },
        { title: "Deals", href: "/crm/deals", icon: Briefcase },
      ];

      // Internal Operations is strictly hidden from the Sales department
      if (!isSalesDepartment) {
        crmItems.push({
          title: "Internal Operations",
          href: "/crm/operations",
          icon: GitBranch,
        });
      }

      crmItems.push(
        { title: "Clients", href: "/crm/clients", icon: Users },
        { title: "Companies", href: "/crm/companies", icon: Building2 },
        { title: "Services", href: "/crm/services", icon: Layers }
      );

      const crmSettings: NavItem[] = [
        { title: "Central Hub", href: "/portal", icon: LayoutGrid },
        { title: "Settings", href: "/portal", icon: Settings },
      ];

      return [
        {
          section: "CRM Modules",
          items: crmItems,
        },
        {
          section: "Settings and access",
          items: crmSettings,
        },
      ];
    }

    if (isHRMS) {
      const hrmsItems: NavItem[] = [];
      if (isSuperAdmin) {
        hrmsItems.push({
          title: "Dashboard",
          href: "/admin",
          icon: LayoutDashboard,
        });
      }
      if (isHrAdmin) {
        hrmsItems.push({
          title: "Inbox",
          href: "/hrms/inbox",
          icon: Inbox,
        });
      }
      hrmsItems.push(
        { title: "Overview", href: "/hrms", icon: Compass, shortcut: "⌘M" },
        { title: "Directory", href: "/hrms/directory", icon: Users },
        { title: "Attendance", href: "/hrms/attendance", icon: Clock },
        { title: "Leave & Off", href: "/hrms/leave", icon: CalendarCheck },
        { title: "Reimbursements", href: "/hrms/reimbursements", icon: Receipt },
        { title: "Helpdesk", href: "/hrms/helpdesk", icon: MessageSquare },
        { title: "Performance", href: "/hrms/performance", icon: TrendingUp },
        { title: "Payroll", href: "/hrms/payroll", icon: FileText },
        { title: "Resignations", href: "/hrms/resignations", icon: LogOut },
        { title: "Surveys", href: "/hrms/surveys", icon: Activity },
        { title: "Calendar", href: "/hrms/calendar", icon: Calendar },
        { title: "Policies", href: "/hrms/policies", icon: BookText }
      );
      if (isHrAdmin) {
        hrmsItems.push({
          title: "Workflows",
          href: "/hrms/workflows",
          icon: Workflow,
        });
      }

      const accessItems: NavItem[] = [];
      if (canViewHierarchy) {
        accessItems.push({
          title: "Team Hierarchy",
          href: "/hrms/departments",
          icon: ShieldAlert,
        });
      }
      accessItems.push(
        { title: "Central Hub", href: "/portal", icon: LayoutGrid },
        { title: "Settings", href: "/portal", icon: Settings }
      );

      return [
        {
          section: "HRMS Modules",
          items: hrmsItems,
        },
        {
          section: "Settings and access",
          items: accessItems,
        },
      ];
    }

    if (isSupport) {
      const supportItems: NavItem[] = [];
      if (isSuperAdmin) {
        supportItems.push({
          title: "Dashboard",
          href: "/admin",
          icon: LayoutDashboard,
        });
      }
      supportItems.push(
        { title: "Overview", href: "/support", icon: Compass },
        { title: "Tickets", href: "/support/tickets", icon: MessageSquare, badge: 2 },
        { title: "Quality Audits", href: "/support/quality", icon: ShieldCheck }
      );

      const supportSettings: NavItem[] = [
        { title: "Central Hub", href: "/portal", icon: LayoutGrid },
        { title: "Settings", href: "/portal", icon: Settings },
      ];

      return [
        {
          section: "Support Desk",
          items: supportItems,
        },
        {
          section: "Settings and access",
          items: supportSettings,
        },
      ];
    }

    if (isChat) {
      const chatSettings: NavItem[] = [
        { title: "Central Hub", href: "/portal", icon: LayoutGrid },
        { title: "Settings", href: "/portal", icon: Settings },
      ];

      const enterpriseModules: NavItem[] = [];
      if (isSuperAdmin) {
        enterpriseModules.push({
          title: "Dashboard",
          href: "/admin",
          icon: LayoutDashboard,
        });
      }
      enterpriseModules.push(
        { title: "CRM Suite", href: "/crm", icon: Briefcase },
        { title: "HRMS Portal", href: "/hrms", icon: Users },
        { title: "Support Desk", href: "/support", icon: MessageSquare }
      );

      return [
        {
          section: "Team Messaging",
          items: [
            { title: "Conversations", href: "/chat", icon: MessageSquare },
          ],
        },
        {
          section: "Enterprise Modules",
          items: enterpriseModules,
        },
        {
          section: "Settings and access",
          items: chatSettings,
        },
      ];
    }

    // Default / Global Fallback
    const fallbackMain: NavItem[] = [];
    if (isSuperAdmin) {
      fallbackMain.push({ title: "Dashboard", href: "/admin", icon: LayoutDashboard });
    }
    fallbackMain.push(
      { title: "Overview", href: "/portal", icon: Compass },
      { title: "CRM Suite", href: "/crm", icon: Briefcase },
      { title: "HRMS Portal", href: "/hrms", icon: Users },
      { title: "Support Desk", href: "/support", icon: MessageSquare }
    );

    return [
      {
        section: "Main menu",
        items: fallbackMain,
      },
      {
        section: "Settings and access",
        items: [
          { title: "Central Hub", href: "/portal", icon: LayoutGrid },
          { title: "Settings", href: "/portal", icon: Settings },
        ],
      },
    ];
  };

  const navSections = getNavSections();

  // Product Tagline & Code
  const getProductInfo = () => {
    if (isAdmin) return { name: "BharatEdge", sub: "EXECUTIVE HQ", badgeColor: "bg-slate-900/10 text-slate-900 border-slate-300" };
    if (isCRM) return { name: "BharatEdge", sub: "CRM SUITE", badgeColor: "bg-amber-500/10 text-amber-700 border-amber-200" };
    if (isHRMS) return { name: "BharatEdge", sub: "HRMS PORTAL", badgeColor: "bg-sky-500/10 text-sky-700 border-sky-200" };
    if (isSupport) return { name: "BharatEdge", sub: "SUPPORT DESK", badgeColor: "bg-emerald-500/10 text-emerald-700 border-emerald-200" };
    if (isChat) return { name: "BharatEdge", sub: "TEAM CHAT", badgeColor: "bg-[#ACCAD5]/30 text-[#274854] border-[#ACCAD5]/50" };
    return { name: "BharatEdge", sub: "OPERATING OS", badgeColor: "bg-slate-500/10 text-slate-700 border-slate-200" };
  };

  const productInfo = getProductInfo();
  const displayName = user?.name || "Vimlendu Mishra";
  const displayRole = user?.jobTitle || (user?.role ? `${user.role} Admin` : "Enterprise Admin");
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <aside
      className={cn(
        "shrink-0 bg-white/65 backdrop-blur-xl border-r border-white/80 shadow-[4px_0_24px_rgba(15,23,42,0.03)] flex flex-col h-full select-none transition-all duration-300 ease-in-out",
        isCollapsed ? "w-[68px]" : "w-60"
      )}
    >
      {/* Top Header: Brand Logo & Functional Collapse / Expand Toggle Button */}
      <div
        className={cn(
          "h-16 flex items-center border-b border-slate-200/50 shrink-0 transition-all",
          isCollapsed ? "justify-center px-1" : "justify-between px-5"
        )}
      >
        {!isCollapsed ? (
          <>
            <Link
              href="/portal"
              title="BharatEdge Central Hub"
              className="flex items-center min-w-0 group py-1"
            >
              <img
                src="/be-logo.png"
                alt="BharatEdge Logo"
                className="h-8 w-auto max-w-[145px] object-contain group-hover:opacity-90 transition-opacity"
              />
            </Link>

            <button
              type="button"
              onClick={toggleSidebar}
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-1 w-full py-0.5">
            <Link
              href="/portal"
              title="BharatEdge Central Hub"
              className="flex items-center justify-center group"
            >
              <img
                src="/be-logo.png"
                alt="BharatEdge Logo"
                className="w-11 h-auto max-h-6 object-contain group-hover:scale-105 transition-transform"
              />
            </Link>
            <button
              type="button"
              onClick={toggleSidebar}
              title="Expand sidebar"
              aria-label="Expand sidebar"
              className="p-1 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <PanelLeftOpen className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Navigation Menu Sections (Scrollable) */}
      <div
        className={cn(
          "flex-1 overflow-y-auto space-y-5 scrollbar-none transition-all",
          isCollapsed ? "px-2 py-4" : "px-3.5 py-4"
        )}
      >
        {/* Switch Product Gateway Quick Pill (Only in expanded mode) */}
        {!isCollapsed && (
          <Link
            href="/portal"
            className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/70 border border-slate-200/60 text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-all shadow-2xs group"
          >
            <span className="flex items-center gap-1.5 truncate">
              <ArrowLeftRight className="h-3 w-3 text-slate-400 group-hover:text-amber-600 transition-colors" />
              Switch Product
            </span>
            <span className="text-[9px] font-mono text-slate-400 group-hover:text-slate-700">
              Central Hub ↵
            </span>
          </Link>
        )}

        {navSections.map((group) => (
          <div key={group.section} className="space-y-1">
            {!isCollapsed ? (
              <h4 className="text-[11px] font-medium text-slate-400 px-3 mb-1.5">
                {group.section}
              </h4>
            ) : (
              <div className="w-5 h-px bg-slate-200/80 mx-auto my-2" />
            )}

            <div className="space-y-1">
              {group.items.map((item) => {
                let isActive = false;
                if (item.href.includes("?")) {
                  const [itemPath, itemQuery] = item.href.split("?");
                  const itemParams = new URLSearchParams(itemQuery);
                  const tabParam = itemParams.get("tab");
                  const currentTab = searchParams.get("tab") || (pathname === "/admin" ? "orbital" : null);
                  isActive = pathname === itemPath && currentTab === tabParam;
                } else {
                  const currentTab = searchParams.get("tab");
                  if (item.href === "/admin") {
                    isActive = pathname === "/admin" && (!currentTab || currentTab === "orbital");
                  } else {
                    isActive =
                      pathname === item.href ||
                      (item.href !== "/crm" &&
                        item.href !== "/hrms" &&
                        item.href !== "/support" &&
                        item.href !== "/portal" &&
                        pathname.startsWith(item.href + "/"));
                  }
                }
                const Icon = item.icon;

                if (isCollapsed) {
                  return (
                    <Link
                      key={`${group.section}-${item.title}-${item.href}`}
                      href={item.href}
                      title={item.title}
                      className={cn(
                        "relative flex items-center justify-center w-10 h-10 mx-auto rounded-2xl transition-all group",
                        isActive
                          ? "bg-[#18181B] text-white font-bold shadow-xs border border-slate-800"
                          : "text-slate-500 hover:text-slate-950 hover:bg-white/60"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          isActive ? "text-[#E86C2C]" : "text-slate-500 group-hover:text-slate-800"
                        )}
                      />
                      {item.badge !== undefined && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#E86C2C] ring-2 ring-white" />
                      )}
                    </Link>
                  );
                }

                return (
                  <Link
                    key={`${group.section}-${item.title}-${item.href}`}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-full text-xs font-medium transition-all group",
                      isActive
                        ? "bg-[#18181B] text-white font-semibold shadow-xs"
                        : "text-slate-600 hover:text-slate-950 hover:bg-white/60"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        isActive ? "text-[#E86C2C]" : "text-slate-400 group-hover:text-slate-700"
                      )}
                    />
                    <span className="truncate">{item.title}</span>

                    {/* Notification badge / count */}
                    {item.badge !== undefined && (
                      <span className="w-4 h-4 rounded-full bg-[#E86C2C] text-white text-[10px] font-bold flex items-center justify-center ml-auto shrink-0 shadow-2xs">
                        {item.badge}
                      </span>
                    )}

                    {/* Keyboard shortcut badge */}
                    {item.shortcut && (
                      <span className="text-[10px] font-mono text-slate-400 ml-auto shrink-0 opacity-70 group-hover:opacity-100">
                        {item.shortcut}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* User Profile Anchor (Absolute Bottom) */}
      <div
        className={cn(
          "border-t border-slate-200/60 bg-[#F4F6F8] shrink-0 transition-all",
          isCollapsed ? "p-2.5 flex flex-col items-center gap-2" : "p-3.5"
        )}
      >
        {!isCollapsed ? (
          <>
            <h4 className="text-[11px] font-medium text-slate-400 px-1 mb-2">
              Account
            </h4>

            <div className="flex items-center justify-between p-1.5 rounded-2xl bg-white/70 border border-slate-200/60 shadow-2xs">
              <div
                onClick={() => setIsProfileModalOpen(true)}
                className="flex items-center gap-2.5 min-w-0 cursor-pointer hover:opacity-90 group/user flex-1"
                title="Click to update profile photo"
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#ACCAD5] to-[#F0944D] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs overflow-hidden border border-white">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    initial
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 text-xs truncate leading-tight group-hover/user:text-[#C66318] transition-colors">
                    {displayName}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate leading-tight">
                    {displayRole}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                title="Sign out of session"
                className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        ) : (
          <>
            <div
              onClick={() => setIsProfileModalOpen(true)}
              title={`${displayName} (${displayRole}) - Click to update photo`}
              className="h-9 w-9 rounded-full bg-gradient-to-br from-[#ACCAD5] to-[#F0944D] text-white flex items-center justify-center font-bold text-xs shadow-2xs cursor-pointer overflow-hidden border border-white hover:scale-105 transition-transform"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                initial
              )}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Sign out of session"
              className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>

      {/* User Profile Photo Upload Modal */}
      <UserProfilePhotoModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={user ? { ...user, avatarUrl: avatarUrl || undefined } : null}
        onAvatarUpdated={(url) => setAvatarUrl(url)}
      />
    </aside>
  );
}

export default Sidebar;
