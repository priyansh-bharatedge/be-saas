"use client";

import { useState, useTransition } from "react";
import {
  FileText,
  Plus,
  Search,
  Download,
  Mail,
  Send,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  Phone,
  User,
  ShieldCheck,
  TrendingUp,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import QuotationFormModal from "@/components/crm/QuotationFormModal";
import QuotationDetailModal from "@/components/crm/QuotationDetailModal";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { openDocumentPreview } from "@/components/modals/DocumentPreviewModal";
import {
  SerializedQuotation,
  QuotationFormData,
  QuotationMasterData,
} from "@/lib/validations/quotation";
import {
  createQuotationAction,
  updateQuotationAction,
  deleteQuotationAction,
  sendQuotationToClientAction,
} from "@/lib/actions/quotations";
import { QuotationStatus } from "@prisma/client";

interface QuotationsViewProps {
  initialQuotations: SerializedQuotation[];
  masterData: QuotationMasterData;
  canManageAll: boolean;
}

export default function QuotationsView({
  initialQuotations,
  masterData,
  canManageAll,
}: QuotationsViewProps) {
  const [quotations, setQuotations] = useState<SerializedQuotation[]>(initialQuotations);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<SerializedQuotation | null>(null);
  const [viewQuotation, setViewQuotation] = useState<SerializedQuotation | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<SerializedQuotation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Send to client state
  const [sendingId, setSendingId] = useState<string | null>(null);

  // Transitions
  const [isPending, startTransition] = useTransition();

  // Metrics Calculations
  const totalCount = quotations.length;
  const sentCount = quotations.filter((q) => q.status === QuotationStatus.SENT).length;
  const acceptedCount = quotations.filter((q) => q.status === QuotationStatus.ACCEPTED).length;
  const totalPipelineValue = quotations.reduce((acc, q) => acc + (q.grandTotal || 0), 0);

  // Filtered list
  const filteredQuotations = quotations.filter((q) => {
    const matchesStatus = statusFilter === "ALL" || q.status === statusFilter;
    const qTerm = search.toLowerCase().trim();
    const matchesSearch =
      !qTerm ||
      q.quotationNumber.toLowerCase().includes(qTerm) ||
      q.clientName.toLowerCase().includes(qTerm) ||
      (q.clientPhone && q.clientPhone.includes(qTerm)) ||
      (q.clientEmail && q.clientEmail.toLowerCase().includes(qTerm)) ||
      (q.companyName && q.companyName.toLowerCase().includes(qTerm));

    return matchesStatus && matchesSearch;
  });

  // Handle Create / Edit Submission
  const handleFormSubmit = async (data: QuotationFormData) => {
    setIsSubmitting(true);
    try {
      if (selectedQuotation) {
        const res = await updateQuotationAction(selectedQuotation.id, data);
        if (res.success && res.data) {
          setQuotations((prev) =>
            prev.map((item) => (item.id === res.data!.id ? res.data! : item))
          );
          toast.success(`Quotation ${res.data.quotationNumber} updated & PDF regenerated.`);
          setIsFormOpen(false);
          setSelectedQuotation(null);
        } else {
          toast.error(res.error || "Failed to update quotation.");
        }
      } else {
        const res = await createQuotationAction(data);
        if (res.success && res.data) {
          setQuotations((prev) => [res.data!, ...prev]);
          toast.success(`Quotation ${res.data.quotationNumber} created & PDF generated.`);
          setIsFormOpen(false);
        } else {
          toast.error(res.error || "Failed to create quotation.");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Confirmation
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await deleteQuotationAction(deleteTarget.id);
      if (res.success) {
        setQuotations((prev) => prev.filter((item) => item.id !== deleteTarget.id));
        toast.success(`Quotation ${deleteTarget.quotationNumber} deleted successfully.`);
        setDeleteTarget(null);
      } else {
        toast.error(res.error || "Failed to delete quotation.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Direct Email Dispatch to Client
  const handleSendToClient = async (quotation: SerializedQuotation) => {
    if (!quotation.clientEmail) {
      toast.error(`Cannot send: No email address on file for ${quotation.clientName}. Click edit to add an email.`);
      return;
    }

    setSendingId(quotation.id);
    try {
      const res = await sendQuotationToClientAction(quotation.id);
      if (res.success) {
        setQuotations((prev) =>
          prev.map((q) =>
            q.id === quotation.id
              ? { ...q, status: QuotationStatus.SENT, emailSentAt: new Date().toISOString() }
              : q
          )
        );
        toast.success(`Quotation ${quotation.quotationNumber} emailed to ${quotation.clientEmail}!`);
      } else {
        toast.error(res.error || "Failed to deliver quotation email.");
      }
    } catch (err: any) {
      toast.error(err.message || "SMTP transmission error.");
    } finally {
      setSendingId(null);
    }
  };

  const getStatusBadge = (status: QuotationStatus) => {
    switch (status) {
      case QuotationStatus.DRAFT:
        return (
          <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300">
            Draft
          </Badge>
        );
      case QuotationStatus.SENT:
        return (
          <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-300">
            Sent to Client
          </Badge>
        );
      case QuotationStatus.ACCEPTED:
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300">
            Accepted
          </Badge>
        );
      case QuotationStatus.REJECTED:
        return (
          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300">
            Declined
          </Badge>
        );
      case QuotationStatus.EXPIRED:
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
            Expired
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
                Total Quotations
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalCount}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Active quote registry</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-[#ACCAD5]/20 flex items-center justify-center text-[#2A4365]">
              <FileText className="h-5 w-5 text-slate-700" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-md border-slate-200/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Proposals Emailed
              </p>
              <h3 className="text-2xl font-bold text-sky-700 mt-1">{sentCount}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Dispatched to clients</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600">
              <Mail className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-md border-slate-200/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Deals Accepted
              </p>
              <h3 className="text-2xl font-bold text-emerald-700 mt-1">{acceptedCount}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Ready for invoice / deal</p>
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
                Quotation Pipeline
              </p>
              <h3 className="text-2xl font-bold text-[#F0944D] mt-1">
                ₹{totalPipelineValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Cumulative net value</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. FILTER & ACTION TOOLBAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-slate-200/80 shadow-xs">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by quote #, client, phone, email, or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs bg-white/80 border-slate-200/80 shadow-2xs h-9"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border border-slate-200 bg-white/90 px-3 text-xs text-slate-700 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#F0944D]/20"
          >
            <option value="ALL">All Statuses</option>
            <option value={QuotationStatus.DRAFT}>Draft</option>
            <option value={QuotationStatus.SENT}>Sent to Client</option>
            <option value={QuotationStatus.ACCEPTED}>Accepted</option>
            <option value={QuotationStatus.REJECTED}>Declined</option>
            <option value={QuotationStatus.EXPIRED}>Expired</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setSelectedQuotation(null);
              setIsFormOpen(true);
            }}
            className="h-9 text-xs font-semibold bg-gradient-to-r from-[#ACCAD5] to-[#F0944D] text-slate-900 shadow-xs hover:opacity-95"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Quotation
          </Button>
        </div>
      </div>

      {/* 3. QUOTATIONS DATA TABLE */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/70 backdrop-blur-md shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] uppercase tracking-wider font-semibold text-slate-700">
              <tr>
                <th className="px-4 py-3.5">Quotation Ref</th>
                <th className="px-4 py-3.5">Client & Contact</th>
                <th className="px-4 py-3.5">Company / Entity</th>
                <th className="px-4 py-3.5">Services Quoted</th>
                <th className="px-4 py-3.5">Net Payable</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Prepared By</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredQuotations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium text-slate-600">No quotations found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Create your first client quotation using the button above.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredQuotations.map((q) => (
                  <tr
                    key={q.id}
                    className="hover:bg-slate-50/70 transition-colors group"
                  >
                    {/* Ref Number & Date */}
                    <td className="px-4 py-3.5 font-medium text-slate-900">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900 tracking-tight flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-[#F0944D]" />
                          {q.quotationNumber}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(q.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </td>

                    {/* Client */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-800">{q.clientName}</span>
                        <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3 text-slate-400" />
                          {q.clientPhone || "—"}
                        </span>
                        {q.clientEmail && (
                          <span className="text-[10px] text-slate-400 truncate max-w-[150px]">
                            {q.clientEmail}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Company */}
                    <td className="px-4 py-3.5">
                      {q.companyName ? (
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-800 flex items-center gap-1">
                            <Building2 className="h-3 w-3 text-slate-400" />
                            {q.companyName}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {q.companyType || "Enterprise"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Individual Client</span>
                      )}
                    </td>

                    {/* Services Breakdown */}
                    <td className="px-4 py-3.5 max-w-[200px]">
                      {q.services.length > 0 ? (
                        <div className="space-y-0.5">
                          <p className="font-medium text-slate-800 truncate" title={q.services[0].serviceName}>
                            {q.services[0].serviceName}
                          </p>
                          {q.services.length > 1 && (
                            <span className="inline-block text-[10px] text-slate-500 font-medium bg-slate-100 px-1.5 py-0.2 rounded">
                              +{q.services.length - 1} more service{q.services.length > 2 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Grand Total */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-sm">
                          ₹{q.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          (GST: ₹{q.gstAmount.toLocaleString("en-IN")})
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">{getStatusBadge(q.status)}</td>

                    {/* Prepared By */}
                    <td className="px-4 py-3.5 text-slate-600">
                      <span className="inline-flex items-center gap-1 text-[11px]">
                        <User className="h-3 w-3 text-slate-400" />
                        {q.preparedByName || "Staff"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View Quotation Details */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setViewQuotation(q)}
                          className="h-8 w-8 text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                          title="View Quotation Details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>

                        {/* Direct Email to Client */}
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={sendingId === q.id}
                          onClick={() => handleSendToClient(q)}
                          className="h-8 w-8 text-sky-600 hover:text-sky-800 hover:bg-sky-50"
                          title={q.clientEmail ? `Send PDF to ${q.clientEmail}` : "Client email missing"}
                        >
                          {sendingId === q.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Send className="h-3.5 w-3.5" />
                          )}
                        </Button>

                        {/* View / Download PDF */}
                        {q.pdfUrl ? (
                          <button
                            type="button"
                            onClick={() =>
                              openDocumentPreview(
                                q.pdfUrl!,
                                `${q.quotationNumber} — Quotation PDF`,
                                "pdf"
                              )
                            }
                            className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 transition-colors cursor-pointer"
                            title="Preview Quotation PDF"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        ) : null}

                        {/* Edit Quotation */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedQuotation(q);
                            setIsFormOpen(true);
                          }}
                          className="h-8 w-8 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                          title="Edit Quotation"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>

                        {/* Delete Quotation */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(q)}
                          className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                          title="Delete Quotation"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. MODALS */}
      <QuotationDetailModal
        open={Boolean(viewQuotation)}
        onOpenChange={(open) => !open && setViewQuotation(null)}
        quotation={viewQuotation}
        onEdit={() => {
          if (viewQuotation) {
            setSelectedQuotation(viewQuotation);
            setIsFormOpen(true);
          }
        }}
        canEdit={true}
      />

      <QuotationFormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        quotation={selectedQuotation}
        masterData={masterData}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
      />

      <ConfirmationModal
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Quotation"
        description={`Are you sure you want to delete quotation ${deleteTarget?.quotationNumber} for ${deleteTarget?.clientName}? This action cannot be undone.`}
        confirmLabel="Delete Quotation"
        isDestructive={true}
        onConfirm={handleDeleteConfirm}
        isPending={isDeleting}
      />
    </div>
  );
}
