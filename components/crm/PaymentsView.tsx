"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  IndianRupee,
  Plus,
  Search,
  UploadCloud,
  CheckCircle2,
  Clock,
  XCircle,
  Landmark,
  Building2,
  Phone,
  User,
  ShieldCheck,
  TrendingUp,
  FileText,
  ExternalLink,
  Sparkles,
  ArrowRight,
  Eye,
  Trash2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import PaymentRecordFormModal from "@/components/crm/PaymentRecordFormModal";
import PaymentDetailModal from "@/components/crm/PaymentDetailModal";
import AccountsPaymentVerifyModal from "@/components/crm/AccountsPaymentVerifyModal";
import BulkUploadModal, { BulkUploadColumnDef } from "@/components/crm/BulkUploadModal";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import {
  SerializedPaymentRecord,
  PaymentRecordFormData,
  PaymentMasterData,
  paymentRecordSchema,
} from "@/lib/validations/payment";
import {
  createPaymentRecordAction,
  verifyPaymentRecordAction,
  rejectPaymentRecordAction,
  convertPaymentToDraftDealAction,
  deletePaymentRecordAction,
  bulkUploadPaymentsAction,
} from "@/lib/actions/payments";
import {
  PaymentVerificationStatus,
  PaymentType,
  SalaryEntity,
} from "@prisma/client";

interface PaymentsViewProps {
  initialPayments: SerializedPaymentRecord[];
  masterData: PaymentMasterData;
  isAccountsUser: boolean;
  canManageAll: boolean;
}

const BULK_COLUMNS: BulkUploadColumnDef[] = [
  { key: "clientId", header: "Client ID", aliases: ["client_id", "client id"], required: true },
  { key: "amount", header: "Amount (₹)", aliases: ["amount", "received amount"], required: true, type: "number" },
  { key: "bankType", header: "Bank Type (BSPL/BSAPL)", aliases: ["bank", "entity", "bank type"] },
  { key: "paymentType", header: "Payment Type", aliases: ["type", "stage"] },
  { key: "paymentMode", header: "Payment Mode", aliases: ["mode"] },
  { key: "transactionRef", header: "Transaction Ref / UTR", aliases: ["utr", "ref", "cheque"] },
  { key: "paymentDate", header: "Payment Date (YYYY-MM-DD)", aliases: ["date"] },
  { key: "remarks", header: "Remarks", aliases: ["note", "notes"] },
];

