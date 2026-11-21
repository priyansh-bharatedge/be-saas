"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Briefcase,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Building2,
  Phone,
  User,
  ShieldCheck,
  TrendingUp,
  FileText,
  ExternalLink,
  Sparkles,
  ArrowRight,
  Send,
  Edit2,
  Trash2,
  Loader2,
  Users,
  AlertTriangle,
  GitBranch,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import DealFormModal from "@/components/crm/DealFormModal";
import DealDetailModal from "@/components/crm/DealDetailModal";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import {
  SerializedDeal,
  DealFormData,
  DealMasterData,
} from "@/lib/validations/deal";
import {
  createDealAction,
  updateDealAction,
  deleteDealAction,
  sendDealToAccountsAction,
  verifyDealByAccountsAction,
  sendDealToLegalAction,
  sendDealToOperationAction,
} from "@/lib/actions/deals";
import { DealStage, LegalStatus } from "@prisma/client";

interface DealsViewProps {
  initialDeals: SerializedDeal[];
  masterData: DealMasterData;
  isAccountsUser: boolean;
  isLegalUser: boolean;
  isSalesUser?: boolean;
  canManageAll: boolean;
}

export default function DealsView({
  initialDeals,
  masterData,
  isAccountsUser,
  isLegalUser,
  isSalesUser = false,
  canManageAll,
}: DealsViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const openDealId = searchParams.get("openDealId");

  const [deals, setDeals] = useState<SerializedDeal[]>(initialDeals);
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("ALL");

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<SerializedDeal | null>(null);
  const [viewDeal, setViewDeal] = useState<SerializedDeal | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Track already-handled openDealId from query params to prevent auto-reopening loops
  const handledDealIdRef = useRef<string | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<SerializedDeal | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Quick Action Pending
  const [actionPendingId, setActionPendingId] = useState<string | null>(null);

  // Check URL query param to open deal modal on conversion
  useEffect(() => {
    if (!openDealId) {
      handledDealIdRef.current = null;
      return;
    }
    if (openDealId && handledDealIdRef.current !== openDealId) {
      const match = deals.find((d) => d.id === openDealId);
      if (match) {
        handledDealIdRef.current = openDealId;
        setSelectedDeal(match);
        setIsFormOpen(true);
      }
    }
  }, [openDealId, deals]);

  // Clean close modal handler that purges query parameters
  const handleCloseModal = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) {
      setSelectedDeal(null);
      if (searchParams.get("openDealId")) {
        router.replace("/crm/deals", { scroll: false });
      }
    }
  };

  // Metrics Calculations
  const totalDealsCount = deals.length;
  const totalPipelineValue = deals.reduce((acc, d) => acc + (d.totalValue || d.value || 0), 0);
  const totalAmountReceived = deals.reduce((acc, d) => acc + (d.amountReceived || 0), 0);
  const totalAmountPending = deals.reduce((acc, d) => acc + (d.amountPending || 0), 0);

  // Filtered List
  const filteredDeals = deals.filter((d) => {
    // Tab filtering by Accounts status
    if (activeTab === "DRAFT" && d.accountsStatus !== "DRAFT") return false;
    if (activeTab === "PENDING_ACCOUNTS" && d.accountsStatus !== "PENDING_ACCOUNTS") return false;
    if (activeTab === "ACCOUNTS_VERIFIED" && d.accountsStatus !== "ACCOUNTS_VERIFIED") return false;
    if (activeTab === "SENT_TO_LEGAL" && d.accountsStatus !== "SENT_TO_LEGAL") return false;
    if (activeTab === "SENT_TO_OPERATION" && d.accountsStatus !== "SENT_TO_OPERATION") return false;
    if (activeTab === "QUALITY" && d.accountsStatus !== "QUALITY") return false;

    // Stage dropdown filter
    if (stageFilter !== "ALL" && d.stage !== stageFilter) return false;

    // Keyword Search
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const match =
        d.dealNumber.toLowerCase().includes(q) ||
        d.title.toLowerCase().includes(q) ||
        d.clientName.toLowerCase().includes(q) ||
        d.clientPhone.includes(q) ||
        d.companyName.toLowerCase().includes(q) ||
        (d.panNumber && d.panNumber.toLowerCase().includes(q));
      if (!match) return false;
    }

    return true;
  });

  // Handle Form Submit
  const handleDealSubmit = async (data: DealFormData) => {
    setIsSubmitting(true);
    try {
      if (selectedDeal) {
        const res = await updateDealAction(selectedDeal.id, data);
        if (res.success && res.data) {
          // 1. Immediately purge openDealId query param from URL
          if (searchParams.get("openDealId")) {
            router.replace("/crm/deals", { scroll: false });
          }
          // 2. Mark this deal ID as handled so useEffect will never reopen it while URL param transitions
          handledDealIdRef.current = res.data.id;
          setIsFormOpen(false);
          setSelectedDeal(null);

          // 3. Update local state and refresh Next.js data
          setDeals((prev) =>
            prev.map((item) => (item.id === res.data!.id ? res.data! : item))
          );
          router.refresh();
          toast.success(`Deal ${res.data.dealNumber} updated successfully!`);
        } else {
          toast.error(res.error || "Failed to update deal.");
        }
      } else {
        const res = await createDealAction(data);
        if (res.success && res.data) {
          if (searchParams.get("openDealId")) {
            router.replace("/crm/deals", { scroll: false });
          }
          handledDealIdRef.current = res.data.id;
          setIsFormOpen(false);
          setSelectedDeal(null);

          setDeals((prev) => [res.data!, ...prev]);
          router.refresh();
          toast.success(`Deal ${res.data.dealNumber} created successfully!`);
        } else {
          toast.error(res.error || "Failed to create deal.");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Send to Accounts (Gatekeeping submission)
  const handleSendToAccounts = async (dealId: string) => {
    setActionPendingId(dealId);
    try {
      const res = await sendDealToAccountsAction(dealId);
      if (res.success) {
        setDeals((prev) =>
          prev.map((d) =>
            d.id === dealId ? { ...d, accountsStatus: "PENDING_ACCOUNTS", stage: DealStage.PROPOSAL } : d
          )
        );
        toast.success("Deal dispatched to Accounts for payment verification!");
      } else {
        toast.error(res.error || "Failed to submit deal to accounts.");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred.");
    } finally {
      setActionPendingId(null);
    }
  };

  // Accounts Action: Verify Deal
  const handleVerifyDeal = async (dealId: string) => {
    setActionPendingId(dealId);
    try {
      const res = await verifyDealByAccountsAction(dealId);
      if (res.success) {
        setDeals((prev) =>
          prev.map((d) =>
            d.id === dealId ? { ...d, accountsStatus: "ACCOUNTS_VERIFIED", stage: DealStage.NEGOTIATION } : d
          )
        );
        toast.success("Deal verified by Accounts! Ready for Legal handover.");
      } else {
        toast.error(res.error || "Failed to verify deal.");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred.");
    } finally {
      setActionPendingId(null);
    }
  };

  // Accounts Action: Send to Legal
  const handleSendToLegal = async (dealId: string) => {
    setActionPendingId(dealId);
    try {
      const res = await sendDealToLegalAction(dealId);
      if (res.success) {
        setDeals((prev) =>
          prev.map((d) =>
            d.id === dealId
              ? {
                  ...d,
                  accountsStatus: "SENT_TO_LEGAL",
                  internalLegalStatus: LegalStatus.UNDER_REVIEW,
                  stage: DealStage.CLOSED_WON,
                }
              : d
          )
        );
        toast.success("Deal successfully handed over to Legal Department!");
      } else {
        toast.error(res.error || "Failed to hand over deal to legal.");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred.");
    } finally {
      setActionPendingId(null);
    }
  };

  // Legal / Admin Action: Send to Operation (Auto-Spawn)
  const handleSendToOperation = async (dealId: string) => {
    setActionPendingId(dealId);
    try {
      const res = await sendDealToOperationAction(dealId);
      if (res.success) {
        setDeals((prev) =>
          prev.map((d) =>
            d.id === dealId
              ? {
                  ...d,
                  accountsStatus: "SENT_TO_OPERATION",
                  internalLegalStatus: LegalStatus.EXECUTED,
                  stage: DealStage.CLOSED_WON,
                }
              : d
          )
        );
        toast.success("Deal dispatched to Operations! Child execution files auto-spawned.");
        if (selectedDeal && selectedDeal.id === dealId) {
          setSelectedDeal((prev) =>
            prev
              ? {
                  ...prev,
                  accountsStatus: "SENT_TO_OPERATION",
                  internalLegalStatus: LegalStatus.EXECUTED,
                  stage: DealStage.CLOSED_WON,
                }
              : null
          );
        }
      } else {
        toast.error(res.error || "Failed to dispatch deal to operations.");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred.");
    } finally {
      setActionPendingId(null);
    }
  };

  // Handle Delete
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await deleteDealAction(deleteTarget.id);
      if (res.success) {
        setDeals((prev) => prev.filter((d) => d.id !== deleteTarget.id));
        toast.success(`Deal ${deleteTarget.dealNumber} deleted successfully.`);
        setDeleteTarget(null);
      } else {
        toast.error(res.error || "Failed to delete deal.");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred.");
    } finally {
      setIsDeleting(false);
    }
  };

  const getAccountsBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return (
          <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300">
            Draft
          </Badge>
        );
      case "PENDING_ACCOUNTS":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300">
            Pending Accounts
          </Badge>
        );
      case "ACCOUNTS_VERIFIED":
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300">
            Accounts Verified
          </Badge>
        );
      case "SENT_TO_LEGAL":
        return (
          <Badge variant="outline" className="bg-sky-50 text-sky-800 border-sky-300">
            Handed to Legal
          </Badge>
        );
      case "SENT_TO_OPERATION":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300">
            In Operations
          </Badge>
        );
      case "QUALITY":
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-800 border-purple-300">
            Quality Review
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white/70 backdrop-blur-md border-slate-200/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Total Deals
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalDealsCount}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Active commercial deals</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <Briefcase className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-md border-slate-200/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Total Deal Value
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                ₹{totalPipelineValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Cumulative pipeline size</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-[#F0944D]/20 flex items-center justify-center text-[#F0944D]">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-md border-slate-200/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Amount Received
              </p>
              <h3 className="text-2xl font-bold text-emerald-700 mt-1">
                ₹{totalAmountReceived.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Verified advance & installments</p>
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
                Pending Receivable
              </p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1">
                ₹{totalAmountPending.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </h3>
              <p className="text-[11px] text-amber-600 font-medium mt-0.5">Awaiting milestone collection</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. DYNAMIC WORKFLOW TABS */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "ALL"
                ? "bg-slate-900 text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            All Deals ({deals.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("DRAFT")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "DRAFT"
                ? "bg-slate-200 text-slate-900 shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Drafts ({deals.filter((d) => d.accountsStatus === "DRAFT").length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("PENDING_ACCOUNTS")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "PENDING_ACCOUNTS"
                ? "bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Pending Accounts ({deals.filter((d) => d.accountsStatus === "PENDING_ACCOUNTS").length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ACCOUNTS_VERIFIED")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "ACCOUNTS_VERIFIED"
                ? "bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Accounts Verified ({deals.filter((d) => d.accountsStatus === "ACCOUNTS_VERIFIED").length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("SENT_TO_LEGAL")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "SENT_TO_LEGAL"
                ? "bg-sky-100 text-sky-900 border border-sky-300 shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Handed to Legal ({deals.filter((d) => d.accountsStatus === "SENT_TO_LEGAL").length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("SENT_TO_OPERATION")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "SENT_TO_OPERATION"
                ? "bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            In Operations ({deals.filter((d) => d.accountsStatus === "SENT_TO_OPERATION").length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("QUALITY")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "QUALITY"
                ? "bg-purple-100 text-purple-900 border border-purple-300 shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Quality Audit ({deals.filter((d) => d.accountsStatus === "QUALITY").length})
          </button>
        </div>

        {isAccountsUser && (
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
            <ShieldCheck className="h-3.5 w-3.5" />
            Accounts Verification & Legal Handover Enabled
          </span>
        )}
      </div>

      {/* 3. FILTER & ACTION TOOLBAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-slate-200/80 shadow-xs">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by deal #, title, client, PAN, or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs bg-white/80 border-slate-200/80 shadow-2xs h-9"
            />
          </div>

          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="h-9 rounded-md border border-slate-200 bg-white/90 px-3 text-xs text-slate-700 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#F0944D]/20"
          >
            <option value="ALL">All Stages</option>
            <option value={DealStage.LEAD}>Lead</option>
            <option value={DealStage.QUALIFIED}>Qualified</option>
            <option value={DealStage.PROPOSAL}>Proposal</option>
            <option value={DealStage.NEGOTIATION}>Negotiation</option>
            <option value={DealStage.CLOSED_WON}>Closed Won</option>
            <option value={DealStage.CLOSED_LOST}>Closed Lost</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setSelectedDeal(null);
              setIsFormOpen(true);
            }}
            className="h-9 text-xs font-semibold bg-gradient-to-r from-[#ACCAD5] to-[#F0944D] text-slate-900 shadow-xs hover:opacity-95"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Deal
          </Button>
        </div>
      </div>

      {/* 4. DEALS DATA TABLE */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/70 backdrop-blur-md shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] uppercase tracking-wider font-semibold text-slate-700">
              <tr>
                <th className="px-4 py-3.5">Deal Number</th>
                <th className="px-4 py-3.5">Client & Company</th>
                <th className="px-4 py-3.5">BDM & Partner</th>
                <th className="px-4 py-3.5">Total Value</th>
                <th className="px-4 py-3.5">Collections Status</th>
                <th className="px-4 py-3.5">Stage</th>
                <th className="px-4 py-3.5">Accounts Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDeals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    <Briefcase className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium text-slate-600">No deals found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Convert a First Payment or create a new deal to initiate engagement.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredDeals.map((d) => {
                  const percentReceived =
                    d.totalValue > 0
                      ? Math.min(100, Math.round((d.amountReceived / d.totalValue) * 100))
                      : 0;

                  return (
                    <tr key={d.id} className="hover:bg-slate-50/70 transition-colors group">
                      {/* Deal Number & Date */}
                      <td className="px-4 py-3.5 font-medium text-slate-900">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900 tracking-tight flex items-center gap-1.5">
                            <Briefcase className="h-3.5 w-3.5 text-[#F0944D]" />
                            {d.dealNumber}
                          </span>
                          <span className="text-[11px] text-slate-800 font-medium truncate max-w-[170px]" title={d.title}>
                            {d.title}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            {d.bookingDate}
                          </span>
                        </div>
                      </td>

                      {/* Client & Company */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900 flex items-center gap-1">
                            <User className="h-3 w-3 text-slate-400" />
                            {d.clientName}
                          </span>
                          <span className="text-[11px] text-slate-600 flex items-center gap-1 mt-0.5">
                            <Building2 className="h-3 w-3 text-slate-400" />
                            {d.companyName}
                          </span>
                          {d.panNumber && (
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                              PAN: {d.panNumber}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* BDM & Partner BDM */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col space-y-1">
                          <span className="font-medium text-slate-800">
                            {d.assignedEmployeeName || "Sales TM"}
                          </span>
                          {d.partnerBdmName ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 w-fit">
                              <Sparkles className="h-2.5 w-2.5" />
                              50% Partner: {d.partnerBdmName}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">100% Owner</span>
                          )}
                        </div>
                      </td>

                      {/* Total Value */}
                      <td className="px-4 py-3.5 font-bold text-slate-900 text-sm">
                        ₹{d.totalValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>

                      {/* Collections Status & Progress */}
                      <td className="px-4 py-3.5 min-w-[140px]">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-emerald-700 font-semibold">
                              Rec: ₹{d.amountReceived.toLocaleString("en-IN")}
                            </span>
                            <span className="text-amber-700 font-medium">
                              Pend: ₹{d.amountPending.toLocaleString("en-IN")}
                            </span>
                          </div>
                          <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${percentReceived}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-400 block text-right">
                            {percentReceived}% collected
                          </span>
                        </div>
                      </td>

                      {/* Stage */}
                      <td className="px-4 py-3.5">
                        <Badge variant="outline" className="text-[10px]">
                          {d.stage.replace("_", " ")}
                        </Badge>
                      </td>

                      {/* Accounts Status */}
                      <td className="px-4 py-3.5">{getAccountsBadge(d.accountsStatus)}</td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* BDM: Send to Accounts for Verification */}
                          {d.accountsStatus === "DRAFT" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={actionPendingId === d.id}
                              onClick={() => handleSendToAccounts(d.id)}
                              className="h-7 text-[11px] font-semibold text-emerald-700 border-emerald-300 hover:bg-emerald-50 gap-1"
                              title="Submit Deal to Accounts for Verification"
                            >
                              {actionPendingId === d.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Send className="h-3 w-3" />
                              )}
                              Send to Accounts
                            </Button>
                          )}

                          {/* Accounts: Verify Deal Button */}
                          {isAccountsUser && d.accountsStatus === "PENDING_ACCOUNTS" && (
                            <Button
                              size="sm"
                              disabled={actionPendingId === d.id}
                              onClick={() => handleVerifyDeal(d.id)}
                              className="h-7 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                              title="Confirm verified payments match deal"
                            >
                              {actionPendingId === d.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <ShieldCheck className="h-3 w-3" />
                              )}
                              Verify Deal
                            </Button>
                          )}

                          {/* Accounts: Send to Legal Button */}
                          {isAccountsUser && d.accountsStatus === "ACCOUNTS_VERIFIED" && (
                            <Button
                              size="sm"
                              disabled={actionPendingId === d.id}
                              onClick={() => handleSendToLegal(d.id)}
                              className="h-7 text-[11px] font-semibold bg-sky-600 hover:bg-sky-700 text-white gap-1 shadow-xs"
                              title="Advance Deal to Legal Department"
                            >
                              {actionPendingId === d.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <ArrowRight className="h-3 w-3" />
                              )}
                              Send to Legal
                            </Button>
                          )}

                          {/* Legal / Admin: Send to Operation Button */}
                          {(isLegalUser || canManageAll) && (d.accountsStatus === "SENT_TO_LEGAL" || d.accountsStatus === "ACCOUNTS_VERIFIED") && (
                            <Button
                              size="sm"
                              disabled={actionPendingId === d.id}
                              onClick={() => handleSendToOperation(d.id)}
                              className="h-7 text-[11px] font-semibold bg-[#F0944D] hover:bg-[#d87c35] text-white gap-1 shadow-xs"
                              title="Hand over Deal to Operations & Auto-Spawn Child Records"
                            >
                              {actionPendingId === d.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <GitBranch className="h-3 w-3" />
                              )}
                              Send to Operation
                            </Button>
                          )}

                          {/* View Deal Details */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewDeal(d)}
                            className="h-7 w-7 text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                            title="View Deal Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>

                          {/* Edit Deal */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedDeal(d);
                              setIsFormOpen(true);
                            }}
                            className="h-7 w-7 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                            title="Edit Deal"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>

                          {/* Delete Deal */}
                          {(canManageAll || d.accountsStatus === "DRAFT") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteTarget(d)}
                              className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                              title="Delete Deal"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. MODALS */}
      <DealDetailModal
        open={Boolean(viewDeal)}
        onOpenChange={(open) => !open && setViewDeal(null)}
        deal={viewDeal}
        onEdit={() => {
          if (viewDeal) {
            setSelectedDeal(viewDeal);
            setIsFormOpen(true);
          }
        }}
        canEdit={true}
        isSalesUser={isSalesUser}
      />

      <DealFormModal
        open={isFormOpen}
        onOpenChange={handleCloseModal}
        deal={selectedDeal}
        masterData={masterData}
        onSubmit={handleDealSubmit}
        onSendToAccounts={handleSendToAccounts}
        onSendToOperation={handleSendToOperation}
        isSubmitting={isSubmitting}
        isSalesUser={isSalesUser}
        isLegalUser={isLegalUser}
        canManageAll={canManageAll}
      />

      <ConfirmationModal
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Commercial Deal"
        description={`Are you sure you want to delete deal ${deleteTarget?.dealNumber} (${deleteTarget?.title})? This cannot be undone.`}
        confirmLabel="Delete Deal"
        isDestructive={true}
        onConfirm={handleDeleteConfirm}
        isPending={isDeleting}
      />
    </div>
  );
}
