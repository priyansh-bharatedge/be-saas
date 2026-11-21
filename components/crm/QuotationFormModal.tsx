"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
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
import {
  FileText,
  Plus,
  Trash2,
  Building2,
  User,
  Calculator,
  Calendar,
  Sparkles,
  Loader2,
  Search,
} from "lucide-react";
import {
  quotationFormSchema,
  QuotationFormData,
  SerializedQuotation,
  QuotationMasterData,
} from "@/lib/validations/quotation";

interface QuotationFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotation?: SerializedQuotation | null;
  masterData: QuotationMasterData;
  onSubmit: (data: QuotationFormData) => Promise<void>;
  isSubmitting?: boolean;
}

const DEFAULT_TERMS = `1. Payment Terms: 100% advance or 50% advance and 50% upon delivery/filing acknowledgment.
2. Validity: This quotation is valid for 15 days from the date of issue.
3. Government Fees & Stamp Duty: Subject to actuals at the time of submission unless specified otherwise.
4. Jurisdiction: All disputes are subject to Ahmedabad/Gujarat jurisdiction.`;

export default function QuotationFormModal({
  open,
  onOpenChange,
  quotation,
  masterData,
  onSubmit,
  isSubmitting = false,
}: QuotationFormModalProps) {
  const isEditing = Boolean(quotation);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<QuotationFormData>({
    resolver: zodResolver(quotationFormSchema) as any,
    defaultValues: {
      clientName: "",
      clientPhone: "",
      clientEmail: "",
      clientAlternatePhone: "",
      clientGender: "",
      clientState: "Gujarat",
      clientCity: "Ahmedabad",
      clientAddress: "",
      clientId: "",

      companyName: "",
      companyId: "",
      companyType: "Private Limited Company",
      companyIncorporatedDate: "",
      companyAddress: "",

      services: [
        {
          serviceId: "",
          serviceName: "Private Limited Company Incorporation",
          totalAmount: 11800,
          withoutGstAmount: 10000,
          gstAmount: 1800,
          remarks: "Includes Name Approval, 2 DIN, SPICe+ filing, PAN, TAN & Bank A/C",
        },
      ],

      subTotal: 10000,
      discountAmount: 0,
      gstRate: 18,
      gstAmount: 1800,
      grandTotal: 11800,
      validUntil: new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
      terms: DEFAULT_TERMS,
      notes: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "services",
  });

  // Watch services and discount to calculate live financial totals
  const watchedServices = useWatch({ control, name: "services" });
  const watchedDiscount = useWatch({ control, name: "discountAmount" });

  useEffect(() => {
    if (!watchedServices || watchedServices.length === 0) return;

    let sub = 0;
    let gst = 0;
    let grand = 0;

    watchedServices.forEach((s) => {
      const tot = Number(s?.totalAmount) || 0;
      const wGst = Number(s?.withoutGstAmount) || Math.round((tot / 1.18) * 100) / 100;
      const g = Number(s?.gstAmount) || Math.round((tot - wGst) * 100) / 100;

      sub += wGst;
      gst += g;
      grand += tot;
    });

    const disc = Number(watchedDiscount) || 0;
    const finalGrand = Math.max(0, grand - disc);

    setValue("subTotal", Math.round(sub * 100) / 100);
    setValue("gstAmount", Math.round(gst * 100) / 100);
    setValue("grandTotal", Math.round(finalGrand * 100) / 100);
  }, [watchedServices, watchedDiscount, setValue]);

  // Sync edit values when modal opens
  useEffect(() => {
    if (quotation) {
      reset({
        clientName: quotation.clientName || "",
        clientPhone: quotation.clientPhone || "",
        clientEmail: quotation.clientEmail || "",
        clientAlternatePhone: quotation.clientAlternatePhone || "",
        clientGender: quotation.clientGender || "",
        clientState: quotation.clientState || "",
        clientCity: quotation.clientCity || "",
        clientAddress: quotation.clientAddress || "",
        clientId: quotation.clientId || "",

        companyName: quotation.companyName || "",
        companyId: quotation.companyId || "",
        companyType: quotation.companyType || "",
        companyIncorporatedDate: quotation.companyIncorporatedDate || "",
        companyAddress: quotation.companyAddress || "",

        services: quotation.services.length
          ? quotation.services.map((s) => ({
              serviceId: s.serviceId || "",
              serviceName: s.serviceName,
              totalAmount: s.totalAmount,
              withoutGstAmount: s.withoutGstAmount,
              gstAmount: s.gstAmount,
              remarks: s.remarks || "",
            }))
          : [
              {
                serviceId: "",
                serviceName: "Professional Services",
                totalAmount: 11800,
                withoutGstAmount: 10000,
                gstAmount: 1800,
                remarks: "",
              },
            ],

        subTotal: quotation.subTotal,
        discountAmount: quotation.discountAmount,
        gstRate: quotation.gstRate || 18,
        gstAmount: quotation.gstAmount,
        grandTotal: quotation.grandTotal,
        validUntil: quotation.validUntil || "",
        terms: quotation.terms || DEFAULT_TERMS,
        notes: quotation.notes || "",
      });
    } else {
      reset({
        clientName: "",
        clientPhone: "",
        clientEmail: "",
        clientAlternatePhone: "",
        clientGender: "",
        clientState: "Gujarat",
        clientCity: "Ahmedabad",
        clientAddress: "",
        clientId: "",

        companyName: "",
        companyId: "",
        companyType: "Private Limited Company",
        companyIncorporatedDate: "",
        companyAddress: "",

        services: [
          {
            serviceId: "",
            serviceName: "Private Limited Company Incorporation",
            totalAmount: 11800,
            withoutGstAmount: 10000,
            gstAmount: 1800,
            remarks: "Includes Name Approval, 2 DIN, SPICe+ filing, PAN, TAN & Bank A/C",
          },
        ],

        subTotal: 10000,
        discountAmount: 0,
        gstRate: 18,
        gstAmount: 1800,
        grandTotal: 11800,
        validUntil: new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
        terms: DEFAULT_TERMS,
        notes: "",
      });
    }
  }, [quotation, reset, open]);

  // Fast Auto-Fill when choosing existing client
  const handleClientSelect = (clientId: string) => {
    if (!clientId) return;
    const client = masterData.clients.find((c) => c.id === clientId);
    if (!client) return;

    setValue("clientId", client.id);
    setValue("clientName", client.name);
    setValue("clientPhone", client.phone);
    setValue("clientEmail", client.email || "");
    setValue("clientAlternatePhone", client.alternatePhone || "");
    setValue("clientGender", client.gender || "");
    setValue("clientState", client.state || "Gujarat");
    setValue("clientCity", client.city || "Ahmedabad");
    setValue("clientAddress", client.address || "");

    // Link company if client has one
    if (client.companyName) {
      setValue("companyName", client.companyName);
      if (client.companyId) {
        setValue("companyId", client.companyId);
        const comp = masterData.companies.find((co) => co.id === client.companyId);
        if (comp) {
          setValue("companyType", comp.companyType || "Private Limited Company");
          setValue("companyIncorporatedDate", comp.incorporatedDate || "");
          setValue("companyAddress", comp.address || client.address || "");
        }
      }
    }
  };

  // Fast Auto-Fill when choosing existing company
  const handleCompanySelect = (companyId: string) => {
    if (!companyId) return;
    const comp = masterData.companies.find((co) => co.id === companyId);
    if (!comp) return;

    setValue("companyId", comp.id);
    setValue("companyName", comp.name);
    setValue("companyType", comp.companyType || "Private Limited Company");
    setValue("companyIncorporatedDate", comp.incorporatedDate || "");
    setValue("companyAddress", comp.address || "");
  };

  // When user selects a service for a line item
  const handleServiceSelect = (index: number, serviceId: string) => {
    const selected = masterData.services.find((s) => s.id === serviceId);
    if (!selected) return;

    const basePrice = selected.minimumPrice || 10000;
    const gstRate = (selected.defaultGstRate || 18) / 100;
    const gstAmt = Math.round(basePrice * gstRate * 100) / 100;
    const totalAmt = Math.round((basePrice + gstAmt) * 100) / 100;

    setValue(`services.${index}.serviceId`, selected.id);
    setValue(`services.${index}.serviceName`, selected.name);
    setValue(`services.${index}.withoutGstAmount`, basePrice);
    setValue(`services.${index}.gstAmount`, gstAmt);
    setValue(`services.${index}.totalAmount`, totalAmt);
  };

  // Manual recalculation when user types Total Amount in a service row
  const handleTotalAmountChange = (index: number, newTotal: number) => {
    const tot = Math.max(0, newTotal);
    const withoutGst = Math.round((tot / 1.18) * 100) / 100;
    const gst = Math.round((tot - withoutGst) * 100) / 100;

    setValue(`services.${index}.totalAmount`, tot);
    setValue(`services.${index}.withoutGstAmount`, withoutGst);
    setValue(`services.${index}.gstAmount`, gst);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto bg-white/95 backdrop-blur-xl border border-slate-200/80 shadow-2xl rounded-2xl p-6">
        <DialogHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#ACCAD5]/30 to-[#F0944D]/20 flex items-center justify-center text-slate-800">
              <FileText className="h-5 w-5 text-[#F0944D]" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                {isEditing ? `Edit Quotation (${quotation?.quotationNumber})` : "Create New Quotation"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Decompose services, compute 18% GST breakdowns, and generate a branded client proposal PDF.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6 pt-3">
          {/* SECTION 1: CLIENT DETAILS */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-[#F0944D]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  1. Client Information
                </h4>
              </div>

              {masterData.clients.length > 0 && !isEditing && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-slate-500">Quick Auto-fill:</span>
                  <select
                    className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#F0944D]/20"
                    onChange={(e) => handleClientSelect(e.target.value)}
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select existing client...
                    </option>
                    {masterData.clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-medium text-slate-700">Client Name *</Label>
                <Input
                  {...register("clientName")}
                  placeholder="e.g. Ramesh Patel"
                  className="mt-1 text-xs"
                />
                {errors.clientName && (
                  <p className="text-[10px] text-rose-500 mt-1">{errors.clientName.message}</p>
                )}
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-700">Primary Phone *</Label>
                <Input
                  {...register("clientPhone")}
                  placeholder="e.g. 9825012345"
                  className="mt-1 text-xs"
                />
                {errors.clientPhone && (
                  <p className="text-[10px] text-rose-500 mt-1">{errors.clientPhone.message}</p>
                )}
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-700">Client Email (For Quote)</Label>
                <Input
                  {...register("clientEmail")}
                  placeholder="e.g. ramesh@example.com"
                  type="email"
                  className="mt-1 text-xs"
                />
                {errors.clientEmail && (
                  <p className="text-[10px] text-rose-500 mt-1">{errors.clientEmail.message}</p>
                )}
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-700">Alternate Phone</Label>
                <Input
                  {...register("clientAlternatePhone")}
                  placeholder="Optional alternate contact"
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-700">Gender</Label>
                <select
                  {...register("clientGender")}
                  className="w-full mt-1 h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#F0944D]/20"
                >
                  <option value="">Select gender...</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-700">City & State</Label>
                <div className="grid grid-cols-2 gap-1 mt-1">
                  <Input {...register("clientCity")} placeholder="City" className="text-xs" />
                  <Input {...register("clientState")} placeholder="State" className="text-xs" />
                </div>
              </div>

              <div className="md:col-span-3">
                <Label className="text-xs font-medium text-slate-700">Billing Address</Label>
                <Input
                  {...register("clientAddress")}
                  placeholder="Full office or residential street address"
                  className="mt-1 text-xs"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: COMPANY DETAILS */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#ACCAD5]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  2. Company / Enterprise (Optional)
                </h4>
              </div>

              {masterData.companies.length > 0 && !isEditing && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-slate-500">Pick Company:</span>
                  <select
                    className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#ACCAD5]/30"
                    onChange={(e) => handleCompanySelect(e.target.value)}
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select registered company...
                    </option>
                    {masterData.companies.map((co) => (
                      <option key={co.id} value={co.id}>
                        {co.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-medium text-slate-700">Company Name</Label>
                <Input
                  {...register("companyName")}
                  placeholder="e.g. Apex Legal Solutions LLP"
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-700">Company Type</Label>
                <select
                  {...register("companyType")}
                  className="w-full mt-1 h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#ACCAD5]/30"
                >
                  <option value="Private Limited Company">Private Limited Company</option>
                  <option value="Limited Liability Partnership (LLP)">LLP</option>
                  <option value="One Person Company (OPC)">One Person Company (OPC)</option>
                  <option value="Sole Proprietorship">Sole Proprietorship</option>
                  <option value="Partnership Firm">Partnership Firm</option>
                  <option value="Public Limited Company">Public Limited Company</option>
                  <option value="Section 8 / NGO">Section 8 / NGO</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-700">Incorporation Date</Label>
                <Input
                  {...register("companyIncorporatedDate")}
                  type="date"
                  className="mt-1 text-xs"
                />
              </div>

              <div className="md:col-span-3">
                <Label className="text-xs font-medium text-slate-700">Company Address</Label>
                <Input
                  {...register("companyAddress")}
                  placeholder="Registered office premises"
                  className="mt-1 text-xs"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: SERVICES SUBFORM (REPEATABLE ROWS) */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#F0944D]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  3. Services & Line Items ({fields.length})
                </h4>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    serviceId: "",
                    serviceName: "",
                    totalAmount: 5900,
                    withoutGstAmount: 5000,
                    gstAmount: 900,
                    remarks: "",
                  })
                }
                className="h-8 text-xs gap-1.5 border-[#F0944D]/30 text-[#F0944D] hover:bg-[#F0944D]/10"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Service Line
              </Button>
            </div>

            {fields.map((field, index) => (
              <div
                key={field.id}
                className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3 relative group"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  {/* Service selector or custom name */}
                  <div className="md:col-span-5 space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-semibold text-slate-700">
                        Service #{index + 1} *
                      </Label>
                      {masterData.services.length > 0 && (
                        <select
                          className="text-[10px] text-slate-500 bg-transparent border-0 underline hover:text-[#F0944D] cursor-pointer focus:outline-none"
                          onChange={(e) => handleServiceSelect(index, e.target.value)}
                          defaultValue=""
                        >
                          <option value="" disabled>
                            Auto-pick service...
                          </option>
                          {masterData.services.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} (₹{s.minimumPrice})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <Input
                      {...register(`services.${index}.serviceName` as const)}
                      placeholder="Service title (e.g. GST Registration)"
                      className="text-xs h-8"
                    />
                  </div>

                  {/* Total Amount (With GST) */}
                  <div className="md:col-span-2 space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-700">
                      Total (₹) *
                    </Label>
                    <Input
                      type="number"
                      step="any"
                      {...register(`services.${index}.totalAmount` as const, {
                        valueAsNumber: true,
                        onChange: (e) => handleTotalAmountChange(index, Number(e.target.value)),
                      })}
                      className="text-xs h-8 font-semibold text-slate-800"
                    />
                  </div>

                  {/* Without GST Amount */}
                  <div className="md:col-span-2 space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-500">
                      Excl. GST (₹)
                    </Label>
                    <Input
                      type="number"
                      step="any"
                      {...register(`services.${index}.withoutGstAmount` as const, {
                        valueAsNumber: true,
                      })}
                      className="text-xs h-8 bg-slate-50 text-slate-600"
                    />
                  </div>

                  {/* GST Amount (18%) */}
                  <div className="md:col-span-2 space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-500">
                      GST 18% (₹)
                    </Label>
                    <Input
                      type="number"
                      step="any"
                      {...register(`services.${index}.gstAmount` as const, {
                        valueAsNumber: true,
                      })}
                      className="text-xs h-8 bg-slate-50 text-slate-600"
                    />
                  </div>

                  {/* Remove Button */}
                  <div className="md:col-span-1 flex items-end justify-center pb-0.5">
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                        title="Remove service"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Remarks / Scope */}
                  <div className="md:col-span-12">
                    <Input
                      {...register(`services.${index}.remarks` as const)}
                      placeholder="Service inclusions, deliverables, or filing notes (appears on PDF quote)"
                      className="text-[11px] h-7 bg-slate-50/70 border-dashed"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* SECTION 4: FINANCIAL TOTALS & TERMS */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200/60 pb-3">
              <Calculator className="h-4 w-4 text-[#ACCAD5]" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                4. Financial Breakdown & Commercial Terms
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Left Column: Validity & Terms */}
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-medium text-slate-700">Proposal Valid Until</Label>
                  <Input
                    type="date"
                    {...register("validUntil")}
                    className="mt-1 text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs font-medium text-slate-700">Terms & Conditions</Label>
                  <Textarea
                    {...register("terms")}
                    rows={4}
                    placeholder="Quotation terms & payment schedules"
                    className="mt-1 text-[11px] font-mono leading-relaxed"
                  />
                </div>

                <div>
                  <Label className="text-xs font-medium text-slate-700">Internal Remarks / Notes</Label>
                  <Input
                    {...register("notes")}
                    placeholder="Private staff notes (not printed on client PDF)"
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              {/* Right Column: Financial Summary Card */}
              <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-xs space-y-3 flex flex-col justify-between">
                <h5 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-2">
                  Invoice & Tax Breakdown (INR)
                </h5>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Taxable Subtotal (Excl. GST):</span>
                    <span className="font-semibold text-slate-900">
                      ₹{Number(watch("subTotal") || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span>GST (18% Integrated / SGST+CGST):</span>
                    <span className="font-semibold text-slate-900">
                      ₹{Number(watch("gstAmount") || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 pt-1 border-t border-slate-100">
                    <span className="flex items-center gap-1">
                      <span>Discount (₹):</span>
                    </span>
                    <div className="w-28">
                      <Input
                        type="number"
                        step="any"
                        {...register("discountAmount", { valueAsNumber: true })}
                        className="h-7 text-xs text-right font-semibold text-rose-600"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm font-bold text-slate-900 pt-2 border-t-2 border-slate-200">
                    <span>Grand Total (Net Payable):</span>
                    <span className="text-base text-[#F0944D]">
                      ₹{Number(watch("grandTotal") || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="rounded-lg bg-amber-50/70 border border-amber-200/60 p-2.5 text-[11px] text-amber-800 flex items-start gap-2">
                  <Sparkles className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                  <span>
                    Saving automatically generates a BharatEdge-formatted PDF quote with official bank account remittance details and uploads it to Cloudflare R2 storage.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-xs text-slate-600"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="text-xs bg-gradient-to-r from-[#ACCAD5] to-[#F0944D] text-slate-900 font-semibold shadow-xs hover:opacity-95"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  {isEditing ? "Updating Quotation..." : "Generating PDF & Quote..."}
                </>
              ) : isEditing ? (
                "Save & Regenerate PDF"
              ) : (
                "Create Quotation & Generate PDF"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
