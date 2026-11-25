"use client";

import { useState } from "react";
import {
  Layers,
  Plus,
  Search,
  UploadCloud,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  IndianRupee,
  ShieldCheck,
  Tag,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import ServiceFormModal from "@/components/crm/ServiceFormModal";
import ServiceDetailModal from "@/components/crm/ServiceDetailModal";
import BulkImportWizard from "@/components/shared/BulkImportWizard";
import BulkExportMenu from "@/components/shared/BulkExportMenu";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import {
  SerializedService,
  createServiceAction,
  updateServiceAction,
  deleteServiceAction,
  bulkUploadServicesAction,
} from "@/lib/actions/crm";
import { serviceSchema, ServiceFormData } from "@/lib/validations/crm";

interface ServicesViewProps {
  initialServices: SerializedService[];
  initialCategories: string[];
}

export default function ServicesView({
  initialServices,
  initialCategories,
}: ServicesViewProps) {
  const [services, setServices] = useState<SerializedService[]>(initialServices);
  const [categories] = useState<string[]>(initialCategories);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [activeFilter, setActiveFilter] = useState<string>("ALL");

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<SerializedService | null>(null);
  const [viewService, setViewService] = useState<SerializedService | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

  const [deletingService, setDeletingService] = useState<SerializedService | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtered services
  const filteredServices = services.filter((s) => {
    const matchesSearch =
      search === "" ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.code && s.code.toLowerCase().includes(search.toLowerCase())) ||
      (s.category && s.category.toLowerCase().includes(search.toLowerCase())) ||
      (s.sacCode && s.sacCode.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory = selectedCategory === "ALL" || s.category === selectedCategory;
    const matchesActive =
      activeFilter === "ALL" ||
      (activeFilter === "ACTIVE" && s.isActive) ||
      (activeFilter === "INACTIVE" && !s.isActive);

    return matchesSearch && matchesCategory && matchesActive;
  });

  // Metrics
  const totalCount = services.length;
  const activeCount = services.filter((s) => s.isActive).length;
  const avgMinPrice =
    totalCount > 0
      ? Math.round(services.reduce((acc, s) => acc + s.minimumPrice, 0) / totalCount)
      : 0;
  const avgOutsource =
    totalCount > 0
      ? Math.round(services.reduce((acc, s) => acc + s.outsourcePrice, 0) / totalCount)
      : 0;

  // Form Handlers
  const handleOpenCreate = () => {
    setEditingService(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (s: SerializedService) => {
    setEditingService(s);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: ServiceFormData) => {
    setIsSubmitting(true);
    try {
      if (editingService) {
        const res = await updateServiceAction(editingService.id, data);
        if (res.success && res.data) {
          toast.success(`Service "${res.data.name}" updated successfully!`);
          setServices((prev) => prev.map((item) => (item.id === res.data!.id ? res.data! : item)));
          setIsFormOpen(false);
        } else {
          toast.error(res.error || "Failed to update service.");
        }
      } else {
        const res = await createServiceAction(data);
        if (res.success && res.data) {
          toast.success(`Service "${res.data.name}" registered in catalog!`);
          setServices((prev) => [res.data!, ...prev]);
          setIsFormOpen(false);
        } else {
          toast.error(res.error || "Failed to create service.");
        }
      }
    } catch {
      toast.error("An unexpected error occurred while saving service.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Handler
  const handleDeleteConfirm = async () => {
    if (!deletingService) return;
    setIsDeleting(true);
    try {
      const res = await deleteServiceAction(deletingService.id);
      if (res.success) {
        toast.success(`Service "${deletingService.name}" removed from catalog.`);
        setServices((prev) => prev.filter((s) => s.id !== deletingService.id));
        setDeletingService(null);
      } else {
        toast.error(res.error || "Failed to delete service.");
      }
    } catch {
      toast.error("An unexpected error occurred while deleting service.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Bulk Upload Handler
  const handleBulkUpload = async (records: ServiceFormData[]) => {
    const res = await bulkUploadServicesAction(records);
    if (res.success) {
      // Reload list locally or refresh
      window.location.reload();
    }
    return res;
  };

  return (
    <div className="space-y-6">
      {/* Metric Highlights */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Services</span>
            <Layers className="h-4 w-4 text-[#ACCAD5]" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{categories.length} categories active</p>
        </div>

        <div className="p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Active Services</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{activeCount}</p>
          <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Available for quotes & deals</p>
        </div>

        <div className="p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Avg Floor Price</span>
            <ShieldCheck className="h-4 w-4 text-[#F0944D]" />
          </div>
          <p className="text-2xl font-bold text-slate-900">₹{avgMinPrice.toLocaleString("en-IN")}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Enforced minimum discount guard</p>
        </div>

        <div className="p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Avg Outsource Cost</span>
            <IndianRupee className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">₹{avgOutsource.toLocaleString("en-IN")}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Vendor fulfillment expense</p>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="relative z-20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex flex-1 items-center gap-2.5">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by name, code, SAC, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs rounded-full bg-slate-50/70 border-slate-200"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-9 px-3 rounded-full border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="h-9 px-3 rounded-full border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {selectedServiceIds.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-xs text-[#F0944D] font-semibold">
              <span>{selectedServiceIds.length} selected</span>
              <button
                type="button"
                onClick={() => setSelectedServiceIds([])}
                className="text-[10px] underline hover:text-orange-700 ml-1 cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}

          <BulkExportMenu
            moduleKey="services"
            selectedIds={selectedServiceIds}
            totalCount={filteredServices.length}
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
            Import Services
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleOpenCreate}
            className="rounded-full text-xs font-semibold px-4 h-9 text-white bg-gradient-to-r from-[#ACCAD5] to-[#F0944D] hover:opacity-95 shadow-xs cursor-pointer gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            New Service
          </Button>
        </div>
      </div>

      {/* Services Table */}
      <div className="rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredServices.length > 0 && selectedServiceIds.length === filteredServices.length}
                    onChange={() => {
                      if (selectedServiceIds.length === filteredServices.length) {
                        setSelectedServiceIds([]);
                      } else {
                        setSelectedServiceIds(filteredServices.map((s) => s.id));
                      }
                    }}
                    className="rounded border-slate-300 text-[#F0944D] focus:ring-[#F0944D] cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4">Service Details</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Floor Price</th>
                <th className="py-3 px-4 text-right">Outsource Cost</th>
                <th className="py-3 px-4 text-center">GST Rate</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Layers className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No services found</p>
                    <p className="text-[11px] mt-0.5">
                      {search ? "Try adjusting your search criteria" : "Click 'New Service' or 'Import Services' to register offerings."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredServices.map((service) => (
                  <tr key={service.id} className="hover:bg-slate-50/60 transition-colors group">
                    <td className="py-3 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedServiceIds.includes(service.id)}
                        onChange={() =>
                          setSelectedServiceIds((prev) =>
                            prev.includes(service.id)
                              ? prev.filter((id) => id !== service.id)
                              : [...prev, service.id]
                          )
                        }
                        className="rounded border-slate-300 text-[#F0944D] focus:ring-[#F0944D] cursor-pointer"
                      />
                    </td>
                    {/* Name & Code */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 group-hover:text-[#F0944D] transition-colors">
                        {service.name}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-mono">
                        {service.code && <span>Code: {service.code}</span>}
                        {service.sacCode && <span>&bull; SAC: {service.sacCode}</span>}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="text-[10px] font-normal border-slate-200 text-slate-600">
                        <Tag className="h-2.5 w-2.5 mr-1 text-slate-400" />
                        {service.category || "General"}
                      </Badge>
                    </td>

                    {/* Minimum Floor Price */}
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      ₹{service.minimumPrice.toLocaleString("en-IN")}
                    </td>

                    {/* Outsource Cost */}
                    <td className="py-3 px-4 text-right font-medium text-slate-500">
                      ₹{service.outsourcePrice.toLocaleString("en-IN")}
                    </td>

                    {/* GST Rate */}
                    <td className="py-3 px-4 text-center font-mono text-[11px] text-slate-600">
                      {service.defaultGstRate}%
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
                      {service.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                          <XCircle className="h-3 w-3" /> Inactive
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewService(service)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                          title="View Service Details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(service)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                          title="Edit Service"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingService(service)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Service"
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
      <ServiceDetailModal
        open={Boolean(viewService)}
        onOpenChange={(open) => !open && setViewService(null)}
        service={viewService}
        onEdit={() => {
          if (viewService) {
            handleOpenEdit(viewService);
          }
        }}
        canEdit={true}
      />

      {/* Form Modal */}
      <ServiceFormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        service={editingService}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
      />

      {/* Bulk Import Wizard Modal */}
      <BulkImportWizard
        open={isBulkOpen}
        onOpenChange={setIsBulkOpen}
        moduleKey="services"
        onSuccess={() => window.location.reload()}
      />

      {/* Confirmation Delete Modal */}
      <ConfirmationModal
        open={Boolean(deletingService)}
        onOpenChange={(open) => !open && setDeletingService(null)}
        title="Delete Service Offering"
        description={`Are you sure you want to delete "${deletingService?.name}"? If active deals rely on this service, consider deactivating it instead.`}
        confirmLabel="Delete Service"
        isPending={isDeleting}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
