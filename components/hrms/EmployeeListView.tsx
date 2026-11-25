"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Users,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Edit,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmployeeDetailDrawer } from "./EmployeeDetailDrawer";
import EditEmployeeModal from "./EditEmployeeModal";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import BulkImportWizard from "@/components/shared/BulkImportWizard";
import BulkExportMenu from "@/components/shared/BulkExportMenu";
import { deleteEmployeeAction } from "@/lib/actions/employee";
import { DEPARTMENT_FILTER_TABS } from "@/lib/constants/departments";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { SystemRole, EmployeeStatus } from "@prisma/client";

interface EmployeeRecord {
  id: string;
  employeeId: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  dateOfBirth: Date | string;
  gender: string;
  nationality: string;
  maritalStatus: string;
  contactNumber: string;
  personalEmail: string;
  permanentAddress: string;
  currentAddress: string;
  educationQualification: string;
  professionalCertifications?: string | null;
  keySkills?: string | null;
  languagesKnown: string[];
  emergencyFirstName: string;
  emergencyLastName: string;
  emergencyNumber: string;
  emergencyRelationship: string;
  dateOfJoining: Date | string;
  department: string;
  designation: string;
  workEmail: string;
  employmentType: string;
  totalExperience?: string | null;
  branch: string;
  systemRole: SystemRole;
  monthlyTarget?: number | null;
  bankAccountNumber: string;
  bankName: string;
  ifscCode: string;
  panNumber: string;
  aadhaarNumber: string;
  salaryEntity: string;
  pfApplicable: boolean;
  uanNumber?: string | null;
  esicNumber?: string | null;
  status: EmployeeStatus;
  teamLeader?: { id: string; firstName: string; lastName: string; employeeId: string } | null;
  reportingManager?: { id: string; firstName: string; lastName: string; employeeId: string } | null;
}

interface EmployeeListViewProps {
  initialEmployees: EmployeeRecord[];
  totalCount: number;
  canCreate?: boolean;
}

const DEPARTMENTS = DEPARTMENT_FILTER_TABS;

const ROLES = [
  { label: "All Roles", value: "ALL" },
  { label: "Super Admin", value: "SUPER_ADMIN" },
  { label: "Admin / HOD", value: "ADMIN_HOD" },
  { label: "HR Admin", value: "HR_ADMIN" },
  { label: "Team Leader", value: "TEAM_LEADER" },
  { label: "Team Member", value: "TEAM_MEMBER" },
];

const STATUSES = [
  { label: "All Status", value: "ALL" },
  { label: "Active", value: "ACTIVE" },
  { label: "Onboarding", value: "ONBOARDING" },
  { label: "On Leave", value: "ON_LEAVE" },
  { label: "Terminated", value: "TERMINATED" },
];

