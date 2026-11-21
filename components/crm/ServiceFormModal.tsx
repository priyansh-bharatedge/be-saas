"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Layers, Loader2 } from "lucide-react";
import { serviceSchema, ServiceFormData } from "@/lib/validations/crm";
import { SerializedService } from "@/lib/actions/crm";

interface ServiceFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: SerializedService | null;
  onSubmit: (data: ServiceFormData) => Promise<void>;
  isSubmitting?: boolean;
}

const CATEGORIES = [
  "Corporate Legal",
  "Statutory Compliance",
  "Direct & Indirect Taxation",
  "Intellectual Property",
  "Financial Auditing",
  "Technology & IT Support",
  "HR & Payroll Consulting",
  "Other Enterprise Services",
];

export default function ServiceFormModal({
  open,
  onOpenChange,
  service,
  onSubmit,
  isSubmitting = false,
}: ServiceFormModalProps) {
  const isEditing = Boolean(service);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema) as any,
    defaultValues: {
      name: "",
      code: "",
      category: "Corporate Legal",
      description: "",
      minimumPrice: 5000,
      outsourcePrice: 0,
      sacCode: "",
      defaultGstRate: 18,
      isActive: true,
    },
  });

  useEffect(() => {
    if (service) {
      reset({
        name: service.name,
        code: service.code || "",
        category: service.category || "Corporate Legal",
        description: service.description || "",
        minimumPrice: service.minimumPrice,
        outsourcePrice: service.outsourcePrice,
        sacCode: service.sacCode || "",
        defaultGstRate: service.defaultGstRate,
        isActive: service.isActive,
      });
    } else {
      reset({
        name: "",
        code: "",
        category: "Corporate Legal",
        description: "",
        minimumPrice: 5000,
        outsourcePrice: 0,
        sacCode: "",
        defaultGstRate: 18,
        isActive: true,
      });
    }
  }, [service, reset, open]);

  const handleFormSubmit = async (data: ServiceFormData) => {
    await onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-hidden flex flex-col rounded-[28px] bg-white/95 backdrop-blur-2xl border border-white/80 p-6 sm:p-7 shadow-2xl">
        <DialogHeader className="shrink-0 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-50 text-[#F0944D] flex items-center justify-center font-bold text-sm shadow-xs border border-amber-200">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                {isEditing ? `Edit Service: ${service?.name}` : "Create New Enterprise Service"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Standardized pricing safeguards, SAC code mapping, and outsource expense margins.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="flex-1 overflow-y-auto space-y-4 py-4 pr-1"
        >
          {/* Service Name & Code */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Service Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                {...register("name")}
                placeholder="e.g. Private Limited Company Registration"
                className="h-9 text-xs rounded-xl"
              />
              {errors.name && (
                <p className="text-[11px] text-rose-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Service Code</Label>
              <Input
                {...register("code")}
                placeholder="e.g. SRV-PL-01"
                className="h-9 text-xs rounded-xl font-mono"
              />
              {errors.code && (
                <p className="text-[11px] text-rose-500">{errors.code.message}</p>
              )}
            </div>
          </div>

          {/* Category & SAC Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Category <span className="text-rose-500">*</span>
              </Label>
              <select
                {...register("category")}
                className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#F0944D]/20 focus:border-[#F0944D]"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className="text-[11px] text-rose-500">{errors.category.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">SAC Code</Label>
              <Input
                {...register("sacCode")}
                placeholder="e.g. 998311"
                className="h-9 text-xs rounded-xl font-mono"
              />
              {errors.sacCode && (
                <p className="text-[11px] text-rose-500">{errors.sacCode.message}</p>
              )}
            </div>
          </div>

          {/* Pricing Row: Minimum Price, Outsource Price, GST Rate */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Minimum Floor Price (₹) <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="number"
                step="any"
                {...register("minimumPrice")}
                className="h-9 text-xs rounded-xl font-medium"
              />
              {errors.minimumPrice && (
                <p className="text-[11px] text-rose-500">{errors.minimumPrice.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Outsource Cost (₹)
              </Label>
              <Input
                type="number"
                step="any"
                {...register("outsourcePrice")}
                className="h-9 text-xs rounded-xl font-medium"
              />
              {errors.outsourcePrice && (
                <p className="text-[11px] text-rose-500">{errors.outsourcePrice.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Default GST Rate (%)
              </Label>
              <Input
                type="number"
                step="any"
                {...register("defaultGstRate")}
                className="h-9 text-xs rounded-xl font-medium"
              />
              {errors.defaultGstRate && (
                <p className="text-[11px] text-rose-500">{errors.defaultGstRate.message}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Service Description</Label>
            <Textarea
              {...register("description")}
              placeholder="Outline deliverables, timelines, statutory inclusions, or client requirements..."
              rows={3}
              className="text-xs rounded-xl resize-none"
            />
            {errors.description && (
              <p className="text-[11px] text-rose-500">{errors.description.message}</p>
            )}
          </div>

          {/* Active Status */}
          <div className="pt-2 flex items-center gap-2.5">
            <input
              type="checkbox"
              id="serviceIsActive"
              {...register("isActive")}
              className="h-4 w-4 rounded border-slate-300 text-[#F0944D] focus:ring-[#F0944D]"
            />
            <label htmlFor="serviceIsActive" className="text-xs font-medium text-slate-700 cursor-pointer">
              Service is active and available in Quotations and Deals pipelines
            </label>
          </div>

          {/* Modal Footer */}
          <div className="shrink-0 pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="rounded-full text-xs px-4"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="rounded-full text-xs font-semibold px-5 text-white bg-gradient-to-r from-[#ACCAD5] to-[#F0944D] hover:opacity-95 shadow-xs cursor-pointer gap-2"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isSubmitting ? "Saving..." : isEditing ? "Update Service" : "Create Service"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