export default function PaymentsView({
  initialPayments,
  masterData,
  isAccountsUser,
  canManageAll,
}: PaymentsViewProps) {
  const router = useRouter();
  const [payments, setPayments] = useState<SerializedPaymentRecord[]>(initialPayments);
  const [activeTab, setActiveTab] = useState<"ALL" | "VERIFIED" | "PENDING">("ALL");
  const [search, setSearch] = useState("");
  const [bankFilter, setBankFilter] = useState<string>("ALL");

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [viewPayment, setViewPayment] = useState<SerializedPaymentRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [verifyTarget, setVerifyTarget] = useState<SerializedPaymentRecord | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<SerializedPaymentRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isBulkOpen, setIsBulkOpen] = useState(false);

  // Convert to deal loading
  const [convertingId, setConvertingId] = useState<string | null>(null);

  // Transitions
  const [isPending, startTransition] = useTransition();

  // Metrics Calculations
  const totalAmountCollected = payments.reduce((acc, p) => acc + p.amount, 0);
  const verifiedAmount = payments
    .filter((p) => p.status === PaymentVerificationStatus.VERIFIED)
    .reduce((acc, p) => acc + p.amount, 0);
  const pendingCount = payments.filter(
    (p) => p.status === PaymentVerificationStatus.UNVERIFIED
  ).length;
  const pendingAmount = payments
    .filter((p) => p.status === PaymentVerificationStatus.UNVERIFIED)
    .reduce((acc, p) => acc + p.amount, 0);

  const bsplTotal = payments
    .filter((p) => p.bankType === SalaryEntity.BSPL && p.status === PaymentVerificationStatus.VERIFIED)
    .reduce((acc, p) => acc + p.amount, 0);

  const bsaplTotal = payments
    .filter((p) => p.bankType === SalaryEntity.BSAPL && p.status === PaymentVerificationStatus.VERIFIED)
    .reduce((acc, p) => acc + p.amount, 0);

  // Filtered List based on Tab, Bank Type, and Search
  const filteredPayments = payments.filter((p) => {
    // Tab filter
    if (activeTab === "VERIFIED" && p.status !== PaymentVerificationStatus.VERIFIED) return false;
    if (activeTab === "PENDING" && p.status !== PaymentVerificationStatus.UNVERIFIED) return false;

    // Bank filter
    if (bankFilter !== "ALL" && p.bankType !== bankFilter) return false;

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const match =
        p.receiptNumber.toLowerCase().includes(q) ||
        p.clientName.toLowerCase().includes(q) ||
        p.clientPhone.includes(q) ||
        (p.transactionRef && p.transactionRef.toLowerCase().includes(q)) ||
        (p.dealNumber && p.dealNumber.toLowerCase().includes(q));
      if (!match) return false;
    }

    return true;
  });

  // Handle Form Submit
  const handleCreatePayment = async (data: PaymentRecordFormData) => {
    setIsSubmitting(true);
    try {
      const res = await createPaymentRecordAction(data);
      if (res.success && res.data) {
        setPayments((prev) => [res.data!, ...prev]);
        toast.success(`Payment receipt ${res.data.receiptNumber} recorded! Accounts notified.`);
        setIsFormOpen(false);
      } else {
        toast.error(res.error || "Failed to save payment record.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Accounts Verification
  const handleVerifyPayment = async (
    paymentId: string,
    bankType: SalaryEntity,
    remarks?: string
  ) => {
    setIsVerifying(true);
    try {
      const res = await verifyPaymentRecordAction(paymentId, bankType, remarks);
      if (res.success && res.data) {
        setPayments((prev) =>
          prev.map((item) => (item.id === paymentId ? res.data! : item))
        );
        toast.success(`Receipt ${res.data.receiptNumber} verified under ${bankType}!`);
        setVerifyTarget(null);
      } else {
        toast.error(res.error || "Verification failed.");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred.");
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle Accounts Rejection
  const handleRejectPayment = async (paymentId: string, reason: string) => {
    setIsVerifying(true);
    try {
      const res = await rejectPaymentRecordAction(paymentId, reason);
      if (res.success) {
        setPayments((prev) =>
          prev.map((item) =>
            item.id === paymentId
              ? {
                  ...item,
                  status: PaymentVerificationStatus.REJECTED,
                  remarks: reason ? `[Rejected]: ${reason}` : item.remarks,
                }
              : item
          )
        );
        toast.success("Payment receipt marked as rejected.");
        setVerifyTarget(null);
      } else {
        toast.error(res.error || "Rejection failed.");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred.");
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle 1-Click Convert to Deal
  const handleConvertToDeal = async (payment: SerializedPaymentRecord) => {
    setConvertingId(payment.id);
    try {
      const res = await convertPaymentToDraftDealAction(payment.id);
      if (res.success && res.data?.dealId) {
        setPayments((prev) =>
          prev.map((p) =>
            p.id === payment.id
              ? { ...p, isConvertedToDeal: true, dealId: res.data!.dealId }
              : p
          )
        );
        toast.success("Draft deal created! Redirecting to Deal builder...");
        router.push(`/crm/deals?openDealId=${res.data.dealId}`);
      } else {
        toast.error(res.error || "Failed to convert payment to Deal.");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred.");
    } finally {
      setConvertingId(null);
    }
  };

  // Handle Delete
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await deletePaymentRecordAction(deleteTarget.id);
      if (res.success) {
        setPayments((prev) => prev.filter((p) => p.id !== deleteTarget.id));
        toast.success(`Payment receipt ${deleteTarget.receiptNumber} deleted.`);
        setDeleteTarget(null);
      } else {
        toast.error(res.error || "Failed to delete payment.");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred.");
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (status: PaymentVerificationStatus) => {
    switch (status) {
      case PaymentVerificationStatus.VERIFIED:
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300">
            Verified
          </Badge>
        );
      case PaymentVerificationStatus.UNVERIFIED:
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
            Pending Accounts
          </Badge>
        );
      case PaymentVerificationStatus.REJECTED:
        return (
          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300">
            Declined
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. FINANCIAL METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white/70 backdrop-blur-md border-slate-200/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Total Collections
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                ₹{totalAmountCollected.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">{payments.length} total receipts logged</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <IndianRupee className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-md border-slate-200/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Accounts Verified
              </p>
              <h3 className="text-2xl font-bold text-emerald-700 mt-1">
                ₹{verifiedAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Credited to corporate accounts</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-md border-slate-200/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Pending Verification
              </p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1">
                ₹{pendingAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </h3>
              <p className="text-[11px] text-amber-600 font-medium mt-0.5">
                {pendingCount} receipt{pendingCount === 1 ? "" : "s"} await statement check
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-md border-slate-200/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                BSPL vs BSAPL Split
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-bold text-[#F0944D]">
                  BSPL: ₹{bsplTotal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-xs font-bold text-sky-700">
                  BSAPL: ₹{bsaplTotal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Verified entity totals</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700">
              <Landmark className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. DYNAMIC 3-TAB NAVIGATION (ACCOUNTS VIEW) */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "ALL"
                ? "bg-gradient-to-r from-[#ACCAD5]/30 to-[#F0944D]/20 text-slate-900 border border-slate-300/80 shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            All Records ({payments.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("VERIFIED")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "VERIFIED"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Verified Records ({payments.filter((p) => p.status === PaymentVerificationStatus.VERIFIED).length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("PENDING")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "PENDING"
                ? "bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Pending Verification ({pendingCount})
          </button>
        </div>

        {isAccountsUser && (
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
            <ShieldCheck className="h-3.5 w-3.5" />
            Accounts Verification Authority Active
          </span>
        )}
      </div>

      {/* 3. FILTER & ACTION TOOLBAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-slate-200/80 shadow-xs">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by receipt #, client, phone, UTR #, or deal..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs bg-white/80 border-slate-200/80 shadow-2xs h-9"
            />
          </div>

          <select
            value={bankFilter}
            onChange={(e) => setBankFilter(e.target.value)}
            className="h-9 rounded-md border border-slate-200 bg-white/90 px-3 text-xs text-slate-700 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#F0944D]/20"
          >
            <option value="ALL">All Bank Entities</option>
            <option value={SalaryEntity.BSPL}>BSPL (Kotak Mahindra)</option>
            <option value={SalaryEntity.BSAPL}>BSAPL (ICICI Bank)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsBulkOpen(true)}
            className="h-9 text-xs gap-1.5 text-slate-700 border-slate-200/80 shadow-2xs"
          >
            <UploadCloud className="h-3.5 w-3.5" />
            Bulk Upload
          </Button>

          <Button
            onClick={() => setIsFormOpen(true)}
            className="h-9 text-xs font-semibold bg-gradient-to-r from-[#ACCAD5] to-[#F0944D] text-slate-900 shadow-xs hover:opacity-95"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Log New Payment
          </Button>
        </div>
      </div>

      {/* 4. PAYMENTS DATA TABLE */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/70 backdrop-blur-md shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] uppercase tracking-wider font-semibold text-slate-700">
              <tr>
                <th className="px-4 py-3.5">Receipt #</th>
                <th className="px-4 py-3.5">Client & Contact</th>
                <th className="px-4 py-3.5">Amount</th>
                <th className="px-4 py-3.5">Bank Entity</th>
                <th className="px-4 py-3.5">Payment Type</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Proof</th>
                <th className="px-4 py-3.5">Staff / BDM</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    <IndianRupee className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium text-slate-600">No payment receipts found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Log your first advance or installment payment receipt using the button above.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors group">
                    {/* Receipt Ref & Date */}
                    <td className="px-4 py-3.5 font-medium text-slate-900">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900 tracking-tight flex items-center gap-1.5">
                          <IndianRupee className="h-3.5 w-3.5 text-[#F0944D]" />
                          {p.receiptNumber}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5">
                          {p.paymentDate}
                        </span>
                      </div>
                    </td>

                    {/* Client Name & Phone */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-800">{p.clientName}</span>
                        <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3 text-slate-400" />
                          {p.clientPhone}
                        </span>
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-sm">
                          ₹{p.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-slate-400 capitalize">
                          {p.paymentMode.toLowerCase().replace("_", " ")}
                        </span>
                      </div>
                    </td>

                    {/* Bank Entity */}
                    <td className="px-4 py-3.5">
                      {p.bankType === SalaryEntity.BSPL ? (
                        <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
                          BSPL (Kotak)
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-sky-50 text-sky-800 border-sky-200">
                          BSAPL (ICICI)
                        </Badge>
                      )}
                    </td>

                    {/* Payment Type & Linked Deal */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col space-y-1">
                        <span className="inline-block text-[11px] font-semibold text-slate-700">
                          {p.paymentType === PaymentType.FIRST_PAYMENT ? "First Payment" : "Remaining"}
                        </span>
                        {p.dealNumber && (
                          <span className="text-[10px] text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200 w-fit">
                            Deal: {p.dealNumber}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">{getStatusBadge(p.status)}</td>

                    {/* Proof Screenshot */}
                    <td className="px-4 py-3.5">
                      {p.screenshotUrl ? (
                        <a
                          href={p.screenshotUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-600 hover:underline"
                        >
                          <Eye className="h-3 w-3" />
                          Screenshot
                        </a>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">None</span>
                      )}
                    </td>

                    {/* Staff / BDM & Accounts */}
                    <td className="px-4 py-3.5 text-slate-600">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-medium text-slate-800">
                          {p.recordedByName || "Sales TM"}
                        </span>
                        {p.verifiedByName && (
                          <span className="text-[10px] text-emerald-600">
                            Verified: {p.verifiedByName}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View Payment Receipt */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setViewPayment(p)}
                          className="h-7 w-7 text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                          title="View Payment Details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>

                        {/* 1-Click Convert to Deal (For First Payment) */}
                        {p.paymentType === PaymentType.FIRST_PAYMENT && !p.isConvertedToDeal && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={convertingId === p.id}
                            onClick={() => handleConvertToDeal(p)}
                            className="h-7 text-[11px] font-semibold text-amber-700 border-amber-300 hover:bg-amber-50 gap-1"
                            title="Convert Advance Payment into a Deal"
                          >
                            {convertingId === p.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Sparkles className="h-3 w-3 text-amber-600" />
                            )}
                            Convert to Deal
                          </Button>
                        )}

                        {/* Accounts Review & Verify Button */}
                        {isAccountsUser && p.status === PaymentVerificationStatus.UNVERIFIED && (
                          <Button
                            size="sm"
                            onClick={() => setVerifyTarget(p)}
                            className="h-7 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                          >
                            <ShieldCheck className="h-3 w-3" />
                            Verify
                          </Button>
                        )}

                        {/* Delete Button */}
                        {(canManageAll || p.status === PaymentVerificationStatus.UNVERIFIED) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget(p)}
                            className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                            title="Delete receipt"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. MODALS */}
      <PaymentDetailModal
        open={Boolean(viewPayment)}
        onOpenChange={(open) => !open && setViewPayment(null)}
        payment={viewPayment}
        onConvertToDeal={(paymentId) => {
          const match = payments.find((p) => p.id === paymentId);
          if (match) handleConvertToDeal(match);
        }}
      />

      <PaymentRecordFormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        masterData={masterData}
        onSubmit={handleCreatePayment}
        isSubmitting={isSubmitting}
      />

      <AccountsPaymentVerifyModal
        open={Boolean(verifyTarget)}
        onOpenChange={(open) => !open && setVerifyTarget(null)}
        payment={verifyTarget}
        onVerify={handleVerifyPayment}
        onReject={handleRejectPayment}
        isProcessing={isVerifying}
      />

      <ConfirmationModal
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Payment Receipt"
        description={`Are you sure you want to delete payment receipt ${deleteTarget?.receiptNumber} of ₹${deleteTarget?.amount.toLocaleString("en-IN")}? This cannot be undone.`}
        confirmLabel="Delete Receipt"
        isDestructive={true}
        onConfirm={handleDeleteConfirm}
        isPending={isDeleting}
      />

      <BulkUploadModal<any>
        open={isBulkOpen}
        onOpenChange={setIsBulkOpen}
        title="Bulk Upload Payment Records"
        description="Upload CSV of historical or imported client payment receipts."
        sampleFileName="bharatedge_payments_template.csv"
        columns={BULK_COLUMNS}
        schema={paymentRecordSchema as any}
        sampleData={[
          {
            clientId: masterData.clients[0]?.id || "CL-UUID-EXAMPLE",
            amount: 15000,
            bankType: "BSPL",
            paymentType: "FIRST_PAYMENT",
            paymentMode: "BANK_TRANSFER",
            transactionRef: "UTR9821827361",
            paymentDate: "2026-11-20",
            remarks: "Advance registration booking",
          },
        ]}
        onUpload={bulkUploadPaymentsAction as any}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
