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
import { UserPlus, Loader2 } from "lucide-react";
import { leadSchema, LeadFormData } from "@/lib/validations/crm";
import { SerializedLead } from "@/lib/actions/crm";
import { LeadStatus } from "@prisma/client";

interface LeadFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: SerializedLead | null;
  employees: { id: string; name: string; department: string }[];
  onSubmit: (data: LeadFormData) => Promise<void>;
  isSubmitting?: boolean;
}

const SOURCES = [
  "Website Inbound",
  "Google Search / SEO",
  "Referral / Partner",
  "Cold Calling",
  "LinkedIn Campaign",
  "Meta / Instagram Ads",
  "Trade Show / Event",
  "Direct Walk-in",
  "Other Channel",
];

const STATUSES: { value: LeadStatus; label: string }[] = [
  { value: LeadStatus.NEW, label: "New Inbound" },
  { value: LeadStatus.CONTACTED, label: "Contacted" },
  { value: LeadStatus.QUALIFIED, label: "Qualified Opportunity" },
  { value: LeadStatus.PROPOSAL_SENT, label: "Proposal / Quote Sent" },
  { value: LeadStatus.WON, label: "Won (Convert to Deal)" },
  { value: LeadStatus.LOST, label: "Lost Opportunity" },
  { value: LeadStatus.JUNK, label: "Junk / Invalid" },
];

export default function LeadFormModal({
  open,
  onOpenChange,
  lead,
  employees,
  onSubmit,
  isSubmitting = false,
}: LeadFormModalProps) {
  const isEditing = Boolean(lead);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema) as any,
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      companyName: "",
      source: "Website Inbound",
      status: LeadStatus.NEW,
      estimatedBudget: 25000,
      notes: "",
      assignedEmployeeId: "",
    },
  });

  useEffect(() => {
    if (lead) {
      reset({
        name: lead.name,
        phone: lead.phone,
        email: lead.email || "",
        companyName: lead.companyName || "",
        source: lead.source || "Website Inbound",
        status: lead.status || LeadStatus.NEW,
        estimatedBudget: lead.estimatedBudget || 0,
        notes: lead.notes || "",
        assignedEmployeeId: lead.assignedEmployeeId || "",
      });
    } else {
      reset({
        name: "",
        phone: "",
        email: "",
        companyName: "",
        source: "Website Inbound",
        status: LeadStatus.NEW,
        estimatedBudget: 25000,
        notes: "",
        assignedEmployeeId: "",
      });
    }
  }, [lead, reset, open]);

  const handleFormSubmit = async (data: LeadFormData) => {
    await onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col rounded-[28px] bg-white/95 backdrop-blur-2xl border border-white/80 p-6 sm:p-7 shadow-2xl">
        <DialogHeader className="shrink-0 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-50 text-[#F0944D] flex items-center justify-center font-bold text-sm shadow-xs border border-amber-200">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                {isEditing ? `Edit Lead: ${lead?.name} (${lead?.leadNumber})` : "Capture New Sales Lead"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Channel source attribution, pipeline qualification status, and BDM routing.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="flex-1 overflow-y-auto space-y-4 py-4 pr-1"
        >
          {/* Contact Name & Company Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Contact Person <span className="text-rose-500">*</span>
              </Label>
              <Input
                {...register("name")}
                placeholder="e.g. Priya Nair"
                className="h-9 text-xs rounded-xl"
              />
              {errors.name && (
                <p className="text-[11px] text-rose-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Company / Organization</Label>
              <Input
                {...register("companyName")}
                placeholder="e.g. Zenith Tech Labs"
                className="h-9 text-xs rounded-xl"
              />
            </div>
          </div>

          {/* Phone & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Contact Phone <span className="text-rose-500">*</span>
              </Label>
              <Input
                {...register("phone")}
                placeholder="e.g. 9822012345"
                className="h-9 text-xs rounded-xl font-mono"
              />
              {errors.phone && (
                <p className="text-[11px] text-rose-500">{errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Email Address</Label>
              <Input
                type="email"
                {...register("email")}
                placeholder="priya@zenithtech.in"
                className="h-9 text-xs rounded-xl"
              />
              {errors.email && (
                <p className="text-[11px] text-rose-500">{errors.email.message}</p>
              )}
            </div>
          </div>

          {/* Source & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Lead Ingestion Channel</Label>
              <select
                {...register("source")}
                className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#F0944D]/20 focus:border-[#F0944D]"
              >
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Pipeline Status</Label>
              <select
                {...register("status")}
                className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#F0944D]/20 focus:border-[#F0944D]"
              >
                {STATUSES.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Budget & Assigned BDM */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Estimated Budget (₹)</Label>
              <Input
                type="number"
                step="any"
                {...register("estimatedBudget")}
                className="h-9 text-xs rounded-xl font-medium"
              />
              {errors.estimatedBudget && (
                <p className="text-[11px] text-rose-500">{errors.estimatedBudget.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Assign to Sales Executive</Label>
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
          </div>

          {/* Notes & Requirements */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Requirement Notes / Context</Label>
            <Textarea
              {...register("notes")}
              placeholder="Client requirement details, service inquiries, follow-up schedule..."
              rows={3}
              className="text-xs rounded-xl resize-none"
            />
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
              {isSubmitting ? "Saving..." : isEditing ? "Update Lead" : "Save Lead"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
