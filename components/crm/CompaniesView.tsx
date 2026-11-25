"use client";

import { useState } from "react";
import {
  Building2,
  Plus,
  Search,
  UploadCloud,
  Edit2,
  Trash2,
  Globe,
  FileCheck2,
  MapPin,
  Calendar,
  Users,
  Briefcase,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import CompanyFormModal from "@/components/crm/CompanyFormModal";
import CompanyDetailModal from "@/components/crm/CompanyDetailModal";
import BulkImportWizard from "@/components/shared/BulkImportWizard";
import BulkExportMenu from "@/components/shared/BulkExportMenu";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import {
  SerializedCompany,
  createCompanyAction,
  updateCompanyAction,
  deleteCompanyAction,
  bulkUploadCompaniesAction,
} from "@/lib/actions/crm";
import { companySchema, CompanyFormData } from "@/lib/validations/crm";

interface CompaniesViewProps {
  initialCompanies: SerializedCompany[];
  canManageAll: boolean;
}

export default function CompaniesView({
  initialCompanies,
  canManageAll,
}: CompaniesViewProps) {
  const [companies, setCompanies] = useState<SerializedCompany[]>(initialCompanies);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<SerializedCompany | null>(null);
  const [viewCompany, setViewCompany] = useState<SerializedCompany | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);

  const [deletingCompany, setDeletingCompany] = useState<SerializedCompany | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtered List
  const filteredCompanies = companies.filter((c) => {
    const matchesSearch =
      search === "" ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.industry && c.industry.toLowerCase().includes(search.toLowerCase())) ||
      (c.city && c.city.toLowerCase().includes(search.toLowerCase())) ||
      (c.state && c.state.toLowerCase().includes(search.toLowerCase())) ||
      (c.gstNumber && c.gstNumber.toLowerCase().includes(search.toLowerCase())) ||
      (c.panNumber && c.panNumber.toLowerCase().includes(search.toLowerCase()));

    const matchesType = typeFilter === "ALL" || c.companyType === typeFilter;
    return matchesSearch && matchesType;
  });

  // Metrics
  const totalCount = companies.length;
  const totalClientsLinked = companies.reduce((acc, c) => acc + c.clientsCount, 0);
  const totalDealsLinked = companies.reduce((acc, c) => acc + c.dealsCount, 0);
  const gstCompliantCount = companies.filter((c) => Boolean(c.gstNumber)).length;

  const handleOpenCreate = () => {
    setEditingCompany(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (c: SerializedCompany) => {
    setEditingCompany(c);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: CompanyFormData) => {
    setIsSubmitting(true);
    try {
      if (editingCompany) {
        const res = await updateCompanyAction(editingCompany.id, data);
        if (res.success && res.data) {
          toast.success(`Company "${res.data.name}" updated!`);
          setCompanies((prev) =>
            prev.map((item) => (item.id === res.data!.id ? res.data! : item))
          );
          setIsFormOpen(false);
        } else {
          toast.error(res.error || "Failed to update company.");
        }
      } else {
        const res = await createCompanyAction(data);
        if (res.success && res.data) {
          toast.success(`Company "${res.data.name}" registered!`);
          setCompanies((prev) => [res.data!, ...prev]);
          setIsFormOpen(false);
        } else {
          toast.error(res.error || "Failed to create company.");
        }
      }
    } catch {
      toast.error("An unexpected error occurred while saving company.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCompany) return;
    setIsDeleting(true);
    try {
      const res = await deleteCompanyAction(deletingCompany.id);
      if (res.success) {
        toast.success(`Company "${deletingCompany.name}" deleted.`);
        setCompanies((prev) => prev.filter((c) => c.id !== deletingCompany.id));
        setDeletingCompany(null);
      } else {
        toast.error(res.error || "Failed to delete company.");
      }
    } catch {
      toast.error("An unexpected error occurred while deleting company.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkUpload = async (records: CompanyFormData[]) => {
    const res = await bulkUploadCompaniesAction(records);
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
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Companies</span>
            <Building2 className="h-4 w-4 text-[#ACCAD5]" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {canManageAll ? "All enterprise records" : "Scoped to your team"}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Linked Clients</span>
            <Users className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalClientsLinked}</p>
          <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Stakeholder contacts</p>
        </div>

        <div className="p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Active Deals</span>
            <Briefcase className="h-4 w-4 text-[#F0944D]" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalDealsLinked}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Associated pipeline deals</p>
        </div>

        <div className="p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">GST Registered</span>
            <FileCheck2 className="h-4 w-4 text-sky-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{gstCompliantCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Verified statutory tax IDs</p>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="relative z-20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex flex-1 items-center gap-2.5">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search companies, GSTIN, PAN, city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs rounded-full bg-slate-50/70 border-slate-200"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 px-3 rounded-full border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Company Types</option>
            <option value="Private Limited Company">Private Limited</option>
            <option value="Limited Liability Partnership (LLP)">LLP</option>
            <option value="Partnership Firm">Partnership</option>
            <option value="Sole Proprietorship">Proprietorship</option>
            <option value="Public Limited Company">Public Limited</option>
          </select>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {selectedCompanyIds.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-xs text-[#F0944D] font-semibold">
              <span>{selectedCompanyIds.length} selected</span>
              <button
                type="button"
                onClick={() => setSelectedCompanyIds([])}
                className="text-[10px] underline hover:text-orange-700 ml-1 cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}

          <BulkExportMenu
            moduleKey="companies"
            selectedIds={selectedCompanyIds}
            totalCount={filteredCompanies.length}
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
            Import Companies
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleOpenCreate}
            className="rounded-full text-xs font-semibold px-4 h-9 text-white bg-gradient-to-r from-[#ACCAD5] to-[#F0944D] hover:opacity-95 shadow-xs cursor-pointer gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Register Company
          </Button>
        </div>
      </div>

      {/* Companies Table */}
      <div className="rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredCompanies.length > 0 && selectedCompanyIds.length === filteredCompanies.length}
                    onChange={() => {
                      if (selectedCompanyIds.length === filteredCompanies.length) {
                        setSelectedCompanyIds([]);
                      } else {
                        setSelectedCompanyIds(filteredCompanies.map((c) => c.id));
                      }
                    }}
                    className="rounded border-slate-300 text-[#F0944D] focus:ring-[#F0944D] cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4">Company Profile</th>
                <th className="py-3 px-4">Type & Industry</th>
                <th className="py-3 px-4">Statutory Identifiers</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4 text-center">Linked Records</th>
                <th className="py-3 px-4">Created By</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredCompanies.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Building2 className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No companies found</p>
                    <p className="text-[11px] mt-0.5">
                      {search
                        ? "Try adjusting your search criteria"
                        : "Click 'Register Company' or 'Import Companies' to create accounts."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCompanies.map((comp) => (
                  <tr key={comp.id} className="hover:bg-slate-50/60 transition-colors group">
                    <td className="py-3 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedCompanyIds.includes(comp.id)}
                        onChange={() =>
                          setSelectedCompanyIds((prev) =>
                            prev.includes(comp.id)
                              ? prev.filter((id) => id !== comp.id)
                              : [...prev, comp.id]
                          )
                        }
                        className="rounded border-slate-300 text-[#F0944D] focus:ring-[#F0944D] cursor-pointer"
                      />
                    </td>
                    {/* Name & Website */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 group-hover:text-[#F0944D] transition-colors">
                        {comp.name}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                        {comp.website && (
                          <a
                            href={comp.website.startsWith("http") ? comp.website : `https://${comp.website}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-0.5 hover:text-slate-700 underline truncate max-w-[180px]"
                          >
                            <Globe className="h-2.5 w-2.5 shrink-0" />
                            {comp.website.replace(/^https?:\/\//, "")}
                          </a>
                        )}
                        {comp.incorporatedDate && (
                          <span className="flex items-center gap-0.5 font-mono">
                            <Calendar className="h-2.5 w-2.5" />
                            Inc: {comp.incorporatedDate}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Type & Industry */}
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="text-[10px] font-normal border-slate-200 text-slate-700 block max-w-fit">
                        {comp.companyType || "Enterprise"}
                      </Badge>
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate">{comp.industry || "General Industry"}</p>
                    </td>

                    {/* Statutory IDs */}
                    <td className="py-3 px-4">
                      <div className="space-y-0.5 font-mono text-[10px]">
                        {comp.gstNumber ? (
                          <div className="text-slate-800">
                            <span className="text-slate-400 font-semibold">GSTIN:</span> {comp.gstNumber}
                          </div>
                        ) : (
                          <span className="text-slate-300">GST: Unregistered</span>
                        )}
                        {comp.panNumber && (
                          <div className="text-slate-600">
                            <span className="text-slate-400 font-semibold">PAN:</span> {comp.panNumber}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-3 px-4 text-slate-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                        <span>{[comp.city, comp.state].filter(Boolean).join(", ") || "India"}</span>
                      </div>
                    </td>

                    {/* Linked Counts */}
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-2 text-[10px] font-mono">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700" title="Linked Clients">
                          {comp.clientsCount} Clients
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200" title="Linked Deals">
                          {comp.dealsCount} Deals
                        </span>
                      </div>
                    </td>

                    {/* Creator */}
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {comp.creatorName || "System"}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewCompany(comp)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                          title="View Company Details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(comp)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                          title="Edit Company"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingCompany(comp)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Company"
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
      <CompanyDetailModal
        open={Boolean(viewCompany)}
        onOpenChange={(open) => !open && setViewCompany(null)}
        company={viewCompany}
        onEdit={() => {
          if (viewCompany) {
            handleOpenEdit(viewCompany);
          }
        }}
        canEdit={true}
      />

      {/* Form Modal */}
      <CompanyFormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        company={editingCompany}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
      />

      {/* Bulk Import Wizard Modal */}
      <BulkImportWizard
        open={isBulkOpen}
        onOpenChange={setIsBulkOpen}
        moduleKey="companies"
        onSuccess={() => window.location.reload()}
      />

      {/* Confirmation Delete Modal */}
      <ConfirmationModal
        open={Boolean(deletingCompany)}
        onOpenChange={(open) => !open && setDeletingCompany(null)}
        title="Delete Company Record"
        description={`Are you sure you want to delete "${deletingCompany?.name}"? You can only delete companies that do not have active linked deals or clients.`}
        confirmLabel="Delete Company"
        isPending={isDeleting}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
