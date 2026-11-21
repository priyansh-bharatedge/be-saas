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
  Building2,
  Calendar,
  Edit2,
  ExternalLink,
  Globe,
  MapPin,
  Briefcase,
  Users,
} from "lucide-react";
import { SerializedCompany } from "@/lib/actions/crm";

interface CompanyDetailModalProps {
  company: SerializedCompany | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
  canEdit?: boolean;
}

export default function CompanyDetailModal({
  company,
  open,
  onOpenChange,
  onEdit,
  canEdit = true,
}: CompanyDetailModalProps) {
  if (!company) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-xl border border-slate-200/80 shadow-2xl rounded-2xl p-6">
        <DialogHeader className="border-b border-slate-100 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#ACCAD5]/30 to-[#F0944D]/20 flex items-center justify-center text-slate-800">
                <Building2 className="h-5 w-5 text-sky-600" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900">
                  {company.name}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Added on {new Date(company.createdAt).toLocaleDateString("en-IN")} • Created by {company.creatorName || "Staff"}
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-semibold bg-sky-50 text-sky-700 border-sky-200">
                {company.companyType || "Private Limited Company"}
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
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Deals</span>
              <p className="text-lg font-black text-slate-900 mt-0.5">{company.dealsCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Associated Clients</span>
              <p className="text-lg font-black text-slate-900 mt-0.5">{company.clientsCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Industry</span>
              <p className="text-xs font-semibold text-slate-800 mt-1">{company.industry || "General Commercial"}</p>
            </div>
          </div>

          {/* Statutory & Legal Registration */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 space-y-2.5">
            <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
              <Building2 className="h-4 w-4 text-[#F0944D]" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Corporate Details</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 text-[11px]">Incorporation Date:</span>
                <p className="font-semibold text-slate-800">{company.incorporatedDate || "—"}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[11px]">Website:</span>
                {company.website ? (
                  <a
                    href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-sky-600 hover:underline flex items-center gap-1"
                  >
                    <Globe className="h-3 w-3" />
                    {company.website}
                  </a>
                ) : (
                  <p className="font-medium text-slate-500">—</p>
                )}
              </div>
              <div>
                <span className="text-slate-400 text-[11px]">GST Number:</span>
                <p className="font-mono font-medium text-slate-800">{company.gstNumber || "—"}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[11px]">PAN Number:</span>
                <p className="font-mono font-medium text-slate-800">{company.panNumber || "—"}</p>
              </div>
            </div>
          </div>

          {/* Location & Address */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 space-y-2.5">
            <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
              <MapPin className="h-4 w-4 text-emerald-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Registered Address</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 text-[11px]">City / State:</span>
                <p className="font-medium text-slate-800">
                  {[company.city, company.state].filter(Boolean).join(", ") || "—"}
                </p>
              </div>
              <div>
                <span className="text-slate-400 text-[11px]">Country:</span>
                <p className="font-medium text-slate-800">{company.country || "India"}</p>
              </div>
              {company.address && (
                <div className="sm:col-span-2">
                  <span className="text-slate-400 text-[11px]">Full Address:</span>
                  <p className="font-medium text-slate-700 mt-0.5">{company.address}</p>
                </div>
              )}
            </div>
          </div>
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
