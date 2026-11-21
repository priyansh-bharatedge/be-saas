"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Building2,
  Calendar,
  CreditCard,
  FileText,
  ShieldCheck,
  Award,
  Globe,
  HeartPulse,
} from "lucide-react";

interface EmployeeDetailDrawerProps {
  employee: any | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EmployeeDetailDrawer({
  employee,
  isOpen,
  onClose,
}: EmployeeDetailDrawerProps) {
  if (!employee) return null;

  const formatDate = (dateVal: string | Date | null | undefined) => {
    if (!dateVal) return "N/A";
    return new Date(dateVal).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-50"
          />

          {/* Drawer Card */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white/95 backdrop-blur-2xl shadow-2xl border-l border-slate-200/80 z-50 overflow-y-auto flex flex-col"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md px-6 py-5 border-b border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#ACCAD5] to-[#F0944D] text-white flex items-center justify-center font-bold text-base shadow-sm">
                  {employee.firstName?.charAt(0)}
                  {employee.lastName?.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">
                      {employee.firstName} {employee.middleName ? `${employee.middleName} ` : ""}{employee.lastName}
                    </h2>
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {employee.employeeId}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    {employee.designation} • {employee.department}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-6 flex-1 text-xs">
              {/* Status Banner */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-[#FCFAF7] border border-slate-200/80">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                  <div>
                    <p className="font-semibold text-slate-900">Employment Status: {employee.status || "ACTIVE"}</p>
                    <p className="text-slate-500 text-[11px]">Joined on {formatDate(employee.dateOfJoining)}</p>
                  </div>
                </div>
                <span className="font-mono text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {employee.systemRole?.replace("_", " ")}
                </span>
              </div>

              {/* Section 1: Contact & Personal Info */}
              <div className="rounded-2xl border border-slate-200/80 p-5 bg-white/70 shadow-2xs space-y-3">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <User className="h-4 w-4 text-[#F0944D]" /> Personal Information
                </h3>
                <div className="grid grid-cols-2 gap-3 text-slate-600">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Personal Email</span>
                    <span className="text-slate-800 font-medium break-all">{employee.personalEmail || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Work Email</span>
                    <span className="text-slate-800 font-medium break-all">{employee.workEmail || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Phone</span>
                    <span className="text-slate-800 font-medium">{employee.contactNumber || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Date of Birth</span>
                    <span className="text-slate-800 font-medium">{formatDate(employee.dateOfBirth)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Gender & Marital Status</span>
                    <span className="text-slate-800 font-medium">{employee.gender} • {employee.maritalStatus}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Nationality</span>
                    <span className="text-slate-800 font-medium">{employee.nationality || "Indian"}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Current Address</span>
                    <span className="text-slate-800 font-medium">{employee.currentAddress || "N/A"}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Permanent Address</span>
                    <span className="text-slate-800 font-medium">{employee.permanentAddress || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* Section 2: Education & Skills */}
              <div className="rounded-2xl border border-slate-200/80 p-5 bg-white/70 shadow-2xs space-y-3">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Award className="h-4 w-4 text-[#ACCAD5]" /> Education & Spoken Languages
                </h3>
                <div className="space-y-2 text-slate-600">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Highest Qualification</span>
                    <span className="text-slate-800 font-medium">{employee.educationQualification || "N/A"}</span>
                  </div>
                  {employee.professionalCertifications && (
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">Certifications</span>
                      <span className="text-slate-800 font-medium">{employee.professionalCertifications}</span>
                    </div>
                  )}
                  {employee.keySkills && (
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">Key Skills</span>
                      <span className="text-slate-800 font-medium">{employee.keySkills}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Languages Known</span>
                    <div className="flex gap-1.5 flex-wrap">
                      {employee.languagesKnown?.map((lang: string) => (
                        <span key={lang} className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono text-[10px]">
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Hierarchy & Department */}
              <div className="rounded-2xl border border-slate-200/80 p-5 bg-white/70 shadow-2xs space-y-3">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[#C66318]" /> Department & Access Hierarchy
                </h3>
                <div className="grid grid-cols-2 gap-3 text-slate-600">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Branch</span>
                    <span className="text-slate-800 font-medium">{employee.branch || "Headquarters"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Employment Type</span>
                    <span className="text-slate-800 font-medium">{employee.employmentType || "Full-Time"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Total Experience</span>
                    <span className="text-slate-800 font-medium">{employee.totalExperience || "N/A"}</span>
                  </div>
                  {employee.monthlyTarget && (
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">Monthly Target</span>
                      <span className="text-slate-800 font-medium">₹{Number(employee.monthlyTarget).toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  {employee.teamLeader && (
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">Team Leader</span>
                      <span className="text-slate-800 font-medium">{employee.teamLeader.firstName} {employee.teamLeader.lastName} ({employee.teamLeader.employeeId})</span>
                    </div>
                  )}
                  {employee.reportingManager && (
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">Reporting Manager</span>
                      <span className="text-slate-800 font-medium">{employee.reportingManager.firstName} {employee.reportingManager.lastName} ({employee.reportingManager.employeeId})</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 4: Emergency Contacts */}
              <div className="rounded-2xl border border-slate-200/80 p-5 bg-white/70 shadow-2xs space-y-3">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <HeartPulse className="h-4 w-4 text-rose-500" /> Emergency Contact
                </h3>
                <div className="grid grid-cols-2 gap-3 text-slate-600">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Contact Name</span>
                    <span className="text-slate-800 font-medium">{employee.emergencyFirstName} {employee.emergencyLastName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Relationship</span>
                    <span className="text-slate-800 font-medium">{employee.emergencyRelationship}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Emergency Number</span>
                    <span className="text-slate-800 font-medium">{employee.emergencyNumber}</span>
                  </div>
                </div>
              </div>

              {/* Section 5: Bank & Statutory */}
              <div className="rounded-2xl border border-slate-200/80 p-5 bg-white/70 shadow-2xs space-y-3">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-emerald-600" /> Bank & Statutory Details
                </h3>
                <div className="grid grid-cols-2 gap-3 text-slate-600">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Salary Entity</span>
                    <span className="text-slate-800 font-semibold">{employee.salaryEntity}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">PF Applicable</span>
                    <span className="text-slate-800 font-medium">{employee.pfApplicable ? "Yes (Deducted)" : "No"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Bank Name</span>
                    <span className="text-slate-800 font-medium">{employee.bankName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">IFSC Code</span>
                    <span className="text-slate-800 font-mono font-medium">{employee.ifscCode}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Bank Account No.</span>
                    <span className="text-slate-800 font-mono font-medium">{employee.bankAccountNumber}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">PAN Number</span>
                    <span className="text-slate-800 font-mono font-medium">{employee.panNumber}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Aadhaar Number</span>
                    <span className="text-slate-800 font-mono font-medium">{employee.aadhaarNumber}</span>
                  </div>
                  {employee.uanNumber && (
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">UAN Number</span>
                      <span className="text-slate-800 font-mono font-medium">{employee.uanNumber}</span>
                    </div>
                  )}
                  {employee.esicNumber && (
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">ESIC Number</span>
                      <span className="text-slate-800 font-mono font-medium">{employee.esicNumber}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200/80 bg-slate-50/70 flex justify-end">
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-black transition-colors"
              >
                Close Profile
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default EmployeeDetailDrawer;
