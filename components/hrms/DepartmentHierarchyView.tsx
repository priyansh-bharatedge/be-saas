"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  DepartmentHierarchyData,
  DepartmentGroup,
  HierarchyMember,
  getDepartmentHierarchyAction,
} from "@/lib/actions/employee";
import { TrackerStatus, SystemRole } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  UserCheck,
  CalendarOff,
  Clock,
  Search,
  Building2,
  ShieldCheck,
  Mail,
  Phone,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  Crown,
  UserPlus,
  Filter,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  initialData: DepartmentHierarchyData;
}

export default function DepartmentHierarchyView({ initialData }: Props) {
  const [data, setData] = useState<DepartmentHierarchyData>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDept, setSelectedDept] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "CLOCKED_IN" | "ON_LEAVE" | "PENDING_LEAVE">("ALL");
  const [expandedTls, setExpandedTls] = useState<Record<string, boolean>>({});

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const res = await getDepartmentHierarchyAction();
      if (res.success && res.data) {
        setData(res.data);
        toast.success("Hierarchy data updated.");
      } else {
        toast.error(res.error || "Failed to refresh hierarchy data.");
      }
    } catch {
      toast.error("An error occurred while refreshing.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTlExpand = (tlId: string) => {
    setExpandedTls((prev) => ({
      ...prev,
      [tlId]: prev[tlId] === false ? true : false, // Default expanded if undefined
    }));
  };

  const isTlExpanded = (tlId: string) => {
    return expandedTls[tlId] !== false; // default true
  };

  // Extract department names
  const departmentNames = useMemo(() => {
    return data.departments.map((d) => d.department);
  }, [data.departments]);

  // Filtered department groups
  const filteredDepartments = useMemo(() => {
    return data.departments
      .filter((dept) => selectedDept === "ALL" || dept.department === selectedDept)
      .map((dept) => {
        const matchesQuery = (m: HierarchyMember) => {
          if (!searchQuery.trim()) return true;
          const q = searchQuery.toLowerCase();
          return (
            m.name.toLowerCase().includes(q) ||
            m.workEmail.toLowerCase().includes(q) ||
            m.designation.toLowerCase().includes(q) ||
            m.employeeId.toLowerCase().includes(q)
          );
        };

        const matchesStatus = (m: HierarchyMember) => {
          if (statusFilter === "ALL") return true;
          if (statusFilter === "CLOCKED_IN") {
            return (
              m.attendanceToday.status === TrackerStatus.ACTIVE ||
              m.attendanceToday.status === TrackerStatus.IDLE
            );
          }
          if (statusFilter === "ON_LEAVE") return m.onLeaveToday;
          return true;
        };

        const filterMember = (m: HierarchyMember) => matchesQuery(m) && matchesStatus(m);

        const filteredHods = dept.hods.filter(filterMember);
        const filteredTeamLeaders = dept.teamLeaders
          .map((tlGroup) => {
            const leaderMatches = filterMember(tlGroup.leader);
            const filteredMembers = tlGroup.members.filter(filterMember);
            if (leaderMatches || filteredMembers.length > 0) {
              return {
                leader: tlGroup.leader,
                members: filteredMembers,
              };
            }
            return null;
          })
          .filter(Boolean) as { leader: HierarchyMember; members: HierarchyMember[] }[];

        const filteredDirect = dept.directMembers.filter(filterMember);

        return {
          ...dept,
          hods: filteredHods,
          teamLeaders: filteredTeamLeaders,
          directMembers: filteredDirect,
        };
      })
      .filter(
        (dept) =>
          dept.hods.length > 0 ||
          dept.teamLeaders.length > 0 ||
          dept.directMembers.length > 0
      );
  }, [data.departments, selectedDept, searchQuery, statusFilter]);

  // Attendance badge helper
  const renderAttendanceBadge = (member: HierarchyMember) => {
    if (member.onLeaveToday) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
          <CalendarOff className="w-3 h-3 text-amber-600" />
          On Leave ({member.leaveType || "Leave"})
        </span>
      );
    }

    if (
      member.attendanceToday.status === TrackerStatus.ACTIVE ||
      member.attendanceToday.status === TrackerStatus.IDLE
    ) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Clocked In {member.attendanceToday.totalHours > 0 ? `(${member.attendanceToday.totalHours.toFixed(1)}h)` : ""}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800/80 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
        <Clock className="w-3 h-3 text-slate-400" />
        Clocked Out
      </span>
    );
  };

  const getSystemRoleBadge = (systemRole: SystemRole) => {
    switch (systemRole) {
      case SystemRole.SUPER_ADMIN:
        return <Badge className="bg-purple-600/90 text-white border-0 text-[10px]">Super Admin</Badge>;
      case SystemRole.HR_ADMIN:
        return <Badge className="bg-sky-600/90 text-white border-0 text-[10px]">HR Admin</Badge>;
      case SystemRole.ADMIN_HOD:
        return <Badge className="bg-blue-600/90 text-white border-0 text-[10px]">Head of Dept</Badge>;
      case SystemRole.TEAM_LEADER:
        return <Badge className="bg-amber-600/90 text-white border-0 text-[10px]">Team Leader</Badge>;
      default:
        return <Badge variant="outline" className="text-slate-600 dark:text-slate-300 text-[10px]">Team Member</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Scope & Access Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-[#ACCAD5]/30 via-white/80 to-[#F0944D]/20 dark:from-slate-800/60 dark:via-slate-900/60 dark:to-slate-800/60 backdrop-blur-md border border-[#ACCAD5]/50 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#F0944D]/20 dark:bg-[#F0944D]/30 flex items-center justify-center text-[#F0944D]">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Department Hierarchy & Reporting Structure
              </h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#ACCAD5]/40 text-slate-800 dark:bg-slate-700 dark:text-slate-200 border border-[#ACCAD5]/60">
                {data.userRole.isSuperAdmin
                  ? "Full Enterprise Access"
                  : data.userRole.isHrAdmin
                  ? "HR Global Scope"
                  : data.userRole.isHod
                  ? `${data.userRole.department} Department Scope`
                  : data.userRole.isTl
                  ? "Team Scope"
                  : "Personal Scope"}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Live organizational tree with real-time attendance, on-leave flags, and managerial hierarchy.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={isLoading}
            className="border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh Live Status
          </Button>
          {(data.userRole.isSuperAdmin || data.userRole.isHrAdmin) && (
            <Link href="/hrms/directory">
              <Button size="sm" className="bg-[#F0944D] hover:bg-[#F0944D]/90 text-white">
                <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                Manage Staff
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-white/40 dark:border-slate-800 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Scoped Workforce</p>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                {data.totalCompanyEmployees}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Across {data.departments.length} departments</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-white/40 dark:border-slate-800 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Clocked In Today</p>
              <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {data.totalClockedIn}
              </h3>
              <p className="text-[11px] text-emerald-600/80 font-medium mt-0.5">
                {data.totalCompanyEmployees > 0
                  ? `${Math.round((data.totalClockedIn / data.totalCompanyEmployees) * 100)}% attendance rate`
                  : "0%"}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-white/40 dark:border-slate-800 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">On Approved Leave Today</p>
              <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                {data.totalOnLeave}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Approved absence</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 flex items-center justify-center">
              <CalendarOff className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-white/40 dark:border-slate-800 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Pending Leave Approvals</p>
              <h3 className="text-2xl font-bold text-[#F0944D] mt-1">
                {data.totalPendingLeaves}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Awaiting TL / HR review</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#F0944D]/15 text-[#F0944D] flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/40 dark:border-slate-800">
        {/* Department Selection Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedDept("ALL")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all shrink-0 ${
              selectedDept === "ALL"
                ? "bg-[#F0944D] text-white shadow-sm"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300"
            }`}
          >
            All Departments
          </button>
          {departmentNames.map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all shrink-0 ${
                selectedDept === dept
                  ? "bg-[#F0944D] text-white shadow-sm"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300"
              }`}
            >
              {dept}
            </button>
          ))}
        </div>

        {/* Search & Status Filters */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-60">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search member, role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-8 text-xs px-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300"
          >
            <option value="ALL">All Status</option>
            <option value="CLOCKED_IN">Clocked In Only</option>
            <option value="ON_LEAVE">On Leave Only</option>
          </select>
        </div>
      </div>

      {/* Department Trees */}
      {filteredDepartments.length === 0 ? (
        <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-dashed border-slate-300 dark:border-slate-800">
          <CardContent className="p-12 text-center text-slate-500">
            <Users className="w-10 h-10 mx-auto text-slate-400 mb-3 opacity-60" />
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">No staff members match the selected filters</h4>
            <p className="text-xs text-slate-500 mt-1">Try resetting the department or search query.</p>
          </CardContent>
        </Card>
      ) : (
        filteredDepartments.map((dept) => (
          <DepartmentTreeCard
            key={dept.department}
            dept={dept}
            renderAttendanceBadge={renderAttendanceBadge}
            getSystemRoleBadge={getSystemRoleBadge}
            isTlExpanded={isTlExpanded}
            toggleTlExpand={toggleTlExpand}
          />
        ))
      )}
    </div>
  );
}

// Subcomponent: Individual Department Hierarchy Tree Card
interface DepartmentTreeCardProps {
  dept: DepartmentGroup;
  renderAttendanceBadge: (member: HierarchyMember) => React.ReactNode;
  getSystemRoleBadge: (role: SystemRole) => React.ReactNode;
  isTlExpanded: (tlId: string) => boolean;
  toggleTlExpand: (tlId: string) => void;
}

function DepartmentTreeCard({
  dept,
  renderAttendanceBadge,
  getSystemRoleBadge,
  isTlExpanded,
  toggleTlExpand,
}: DepartmentTreeCardProps) {
  return (
    <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-white/40 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Department Header */}
      <div className="px-5 py-3.5 bg-gradient-to-r from-slate-100/80 via-white/50 to-slate-50/50 dark:from-slate-800/80 dark:via-slate-900/50 dark:to-slate-800/50 border-b border-slate-200/60 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ACCAD5] to-[#F0944D]/70 flex items-center justify-center text-white font-bold text-sm shadow-sm">
            {dept.department.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {dept.department} Department
            </h3>
            <span className="text-[11px] text-slate-500">
              {dept.stats.totalEmployees} Members · {dept.teamLeaders.length} Teams
            </span>
          </div>
        </div>

        {/* Live Attendance Badges */}
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-medium">
            {dept.stats.clockedIn} Present
          </span>
          {dept.stats.onLeave > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 font-medium">
              {dept.stats.onLeave} on Leave
            </span>
          )}
          {dept.stats.pendingLeaves > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 font-medium">
              {dept.stats.pendingLeaves} Pending Leaves
            </span>
          )}
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Tier 1: Department Leadership (HODs) */}
        {dept.hods.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Crown className="w-4 h-4 text-amber-500" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Department Leadership (HOD)
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {dept.hods.map((hod) => (
                <MemberCard
                  key={hod.id}
                  member={hod}
                  isHod
                  renderAttendanceBadge={renderAttendanceBadge}
                  getSystemRoleBadge={getSystemRoleBadge}
                />
              ))}
            </div>
          </div>
        )}

        {/* Tier 2: Team Leaders & Subordinate Teams */}
        {dept.teamLeaders.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-indigo-500" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Team Clusters & Managerial Chains
              </h4>
            </div>

            <div className="space-y-4">
              {dept.teamLeaders.map(({ leader, members }) => {
                const expanded = isTlExpanded(leader.id);
                return (
                  <div
                    key={leader.id}
                    className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 overflow-hidden"
                  >
                    {/* TL Bar */}
                    <div className="p-3.5 bg-white/80 dark:bg-slate-800/80 flex items-center justify-between gap-3 border-b border-slate-200/60 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleTlExpand(leader.id)}
                          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
                        >
                          {expanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>

                        <div className="w-8 h-8 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold text-xs flex items-center justify-center border border-amber-500/20">
                          {leader.firstName.charAt(0)}{leader.lastName.charAt(0)}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                              {leader.name}
                            </span>
                            <Badge className="bg-amber-600/90 text-white text-[10px]">Team Leader</Badge>
                            <span className="text-[11px] text-slate-500">({leader.employeeId})</span>
                          </div>
                          <p className="text-[11px] text-slate-500">{leader.designation}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {renderAttendanceBadge(leader)}
                        <Badge variant="outline" className="text-slate-600 dark:text-slate-300 text-[11px]">
                          {members.length} Direct Report{members.length !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                    </div>

                    {/* Subordinate Team Members Accordion */}
                    <AnimatePresence>
                      {expanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="p-3.5"
                        >
                          {members.length === 0 ? (
                            <p className="text-xs text-slate-400 italic py-2 pl-4">
                              No team members currently reporting to this Team Leader.
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                              {members.map((member) => (
                                <MemberCard
                                  key={member.id}
                                  member={member}
                                  renderAttendanceBadge={renderAttendanceBadge}
                                  getSystemRoleBadge={getSystemRoleBadge}
                                />
                              ))}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tier 3: Direct / Independent Staff */}
        {dept.directMembers.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-slate-500" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Direct Department Staff (Reporting to HOD)
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {dept.directMembers.map((member) => (
                <MemberCard
                  key={member.id}
                  member={member}
                  renderAttendanceBadge={renderAttendanceBadge}
                  getSystemRoleBadge={getSystemRoleBadge}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

// Subcomponent: Single Member Card
interface MemberCardProps {
  member: HierarchyMember;
  isHod?: boolean;
  renderAttendanceBadge: (member: HierarchyMember) => React.ReactNode;
  getSystemRoleBadge: (role: SystemRole) => React.ReactNode;
}

function MemberCard({
  member,
  isHod,
  renderAttendanceBadge,
  getSystemRoleBadge,
}: MemberCardProps) {
  return (
    <div
      className={`p-3 rounded-lg border transition-all ${
        isHod
          ? "bg-gradient-to-br from-amber-50/50 via-white to-orange-50/30 dark:from-slate-800/70 dark:to-slate-800/40 border-amber-200/80 dark:border-amber-900/40 shadow-sm"
          : "bg-white/90 dark:bg-slate-800/60 border-slate-200/70 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center shrink-0">
            {member.firstName.charAt(0)}{member.lastName.charAt(0)}
          </div>
          <div>
            <h5 className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              {member.name}
            </h5>
            <p className="text-[11px] text-slate-500">{member.designation}</p>
          </div>
        </div>

        <div>{getSystemRoleBadge(member.systemRole)}</div>
      </div>

      <div className="space-y-1 mb-2.5 text-[11px] text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-1.5 truncate">
          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="truncate">{member.workEmail}</span>
        </div>
        {member.phone && (
          <div className="flex items-center gap-1.5">
            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
            <span>{member.phone}</span>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
        <div>{renderAttendanceBadge(member)}</div>
        <span className="text-[10px] text-slate-400 font-mono">{member.employeeId}</span>
      </div>
    </div>
  );
}
