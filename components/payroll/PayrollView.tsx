"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  FileText,
  IndianRupee,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  Plus,
  ShieldCheck,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { PayrollPaymentStatus } from "@prisma/client";
import {
  generateMonthlyPayrollAction,
  updatePayrollStatusAction,
} from "@/lib/actions/payroll";

interface PayrollItem {
  id: string;
  employeeName?: string;
  employeeId?: string;
  department?: string;
  designation?: string;
  bankDetails?: string;
  month: number;
  year: number;
  baseSalary: number;
  deductions: number;
  reimbursementsAdded: number;
  netPayable: number;
  paymentStatus: PayrollPaymentStatus;
  paidAt?: string | null;
  paymentReference?: string | null;
  payslipUrl?: string | null;
  createdAt: string;
}

interface PayrollViewProps {
  initialMyRecords: PayrollItem[];
  initialAllRecords: PayrollItem[];
  isHrAdmin: boolean;
  currentMonth: number;
  currentYear: number;
}

export default function PayrollView({
  initialMyRecords,
  initialAllRecords,
  isHrAdmin,
  currentMonth,
  currentYear,
}: PayrollViewProps) {
  const [activeTab, setActiveTab] = useState<"my" | "admin">(isHrAdmin ? "admin" : "my");
  const [myRecords, setMyRecords] = useState<PayrollItem[]>(initialMyRecords);
  const [allRecords, setAllRecords] = useState<PayrollItem[]>(initialAllRecords);

  // Generate modal
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [genMonth, setGenMonth] = useState(currentMonth);
  const [genYear, setGenYear] = useState(currentYear);

  // Pay modal
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [utrRef, setUtrRef] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleGeneratePayroll = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await generateMonthlyPayrollAction({
        month: Number(genMonth),
        year: Number(genYear),
      });

      if (res.success) {
        toast.success(`Payroll generated for ${res.data?.generatedCount} staff members!`);
        setIsGenerateOpen(false);
        window.location.reload();
      } else {
        toast.error(res.error || "Failed to generate payroll.");
      }
    });
  };

  const handleOpenPay = (id: string) => {
    setSelectedRecordId(id);
    setUtrRef("");
    setPayModalOpen(true);
  };

  const handleConfirmPay = () => {
    if (!selectedRecordId) return;

    startTransition(async () => {
      const res = await updatePayrollStatusAction({
        payrollId: selectedRecordId,
        status: PayrollPaymentStatus.PAID,
        paymentReference: utrRef.trim() || undefined,
      });

      if (res.success) {
        toast.success("Salary payment marked as PAID with notification sent.");
        setAllRecords((prev) =>
          prev.map((r) =>
            r.id === selectedRecordId
              ? { ...r, paymentStatus: PayrollPaymentStatus.PAID, paymentReference: utrRef }
              : r
          )
        );
        setPayModalOpen(false);
      } else {
        toast.error(res.error || "Failed to record payment.");
      }
    });
  };

  const getStatusBadge = (status: PayrollPaymentStatus) => {
    switch (status) {
      case "PAID":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="h-3 w-3" /> Disbursed & Paid
          </span>
        );
      case "PROCESSED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <Clock className="h-3 w-3" /> Processed (Pending Bank File)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="h-3 w-3" /> Draft Pending
          </span>
        );
    }
  };

  const records = activeTab === "my" ? myRecords : allRecords;
  const totalNet = records.reduce((sum, r) => sum + r.netPayable, 0);
  const paidCount = records.filter((r) => r.paymentStatus === "PAID").length;
  const pendingCount = records.filter((r) => r.paymentStatus === "PENDING").length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Payroll & Monthly Salary Tracker</h2>
            <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#EBF3F6] text-[#588594] border border-[#ACCAD5]/50">
              Accounts & Compensation
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Monthly salary generation, statutory PF/tax deductions, expense claim additions, payslip downloads, and disbursal reconciliations.
          </p>
        </div>

        {isHrAdmin && (
          <Button
            onClick={() => setIsGenerateOpen(true)}
            className="rounded-full bg-gradient-to-r from-[#ACCAD5] to-[#F0944D] text-white font-semibold text-xs px-5 py-2.5 shadow-xs cursor-pointer flex items-center gap-2 self-start sm:self-center"
          >
            <Plus className="h-4 w-4" />
            Generate Monthly Payroll
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white/85 backdrop-blur-md border border-slate-200/80 shadow-2xs">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Total Net Payable</span>
          <span className="text-xl font-bold text-slate-900">₹{totalNet.toLocaleString("en-IN")}</span>
          <span className="text-[11px] text-slate-400 block mt-0.5">{records.length} total staff records</span>
        </div>
        <div className="p-5 rounded-2xl bg-white/85 backdrop-blur-md border border-emerald-200/70 shadow-2xs">
          <span className="text-xs font-semibold text-emerald-600 block mb-1">Disbursed & Settled</span>
          <span className="text-xl font-bold text-emerald-800">{paidCount} Salaries</span>
          <span className="text-[11px] text-slate-400 block mt-0.5">Credited to employee bank accounts</span>
        </div>
        <div className="p-5 rounded-2xl bg-white/85 backdrop-blur-md border border-amber-200/70 shadow-2xs">
          <span className="text-xs font-semibold text-amber-600 block mb-1">Pending Disbursals</span>
          <span className="text-xl font-bold text-amber-800">{pendingCount} Salaries</span>
          <span className="text-[11px] text-slate-400 block mt-0.5">Awaiting bank batch payment</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
        <button
          onClick={() => setActiveTab("my")}
          className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "my"
              ? "bg-[#588594] text-white shadow-2xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          My Payslips ({myRecords.length})
        </button>

        {isHrAdmin && (
          <button
            onClick={() => setActiveTab("admin")}
            className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "admin"
                ? "bg-[#1E293B] text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Payroll Administration Desk ({allRecords.length})</span>
          </button>
        )}
      </div>

      {/* Records Table / Cards */}
      {records.length === 0 ? (
        <div className="text-center py-16 bg-white/60 rounded-3xl border border-slate-200/60 p-8">
          <FileText className="h-10 w-10 mx-auto text-slate-300 mb-2" />
          <h3 className="text-sm font-bold text-slate-700">No payroll records found</h3>
          <p className="text-xs text-slate-400 mt-1">
            Generate payroll for this month or select a prior cycle.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-2xl bg-white/85 backdrop-blur-md border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-[#ACCAD5]"
            >
              <div className="space-y-1.5 flex-1 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  {item.employeeName && (
                    <span className="font-bold text-slate-900 text-sm">
                      {item.employeeName} ({item.employeeId}) •{" "}
                    </span>
                  )}
                  <h4 className="text-sm font-bold text-slate-900 font-mono">
                    Cycle: {item.month}/{item.year}
                  </h4>
                  {getStatusBadge(item.paymentStatus)}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-slate-600">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Base Salary</span>
                    <span className="font-semibold text-slate-800">
                      ₹{item.baseSalary.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Statutory Deductions</span>
                    <span className="font-semibold text-rose-600">
                      -₹{item.deductions.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Reimbursements Added</span>
                    <span className="font-semibold text-emerald-600">
                      +₹{item.reimbursementsAdded.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Net Disbursable</span>
                    <span className="font-bold text-slate-900 font-mono text-sm">
                      ₹{item.netPayable.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {item.bankDetails && (
                  <div className="text-[11px] text-slate-400 pt-0.5">
                    Account: {item.bankDetails}
                    {item.paymentReference ? ` • UTR: ${item.paymentReference}` : ""}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                {activeTab === "admin" && item.paymentStatus === "PENDING" && (
                  <Button
                    size="sm"
                    onClick={() => handleOpenPay(item.id)}
                    disabled={isPending}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    Record Disbursal
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toast.info(`Official payslip for ${item.month}/${item.year} downloaded.`)}
                  className="rounded-xl border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 text-[#588594]" />
                  Payslip
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generate Payroll Dialog */}
      <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-3xl bg-white/95 backdrop-blur-2xl border border-white/80 p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Generate Monthly Payroll
            </DialogTitle>
            <p className="text-xs text-slate-500">
              Bulk compute salaries, approved expense additions, and statutory deductions for all active staff.
            </p>
          </DialogHeader>

          <form onSubmit={handleGeneratePayroll} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-700 font-semibold">Month (1 - 12) *</Label>
                <Input
                  type="number"
                  min="1"
                  max="12"
                  value={genMonth}
                  onChange={(e) => setGenMonth(parseInt(e.target.value) || 1)}
                  className="mt-1 bg-slate-50 text-xs font-semibold"
                  required
                />
              </div>
              <div>
                <Label className="text-xs text-slate-700 font-semibold">Year *</Label>
                <Input
                  type="number"
                  min="2024"
                  max="2030"
                  value={genYear}
                  onChange={(e) => setGenYear(parseInt(e.target.value) || 2026)}
                  className="mt-1 bg-slate-50 text-xs font-semibold"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsGenerateOpen(false)}
                className="rounded-full text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isPending}
                className="rounded-full text-xs font-semibold px-5 bg-gradient-to-r from-[#ACCAD5] to-[#F0944D] text-white cursor-pointer"
              >
                {isPending ? "Generating..." : "Generate Payroll"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Disbursal Payment Dialog */}
      <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-3xl bg-white/95 backdrop-blur-2xl border border-white/80 p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Record Salary Disbursal
            </DialogTitle>
            <p className="text-xs text-slate-500 mt-1">
              Confirm bank NEFT/RTGS transaction reference for this salary credit.
            </p>
          </DialogHeader>

          <div className="space-y-3 mt-3">
            <div>
              <Label className="text-xs text-slate-700 font-semibold">
                Bank UTR / Transaction Reference
              </Label>
              <Input
                placeholder="e.g. ICICI260938472910"
                value={utrRef}
                onChange={(e) => setUtrRef(e.target.value)}
                className="mt-1 bg-slate-50 text-xs font-semibold font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPayModalOpen(false)}
                className="rounded-full text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmPay}
                disabled={isPending}
                className="rounded-full text-xs font-semibold px-5 text-white bg-slate-900 hover:bg-black cursor-pointer"
              >
                {isPending ? "Confirming..." : "Confirm & Notify Employee"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
