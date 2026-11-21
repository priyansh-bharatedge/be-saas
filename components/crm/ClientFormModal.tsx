"use client";

import { useEffect, useState } from "react";
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
import { Users, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { clientSchema, ClientFormData } from "@/lib/validations/crm";
import { SerializedClient } from "@/lib/actions/crm";

interface ClientFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: SerializedClient | null;
  companies: { id: string; name: string }[];
  employees: { id: string; name: string; department: string }[];
  onSubmit: (data: ClientFormData) => Promise<void>;
  isSubmitting?: boolean;
}

const GENDERS = ["Male", "Female", "Other", "Prefer not to say"];

export default function ClientFormModal({
  open,
  onOpenChange,
  client,
  companies,
  employees,
  onSubmit,
  isSubmitting = false,
}: ClientFormModalProps) {
  const isEditing = Boolean(client);

  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      phone: "",
      alternatePhone: "",
      email: "",
      gender: "Male",
      companyId: "",
      companyName: "",
      gstNumber: "",
      panNumber: "",
      address: "",
      city: "",
      state: "Gujarat",
      country: "India",
      assignedEmployeeId: "",
    },
  });

  const watchedPhone = watch("phone");

  // Real-time duplicate phone checking using global lookup API
  useEffect(() => {
    if (isEditing || !watchedPhone || watchedPhone.length < 10) {
      setDuplicateWarning(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingPhone(true);
      try {
        const res = await fetch(
          `/api/crm/clients/search?checkDuplicate=true&phone=${encodeURIComponent(watchedPhone)}`
        );
        const data = await res.json();
        if (data.success && data.exists && data.client) {
          setDuplicateWarning(
            `A client with phone ${watchedPhone} already exists: "${data.client.name}" (${data.client.clientNumber}). Linking or reusing existing client is recommended.`
          );
        } else {
          setDuplicateWarning(null);
        }
      } catch {
        // Ignore background check failure
      } finally {
        setIsCheckingPhone(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [watchedPhone, isEditing]);

  useEffect(() => {
    if (client) {
      reset({
        name: client.name,
        phone: client.phone,
        alternatePhone: client.alternatePhone || "",
        email: client.email || "",
        gender: client.gender || "Male",
        companyId: client.companyId || "",
        companyName: client.companyName || "",
        gstNumber: client.gstNumber || "",
        panNumber: client.panNumber || "",
        address: client.address || "",
        city: client.city || "",
        state: client.state || "Gujarat",
        country: client.country || "India",
        assignedEmployeeId: client.assignedEmployeeId || "",
      });
      setDuplicateWarning(null);
    } else {
      reset({
        name: "",
        phone: "",
        alternatePhone: "",
        email: "",
        gender: "Male",
        companyId: "",
        companyName: "",
        gstNumber: "",
        panNumber: "",
        address: "",
        city: "",
        state: "Gujarat",
        country: "India",
        assignedEmployeeId: "",
      });
      setDuplicateWarning(null);
    }
  }, [client, reset, open]);

  const handleFormSubmit = async (data: ClientFormData) => {
    await onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-hidden flex flex-col rounded-[28px] bg-white/95 backdrop-blur-2xl border border-white/80 p-6 sm:p-7 shadow-2xl">
        <DialogHeader className="shrink-0 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-50 text-[#F0944D] flex items-center justify-center font-bold text-sm shadow-xs border border-amber-200">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                {isEditing ? `Edit Client: ${client?.name}` : "Create Master Client Record"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Primary phone indexing, corporate account linkage, and team assignment.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="flex-1 overflow-y-auto space-y-4 py-4 pr-1"
        >
          {/* Client Name & Gender */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Client Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                {...register("name")}
                placeholder="e.g. Vikramaditya Sharma"
                className="h-9 text-xs rounded-xl"
              />
              {errors.name && (
                <p className="text-[11px] text-rose-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Gender</Label>
              <select
                {...register("gender")}
                className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#F0944D]/20 focus:border-[#F0944D]"
              >
                {GENDERS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Phone (Primary Search Key) & Alternate Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-700">
                  Primary Phone <span className="text-rose-500">*</span>
                </Label>
                {isCheckingPhone && (
                  <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                    <Loader2 className="h-2.5 w-2.5 animate-spin" /> checking...
                  </span>
                )}
              </div>
              <Input
                {...register("phone")}
                placeholder="e.g. 9876543210"
                className="h-9 text-xs rounded-xl font-mono"
              />
              {errors.phone && (
                <p className="text-[11px] text-rose-500">{errors.phone.message}</p>
              )}
              {duplicateWarning && (
                <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[10px] flex items-start gap-1.5 mt-1 leading-snug">
                  <AlertCircle className="h-3 w-3 shrink-0 text-amber-600 mt-0.5" />
                  <span>{duplicateWarning}</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Alternate Phone / WhatsApp</Label>
              <Input
                {...register("alternatePhone")}
                placeholder="e.g. 9898989898"
                className="h-9 text-xs rounded-xl font-mono"
              />
              {errors.alternatePhone && (
                <p className="text-[11px] text-rose-500">{errors.alternatePhone.message}</p>
              )}
            </div>
          </div>

          {/* Email (Secondary Search Key) & Company Linkage */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Email Address</Label>
              <Input
                type="email"
                {...register("email")}
                placeholder="client@company.com"
                className="h-9 text-xs rounded-xl"
              />
              {errors.email && (
                <p className="text-[11px] text-rose-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Associated Company</Label>
              <select
                {...register("companyId")}
                className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#F0944D]/20 focus:border-[#F0944D]"
              >
                <option value="">-- No Corporate Company (Individual) --</option>
                {companies.map((co) => (
                  <option key={co.id} value={co.id}>
                    {co.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Statutory Tax IDs: GSTIN & PAN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">GSTIN (Optional)</Label>
              <Input
                {...register("gstNumber")}
                placeholder="24AAACC1234D1Z5"
                className="h-9 text-xs rounded-xl font-mono uppercase"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Client PAN (Optional)</Label>
              <Input
                {...register("panNumber")}
                placeholder="AAACC1234D"
                className="h-9 text-xs rounded-xl font-mono uppercase"
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Billing / Registered Address</Label>
            <Textarea
              {...register("address")}
              placeholder="Office / Street address..."
              rows={2}
              className="text-xs rounded-xl resize-none"
            />
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

          {/* Account Manager / Assigned Employee */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Account Manager / Assigned BDM</Label>
            <select
              {...register("assignedEmployeeId")}
              className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#F0944D]/20 focus:border-[#F0944D]"
            >
              <option value="">-- Assign to Current User --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.department})
                </option>
              ))}
            </select>
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
              {isSubmitting ? "Saving..." : isEditing ? "Update Client" : "Register Client"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
