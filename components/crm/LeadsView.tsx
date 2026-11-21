"use client";

import { useState } from "react";
import {
  UserPlus,
  Plus,
  Search,
  UploadCloud,
  Edit2,
  Trash2,
  Phone,
  Mail,
  Building2,
  TrendingUp,
  Target,
  CheckCircle2,
  Layers,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import LeadFormModal from "@/components/crm/LeadFormModal";
import LeadDetailModal from "@/components/crm/LeadDetailModal";
import BulkUploadModal, { BulkUploadColumnDef } from "@/components/crm/BulkUploadModal";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import {
  SerializedLead,
  createLeadAction,
  updateLeadAction,
  deleteLeadAction,
  bulkUploadLeadsAction,
} from "@/lib/actions/crm";
import { leadSchema, LeadFormData } from "@/lib/validations/crm";
import { LeadStatus } from "@prisma/client";

interface LeadsViewProps {
  initialLeads: SerializedLead[];
  employees: { id: string; name: string; department: string }[];
  canManageAll: boolean;
}

const BULK_COLUMNS: BulkUploadColumnDef[] = [
  { key: "name", header: "Contact Person", aliases: ["lead name", "contact", "name"], required: true },
  { key: "phone", header: "Phone Number", aliases: ["mobile", "phone"], required: true },
  { key: "email", header: "Email Address", aliases: ["email", "mail"] },
  { key: "companyName", header: "Company Name", aliases: ["company", "organization"] },
  { key: "source", header: "Lead Source", aliases: ["channel", "source"] },
  { key: "status", header: "Status", aliases: ["stage", "lead status"] },
  { key: "estimatedBudget", header: "Estimated Budget", aliases: ["budget", "value"], type: "number" },
  { key: "notes", header: "Notes", aliases: ["requirement", "description"] },
];

const SAMPLE_DATA: Record<string, string | number>[] = [
  {
    name: "Rameshwar Patel",
    phone: "9825098765",
    email: "rameshwar@patelagro.com",
    companyName: "Patel Agro Enterprises",
    source: "Website Inbound",
    status: "NEW",
    estimatedBudget: 35000,
    notes: "Requires private limited incorporation & trademark registration.",
  },
  {
    name: "Meera Sen",
    phone: "9871122334",
    email: "meera.sen@designcraft.in",
    companyName: "DesignCraft Studios",
    source: "LinkedIn Campaign",
    status: "QUALIFIED",
    estimatedBudget: 50000,
    notes: "Interested in monthly corporate compliance and GST retainer.",
  },
];

function getStatusBadge(status: LeadStatus) {
  switch (status) {
    case LeadStatus.NEW:
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
          New
        </span>
      );
    case LeadStatus.CONTACTED:
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          Contacted
        </span>
      );
    case LeadStatus.QUALIFIED:
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
          Qualified
        </span>
      );
    case LeadStatus.PROPOSAL_SENT:
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          Quote Sent
        </span>
      );
    case LeadStatus.WON:
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          Won (Deal)
        </span>
      );
    case LeadStatus.LOST:
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          Lost
        </span>
      );
    case LeadStatus.JUNK:
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
          Junk
        </span>
      );
    default:
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
          {status}
        </span>
      );
  }
}

