"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  MessageSquare,
  Search,
  LayoutGrid,
  ChevronRight,
  Clock,
  Users,
  Compass,
  Briefcase,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { AuthUser } from "@/lib/auth/session";
import NotificationBell from "@/components/notifications/NotificationBell";

interface NavbarProps {
  user?: AuthUser | null;
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();

  // Generate dynamic breadcrumbs matching reference ("Maham > Schedule")
  const getBreadcrumbs = () => {
    if (pathname.startsWith("/admin")) {
      return { parent: "Executive Hub", title: "Super Admin Command Center", icon: ShieldCheck };
    }
    if (pathname.startsWith("/hrms/directory/new")) {
      return { parent: "HRMS", title: "New Employee", icon: Users };
    }
    if (pathname.startsWith("/hrms/directory")) {
      return { parent: "HRMS", title: "Employee Directory", icon: Users };
    }
    if (pathname.startsWith("/hrms/attendance")) {
      return { parent: "HRMS", title: "Attendance & Logs", icon: Clock };
    }
    if (pathname.startsWith("/hrms/departments")) {
      return { parent: "HRMS", title: "Department Access", icon: ShieldCheck };
    }
    if (pathname.startsWith("/hrms")) {
      return { parent: "HRMS", title: "Overview", icon: Compass };
    }
    if (pathname.startsWith("/crm/deals")) {
      return { parent: "CRM", title: "Deal Pipelines", icon: Briefcase };
    }
    if (pathname.startsWith("/crm/leads")) {
      return { parent: "CRM", title: "Leads Registry", icon: Building2 };
    }
    if (pathname.startsWith("/crm/prospects")) {
      return { parent: "CRM", title: "Prospect Master Sheets", icon: Building2 };
    }
    if (pathname.startsWith("/crm/quotations")) {
      return { parent: "CRM", title: "Quotations Engine", icon: Briefcase };
    }
    if (pathname.startsWith("/crm/payments")) {
      return { parent: "CRM", title: "Payment Records", icon: Briefcase };
    }
    if (pathname.startsWith("/crm/operations")) {
      return { parent: "CRM", title: "Internal Operations", icon: Briefcase };
    }
    if (pathname.startsWith("/crm/clients")) {
      return { parent: "CRM", title: "Clients Directory", icon: Users };
    }
    if (pathname.startsWith("/crm/companies")) {
      return { parent: "CRM", title: "Companies Directory", icon: Building2 };
    }
    if (pathname.startsWith("/crm/services")) {
      return { parent: "CRM", title: "Services Catalog", icon: Briefcase };
    }
    if (pathname.startsWith("/crm/workflows")) {
      return { parent: "CRM", title: "Sales Workflows", icon: Briefcase };
    }
    if (pathname.startsWith("/crm")) {
      return { parent: "CRM", title: "Overview", icon: Compass };
    }
    if (pathname.startsWith("/support/tickets")) {
      return { parent: "Support", title: "Ticket Management", icon: MessageSquare };
    }
    if (pathname.startsWith("/support/quality")) {
      return { parent: "Support", title: "Quality Audit Desk", icon: ShieldCheck };
    }
    if (pathname.startsWith("/support")) {
      return { parent: "Support", title: "Overview", icon: Compass };
    }
    return { parent: "BharatEdge", title: "Operations", icon: Compass };
  };

  const crumb = getBreadcrumbs();
  const Icon = crumb.icon;

  return (
    <header className="h-16 px-6 sm:px-8 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white select-none">
      {/* Breadcrumbs on Left (matching reference: Maham > Schedule) */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-400 font-medium">{crumb.parent}</span>
        <ChevronRight className="h-3 w-3 text-slate-300" />
        <span className="flex items-center gap-1.5 font-bold text-slate-900">
          <Icon className="h-3.5 w-3.5 text-slate-700" />
          <span>{crumb.title}</span>
        </span>
      </div>

      {/* Quick Action Icons on Right (matching reference icons: notifications, chat, search) */}
      <div className="flex items-center gap-2">
        {/* Search Action */}
        <button
          type="button"
          aria-label="Search"
          className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <Search className="h-4 w-4" />
        </button>

        {/* Message / Chat Action */}
        <Link
          href="/support/tickets"
          aria-label="Messages"
          className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <MessageSquare className="h-4 w-4" />
        </Link>

        {/* Notification Bell with Dropdown */}
        <NotificationBell />

        <div className="h-4 w-px bg-slate-200 mx-1" />

        {/* Central Hub Button */}
        <Link
          href="/portal"
          title="Central Gateway Hub"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all hover:scale-105 active:scale-95"
        >
          <LayoutGrid className="h-3.5 w-3.5 text-[#C66318]" />
          <span className="hidden sm:inline">Hub</span>
        </Link>
      </div>
    </header>
  );
}

export default Navbar;
