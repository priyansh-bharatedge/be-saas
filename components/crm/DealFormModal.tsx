"use client";

import { useEffect, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  Briefcase,
  User,
  Building2,
  Sparkles,
  Calculator,
  Plus,
  Trash2,
  UploadCloud,
  FileText,
  ShieldCheck,
  Send,
  Loader2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Users,
  Scale,
  Cog,
  Layers,
} from "lucide-react";
import {
  dealFormSchema,
  DealFormData,
  SerializedDeal,
  DealMasterData,
} from "@/lib/validations/deal";
import { DealStage, LegalStatus } from "@prisma/client";
import { toast } from "sonner";

interface DealFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal?: SerializedDeal | null;
  masterData: DealMasterData;
  onSubmit: (data: DealFormData) => Promise<void>;
  onSendToAccounts?: (dealId: string) => Promise<void>;
  onSendToOperation?: (dealId: string) => Promise<void>;
  isSubmitting?: boolean;
  isSalesUser?: boolean;
  isLegalUser?: boolean;
  canManageAll?: boolean;
}

export default function DealFormModal({
  open,
  onOpenChange,
  deal,
  masterData,
  onSubmit,
  onSendToAccounts,
  onSendToOperation,
  isSubmitting = false,
  isSalesUser = false,
  isLegalUser = false,
  canManageAll = false,
}: DealFormModalProps) {
  const isEditing = Boolean(deal);

  // Department RBAC for Legal fields:
  // - Sales Department: Hide Section 5 and per-service legal fields completely
  // - Legal Department & Super Admin: Full edit access
  // - Other Departments (Accounts, Operations, Quality, etc.): Read-only display
  const canViewLegal = !isSalesUser;
  const canEditLegal = Boolean(isLegalUser || canManageAll);

  // Document upload state
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docType, setDocType] = useState("CLIENT_KYC");
  const [uploadProgressText, setUploadProgressText] = useState<string | null>(null);

  // Screenshot upload state
  const [isUploadingScreenshot, setIsUploadingScreenshot] = useState(false);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);

  // Transition actions
  const [isSendingToAccounts, setIsSendingToAccounts] = useState(false);
  const [isSendingToOperation, setIsSendingToOperation] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<DealFormData>({
    resolver: zodResolver(dealFormSchema) as any,
    defaultValues: {
      title: "",
      bookingDate: new Date().toISOString().split("T")[0],
      assignedEmployeeId: "",
      partnerBdmId: "",
      panNumber: "",
      stage: DealStage.LEAD,

      clientId: "",
      clientName: "",
      clientPhone: "",
      clientEmail: "",
      clientAlternatePhone: "",
      clientGender: "",
      clientState: "Gujarat",
      clientCity: "Ahmedabad",
      clientAddress: "",

      companyName: "",
      companyId: "",
      companyType: "Private Limited Company",
      companyIncorporatedDate: "",
      companyAddress: "",

      services: [
        {
          serviceId: "",
          serviceName: "Private Limited Incorporation",
          minimumPrice: 10000,
          outsourceCost: 3500,
          totalAmount: 11800,
          withoutGstAmount: 10000,
          gstAmount: 1800,
          amountReceived: 11800,
          receivedWithoutGst: 10000,
          receivedGst: 1800,
          amountPending: 0,
          remarks: "SPICe+ filing, 2 DIN, PAN, TAN & Bank A/C",
          teamType: "Team Incorporation",
          legalStatus: LegalStatus.PENDING,
          legalDocType: "Service Agreement",
          agreementTerms: "",
          legalRemarks: "",
        },
      ],

      subTotal: 10000,
      gstRate: 18,
      gstAmount: 1800,
      totalValue: 11800,
      amountReceived: 11800,
      amountPending: 0,

      paymentScreenshotUrl: "",
      paymentScreenshotKey: "",
      documents: [],
      agreementTerms: "",
      legalRemarks: "",
      legalDocSenderName: "",
      legalDocSenderDate: "",
      legalDocReceiverName: "",
      legalDocReceiverDate: "",
      accountsStatus: "DRAFT",
      isQualityPassed: false,
      qualityRemarks: "",
      notes: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "services",
  });

  const watchedServices = useWatch({ control, name: "services" });
  const watchedPartnerBdmId = useWatch({ control, name: "partnerBdmId" });
  const watchedDocuments = watch("documents") || [];

  // Live Financial Calculation
  useEffect(() => {
    if (!watchedServices || watchedServices.length === 0) return;

    let sub = 0;
    let gst = 0;
    let totVal = 0;
    let recVal = 0;

    watchedServices.forEach((s) => {
      const tot = Number(s?.totalAmount) || 0;
      const wGst = Number(s?.withoutGstAmount) || Math.round((tot / 1.18) * 100) / 100;
      const g = Number(s?.gstAmount) || Math.round((tot - wGst) * 100) / 100;

      const rec = Number(s?.amountReceived) || 0;

      sub += wGst;
      gst += g;
      totVal += tot;
      recVal += rec;
    });

    const pendVal = Math.max(0, totVal - recVal);

    setValue("subTotal", Math.round(sub * 100) / 100);
    setValue("gstAmount", Math.round(gst * 100) / 100);
    setValue("totalValue", Math.round(totVal * 100) / 100);
    setValue("amountReceived", Math.round(recVal * 100) / 100);
    setValue("amountPending", Math.round(pendVal * 100) / 100);
  }, [watchedServices, setValue]);

  // Populate form
  useEffect(() => {
    if (deal) {
      reset({
        title: deal.title,
        bookingDate: deal.bookingDate || new Date().toISOString().split("T")[0],
        assignedEmployeeId: deal.assignedEmployeeId || "",
        partnerBdmId: deal.partnerBdmId || "",
        panNumber: deal.panNumber || "",
        stage: deal.stage,

        clientId: deal.clientId || "",
        clientName: deal.clientName || "",
        clientPhone: deal.clientPhone || "",
        clientEmail: deal.clientEmail || "",
        clientAlternatePhone: deal.clientAlternatePhone || "",
        clientGender: deal.clientGender || "",
        clientState: deal.clientState || "",
        clientCity: deal.clientCity || "",
        clientAddress: deal.clientAddress || "",

        companyName: deal.companyName || "",
        companyId: deal.companyId || "",
        companyType: deal.companyType || "Private Limited Company",
        companyIncorporatedDate: deal.companyIncorporatedDate || "",
        companyAddress: deal.companyAddress || "",

        services: deal.services.length
          ? deal.services.map((s) => ({
              id: s.id,
              serviceId: s.serviceId || "",
              serviceName: s.serviceName,
              minimumPrice: s.minimumPrice,
              outsourceCost: s.outsourceCost,
              totalAmount: s.totalPrice,
              withoutGstAmount: s.withoutGstAmount,
              gstAmount: s.gstAmount,
              amountReceived: s.amountReceived,
              receivedWithoutGst: s.receivedWithoutGst,
              receivedGst: s.receivedGst,
              amountPending: s.amountPending,
              remarks: s.remarks || "",
              teamType: s.teamType || "Team Incorporation",
              legalStatus: s.legalStatus || LegalStatus.PENDING,
              legalDocType: s.legalDocType || "Service Agreement",
              agreementTerms: s.agreementTerms || "",
              legalRemarks: s.legalRemarks || "",
            }))
          : [
              {
                serviceId: "",
                serviceName: "Professional Advisory Service",
                minimumPrice: 10000,
                outsourceCost: 0,
                totalAmount: 11800,
                withoutGstAmount: 10000,
                gstAmount: 1800,
                amountReceived: 11800,
                receivedWithoutGst: 10000,
                receivedGst: 1800,
                amountPending: 0,
                remarks: "",
                teamType: "Team Incorporation",
                legalStatus: LegalStatus.PENDING,
                legalDocType: "Service Agreement",
                agreementTerms: "",
                legalRemarks: "",
              },
            ],

        subTotal: deal.subTotal,
        gstRate: 18,
        gstAmount: deal.gstAmount,
        totalValue: deal.totalValue,
        amountReceived: deal.amountReceived,
        amountPending: deal.amountPending,

        paymentScreenshotUrl: deal.paymentScreenshotUrl || "",
        paymentScreenshotKey: deal.paymentScreenshotKey || "",
        documents: deal.documents.map((d) => ({
          id: d.id,
          title: d.title,
          docType: d.docType,
          fileUrl: d.fileUrl,
          fileKey: d.fileKey,
        })),
        agreementTerms: deal.agreementTerms || "",
        legalRemarks: deal.legalRemarks || "",
        legalDocSenderName: deal.legalDocSenderName || "",
        legalDocSenderDate: deal.legalDocSenderDate || "",
        legalDocReceiverName: deal.legalDocReceiverName || "",
        legalDocReceiverDate: deal.legalDocReceiverDate || "",
        accountsStatus: deal.accountsStatus || "DRAFT",
        isQualityPassed: deal.isQualityPassed || false,
        qualityRemarks: deal.qualityRemarks || "",
        notes: deal.notes || "",
      });

      setScreenshotPreview(deal.paymentScreenshotUrl || null);
    } else {
      const defaultEmployee = masterData.employees[0]?.id || "";
      reset({
        title: "New Client Engagement",
        bookingDate: new Date().toISOString().split("T")[0],
        assignedEmployeeId: defaultEmployee,
        partnerBdmId: "",
        panNumber: "",
        stage: DealStage.LEAD,

        clientId: "",
        clientName: "",
        clientPhone: "",
        clientEmail: "",
        clientAlternatePhone: "",
        clientGender: "",
        clientState: "Gujarat",
        clientCity: "Ahmedabad",
        clientAddress: "",

        companyName: "",
        companyId: "",
        companyType: "Private Limited Company",
        companyIncorporatedDate: "",
        companyAddress: "",

        services: [
          {
            serviceId: "",
            serviceName: "Private Limited Company Incorporation",
            minimumPrice: 10000,
            outsourceCost: 3500,
            totalAmount: 11800,
            withoutGstAmount: 10000,
            gstAmount: 1800,
            amountReceived: 11800,
            receivedWithoutGst: 10000,
            receivedGst: 1800,
            amountPending: 0,
            remarks: "SPICe+ filing, 2 DIN, PAN, TAN & Bank A/C",
            teamType: "Team Incorporation",
            legalStatus: LegalStatus.PENDING,
            legalDocType: "Service Agreement",
            agreementTerms: "",
            legalRemarks: "",
          },
        ],

        subTotal: 10000,
        gstRate: 18,
        gstAmount: 1800,
        totalValue: 11800,
        amountReceived: 11800,
        amountPending: 0,

        paymentScreenshotUrl: "",
        paymentScreenshotKey: "",
        documents: [],
        agreementTerms: "",
        legalRemarks: "",
        legalDocSenderName: "",
        legalDocSenderDate: "",
        legalDocReceiverName: "",
        legalDocReceiverDate: "",
        accountsStatus: "DRAFT",
        isQualityPassed: false,
        qualityRemarks: "",
        notes: "",
      });

      setScreenshotPreview(null);
    }
  }, [deal, open, reset, masterData.employees]);

  const handleSelectClient = (clientId: string) => {
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

  const handleSelectCompany = (companyId: string) => {
    const comp = masterData.companies.find((co) => co.id === companyId);
    if (!comp) return;

    setValue("companyId", comp.id);
    setValue("companyName", comp.name);
    setValue("companyType", comp.companyType || "Private Limited Company");
    setValue("companyIncorporatedDate", comp.incorporatedDate || "");
    setValue("companyAddress", comp.address || "");
  };

  const handleSelectService = (index: number, serviceId: string) => {
    const s = masterData.services.find((item) => item.id === serviceId);
    if (!s) return;

    const minPrice = s.minimumPrice || 10000;
    const outsource = s.outsourcePrice || 0;
    const gstRate = 0.18;
    const gstAmt = Math.round(minPrice * gstRate * 100) / 100;
    const totAmt = Math.round((minPrice + gstAmt) * 100) / 100;

    setValue(`services.${index}.serviceId`, s.id);
    setValue(`services.${index}.serviceName`, s.name);
    setValue(`services.${index}.minimumPrice`, minPrice);
    setValue(`services.${index}.outsourceCost`, outsource);
    setValue(`services.${index}.totalAmount`, totAmt);
    setValue(`services.${index}.withoutGstAmount`, minPrice);
    setValue(`services.${index}.gstAmount`, gstAmt);
    setValue(`services.${index}.amountReceived`, totAmt);
    setValue(`services.${index}.receivedWithoutGst`, minPrice);
    setValue(`services.${index}.receivedGst`, gstAmt);
    setValue(`services.${index}.amountPending`, 0);
  };

  const handleServiceTotalChange = (index: number, newTotal: number) => {
    const tot = Math.max(0, newTotal);
    const wGst = Math.round((tot / 1.18) * 100) / 100;
    const gst = Math.round((tot - wGst) * 100) / 100;

    const currentRec = watch(`services.${index}.amountReceived`) || 0;
    const rec = Math.min(tot, currentRec);
    const recWGst = Math.round((rec / 1.18) * 100) / 100;
    const recGst = Math.round((rec - recWGst) * 100) / 100;
    const pend = Math.max(0, tot - rec);

    setValue(`services.${index}.totalAmount`, tot);
    setValue(`services.${index}.withoutGstAmount`, wGst);
    setValue(`services.${index}.gstAmount`, gst);
    setValue(`services.${index}.amountReceived`, rec);
    setValue(`services.${index}.receivedWithoutGst`, recWGst);
    setValue(`services.${index}.receivedGst`, recGst);
    setValue(`services.${index}.amountPending`, pend);
  };

  const handleServiceReceivedChange = (index: number, newReceived: number) => {
    const rec = Math.max(0, newReceived);
    const tot = watch(`services.${index}.totalAmount`) || 0;
    const recWGst = Math.round((rec / 1.18) * 100) / 100;
    const recGst = Math.round((rec - recWGst) * 100) / 100;
    const pend = Math.max(0, tot - rec);

    setValue(`services.${index}.amountReceived`, rec);
    setValue(`services.${index}.receivedWithoutGst`, recWGst);
    setValue(`services.${index}.receivedGst`, recGst);
    setValue(`services.${index}.amountPending`, pend);
  };

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingScreenshot(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "deals");

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success && data.url) {
        setValue("paymentScreenshotUrl", data.url);
        setValue("paymentScreenshotKey", data.key || "");
        setScreenshotPreview(data.url);
        toast.success("Payment proof screenshot uploaded!");
      } else {
        toast.error(data.error || "Upload failed.");
      }
    } catch {
      toast.error("Network error during file upload.");
    } finally {
      setIsUploadingScreenshot(false);
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    setIsUploadingDoc(true);
    setUploadProgressText(`Uploading 0 of ${files.length}...`);

    try {
      const newDocs: Array<{ title: string; docType: string; fileUrl: string; fileKey: string }> = [];
      let successCount = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgressText(`Uploading ${i + 1} of ${files.length} (${file.name})...`);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "deals/documents");

        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();

        if (data.success && data.url) {
          const itemTitle =
            files.length === 1
              ? (docTitle.trim() || file.name)
              : (docTitle.trim() ? `${docTitle.trim()} - ${file.name}` : file.name);

          newDocs.push({
            title: itemTitle,
            docType,
            fileUrl: data.url,
            fileKey: data.key || data.url,
          });
          successCount++;
        } else {
          toast.error(`Failed to upload ${file.name}: ${data.error || "Upload error"}`);
        }
      }

      if (newDocs.length > 0) {
        const currentDocs = watch("documents") || [];
        setValue("documents", [...currentDocs, ...newDocs], { shouldDirty: true });
        toast.success(`Successfully uploaded ${successCount} file${successCount > 1 ? "s" : ""} to Cloudflare R2!`);
        setDocTitle("");
      }
    } catch {
      toast.error("Document upload failed.");
    } finally {
      setIsUploadingDoc(false);
      setUploadProgressText(null);
      e.target.value = "";
    }
  };

  // Gatekeeping verifications
  const clientNameVal = watch("clientName");
  const clientPhoneVal = watch("clientPhone");
  const companyNameVal = watch("companyName");
  const totalValueVal = watch("totalValue");
  const servicesVal = watch("services");

  const isGatekeepingComplete =
    Boolean(isEditing && deal?.id) &&
    Boolean(clientNameVal?.trim()) &&
    Boolean(clientPhoneVal?.trim()) &&
    Boolean(companyNameVal?.trim()) &&
    Boolean(servicesVal && servicesVal.length > 0) &&
    Number(totalValueVal || 0) > 0;

  const handleSendToAccountsClick = async () => {
    if (!deal?.id || !onSendToAccounts) return;
    setIsSendingToAccounts(true);
    try {
      await onSendToAccounts(deal.id);
      setValue("accountsStatus", "PENDING_ACCOUNTS");
      toast.success("Deal dispatched to Accounts for payment verification!");
    } catch (err: any) {
      toast.error(err.message || "Failed to dispatch deal.");
    } finally {
      setIsSendingToAccounts(false);
    }
  };

  const handleSendToOperationClick = async () => {
    if (!deal?.id || !onSendToOperation) return;
    setIsSendingToOperation(true);
    try {
      await onSendToOperation(deal.id);
      setValue("accountsStatus", "SENT_TO_OPERATION");
      toast.success("Deal dispatched to Operations! Child execution files auto-spawned.");
    } catch (err: any) {
      toast.error(err.message || "Failed to dispatch deal to operations.");
    } finally {
      setIsSendingToOperation(false);
    }
  };

  const onFormError = (validationErrors: any) => {
    console.warn("[DealFormModal Validation Errors]:", validationErrors);
    const entries = Object.entries(validationErrors);
    if (entries.length > 0) {
      const [field, errObj]: [string, any] = entries[0];
      const msg = errObj?.message || `Please check the "${field}" field.`;
      toast.error(`Validation Error: ${msg}`);
    } else {
      toast.error("Please check the form for invalid inputs.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto bg-white/95 backdrop-blur-xl border border-slate-200/80 shadow-2xl rounded-2xl p-6">
        <DialogHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#ACCAD5]/30 to-[#F0944D]/20 flex items-center justify-center text-slate-800">
                <Briefcase className="h-5 w-5 text-[#F0944D]" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900">
                  {isEditing ? `Edit Deal (${deal?.dealNumber})` : "Create New Engagement Deal"}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Manage commercial scope, partner revenue split, client/company sync, legal contracts, and operations handover.
                </DialogDescription>
              </div>
            </div>

            {deal?.accountsStatus && (
              <Badge variant="outline" className="text-xs bg-slate-50 font-semibold">
                Status: {deal.accountsStatus.replace("_", " ")}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit as any, onFormError)} className="space-y-6 pt-3">
          {/* SECTION 1: CLIENT SECTION (SYNCED WITH MASTER CLIENTS) */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-[#F0944D]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  1. Client Details (Auto-updates Master Client Record) *
                </h4>
              </div>

              {masterData.clients.length > 0 && !isEditing && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-slate-500">Pick Existing:</span>
                  <select
                    className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 shadow-xs focus:ring-2 focus:ring-[#F0944D]/20"
                    onChange={(e) => handleSelectClient(e.target.value)}
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select client...
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
                  placeholder="e.g. Anand Mahindra"
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
                <Label className="text-xs font-medium text-slate-700">Email Address</Label>
                <Input
                  {...register("clientEmail")}
                  placeholder="e.g. anand@example.com"
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-700">Alternate Phone</Label>
                <Input
                  {...register("clientAlternatePhone")}
                  placeholder="Optional alternate"
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-700">Gender</Label>
                <select
                  {...register("clientGender")}
                  className="w-full mt-1 h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-xs"
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
                <Label className="text-xs font-medium text-slate-700">Client Address</Label>
                <Input
                  {...register("clientAddress")}
                  placeholder="Full residential or commercial address"
                  className="mt-1 text-xs"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: BASIC DETAILS & REVENUE SPLIT */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200/60 pb-3">
              <Users className="h-4 w-4 text-[#ACCAD5]" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                2. Deal Basics & BDM Revenue Split
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <Label className="text-xs font-medium text-slate-700">Deal Title / Engagement Name *</Label>
                <Input
                  {...register("title")}
                  placeholder="e.g. Apex Legal Solutions - Private Limited & Trademark"
                  className="mt-1 text-xs"
                />
                {errors.title && (
                  <p className="text-[10px] text-rose-500 mt-1">{errors.title.message}</p>
                )}
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-700">Booking Date *</Label>
                <Input
                  type="date"
                  {...register("bookingDate")}
                  className="mt-1 text-xs"
                />
                {errors.bookingDate && (
                  <p className="text-[10px] text-rose-500 mt-1">{errors.bookingDate.message}</p>
                )}
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-700">Primary BDM (Owner) *</Label>
                <select
                  {...register("assignedEmployeeId")}
                  className="w-full mt-1 h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-xs"
                >
                  <option value="" disabled>
                    Select primary BDM...
                  </option>
                  {masterData.employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.department})
                    </option>
                  ))}
                </select>
                {errors.assignedEmployeeId && (
                  <p className="text-[10px] text-rose-500 mt-1">
                    {errors.assignedEmployeeId.message}
                  </p>
                )}
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-700">
                  Partner BDM (Optional 50% Split)
                </Label>
                <select
                  {...register("partnerBdmId")}
                  className="w-full mt-1 h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-xs"
                >
                  <option value="">No Partner BDM (100% to Primary)</option>
                  {masterData.employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.department})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-700">PAN Card Number</Label>
                <Input
                  {...register("panNumber")}
                  placeholder="e.g. ABCDE1234F"
                  className="mt-1 text-xs uppercase font-mono"
                />
                {errors.panNumber && (
                  <p className="text-[10px] text-rose-500 mt-1">{errors.panNumber.message}</p>
                )}
              </div>

              {watchedPartnerBdmId && (
                <div className="md:col-span-3 p-2.5 rounded-lg bg-amber-50/80 border border-amber-200/70 text-xs text-amber-800 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>50%–50% Revenue Split Active:</strong> Sales achievement and target progress for this deal will be split equally between Primary BDM and Partner BDM.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 3: COMPANY SECTION (SYNCED WITH MASTER COMPANIES) */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#ACCAD5]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  3. Company / Entity Details (Auto-syncs Companies Master) *
                </h4>
              </div>

              {masterData.companies.length > 0 && !isEditing && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-slate-500">Pick Company:</span>
                  <select
                    className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 shadow-xs"
                    onChange={(e) => handleSelectCompany(e.target.value)}
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
                <Label className="text-xs font-medium text-slate-700">Company Name *</Label>
                <Input
                  {...register("companyName")}
                  placeholder="e.g. Apex Legal Technologies Pvt Ltd"
                  className="mt-1 text-xs"
                />
                {errors.companyName && (
                  <p className="text-[10px] text-rose-500 mt-1">{errors.companyName.message}</p>
                )}
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-700">Company Type</Label>
                <select
                  {...register("companyType")}
                  className="w-full mt-1 h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-xs"
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
                  type="date"
                  {...register("companyIncorporatedDate")}
                  className="mt-1 text-xs"
                />
              </div>

              <div className="md:col-span-3">
                <Label className="text-xs font-medium text-slate-700">Registered Premises Address</Label>
                <Input
                  {...register("companyAddress")}
                  placeholder="Corporate registered office address"
                  className="mt-1 text-xs"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: SERVICES SUBFORM (REPEATABLE ROWS WITH LEGAL CONFIG) */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#F0944D]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  4. Scope of Services & Collections Breakdown ({fields.length})
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
                    minimumPrice: 5000,
                    outsourceCost: 0,
                    totalAmount: 5900,
                    withoutGstAmount: 5000,
                    gstAmount: 900,
                    amountReceived: 5900,
                    receivedWithoutGst: 5000,
                    receivedGst: 900,
                    amountPending: 0,
                    remarks: "",
                    teamType: "Team Incorporation",
                    legalStatus: LegalStatus.PENDING,
                    legalDocType: "Service Agreement",
                    agreementTerms: "",
                    legalRemarks: "",
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
                  {/* Service selector */}
                  <div className="md:col-span-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-semibold text-slate-700">
                        Service #{index + 1} *
                      </Label>
                      {masterData.services.length > 0 && (
                        <select
                          className="text-[10px] text-slate-500 bg-transparent border-0 underline hover:text-[#F0944D] cursor-pointer focus:outline-none"
                          onChange={(e) => handleSelectService(index, e.target.value)}
                          defaultValue=""
                        >
                          <option value="" disabled>
                            Auto-pick service...
                          </option>
                          {masterData.services.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} (Min: ₹{s.minimumPrice})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <Input
                      {...register(`services.${index}.serviceName` as const)}
                      placeholder="Service title"
                      className="text-xs h-8"
                    />
                  </div>

                  {/* Total Amount */}
                  <div className="md:col-span-2 space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-700">Total (₹) *</Label>
                    <Input
                      type="number"
                      step="any"
                      {...register(`services.${index}.totalAmount` as const, {
                        valueAsNumber: true,
                        onChange: (e) => handleServiceTotalChange(index, Number(e.target.value)),
                      })}
                      className="text-xs h-8 font-semibold text-slate-900"
                    />
                  </div>

                  {/* Without GST Amount */}
                  <div className="md:col-span-2 space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-500">Excl. GST (₹)</Label>
                    <Input
                      type="number"
                      step="any"
                      readOnly
                      {...register(`services.${index}.withoutGstAmount` as const, {
                        valueAsNumber: true,
                      })}
                      className="text-xs h-8 bg-slate-50 text-slate-600"
                    />
                  </div>

                  {/* Received Amount */}
                  <div className="md:col-span-2 space-y-1">
                    <Label className="text-[11px] font-semibold text-emerald-700">Received (₹)</Label>
                    <Input
                      type="number"
                      step="any"
                      {...register(`services.${index}.amountReceived` as const, {
                        valueAsNumber: true,
                        onChange: (e) => handleServiceReceivedChange(index, Number(e.target.value)),
                      })}
                      className="text-xs h-8 font-semibold text-emerald-800 bg-emerald-50/50"
                    />
                  </div>

                  {/* Pending Amount */}
                  <div className="md:col-span-1 space-y-1">
                    <Label className="text-[11px] font-semibold text-amber-700">Pending</Label>
                    <Input
                      type="number"
                      readOnly
                      {...register(`services.${index}.amountPending` as const, {
                        valueAsNumber: true,
                      })}
                      className="text-xs h-8 bg-amber-50/60 font-semibold text-amber-800"
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

                  {/* Remarks */}
                  <div className="md:col-span-12">
                    <Input
                      {...register(`services.${index}.remarks` as const)}
                      placeholder="Service deliverables, filing steps, or internal instructions"
                      className="text-[11px] h-7 bg-slate-50/70 border-dashed"
                    />
                  </div>

                  {/* Legal Configuration Per Service Row (Hidden for Sales, Read-Only for non-Legal, Editable for Legal & Super Admin) */}
                  {canViewLegal && (
                    <div className="md:col-span-12 p-2.5 rounded-lg bg-slate-50 border border-slate-200/60 grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                      <div>
                        <Label className="text-[10px] font-semibold text-slate-600">Assigned Team Type</Label>
                        <select
                          {...register(`services.${index}.teamType` as const)}
                          disabled={!canEditLegal}
                          className={`w-full mt-0.5 h-7 rounded border border-slate-200 px-2 text-[11px] ${
                            !canEditLegal ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-white"
                          }`}
                        >
                          <option value="Team Incorporation">Team Incorporation</option>
                          <option value="Team Funding">Team Funding</option>
                          <option value="Team Compliance">Team Compliance</option>
                          <option value="Team Digital Marketing">Team Digital Marketing</option>
                        </select>
                      </div>

                      <div>
                        <Label className="text-[10px] font-semibold text-slate-600">Legal Status</Label>
                        <select
                          {...register(`services.${index}.legalStatus` as const)}
                          disabled={!canEditLegal}
                          className={`w-full mt-0.5 h-7 rounded border border-slate-200 px-2 text-[11px] ${
                            !canEditLegal ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-white"
                          }`}
                        >
                          <option value={LegalStatus.PENDING}>Pending</option>
                          <option value={LegalStatus.UNDER_REVIEW}>Under Review</option>
                          <option value={LegalStatus.DRAFTED}>Drafted</option>
                          <option value={LegalStatus.EXECUTED}>Executed</option>
                          <option value={LegalStatus.REJECTED}>Rejected</option>
                        </select>
                      </div>

                      <div>
                        <Label className="text-[10px] font-semibold text-slate-600">Legal Document Type</Label>
                        <select
                          {...register(`services.${index}.legalDocType` as const)}
                          disabled={!canEditLegal}
                          className={`w-full mt-0.5 h-7 rounded border border-slate-200 px-2 text-[11px] ${
                            !canEditLegal ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-white"
                          }`}
                        >
                          <option value="Service Agreement">Service Agreement</option>
                          <option value="Non-Disclosure Agreement (NDA)">NDA</option>
                          <option value="Memorandum of Understanding (MOU)">MOU</option>
                          <option value="Power of Attorney (POA)">Power of Attorney</option>
                          <option value="Retainership Agreement">Retainership Agreement</option>
                          <option value="Board Resolution">Board Resolution</option>
                        </select>
                      </div>

                      <div>
                        <Label className="text-[10px] font-semibold text-slate-600">Agreement Terms</Label>
                        <Input
                          {...register(`services.${index}.agreementTerms` as const)}
                          placeholder="Specific terms or milestones"
                          disabled={!canEditLegal}
                          className={`text-[11px] h-7 mt-0.5 ${
                            !canEditLegal ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-white"
                          }`}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* SECTION 5: LEGAL TRACKING & DOCUMENT DISPATCH (Hidden for Sales, Read-Only for non-Legal, Editable for Legal & Super Admin) */}
          {canViewLegal && (
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-[#ACCAD5]" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    5. Legal Department Tracking & Document Execution
                  </h4>
                </div>
                {!canEditLegal && (
                  <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-600 border-slate-300">
                    Read-Only (Legal Dept Only)
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <Label className="text-[11px] font-medium text-slate-700">Legal Doc Sender Name</Label>
                  <Input
                    {...register("legalDocSenderName")}
                    placeholder="e.g. Adv. Rohit Verma"
                    disabled={!canEditLegal}
                    className={`mt-1 text-xs h-8 ${!canEditLegal ? "bg-slate-100/80 cursor-not-allowed text-slate-600" : "bg-white"}`}
                  />
                </div>

                <div>
                  <Label className="text-[11px] font-medium text-slate-700">Sender Dispatch Date</Label>
                  <Input
                    type="date"
                    {...register("legalDocSenderDate")}
                    disabled={!canEditLegal}
                    className={`mt-1 text-xs h-8 ${!canEditLegal ? "bg-slate-100/80 cursor-not-allowed text-slate-600" : "bg-white"}`}
                  />
                </div>

                <div>
                  <Label className="text-[11px] font-medium text-slate-700">Legal Doc Receiver Name</Label>
                  <Input
                    {...register("legalDocReceiverName")}
                    placeholder="e.g. Ramesh Patel (Client)"
                    disabled={!canEditLegal}
                    className={`mt-1 text-xs h-8 ${!canEditLegal ? "bg-slate-100/80 cursor-not-allowed text-slate-600" : "bg-white"}`}
                  />
                </div>

                <div>
                  <Label className="text-[11px] font-medium text-slate-700">Receiver Signed Date</Label>
                  <Input
                    type="date"
                    {...register("legalDocReceiverDate")}
                    disabled={!canEditLegal}
                    className={`mt-1 text-xs h-8 ${!canEditLegal ? "bg-slate-100/80 cursor-not-allowed text-slate-600" : "bg-white"}`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* SECTION 6: LIVE SYNCD OPERATION STATUS SUBFORM (SALES READ-ONLY SYNC) */}
          {deal?.services && deal.services.some((s) => s.operation) && (
            <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-sky-200/80 pb-2">
                <div className="flex items-center gap-2">
                  <Cog className="h-4 w-4 text-sky-700" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-sky-900">
                    Live Operational Execution Status (Sales Read-Only Sync)
                  </h4>
                </div>
                <Badge variant="outline" className="text-[10px] bg-white text-sky-700 border-sky-300">
                  Operations Synced
                </Badge>
              </div>

              <div className="divide-y divide-sky-100 rounded-lg border border-sky-200/80 bg-white overflow-hidden text-xs">
                {deal.services.map((s, idx) => {
                  const op = s.operation;
                  if (!op) return null;
                  return (
                    <div key={idx} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold text-slate-800">
                            {op.operationNumber}
                          </span>
                          <span className="font-semibold text-slate-900">{s.serviceName}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {s.teamType}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Stage: <strong className="text-slate-800">{op.internalStage}</strong> ({op.stage})
                        </p>
                      </div>

                      <div className="text-left sm:text-right text-[11px] text-slate-600">
                        <p>
                          TL: <strong>{op.assignedTlName || "Pending Assign"}</strong>
                        </p>
                        <p>
                          TM: <strong>{op.assignedTmName || "Pending Assign"}</strong>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 7: ATTACHMENTS (PAYMENT SCREENSHOT + CLIENT DOCUMENTS) */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200/60 pb-3">
              <UploadCloud className="h-4 w-4 text-[#ACCAD5]" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                7. Attachments & Contracts (Cloudflare R2 Storage)
              </h4>
            </div>

            {/* Payment Proof Screenshot */}
            <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-700">
                  Payment Proof / Screenshot
                </Label>
                {screenshotPreview && (
                  <a
                    href={screenshotPreview}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-[#F0944D] hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View Proof
                  </a>
                )}
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleScreenshotUpload}
                  disabled={isUploadingScreenshot}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                />
                {isUploadingScreenshot && (
                  <Loader2 className="h-4 w-4 animate-spin text-[#F0944D] shrink-0" />
                )}
              </div>
            </div>

            {/* Client KYC & Documents Upload (Multi-File Support to Cloudflare R2) */}
            <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <Label className="text-xs font-semibold text-slate-700">
                  Agreements, NDAs, & KYC Documents ({watchedDocuments.length})
                </Label>
                {watchedDocuments.length > 0 && (
                  <span className="text-[11px] text-slate-500 font-medium">
                    {watchedDocuments.length} document{watchedDocuments.length !== 1 ? "s" : ""} attached
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Input
                  placeholder="Doc title prefix (optional for multi-file)"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="text-xs h-8"
                />
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700"
                >
                  <option value="CLIENT_KYC">Client KYC / ID Proof</option>
                  <option value="SERVICE_AGREEMENT">Service Agreement</option>
                  <option value="NON_DISCLOSURE_AGREEMENT">Non-Disclosure Agreement (NDA)</option>
                  <option value="POWER_OF_ATTORNEY">Power of Attorney</option>
                  <option value="TAX_INVOICE">Tax Invoice</option>
                  <option value="OTHER">Other Document</option>
                </select>

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    multiple
                    onChange={handleDocumentUpload}
                    disabled={isUploadingDoc}
                    className="block w-full text-xs text-slate-500 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:bg-[#ACCAD5]/20 hover:file:bg-[#ACCAD5]/30 cursor-pointer disabled:opacity-50"
                  />
                  {isUploadingDoc && (
                    <div className="flex items-center gap-1.5 text-[11px] text-[#ACCAD5] font-medium shrink-0">
                      <Loader2 className="h-4 w-4 animate-spin text-[#ACCAD5]" />
                      <span>{uploadProgressText || "Uploading..."}</span>
                    </div>
                  )}
                </div>
              </div>

              {watchedDocuments.length > 0 && (
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
                  {watchedDocuments.map((doc, dIdx) => (
                    <div key={dIdx} className="p-2 flex items-center justify-between text-xs bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        <span className="font-medium text-slate-800 break-all">{doc.title}</span>
                        <Badge variant="outline" className="text-[10px] bg-white border-slate-200 shrink-0">
                          {doc.docType.replace(/_/g, " ")}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="text-sky-600 hover:text-sky-700 flex items-center gap-1 text-[11px] font-medium hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View / Download
                        </a>
                        <button
                          type="button"
                          title="Remove document"
                          onClick={() => {
                            const updated = watchedDocuments.filter((_, i) => i !== dIdx);
                            setValue("documents", updated, { shouldDirty: true });
                          }}
                          className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SECTION 8: COMMERCIAL SUMMARY & HANDOVER GATES */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200/60 pb-3">
              <Calculator className="h-4 w-4 text-[#ACCAD5]" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                8. Commercial Summary & Operational Handover Gates
              </h4>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-xl bg-white border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                  Taxable Subtotal
                </span>
                <p className="text-sm font-bold text-slate-800 mt-0.5">
                  ₹{Number(watch("subTotal") || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                  GST 18% Total
                </span>
                <p className="text-sm font-bold text-slate-800 mt-0.5">
                  ₹{Number(watch("gstAmount") || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200">
                <span className="text-[10px] text-emerald-700 uppercase tracking-wider font-semibold">
                  Amount Received
                </span>
                <p className="text-sm font-bold text-emerald-700 mt-0.5">
                  ₹{Number(watch("amountReceived") || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200">
                <span className="text-[10px] text-amber-700 uppercase tracking-wider font-semibold">
                  Pending Balance
                </span>
                <p className="text-sm font-bold text-amber-700 mt-0.5">
                  ₹{Number(watch("amountPending") || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Handover Gate Action Bars */}
            {isEditing && (
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
                <div className="space-y-0.5 text-center sm:text-left">
                  <h5 className="text-xs font-bold text-slate-800 flex items-center justify-center sm:justify-start gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    Deal Handover Stage: {watch("accountsStatus").replace("_", " ")}
                  </h5>
                  <p className="text-[11px] text-slate-500">
                    {watch("accountsStatus") === "DRAFT"
                      ? "Complete required fields and send to Accounts for payment verification."
                      : watch("accountsStatus") === "PENDING_ACCOUNTS"
                      ? "Under review by Accounts."
                      : watch("accountsStatus") === "ACCOUNTS_VERIFIED"
                      ? "Verified by Accounts. Ready for Legal drafting and handover."
                      : watch("accountsStatus") === "SENT_TO_LEGAL"
                      ? "Legal has prepared documentation. Ready to dispatch to Operations (auto-spawns execution child records)."
                      : watch("accountsStatus") === "SENT_TO_OPERATION"
                      ? "Child operational execution files are currently active under Operations."
                      : watch("accountsStatus") === "QUALITY"
                      ? "All child operations completed! Parent Deal is rolled up to Quality for final audit."
                      : "Deal active."}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Gate 1: BDM sends to Accounts */}
                  {watch("accountsStatus") === "DRAFT" && (
                    <Button
                      type="button"
                      disabled={!isGatekeepingComplete || isSendingToAccounts}
                      onClick={handleSendToAccountsClick}
                      className="shrink-0 h-9 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs gap-1.5"
                    >
                      {isSendingToAccounts ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      Send to Accounts for Verification
                    </Button>
                  )}

                  {/* Gate 2: Legal sends to Operations (Auto-Spawns Child Operations) */}
                  {(watch("accountsStatus") === "SENT_TO_LEGAL" || watch("accountsStatus") === "ACCOUNTS_VERIFIED") && onSendToOperation && (
                    <Button
                      type="button"
                      disabled={isSendingToOperation}
                      onClick={handleSendToOperationClick}
                      className="shrink-0 h-9 text-xs font-semibold bg-gradient-to-r from-emerald-600 to-sky-600 hover:opacity-95 text-white shadow-xs gap-1.5"
                    >
                      {isSendingToOperation ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Cog className="h-3.5 w-3.5" />
                      )}
                      Send to Operation (Auto-Spawn)
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
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
              disabled={isSubmitting || isUploadingScreenshot || isUploadingDoc}
              className="text-xs bg-gradient-to-r from-[#ACCAD5] to-[#F0944D] text-slate-900 font-semibold shadow-xs hover:opacity-95"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Saving Deal...
                </>
              ) : isEditing ? (
                "Save Deal Changes"
              ) : (
                "Create Deal"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
