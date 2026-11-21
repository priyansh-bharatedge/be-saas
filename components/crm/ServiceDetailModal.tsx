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
  Layers,
  Edit2,
  IndianRupee,
  Tag,
  CheckCircle2,
  XCircle,
  FileText,
} from "lucide-react";
import { SerializedService } from "@/lib/actions/crm";

interface ServiceDetailModalProps {
  service: SerializedService | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
  canEdit?: boolean;
}

export default function ServiceDetailModal({
  service,
  open,
  onOpenChange,
  onEdit,
  canEdit = true,
}: ServiceDetailModalProps) {
  if (!service) return null;

  const formatCurrency = (val?: number | null) => {
    return `₹${Number(val || 0).toLocaleString("en-IN")}`;
  };

  const margin = Math.max(0, service.minimumPrice - service.outsourcePrice);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-xl border border-slate-200/80 shadow-2xl rounded-2xl p-6">
        <DialogHeader className="border-b border-slate-100 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#ACCAD5]/30 to-[#F0944D]/20 flex items-center justify-center text-slate-800">
                <Layers className="h-5 w-5 text-[#F0944D]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-lg font-bold text-slate-900">
                    {service.name}
                  </DialogTitle>
                  {service.code && (
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                      {service.code}
                    </span>
                  )}
                </div>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Category: {service.category || "General"} • SAC: {service.sacCode || "N/A"}
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`text-xs font-semibold ${
                  service.isActive
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-slate-100 text-slate-600 border-slate-300"
                }`}
              >
                {service.isActive ? "Active Service" : "Archived"}
              </Badge>
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
          {/* Financial Commercials Card */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Minimum Retail Price
              </span>
              <p className="text-lg font-extrabold text-slate-900 mt-1">{formatCurrency(service.minimumPrice)}</p>
              <span className="text-[10px] text-slate-400">Without GST</span>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Outsource / Vendor Cost
              </span>
              <p className="text-lg font-extrabold text-slate-800 mt-1">{formatCurrency(service.outsourcePrice)}</p>
              <span className="text-[10px] text-slate-400">Fulfillment expense</span>
            </div>
            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                Gross Gross Margin
              </span>
              <p className="text-lg font-extrabold text-emerald-700 mt-1">{formatCurrency(margin)}</p>
              <span className="text-[10px] text-emerald-600">Company retained value</span>
            </div>
          </div>

          {/* Statutory Tax & Classification */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 space-y-2">
            <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
              <Tag className="h-4 w-4 text-sky-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Classification & Statutory GST
              </h4>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 text-[11px]">SAC / HSN Code:</span>
                <p className="font-mono font-medium text-slate-800">{service.sacCode || "—"}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[11px]">Default GST Rate:</span>
                <p className="font-semibold text-slate-800">{service.defaultGstRate}%</p>
              </div>
            </div>
          </div>

          {/* Description & Scope */}
          {service.description && (
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Service Inclusions & Scope of Work
              </span>
              <p className="text-slate-700 text-xs whitespace-pre-line leading-relaxed">{service.description}</p>
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
