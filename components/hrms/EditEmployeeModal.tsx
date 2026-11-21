"use client";

import { useState, useEffect, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateEmployeeAction, getHierarchyManagersAction } from "@/lib/actions/employee";
import { DEPARTMENTS } from "@/lib/constants/departments";
import { SystemRole, SalaryEntity } from "@prisma/client";
import { UserCheck, Edit, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

interface EditEmployeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: any;
  onSuccess?: () => void;
}

export default function EditEmployeeModal({
  open,
  onOpenChange,
  employee,
  onSuccess,
}: EditEmployeeModalProps) {
  const [isPending, startTransition] = useTransition();
  const [leaders, setLeaders] = useState<any[]>([]);

  // Form State
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("Male");
  const [contactNumber, setContactNumber] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [permanentAddress, setPermanentAddress] = useState("");
  const [currentAddress, setCurrentAddress] = useState("");

  const [employeeId, setEmployeeId] = useState("");
  const [dateOfJoining, setDateOfJoining] = useState("");
  const [department, setDepartment] = useState("Human Resources");
  const [designation, setDesignation] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [systemRole, setSystemRole] = useState<SystemRole>(SystemRole.TEAM_MEMBER);
  const [teamLeaderId, setTeamLeaderId] = useState("");
  const [reportingManagerId, setReportingManagerId] = useState("");
  const [monthlyTarget, setMonthlyTarget] = useState<number | "">("");

  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [salaryEntity, setSalaryEntity] = useState<SalaryEntity>(SalaryEntity.BSPL);

  // Sync employee data when modal opens
  useEffect(() => {
    if (employee && open) {
      setFirstName(employee.firstName || "");
      setMiddleName(employee.middleName || "");
      setLastName(employee.lastName || "");
      setDateOfBirth(employee.dateOfBirth ? String(employee.dateOfBirth).split("T")[0] : "");
      setGender(employee.gender || "Male");
      setContactNumber(employee.contactNumber || "");
      setPersonalEmail(employee.personalEmail || "");
      setPermanentAddress(employee.permanentAddress || "");
      setCurrentAddress(employee.currentAddress || "");

      setEmployeeId(employee.employeeId || "");
      setDateOfJoining(employee.dateOfJoining ? String(employee.dateOfJoining).split("T")[0] : "");
      setDepartment(employee.department || "Human Resources");
      setDesignation(employee.designation || "");
      setWorkEmail(employee.workEmail || "");
      setSystemRole(employee.systemRole || SystemRole.TEAM_MEMBER);
      setTeamLeaderId(employee.teamLeaderId || "");
      setReportingManagerId(employee.reportingManagerId || "");
      setMonthlyTarget(employee.monthlyTarget ?? "");

      setBankAccountNumber(employee.bankAccountNumber || "");
      setBankName(employee.bankName || "");
      ifscCode ? setIfscCode(employee.ifscCode) : setIfscCode(employee.ifscCode || "");
      setPanNumber(employee.panNumber || "");
      setAadhaarNumber(employee.aadhaarNumber || "");
      setSalaryEntity(employee.salaryEntity || SalaryEntity.BSPL);
    }
  }, [employee, open]);

  // Load hierarchy managers
  useEffect(() => {
    if (open) {
      getHierarchyManagersAction().then((res) => {
        if (res.success && res.data) {
          setLeaders(res.data);
        }
      });
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      const payload: any = {
        firstName,
        middleName: middleName || undefined,
        lastName,
        dateOfBirth,
        gender,
        nationality: employee?.nationality || "Indian",
        maritalStatus: employee?.maritalStatus || "Single",
        contactNumber,
        personalEmail,
        permanentAddress,
        currentAddress,

        educationQualification: employee?.educationQualification || "Graduate",
        professionalCertifications: employee?.professionalCertifications || undefined,
        keySkills: employee?.keySkills || undefined,
        languagesKnown: employee?.languagesKnown || ["English", "Hindi"],

        emergencyFirstName: employee?.emergencyFirstName || "Emergency",
        emergencyLastName: employee?.emergencyLastName || "Contact",
        emergencyNumber: employee?.emergencyNumber || "9876543210",
        emergencyRelationship: employee?.emergencyRelationship || "Family",

        employeeId,
        dateOfJoining,
        department,
        designation,
        workEmail,
        employmentType: employee?.employmentType || "Full-Time",
        previousEmployer: employee?.previousEmployer || undefined,
        totalExperience: employee?.totalExperience || undefined,
        branch: employee?.branch || "Headquarters - Ahmedabad",
        systemRole,
        monthlyTarget: monthlyTarget !== "" ? Number(monthlyTarget) : undefined,
        teamLeaderId: teamLeaderId || undefined,
        reportingManagerId: reportingManagerId || undefined,

        bankAccountNumber,
        bankName,
        ifscCode,
        panNumber,
        aadhaarNumber,
        passportNumber: employee?.passportNumber || undefined,
        drivingLicenseNumber: employee?.drivingLicenseNumber || undefined,
        salaryEntity,
        pfApplicable: employee?.pfApplicable ?? true,
        esicNumber: employee?.esicNumber || undefined,
        uanNumber: employee?.uanNumber || undefined,
        medicalInsuranceNumber: employee?.medicalInsuranceNumber || undefined,
      };

      const res = await updateEmployeeAction(employee.id, payload);
      if (res.success) {
        toast.success(`Employee profile for ${res.data?.name} updated successfully!`);
        onOpenChange(false);
        if (onSuccess) onSuccess();
      } else {
        toast.error(res.error || "Failed to update employee.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[88vh] overflow-y-auto rounded-[32px] bg-white/95 backdrop-blur-2xl border border-white/80 p-6 sm:p-8">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Edit className="h-5 w-5 text-[#588594]" />
            Edit Staff Record: {employee?.firstName} {employee?.lastName} ({employee?.employeeId})
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-1">
            Updates will persist directly to PostgreSQL and notify the staff member and HR administrators.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Section 1: Basic Information */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#588594] border-b border-slate-100 pb-1.5">
              Personal Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">First Name</Label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="mt-1 h-9 rounded-xl text-xs"
                  required
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Middle Name</Label>
                <Input
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  className="mt-1 h-9 rounded-xl text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Last Name</Label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="mt-1 h-9 rounded-xl text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Contact Number</Label>
                <Input
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  className="mt-1 h-9 rounded-xl text-xs"
                  required
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Personal Email</Label>
                <Input
                  type="email"
                  value={personalEmail}
                  onChange={(e) => setPersonalEmail(e.target.value)}
                  className="mt-1 h-9 rounded-xl text-xs"
                  required
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Date of Birth</Label>
                <Input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="mt-1 h-9 rounded-xl text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Current Address</Label>
                <Input
                  value={currentAddress}
                  onChange={(e) => setCurrentAddress(e.target.value)}
                  className="mt-1 h-9 rounded-xl text-xs"
                  required
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Permanent Address</Label>
                <Input
                  value={permanentAddress}
                  onChange={(e) => setPermanentAddress(e.target.value)}
                  className="mt-1 h-9 rounded-xl text-xs"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 2: Department, Role & Access Hierarchy */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#588594] border-b border-slate-100 pb-1.5">
              Department &amp; Access Hierarchy
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Employee ID</Label>
                <Input
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="mt-1 h-9 rounded-xl text-xs font-mono font-bold"
                  required
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Department</Label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="mt-1 w-full h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 font-semibold"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept === "Executive Management"
                        ? "Executive Management (C-level / Super Admin only)"
                        : dept}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Designation</Label>
                <Input
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="mt-1 h-9 rounded-xl text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Work Email</Label>
                <Input
                  type="email"
                  value={workEmail}
                  onChange={(e) => setWorkEmail(e.target.value)}
                  className="mt-1 h-9 rounded-xl text-xs"
                  required
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">System Role (RBAC)</Label>
                <select
                  value={systemRole}
                  onChange={(e) => setSystemRole(e.target.value as SystemRole)}
                  className="mt-1 w-full h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 font-semibold"
                >
                  <option value={SystemRole.TEAM_MEMBER}>TEAM_MEMBER</option>
                  <option value={SystemRole.TEAM_LEADER}>TEAM_LEADER</option>
                  <option value={SystemRole.ADMIN_HOD}>ADMIN_HOD</option>
                  <option value={SystemRole.HR_ADMIN}>HR_ADMIN</option>
                  <option value={SystemRole.SUPER_ADMIN}>SUPER_ADMIN</option>
                </select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Date of Joining</Label>
                <Input
                  type="date"
                  value={dateOfJoining}
                  onChange={(e) => setDateOfJoining(e.target.value)}
                  className="mt-1 h-9 rounded-xl text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Team Leader</Label>
                <select
                  value={teamLeaderId}
                  onChange={(e) => setTeamLeaderId(e.target.value)}
                  className="mt-1 w-full h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800"
                >
                  <option value="">None / Self</option>
                  {leaders
                    .filter((l) => l.id !== employee?.id)
                    .map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.firstName} {l.lastName} ({l.designation})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Monthly Target (₹)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 500000"
                  value={monthlyTarget}
                  onChange={(e) => setMonthlyTarget(e.target.value ? Number(e.target.value) : "")}
                  className="mt-1 h-9 rounded-xl text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Bank & Statutory */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#588594] border-b border-slate-100 pb-1.5">
              Bank &amp; Statutory Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Bank Name</Label>
                <Input
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="mt-1 h-9 rounded-xl text-xs"
                  required
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Account Number</Label>
                <Input
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  className="mt-1 h-9 rounded-xl text-xs font-mono"
                  required
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">IFSC Code</Label>
                <Input
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value)}
                  className="mt-1 h-9 rounded-xl text-xs font-mono"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">PAN Number</Label>
                <Input
                  value={panNumber}
                  onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                  className="mt-1 h-9 rounded-xl text-xs font-mono uppercase"
                  required
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Aadhaar Number</Label>
                <Input
                  value={aadhaarNumber}
                  onChange={(e) => setAadhaarNumber(e.target.value)}
                  className="mt-1 h-9 rounded-xl text-xs font-mono"
                  required
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Salary Entity</Label>
                <select
                  value={salaryEntity}
                  onChange={(e) => setSalaryEntity(e.target.value as SalaryEntity)}
                  className="mt-1 w-full h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 font-semibold"
                >
                  <option value={SalaryEntity.BSPL}>BharatEdge Services Pvt Ltd (BSPL)</option>
                  <option value={SalaryEntity.BSAPL}>BharatEdge Advisory Pvt Ltd (BSAPL)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="rounded-full text-xs px-4"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              className="bg-[#588594] hover:bg-[#466C78] text-white rounded-full text-xs font-semibold px-6 shadow-sm"
            >
              {isPending ? "Saving Changes..." : "Update Employee Record"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