export default function LeadsView({
  initialLeads,
  employees,
  canManageAll,
}: LeadsViewProps) {
  const [leads, setLeads] = useState<SerializedLead[]>(initialLeads);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sourceFilter, setSourceFilter] = useState("ALL");

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<SerializedLead | null>(null);
  const [viewLead, setViewLead] = useState<SerializedLead | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isBulkOpen, setIsBulkOpen] = useState(false);

  const [deletingLead, setDeletingLead] = useState<SerializedLead | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtered Leads
  const filteredLeads = leads.filter((l) => {
    const matchesSearch =
      search === "" ||
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.phone.includes(search) ||
      (l.email && l.email.toLowerCase().includes(search.toLowerCase())) ||
      l.leadNumber.toLowerCase().includes(search.toLowerCase()) ||
      (l.companyName && l.companyName.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === "ALL" || l.status === statusFilter;
    const matchesSource = sourceFilter === "ALL" || l.source === sourceFilter;

    return matchesSearch && matchesStatus && matchesSource;
  });

  // Unique sources
  const allSources = Array.from(new Set(leads.map((l) => l.source).filter(Boolean)));

  // Metrics
  const totalCount = leads.length;
  const qualifiedCount = leads.filter(
    (l) => l.status === LeadStatus.QUALIFIED || l.status === LeadStatus.PROPOSAL_SENT
  ).length;
  const wonCount = leads.filter((l) => l.status === LeadStatus.WON).length;
  const pipelineValue = leads
    .filter((l) => l.status !== LeadStatus.LOST && l.status !== LeadStatus.JUNK)
    .reduce((acc, l) => acc + (l.estimatedBudget || 0), 0);

  const handleOpenCreate = () => {
    setEditingLead(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (l: SerializedLead) => {
    setEditingLead(l);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: LeadFormData) => {
    setIsSubmitting(true);
    try {
      if (editingLead) {
        const res = await updateLeadAction(editingLead.id, data);
        if (res.success && res.data) {
          toast.success(`Lead "${res.data.name}" updated!`);
          setLeads((prev) =>
            prev.map((item) => (item.id === res.data!.id ? res.data! : item))
          );
          setIsFormOpen(false);
        } else {
          toast.error(res.error || "Failed to update lead.");
        }
      } else {
        const res = await createLeadAction(data);
        if (res.success && res.data) {
          toast.success(`Lead "${res.data.name}" (${res.data.leadNumber}) captured!`);
          setLeads((prev) => [res.data!, ...prev]);
          setIsFormOpen(false);
        } else {
          toast.error(res.error || "Failed to create lead.");
        }
      }
    } catch {
      toast.error("An unexpected error occurred while saving lead.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingLead) return;
    setIsDeleting(true);
    try {
      const res = await deleteLeadAction(deletingLead.id);
      if (res.success) {
        toast.success(`Lead "${deletingLead.name}" removed.`);
        setLeads((prev) => prev.filter((l) => l.id !== deletingLead.id));
        setDeletingLead(null);
      } else {
        toast.error(res.error || "Failed to delete lead.");
      }
    } catch {
      toast.error("An unexpected error occurred while deleting lead.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkUpload = async (records: LeadFormData[]) => {
    const res = await bulkUploadLeadsAction(records);
    if (res.success) {
      window.location.reload();
    }
    return res;
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Leads</span>
            <UserPlus className="h-4 w-4 text-[#ACCAD5]" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {canManageAll ? "All pipeline inbound" : "Assigned to your team"}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Qualified Deals</span>
            <Target className="h-4 w-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{qualifiedCount}</p>
          <p className="text-[10px] text-indigo-600 font-medium mt-0.5">High propensity accounts</p>
        </div>

        <div className="p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Won Leads</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{wonCount}</p>
          <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Ready for deal conversion</p>
        </div>

        <div className="p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Pipeline Value</span>
            <TrendingUp className="h-4 w-4 text-[#F0944D]" />
          </div>
          <p className="text-2xl font-bold text-slate-900">₹{pipelineValue.toLocaleString("en-IN")}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Active estimated budget sum</p>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-2xs">
        <div className="flex flex-1 items-center gap-2.5">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search leads by name, phone, company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs rounded-full bg-slate-50/70 border-slate-200"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-full border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">New</option>
            <option value="CONTACTED">Contacted</option>
            <option value="QUALIFIED">Qualified</option>
            <option value="PROPOSAL_SENT">Quote Sent</option>
            <option value="WON">Won</option>
            <option value="LOST">Lost</option>
            <option value="JUNK">Junk</option>
          </select>

          {allSources.length > 0 && (
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="h-9 px-3 rounded-full border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none hidden md:block"
            >
              <option value="ALL">All Channels</option>
              {allSources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsBulkOpen(true)}
            className="rounded-full text-xs gap-1.5 h-9 border-slate-200 text-slate-700 hover:text-slate-900 shadow-2xs"
          >
            <UploadCloud className="h-3.5 w-3.5 text-[#F0944D]" />
            Bulk Upload CSV
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleOpenCreate}
            className="rounded-full text-xs font-semibold px-4 h-9 text-white bg-gradient-to-r from-[#ACCAD5] to-[#F0944D] hover:opacity-95 shadow-xs cursor-pointer gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Capture Lead
          </Button>
        </div>
      </div>

      {/* Leads Table */}
      <div className="rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Lead Opportunity</th>
                <th className="py-3 px-4">Contact Person</th>
                <th className="py-3 px-4">Channel Source</th>
                <th className="py-3 px-4 text-center">Pipeline Status</th>
                <th className="py-3 px-4 text-right">Est. Budget</th>
                <th className="py-3 px-4">Assigned To</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <UserPlus className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No leads captured yet</p>
                    <p className="text-[11px] mt-0.5">
                      {search
                        ? "Try searching another phone number, contact, or company"
                        : "Click 'Capture Lead' or 'Bulk Upload CSV' to start tracking opportunities."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/60 transition-colors group">
                    {/* Identifier */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 group-hover:text-[#F0944D] transition-colors">
                        {lead.companyName || lead.name}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400 mt-0.5">
                        {lead.leadNumber}
                      </div>
                    </td>

                    {/* Contact Person */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{lead.name}</div>
                      <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-500 mt-0.5">
                        <Phone className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                        <span>{lead.phone}</span>
                        {lead.email && <span className="text-slate-400">&bull; {lead.email}</span>}
                      </div>
                    </td>

                    {/* Source Channel */}
                    <td className="py-3 px-4 text-slate-600">
                      <Badge variant="outline" className="text-[10px] font-normal border-slate-200 text-slate-600">
                        {lead.source}
                      </Badge>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
                      {getStatusBadge(lead.status)}
                    </td>

                    {/* Budget */}
                    <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono">
                      {lead.estimatedBudget > 0 ? `₹${lead.estimatedBudget.toLocaleString("en-IN")}` : "—"}
                    </td>

                    {/* Assigned */}
                    <td className="py-3 px-4 text-slate-600 text-[11px]">
                      {lead.assignedEmployeeName || "Unassigned"}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewLead(lead)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                          title="View Lead Details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(lead)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                          title="Edit Lead"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingLead(lead)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Lead"
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
      </div>

      {/* Detail Modal */}
      <LeadDetailModal
        open={Boolean(viewLead)}
        onOpenChange={(open) => !open && setViewLead(null)}
        lead={viewLead}
        onEdit={() => {
          if (viewLead) {
            handleOpenEdit(viewLead);
          }
        }}
        canEdit={true}
      />

      {/* Form Modal */}
      <LeadFormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        lead={editingLead}
        employees={employees}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
      />

      {/* Bulk Upload Modal */}
      <BulkUploadModal<LeadFormData>
        open={isBulkOpen}
        onOpenChange={setIsBulkOpen}
        title="Bulk Upload Leads"
        description="Batch capture leads with contact numbers, channel sources, qualification statuses, and budgets."
        sampleFileName="bharatedge_leads_template.csv"
        columns={BULK_COLUMNS}
        sampleData={SAMPLE_DATA}
        schema={leadSchema}
        onUpload={handleBulkUpload}
      />

      {/* Confirmation Delete Modal */}
      <ConfirmationModal
        open={Boolean(deletingLead)}
        onOpenChange={(open) => !open && setDeletingLead(null)}
        title="Delete Sales Lead"
        description={`Are you sure you want to delete lead "${deletingLead?.name}" (${deletingLead?.leadNumber})? This action cannot be reversed.`}
        confirmLabel="Delete Lead"
        isPending={isDeleting}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
