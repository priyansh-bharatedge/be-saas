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
  User,
  Building2,
  Calendar,
  Edit2,
  Mail,
  MapPin,
  Phone,
  Briefcase,
  Users,
} from "lucide-react";
import { SerializedClient } from "@/lib/actions/crm";

interface ClientDetailModalProps {
  client: SerializedClient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
  canEdit?: boolean;
}

export default function ClientDetailModal({
  client,
  open,
  onOpenChange,
  onEdit,
  canEdit = true,
}: ClientDetailModalProps) {
  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-xl border border-slate-200/80 shadow-2xl rounded-2xl p-6">
        <DialogHeader className="border-b border-slate-100 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#ACCAD5]/30 to-[#F0944D]/20 flex items-center justify-center text-slate-800">
                <User className="h-5 w-5 text-[#F0944D]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-lg font-bold text-slate-900">
                    {client.name}
                  </DialogTitle>
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                    {client.clientNumber}
                  </span>
                </div>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Added on {new Date(client.createdAt).toLocaleDateString("en-IN")} • Deals: {client.dealsCount}
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {client.companyName && (
                <Badge variant="outline" className="text-xs font-semibold bg-sky-50 text-sky-700 border-sky-200">
                  {client.companyName}
                </Badge>
              )}
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
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Deals</span>
              <p className="text-lg font-black text-slate-900 mt-0.5">{client.dealsCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Assigned BDM</span>
              <p className="text-xs font-semibold text-slate-800 mt-1 truncate">
                {client.assignedEmployeeName || "Unassigned"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gender</span>
              <p className="text-xs font-semibold text-slate-800 mt-1">{client.gender || "Not specified"}</p>
            </div>
          </div>

          {/* Contact Information */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 space-y-2.5">
            <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
              <Phone className="h-4 w-4 text-[#F0944D]" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Contact Information</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 text-[11px]">Primary Phone:</span>
                <p className="font-semibold text-slate-800">{client.phone}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[11px]">Alternate Phone:</span>
                <p className="font-medium text-slate-700">{client.alternatePhone || "—"}</p>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-400 text-[11px]">Email Address:</span>
                <p className="font-medium text-slate-700">{client.email || "—"}</p>
              </div>
            </div>
          </div>

          {/* Location & Address */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 space-y-2.5">
            <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
              <MapPin className="h-4 w-4 text-emerald-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Location & Address</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 text-[11px]">City / State:</span>
                <p className="font-medium text-slate-800">
                  {[client.city, client.state].filter(Boolean).join(", ") || "—"}
                </p>
              </div>
              <div>
                <span className="text-slate-400 text-[11px]">Country:</span>
                <p className="font-medium text-slate-800">{client.country || "India"}</p>
              </div>
              {client.address && (
                <div className="sm:col-span-2">
                  <span className="text-slate-400 text-[11px]">Full Street Address:</span>
                  <p className="font-medium text-slate-700 mt-0.5">{client.address}</p>
                </div>
              )}
            </div>
          </div>

          {/* Statutory Tax Details */}
          {(client.panNumber || client.gstNumber) && (
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 space-y-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Statutory Identifiers
              </span>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px]">PAN Number:</span>
                  <p className="font-mono font-medium text-slate-800">{client.panNumber || "—"}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">GST Number:</span>
                  <p className="font-mono font-medium text-slate-800">{client.gstNumber || "—"}</p>
                </div>
              </div>
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
