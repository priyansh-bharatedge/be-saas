"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  UserCheck,
  Building2,
  Calendar,
  Clock,
  Edit2,
  IndianRupee,
  Mail,
  Phone,
  Tag,
  User,
  Users,
} from "lucide-react";
import { SerializedLead } from "@/lib/actions/crm";

interface LeadDetailModalProps {
  lead: SerializedLead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
  canEdit?: boolean;
}

export default function LeadDetailModal({
  lead,
  open,
  onOpenChange,
  onEdit,
  canEdit = true,
}: LeadDetailModalProps) {
  if (!lead) return null;

  const formatCurrency = (val?: number | null) => {
    return `₹${Number(val || 0).toLocaleString("en-IN")}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONVERTED":
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Converted</Badge>;
      case "QUALIFIED":
        return <Badge className="bg-sky-50 text-sky-700 border-sky-200">Qualified</Badge>;
      case "CONTACTED":
        return <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200">Contacted</Badge>;
      case "PROPOSAL_SENT":
        return <Badge className="bg-purple-50 text-purple-700 border-purple-200">Proposal Sent</Badge>;
      case "LOST":
        return <Badge className="bg-rose-50 text-rose-700 border-rose-200">Lost</Badge>;
      default:
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200">New Lead</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-xl border border-slate-200/80 shadow-2xl rounded-2xl p-6">
        <DialogHeader className="border-b border-slate-100 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#ACCAD5]/30 to-[#F0944D]/20 flex items-center justify-center text-slate-800">
                <UserCheck className="h-5 w-5 text-[#F0944D]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-lg font-bold text-slate-900">
                    {lead.name}
                  </DialogTitle>
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                    {lead.leadNumber}
                  </span>
                </div>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Captured on {new Date(lead.createdAt).toLocaleDateString("en-IN")} • Source: {lead.source}
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {getStatusBadge(lead.status)}
              {canEdit && onEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onOpenChange(false);
                    onEdit();
                  }}
                  className="h-8 text-xs font-semibold text-slate-700 border-slate-200 hover:bg-slate-50 gap-1.5"
                >
                  <Edit2 className="h-3.5 w-3.5 text-[#F0944D]" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-3 text-xs text-slate-700">
          {/* Estimated Budget Card */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Estimated Commercial Budget
              </span>
              <p className="text-xl font-black text-slate-900 mt-0.5">
                {formatCurrency(lead.estimatedBudget)}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Assigned Sales Rep
              </span>
              <p className="font-semibold text-slate-800 text-xs mt-0.5">
                {lead.assignedEmployeeName || "Unassigned"}
              </p>
            </div>
          </div>

          {/* Contact & Company Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 space-y-2">
              <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
                <Phone className="h-4 w-4 text-[#F0944D]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Contact Details</h4>
              </div>
              <div className="space-y-1 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px]">Primary Phone:</span>
                  <p className="font-semibold text-slate-800">{lead.phone || "—"}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Email Address:</span>
                  <p className="font-medium text-slate-700 truncate">{lead.email || "—"}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 space-y-2">
              <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
                <Building2 className="h-4 w-4 text-sky-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Company & Channel</h4>
              </div>
              <div className="space-y-1 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px]">Company / Organization:</span>
                  <p className="font-semibold text-slate-800">{lead.companyName || "—"}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Lead Generation Source:</span>
                  <p className="font-medium text-slate-700">{lead.source}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Notes & Context */}
          {lead.notes && (
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Notes & Client Requirements
              </span>
              <p className="text-slate-700 text-xs whitespace-pre-line">{lead.notes}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 mt-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-xs text-slate-600"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
