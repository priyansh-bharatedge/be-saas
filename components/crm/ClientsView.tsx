"use client";

import { useState } from "react";
import {
  Users,
  Plus,
  Search,
  UploadCloud,
  Edit2,
  Trash2,
  Phone,
  Mail,
  Building2,
  MapPin,
  Briefcase,
  UserCheck,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import ClientFormModal from "@/components/crm/ClientFormModal";
import ClientDetailModal from "@/components/crm/ClientDetailModal";
import BulkImportWizard from "@/components/shared/BulkImportWizard";
import BulkExportMenu from "@/components/shared/BulkExportMenu";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import {
  SerializedClient,
  createClientAction,
  updateClientAction,
  deleteClientAction,
  bulkUploadClientsAction,
} from "@/lib/actions/crm";
import { clientSchema, ClientFormData } from "@/lib/validations/crm";

interface ClientsViewProps {
  initialClients: SerializedClient[];
  companies: { id: string; name: string }[];
  employees: { id: string; name: string; department: string }[];
  canManageAll: boolean;
}

export default function ClientsView({
  initialClients,
  companies,
  employees,
  canManageAll,
}: ClientsViewProps) {
  const [clients, setClients] = useState<SerializedClient[]>(initialClients);
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("ALL");

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<SerializedClient | null>(null);
  const [viewClient, setViewClient] = useState<SerializedClient | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);

  const [deletingClient, setDeletingClient] = useState<SerializedClient | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtered Clients
  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      search === "" ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
      c.clientNumber.toLowerCase().includes(search.toLowerCase()) ||
      (c.companyName && c.companyName.toLowerCase().includes(search.toLowerCase())) ||
      (c.city && c.city.toLowerCase().includes(search.toLowerCase()));

    const matchesCompany =
      companyFilter === "ALL" ||
      (companyFilter === "NONE" && !c.companyId && !c.companyName) ||
      c.companyId === companyFilter;

    return matchesSearch && matchesCompany;
  });

  // Metrics
  const totalCount = clients.length;
  const withCompanyCount = clients.filter((c) => Boolean(c.companyId || c.companyName)).length;
  const individualCount = totalCount - withCompanyCount;
  const activeDealsCount = clients.reduce((acc, c) => acc + c.dealsCount, 0);

  const handleOpenCreate = () => {
    setEditingClient(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (c: SerializedClient) => {
    setEditingClient(c);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: ClientFormData) => {
    setIsSubmitting(true);
    try {
      if (editingClient) {
        const res = await updateClientAction(editingClient.id, data);
        if (res.success && res.data) {
          toast.success(`Client "${res.data.name}" updated!`);
          setClients((prev) =>
            prev.map((item) => (item.id === res.data!.id ? res.data! : item))
          );
          setIsFormOpen(false);
        } else {
          toast.error(res.error || "Failed to update client.");
        }
      } else {
        const res = await createClientAction(data);
        if (res.success && res.data) {
          toast.success(`Client "${res.data.name}" (${res.data.clientNumber}) registered!`);
          setClients((prev) => [res.data!, ...prev]);
          setIsFormOpen(false);
        } else {
          toast.error(res.error || "Failed to create client.");
        }
      }
    } catch {
      toast.error("An unexpected error occurred while saving client.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingClient) return;
    setIsDeleting(true);
    try {
      const res = await deleteClientAction(deletingClient.id);
      if (res.success) {
        toast.success(`Client "${deletingClient.name}" removed from registry.`);
        setClients((prev) => prev.filter((c) => c.id !== deletingClient.id));
        setDeletingClient(null);
      } else {
        toast.error(res.error || "Failed to delete client.");
      }
    } catch {
      toast.error("An unexpected error occurred while deleting client.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkUpload = async (records: ClientFormData[]) => {
    const res = await bulkUploadClientsAction(records);
    if (res.success) {
      window.location.reload();
    }
    return res;
  };

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Clients</span>
            <Users className="h-4 w-4 text-[#ACCAD5]" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {canManageAll ? "All enterprise records" : "Scoped to your team"}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Corporate Accounts</span>
            <Building2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{withCompanyCount}</p>
          <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Linked to registered companies</p>
        </div>

        <div className="p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Individual Clients</span>
            <UserCheck className="h-4 w-4 text-sky-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{individualCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Direct retail / individual leads</p>
        </div>

        <div className="p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Active Deals</span>
            <Briefcase className="h-4 w-4 text-[#F0944D]" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{activeDealsCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Associated pipeline deals</p>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="relative z-20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex flex-1 items-center gap-2.5">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by phone, email, client name, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs rounded-full bg-slate-50/70 border-slate-200"
            />
          </div>

          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="h-9 px-3 rounded-full border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Companies</option>
            <option value="NONE">Individual Clients (No Company)</option>
            {companies.map((co) => (
              <option key={co.id} value={co.id}>
                {co.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {selectedClientIds.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-xs text-[#F0944D] font-semibold">
              <span>{selectedClientIds.length} selected</span>
              <button
                type="button"
                onClick={() => setSelectedClientIds([])}
                className="text-[10px] underline hover:text-orange-700 ml-1 cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}

          <BulkExportMenu
            moduleKey="clients"
            selectedIds={selectedClientIds}
            totalCount={filteredClients.length}
            searchQuery={search}
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsBulkOpen(true)}
            className="rounded-full text-xs gap-1.5 h-9 border-slate-200 text-slate-700 hover:text-slate-900 shadow-2xs font-medium"
          >
            <UploadCloud className="h-3.5 w-3.5 text-[#F0944D]" />
            Import Clients
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleOpenCreate}
            className="rounded-full text-xs font-semibold px-4 h-9 text-white bg-gradient-to-r from-[#ACCAD5] to-[#F0944D] hover:opacity-95 shadow-xs cursor-pointer gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            New Client
          </Button>
        </div>
      </div>

      {/* Clients Table */}
      <div className="rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredClients.length > 0 && selectedClientIds.length === filteredClients.length}
                    onChange={() => {
                      if (selectedClientIds.length === filteredClients.length) {
                        setSelectedClientIds([]);
                      } else {
                        setSelectedClientIds(filteredClients.map((c) => c.id));
                      }
                    }}
                    className="rounded border-slate-300 text-[#F0944D] focus:ring-[#F0944D] cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4">Client Identifier</th>
                <th className="py-3 px-4">Contact Info (Phone / Email)</th>
                <th className="py-3 px-4">Company Affiliation</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Account Manager</th>
                <th className="py-3 px-4 text-center">Deals</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Users className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No clients found</p>
                    <p className="text-[11px] mt-0.5">
                      {search
                        ? "Try searching another phone number or email"
                        : "Click 'New Client' or 'Import Clients' to register accounts."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50/60 transition-colors group">
                    <td className="py-3 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedClientIds.includes(client.id)}
                        onChange={() =>
                          setSelectedClientIds((prev) =>
                            prev.includes(client.id)
                              ? prev.filter((id) => id !== client.id)
                              : [...prev, client.id]
                          )
                        }
                        className="rounded border-slate-300 text-[#F0944D] focus:ring-[#F0944D] cursor-pointer"
                      />
                    </td>
                    {/* Identifier */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 group-hover:text-[#F0944D] transition-colors flex items-center gap-1.5">
                        <span>{client.name}</span>
                        {client.gender && (
                          <span className="text-[10px] text-slate-400 font-normal">({client.gender.charAt(0)})</span>
                        )}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400 mt-0.5">
                        {client.clientNumber}
                      </div>
                    </td>

                    {/* Contact Info */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-900 font-semibold">
                        <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                        <span>{client.phone}</span>
                        {client.alternatePhone && (
                          <span className="text-[10px] text-slate-400 font-normal">/ {client.alternatePhone}</span>
                        )}
                      </div>
                      {client.email && (
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                          <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[180px]">{client.email}</span>
                        </div>
                      )}
                    </td>

                    {/* Company */}
                    <td className="py-3 px-4">
                      {client.companyName || client.company?.name ? (
                        <div className="flex items-center gap-1 text-slate-800 font-medium">
                          <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[160px]">
                            {client.companyName || client.company?.name}
                          </span>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-normal border-slate-200 text-slate-400">
                          Individual
                        </Badge>
                      )}
                      {client.gstNumber && (
                        <p className="text-[9px] font-mono text-slate-400 mt-0.5">GST: {client.gstNumber}</p>
                      )}
                    </td>

                    {/* Location */}
                    <td className="py-3 px-4 text-slate-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                        <span>{[client.city, client.state].filter(Boolean).join(", ") || "India"}</span>
                      </div>
                    </td>

                    {/* Account Manager */}
                    <td className="py-3 px-4 text-slate-600 text-[11px]">
                      {client.assignedEmployeeName || "Unassigned"}
                    </td>

                    {/* Deals */}
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full font-mono text-[10px] bg-slate-100 text-slate-700">
                        {client.dealsCount} Deals
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewClient(client)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                          title="View Client Details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(client)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                          title="Edit Client"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingClient(client)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Client"
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
      <ClientDetailModal
        open={Boolean(viewClient)}
        onOpenChange={(open) => !open && setViewClient(null)}
        client={viewClient}
        onEdit={() => {
          if (viewClient) {
            handleOpenEdit(viewClient);
          }
        }}
        canEdit={true}
      />

      {/* Form Modal */}
      <ClientFormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        client={editingClient}
        companies={companies}
        employees={employees}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
      />

      {/* Bulk Import Wizard Modal */}
      <BulkImportWizard
        open={isBulkOpen}
        onOpenChange={setIsBulkOpen}
        moduleKey="clients"
        onSuccess={() => window.location.reload()}
      />

      {/* Confirmation Delete Modal */}
      <ConfirmationModal
        open={Boolean(deletingClient)}
        onOpenChange={(open) => !open && setDeletingClient(null)}
        title="Delete Client Record"
        description={`Are you sure you want to delete "${deletingClient?.name}" (${deletingClient?.phone})? You can only delete clients who do not have linked deals, quotations, or payments.`}
        confirmLabel="Delete Client"
        isPending={isDeleting}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
