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
import { Building2, Loader2 } from "lucide-react";
import { companySchema, CompanyFormData } from "@/lib/validations/crm";
import { SerializedCompany } from "@/lib/actions/crm";

interface CompanyFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company?: SerializedCompany | null;
  onSubmit: (data: CompanyFormData) => Promise<void>;
  isSubmitting?: boolean;
}

const COMPANY_TYPES = [
  "Private Limited Company",
  "Limited Liability Partnership (LLP)",
  "Partnership Firm",
  "Sole Proprietorship",
  "Public Limited Company",
  "One Person Company (OPC)",
  "Trust / Society / Section 8",
  "Other Corporate Entity",
];

const INDUSTRIES = [
  "Information Technology & SaaS",
  "Financial Services & Banking",
  "Manufacturing & Industrial",
  "Healthcare & Pharmaceuticals",
  "Retail & E-commerce",
  "Real Estate & Construction",
  "Logistics & Supply Chain",
  "Legal & Professional Services",
  "Education & EdTech",
  "Other",
];

export default function CompanyFormModal({
  open,
  onOpenChange,
  company,
  onSubmit,
  isSubmitting = false,
}: CompanyFormModalProps) {
  const isEditing = Boolean(company);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: "",
      companyType: "Private Limited Company",
      incorporatedDate: "",
      industry: "Information Technology & SaaS",
      website: "",
      gstNumber: "",
      panNumber: "",
      address: "",
      city: "",
      state: "Gujarat",
      country: "India",
    },
  });

  useEffect(() => {
    if (company) {
      reset({
        name: company.name,
        companyType: company.companyType || "Private Limited Company",
        incorporatedDate: company.incorporatedDate || "",
        industry: company.industry || "Information Technology & SaaS",
        website: company.website || "",
        gstNumber: company.gstNumber || "",
        panNumber: company.panNumber || "",
        address: company.address || "",
        city: company.city || "",
        state: company.state || "Gujarat",
        country: company.country || "India",
      });
    } else {
      reset({
        name: "",
        companyType: "Private Limited Company",
        incorporatedDate: "",
        industry: "Information Technology & SaaS",
        website: "",
        gstNumber: "",
        panNumber: "",
        address: "",
        city: "",
        state: "Gujarat",
        country: "India",
      });
    }
  }, [company, reset, open]);

  const handleFormSubmit = async (data: CompanyFormData) => {
    await onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-hidden flex flex-col rounded-[28px] bg-white/95 backdrop-blur-2xl border border-white/80 p-6 sm:p-7 shadow-2xl">
        <DialogHeader className="shrink-0 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-50 text-[#F0944D] flex items-center justify-center font-bold text-sm shadow-xs border border-amber-200">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                {isEditing ? `Edit Company: ${company?.name}` : "Register Enterprise Company"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Corporate registry, statutory GST/PAN details, and incorporated entity structure.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="flex-1 overflow-y-auto space-y-4 py-4 pr-1"
        >
          {/* Company Name & Incorporated Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Company Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                {...register("name")}
                placeholder="e.g. Acme Tech Solutions Private Limited"
                className="h-9 text-xs rounded-xl"
              />
              {errors.name && (
                <p className="text-[11px] text-rose-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Incorporation Date</Label>
              <Input
                type="date"
                {...register("incorporatedDate")}
                className="h-9 text-xs rounded-xl"
              />
              {errors.incorporatedDate && (
                <p className="text-[11px] text-rose-500">{errors.incorporatedDate.message}</p>
              )}
            </div>
          </div>

          {/* Company Type & Industry */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Company Type</Label>
              <select
                {...register("companyType")}
                className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#F0944D]/20 focus:border-[#F0944D]"
              >
                {COMPANY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Industry Domain</Label>
              <select
                {...register("industry")}
                className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#F0944D]/20 focus:border-[#F0944D]"
              >
                {INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* GSTIN, PAN, and Website */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">GSTIN Number</Label>
              <Input
                {...register("gstNumber")}
                placeholder="24AAACC1234D1Z5"
                className="h-9 text-xs rounded-xl font-mono uppercase"
              />
              {errors.gstNumber && (
                <p className="text-[11px] text-rose-500">{errors.gstNumber.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">PAN Number</Label>
              <Input
                {...register("panNumber")}
                placeholder="AAACC1234D"
                className="h-9 text-xs rounded-xl font-mono uppercase"
              />
              {errors.panNumber && (
                <p className="text-[11px] text-rose-500">{errors.panNumber.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Website URL</Label>
              <Input
                {...register("website")}
                placeholder="https://example.com"
                className="h-9 text-xs rounded-xl"
              />
              {errors.website && (
                <p className="text-[11px] text-rose-500">{errors.website.message}</p>
              )}
            </div>
          </div>

          {/* Registered Address */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Registered Corporate Address</Label>
            <Textarea
              {...register("address")}
              placeholder="Suite / Floor, Building Name, Industrial Estate..."
              rows={2}
              className="text-xs rounded-xl resize-none"
            />
            {errors.address && (
              <p className="text-[11px] text-rose-500">{errors.address.message}</p>
            )}
          </div>

          {/* City, State, Country */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">City</Label>
              <Input {...register("city")} placeholder="e.g. Ahmedabad" className="h-9 text-xs rounded-xl" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">State</Label>
              <Input {...register("state")} placeholder="e.g. Gujarat" className="h-9 text-xs rounded-xl" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Country</Label>
              <Input {...register("country")} className="h-9 text-xs rounded-xl" defaultValue="India" />
            </div>
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
              {isSubmitting ? "Saving..." : isEditing ? "Update Company" : "Register Company"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