export function EmployeeListView({
  initialEmployees,
  totalCount,
  canCreate = false,
}: EmployeeListViewProps) {
  const [employees, setEmployees] = useState<EmployeeRecord[]>(initialEmployees);
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [selectedRole, setSelectedRole] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const pageSize = 8;

  // Drawer state for viewing employee full 360 profile
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRecord | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Edit & Delete modal states
  const router = useRouter();
  const [editingEmployee, setEditingEmployee] = useState<EmployeeRecord | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deletingEmployee, setDeletingEmployee] = useState<EmployeeRecord | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeletePending, setIsDeletePending] = useState(false);

  const handleOpenEdit = (e: React.MouseEvent, emp: EmployeeRecord) => {
    e.stopPropagation();
    setEditingEmployee(emp);
    setIsEditOpen(true);
  };

  const handleOpenDelete = (e: React.MouseEvent, emp: EmployeeRecord) => {
    e.stopPropagation();
    setDeletingEmployee(emp);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingEmployee) return;
    setIsDeletePending(true);
    const res = await deleteEmployeeAction(deletingEmployee.id);
    setIsDeletePending(false);
    if (res.success) {
      toast.success(`Employee ${deletingEmployee.firstName} ${deletingEmployee.lastName} removed.`);
      setEmployees((prev) => prev.filter((e) => e.id !== deletingEmployee.id));
      setIsDeleteOpen(false);
      setDeletingEmployee(null);
      if (selectedEmployee?.id === deletingEmployee.id) {
        setIsDrawerOpen(false);
      }
    } else {
      toast.error(res.error || "Failed to delete employee.");
    }
  };

  // Client-side filtering across current cached dataset
  const filteredEmployees = employees.filter((emp) => {
    const query = search.toLowerCase().trim();
    const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
    const matchesSearch =
      !query ||
      fullName.includes(query) ||
      emp.employeeId.toLowerCase().includes(query) ||
      emp.workEmail.toLowerCase().includes(query) ||
      emp.designation.toLowerCase().includes(query) ||
      emp.department.toLowerCase().includes(query);

    const matchesDept = selectedDept === "ALL" || emp.department === selectedDept;
    const matchesRole = selectedRole === "ALL" || emp.systemRole === selectedRole;
    const matchesStatus = selectedStatus === "ALL" || emp.status === selectedStatus;

    return matchesSearch && matchesDept && matchesRole && matchesStatus;
  });

  const totalPages = Math.ceil(filteredEmployees.length / pageSize) || 1;
  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleOpenDrawer = (emp: EmployeeRecord) => {
    setSelectedEmployee(emp);
    setIsDrawerOpen(true);
  };

  const formatRowDate = (dateVal: string | Date | null | undefined) => {
    if (!dateVal) return "—";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "—";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Aesthetic soft status text matching reference ("Quotation Sent", "Sales Order")
  const getStatusTextColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "text-[#10B981]"; // Soft aesthetic emerald
      case "ONBOARDING":
        return "text-[#0EA5E9]"; // Soft aesthetic cyan/blue
      case "ON_LEAVE":
        return "text-[#F59E0B]"; // Soft aesthetic warm amber
      case "TERMINATED":
        return "text-[#F43F5E]"; // Soft aesthetic rose
      default:
        return "text-slate-600";
    }
  };

  const formatStatusText = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "Active";
      case "ONBOARDING":
        return "Onboarding";
      case "ON_LEAVE":
        return "On Leave";
      case "TERMINATED":
        return "Terminated";
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Translucent, Glassmorphic Container Block (per Reference Image 1) */}
      <div className="rounded-[36px] bg-white/70 backdrop-blur-2xl border border-white/80 shadow-[0_12px_40px_rgba(0,0,0,0.03)] p-6 sm:p-8">
        {/* Top Department Category Pills / Tabs */}
        <div className="flex items-center gap-3 overflow-x-auto pb-3 scrollbar-none border-b border-slate-100/80 mb-6">
          {DEPARTMENTS.map((dept) => {
            const isActive = selectedDept === dept;
            return (
              <button
                key={dept}
                onClick={() => {
                  setSelectedDept(dept);
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "text-slate-900 font-bold bg-white shadow-2xs border border-slate-200/70"
                    : "text-slate-500 hover:text-slate-900 font-medium"
                }`}
              >
                {dept === "ALL" ? "All Departments" : dept}
              </button>
            );
          })}
        </div>

        {/* Action Row: Create Button + Search & Filters */}
        <div className="relative z-20 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          {/* Create Employee + Import + Export Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {canCreate && (
              <Link
                href="/hrms/directory/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-200/90 bg-white/90 hover:bg-white text-slate-800 text-xs font-medium shadow-2xs hover:shadow-xs transition-all cursor-pointer w-fit"
              >
                <span>Create Employee</span>
                <Plus className="h-3.5 w-3.5 text-slate-500" />
              </Link>
            )}

            {canCreate && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsImportOpen(true)}
                className="rounded-full text-xs gap-1.5 h-9 border-slate-200 text-slate-700 bg-white/90 hover:bg-white shadow-2xs font-medium cursor-pointer"
              >
                <UploadCloud className="h-3.5 w-3.5 text-[#F0944D]" />
                Import Directory
              </Button>
            )}

            <BulkExportMenu
              moduleKey="employees"
              selectedIds={selectedEmployeeIds}
              totalCount={filteredEmployees.length}
              searchQuery={search}
            />

            {selectedEmployeeIds.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-xs text-[#F0944D] font-semibold">
                <span>{selectedEmployeeIds.length} selected</span>
                <button
                  type="button"
                  onClick={() => setSelectedEmployeeIds([])}
                  className="text-[10px] underline hover:text-orange-700 ml-1 cursor-pointer"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff, ID, designation..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-56 sm:w-64 pl-9 pr-3.5 py-1.5 rounded-full bg-white/90 border border-slate-200/80 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#F0944D]/25 shadow-2xs"
              />
            </div>

            {/* Role Filter */}
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3.5 py-1.5 rounded-full bg-white/90 border border-slate-200/80 text-xs text-slate-700 focus:outline-none shadow-2xs cursor-pointer"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3.5 py-1.5 rounded-full bg-white/90 border border-slate-200/80 text-xs text-slate-700 focus:outline-none shadow-2xs cursor-pointer"
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>

            {(search || selectedDept !== "ALL" || selectedRole !== "ALL" || selectedStatus !== "ALL") && (
              <button
                onClick={() => {
                  setSearch("");
                  setSelectedDept("ALL");
                  setSelectedRole("ALL");
                  setSelectedStatus("ALL");
                  setCurrentPage(1);
                }}
                title="Reset filters"
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-white transition-colors cursor-pointer border border-transparent hover:border-slate-200"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 2 & 3. Data Table with Shaded Header & Clean Rows (per Reference Image 1) */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-0 text-xs">
            {/* Table Header (thead): Shaded translucent gray row with sentence case typography */}
            <thead>
              <tr className="bg-[#E7EAEF]/90 text-slate-600">
                <th className="py-3 px-3 pl-4 font-medium text-slate-600 rounded-l-2xl whitespace-nowrap w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredEmployees.length > 0 && selectedEmployeeIds.length === filteredEmployees.length}
                    onChange={() => {
                      if (selectedEmployeeIds.length === filteredEmployees.length) {
                        setSelectedEmployeeIds([]);
                      } else {
                        setSelectedEmployeeIds(filteredEmployees.map((e) => e.id));
                      }
                    }}
                    className="rounded border-slate-300 text-[#F0944D] focus:ring-[#F0944D] cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4 font-medium text-slate-600 whitespace-nowrap">
                  Employee ID
                </th>
                <th className="py-3 px-4 font-medium text-slate-600 whitespace-nowrap">
                  Joining Date
                </th>
                <th className="py-3 px-4 font-medium text-slate-600 whitespace-nowrap">
                  Staff Name
                </th>
                <th className="py-3 px-4 font-medium text-slate-600 whitespace-nowrap">
                  Department
                </th>
                <th className="py-3 px-4 font-medium text-slate-600 whitespace-nowrap">
                  Designation
                </th>
                <th className="py-3 px-4 font-medium text-slate-600 whitespace-nowrap">
                  Work Email
                </th>
                <th className="py-3 px-4 font-medium text-slate-600 whitespace-nowrap">
                  Status
                </th>
                <th className="py-3 px-4 font-medium text-slate-600 whitespace-nowrap text-right">
                  System Role
                </th>
                <th className="py-3 px-4 pr-5 font-medium text-slate-600 rounded-r-2xl whitespace-nowrap text-right">
                  Actions
                </th>
              </tr>
            </thead>

            {/* Table Rows (tbody): Clean padding, no avatars, subtle border-bottom, soft status text */}
            <tbody>
              {paginatedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold text-slate-600">No employees found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Try adjusting your search query or department filter.</p>
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map((emp) => (
                  <tr
                    key={emp.id}
                    className="hover:bg-white/60 transition-colors cursor-pointer group"
                    onClick={() => handleOpenDrawer(emp)}
                  >
                    <td className="py-3.5 px-3 pl-4 border-b border-slate-200/50 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedEmployeeIds.includes(emp.id)}
                        onChange={() =>
                          setSelectedEmployeeIds((prev) =>
                            prev.includes(emp.id)
                              ? prev.filter((id) => id !== emp.id)
                              : [...prev, emp.id]
                          )
                        }
                        className="rounded border-slate-300 text-[#F0944D] focus:ring-[#F0944D] cursor-pointer"
                      />
                    </td>
                    {/* Employee ID */}
                    <td className="py-3.5 px-4 pl-5 border-b border-slate-200/50 font-mono text-slate-600 text-xs whitespace-nowrap">
                      {emp.employeeId}
                    </td>

                    {/* Joining Date (Formatted as DD-MM-YYYY) */}
                    <td className="py-3.5 px-4 border-b border-slate-200/50 text-slate-600 text-xs whitespace-nowrap font-mono">
                      {formatRowDate(emp.dateOfJoining)}
                    </td>

                    {/* Staff Name (Clean text alignment without circular avatar) */}
                    <td className="py-3.5 px-4 border-b border-slate-200/50 font-medium text-slate-900 text-xs whitespace-nowrap">
                      {emp.firstName} {emp.lastName}
                    </td>

                    {/* Department */}
                    <td className="py-3.5 px-4 border-b border-slate-200/50 text-slate-600 text-xs whitespace-nowrap">
                      {emp.department}
                    </td>

                    {/* Designation */}
                    <td className="py-3.5 px-4 border-b border-slate-200/50 text-slate-700 text-xs whitespace-nowrap">
                      {emp.designation}
                    </td>

                    {/* Work Email */}
                    <td className="py-3.5 px-4 border-b border-slate-200/50 text-slate-600 text-xs whitespace-nowrap">
                      {emp.workEmail}
                    </td>

                    {/* Status (Soft aesthetic colored typography, no harsh dots) */}
                    <td className="py-3.5 px-4 border-b border-slate-200/50 whitespace-nowrap">
                      <span className={`text-xs ${getStatusTextColor(emp.status)}`}>
                        {formatStatusText(emp.status)}
                      </span>
                    </td>

                    {/* System Role */}
                    <td className="py-3.5 px-4 border-b border-slate-200/50 text-right whitespace-nowrap text-slate-600 text-xs font-medium">
                      {emp.systemRole.replace("_", " ")}
                    </td>

                    {/* Actions: Edit & Delete */}
                    <td className="py-3.5 px-4 pr-5 border-b border-slate-200/50 text-right whitespace-nowrap">
                      <div
                        className="flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={(e) => handleOpenEdit(e, emp)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#588594] hover:bg-[#EBF3F6] transition-colors cursor-pointer"
                          title="Edit Staff Record"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleOpenDelete(e, emp)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Staff Record"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Styled Pagination Component at Bottom Left (matching Reference Image 1) */}
        <div className="flex items-center gap-1.5 mt-6 pt-2">
          {/* Previous Chevron Button */}
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            aria-label="Previous page"
            className="w-7 h-7 rounded-full flex items-center justify-center border border-slate-200/80 bg-white/90 text-slate-500 hover:text-slate-900 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>

          {/* Page Pills with Neon-Yellow Highlight for Active Page */}
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
            const isActive = currentPage === page;
            return (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
                  isActive
                    ? "bg-[#E2F16D] text-slate-950 font-bold border border-[#D4E882]"
                    : "bg-white/80 border border-slate-200/70 text-slate-600 hover:bg-white hover:text-slate-900"
                }`}
              >
                {page}
              </button>
            );
          })}

          {/* Next Chevron Button */}
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            aria-label="Next page"
            className="w-7 h-7 rounded-full flex items-center justify-center border border-slate-200/80 bg-white/90 text-slate-500 hover:text-slate-900 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 360 Degree Profile Slide-Over Drawer */}
      <EmployeeDetailDrawer
        employee={selectedEmployee}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />

      {/* Edit Employee Modal */}
      {editingEmployee && (
        <EditEmployeeModal
          open={isEditOpen}
          onOpenChange={(open) => {
            setIsEditOpen(open);
            if (!open) setEditingEmployee(null);
          }}
          employee={editingEmployee}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        open={isDeleteOpen}
        onOpenChange={(open) => {
          setIsDeleteOpen(open);
          if (!open) setDeletingEmployee(null);
        }}
        title="Delete Employee Record"
        description={`Are you sure you want to permanently delete the staff record for ${deletingEmployee?.firstName} ${deletingEmployee?.lastName} (${deletingEmployee?.employeeId})? This action will safely clean up associated leave balances and historical logs.`}
        confirmLabel="Confirm Delete"
        isPending={isDeletePending}
        onConfirm={handleConfirmDelete}
      />

      {/* Bulk Import Directory Wizard */}
      <BulkImportWizard
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        moduleKey="employees"
        onSuccess={() => window.location.reload()}
      />
    </div>
  );
}

export default EmployeeListView;
