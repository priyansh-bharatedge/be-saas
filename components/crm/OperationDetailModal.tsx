"use client";

import React, { useState } from "react";
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
  Cog,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Edit2,
  Phone,
  Mail,
  ShieldCheck,
  User,
  Users,
  ExternalLink,
  Download,
  FileText,
  AlertCircle,
  Eye,
  EyeOff,
  Scale,
  Sparkles,
  Globe,
  Share2,
  Award,
  Layers,
  IndianRupee,
} from "lucide-react";
import {
  SerializedOperation,
  normalizeTeamType,
  FileAttachment,
} from "@/lib/validations/operation";
import { openDocumentPreview } from "@/components/modals/DocumentPreviewModal";

interface OperationDetailModalProps {
  operation: SerializedOperation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
  canEdit?: boolean;
}

export default function OperationDetailModal({
  operation,
  open,
  onOpenChange,
  onEdit,
  canEdit = true,
}: OperationDetailModalProps) {
  const [showPortalPassword, setShowPortalPassword] = useState(false);

  if (!operation) return null;

  const teamType = normalizeTeamType(operation.teamType);
  const workflowData = operation.workflowData || {};
  const companyType = workflowData.companyType || operation.companyType || "PVT LTD";
  const afterAllocation = workflowData.afterAllocation || "No";

  // Helper to render file attachments
  const renderAttachments = (attachments?: FileAttachment[]) => {
    if (!attachments || attachments.length === 0) return null;

    return (
      <div className="mt-2 space-y-1">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
          Attached Documents ({attachments.length}):
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {attachments.map((file, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => openDocumentPreview(file.url, file.name)}
              className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/80 hover:border-[#F0944D]/50 hover:bg-orange-50/20 transition-all text-xs group cursor-pointer text-left w-full"
            >
              <div className="flex items-center gap-2 truncate pr-2">
                <FileText className="h-3.5 w-3.5 text-[#F0944D] shrink-0" />
                <span className="truncate text-slate-700 font-medium group-hover:text-slate-900">
                  {file.name}
                </span>
              </div>
              <Eye className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#F0944D] shrink-0" />
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Helper to render resubmissions
  const renderResubmissions = (resubmissions?: any[]) => {
    if (!resubmissions || resubmissions.length === 0) return null;

    return (
      <div className="mt-2 p-2.5 rounded-lg bg-amber-50/50 border border-amber-200/60 space-y-2">
        <div className="flex items-center gap-1.5 text-amber-800 text-[11px] font-bold">
          <Clock className="h-3.5 w-3.5" />
          <span>Resubmission Attempt History ({resubmissions.length}):</span>
        </div>
        <div className="space-y-1.5">
          {resubmissions.map((r, i) => (
            <div
              key={i}
              className="text-xs bg-white/80 p-2 rounded border border-amber-200/40 flex flex-col sm:flex-row sm:items-center justify-between gap-1"
            >
              <div>
                <span className="font-semibold text-slate-800">
                  Attempt #{i + 1} ({r.date || "Date not specified"}):
                </span>{" "}
                <span className="text-rose-700 font-medium">{r.reason || "Rejection noted"}</span>
                {r.remarks && <p className="text-[11px] text-slate-500 mt-0.5">{r.remarks}</p>}
              </div>
              <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300 text-[10px] w-fit">
                {r.status || "Resubmission"}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    const lower = status.toLowerCase();
    if (lower.includes("approved") || lower.includes("completed")) {
      return (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px]">
          {status}
        </Badge>
      );
    }
    if (lower.includes("rejected") || lower.includes("failed")) {
      return (
        <Badge variant="outline" className="bg-rose-50 text-rose-800 border-rose-300 text-[10px]">
          {status}
        </Badge>
      );
    }
    if (lower.includes("resubmission") || lower.includes("correction")) {
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-[10px]">
          {status}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-sky-50 text-sky-800 border-sky-300 text-[10px]">
        {status}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-xl border border-slate-200/80 shadow-2xl rounded-2xl p-6">
        <DialogHeader className="border-b border-slate-100 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-[#ACCAD5]/30 to-[#F0944D]/20 flex items-center justify-center text-slate-800 shrink-0">
                <Cog className="h-6 w-6 text-[#F0944D]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-lg font-bold text-slate-900">
                    {operation.serviceName}
                  </DialogTitle>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-900 text-white">
                    {operation.operationNumber}
                  </span>
                </div>
                <DialogDescription className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                  <span>Department: <strong>{operation.teamType}</strong></span>
                  <span>•</span>
                  <span>Created: {new Date(operation.createdAt).toLocaleDateString("en-IN")}</span>
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`text-[11px] font-bold px-2.5 py-1 ${
                  operation.stage === "QUALITY"
                    ? "bg-purple-50 text-purple-800 border-purple-300"
                    : "bg-sky-50 text-sky-800 border-sky-300"
                }`}
              >
                {operation.stage === "QUALITY" ? "Quality Audit Stage" : "Operations Execution Stage"}
              </Badge>
              {canEdit && onEdit && (
                <Button
                  size="sm"
                  onClick={() => {
                    onOpenChange(false);
                    onEdit();
                  }}
                  className="h-8 text-xs font-semibold bg-[#F0944D] hover:bg-[#d97c36] text-white gap-1.5 shadow-xs"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  Edit Workflow
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-3 text-xs text-slate-700">
          {/* 1. Parent Deal & Client Details Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-2">
              <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
                <Briefcase className="h-4 w-4 text-[#F0944D]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Parent Commercial Deal
                </h4>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px]">Deal Number:</span>
                  <p className="font-mono font-bold text-slate-900">{operation.dealNumber}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Deal Title:</span>
                  <p className="font-semibold text-slate-800 truncate">{operation.dealTitle}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Booking Date:</span>
                  <p className="font-medium text-slate-700">{operation.bookingDate || "—"}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Commercial Value:</span>
                  <p className="font-bold text-emerald-700">
                    {operation.dealValue ? `₹${operation.dealValue.toLocaleString("en-IN")}` : "—"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-2">
              <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
                <Building2 className="h-4 w-4 text-sky-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Client & Legal Entity
                </h4>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px]">Entity / Company:</span>
                  <p className="font-bold text-slate-900">{operation.companyName || "—"}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Entity Structure:</span>
                  <Badge variant="outline" className="bg-slate-100 text-slate-800 text-[10px] mt-0.5">
                    {companyType}
                  </Badge>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Primary Contact:</span>
                  <p className="font-semibold text-slate-800">{operation.clientName}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Phone & Email:</span>
                  <p className="font-medium text-slate-700 truncate">
                    {operation.clientPhone}
                    {operation.clientEmail && ` • ${operation.clientEmail}`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Operations Staff & CA/CS Alignment */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Assigned Staff & Delivery Timeline
                </h4>
              </div>
              <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-[10px]">
                Stage: {operation.internalStage}
              </Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400 text-[10px] font-medium">Team Leader (TL):</span>
                <p className="font-bold text-slate-900">{operation.assignedTlName || "Unassigned"}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] font-medium">Executing Specialist (TM):</span>
                <p className="font-bold text-slate-900">{operation.assignedTmName || "Unassigned"}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] font-medium">Target Due Date:</span>
                <p className="font-semibold text-slate-800">{operation.dueDate || "Not set"}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] font-medium">Completion Date:</span>
                <p className="font-semibold text-slate-800">
                  {operation.completionDate
                    ? new Date(operation.completionDate).toLocaleDateString("en-IN")
                    : "In execution"}
                </p>
              </div>
            </div>

            {/* CA / CS Professionals for Incorporation & Compliance */}
            {(teamType === "Incorporation" ||
              teamType === "Compliance" ||
              operation.caCs1Name ||
              operation.caCs2Name) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/50">
                <div className="p-2.5 rounded-lg bg-indigo-50/50 border border-indigo-100 flex items-center gap-2.5">
                  <Scale className="h-4 w-4 text-indigo-600 shrink-0" />
                  <div>
                    <span className="text-[10px] font-semibold text-indigo-700 uppercase tracking-wider block">
                      CA / CS Professional 1:
                    </span>
                    <p className="font-bold text-slate-900 text-xs">
                      {operation.caCs1Name || "Not assigned"}
                    </p>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-indigo-50/50 border border-indigo-100 flex items-center gap-2.5">
                  <Scale className="h-4 w-4 text-indigo-600 shrink-0" />
                  <div>
                    <span className="text-[10px] font-semibold text-indigo-700 uppercase tracking-wider block">
                      CA / CS Professional 2:
                    </span>
                    <p className="font-bold text-slate-900 text-xs">
                      {operation.caCs2Name || "Not assigned"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. DYNAMIC TEAM-TYPE-WISE FULFILLMENT BREAKDOWN */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-[#F0944D]" />
              <span>Team-Type Fulfillment Modules ({operation.teamType})</span>
            </h4>

            {/* A. INCORPORATION MODULE */}
            {teamType === "Incorporation" && (
              <div className="space-y-3">
                {/* Stage 1: Document Collection */}
                <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">1. Document Collection & KYC</span>
                    {getStatusBadge(workflowData.docCollection?.status)}
                  </div>
                  {workflowData.docCollection?.remarks && (
                    <p className="text-slate-600 text-xs">Remarks: {workflowData.docCollection.remarks}</p>
                  )}
                  {renderAttachments(workflowData.docCollection?.attachments)}
                </div>

                {/* Stage 2: Name Application */}
                <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">2. Name Application (RUN / SPICe+ Part A)</span>
                    {getStatusBadge(workflowData.nameApplication?.status)}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-slate-400 text-[10px]">SRN Number:</span>
                      <p className="font-mono font-bold text-slate-800">
                        {workflowData.nameApplication?.srnNumber || "—"}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">Approved Name:</span>
                      <p className="font-bold text-emerald-700">
                        {workflowData.nameApplication?.approvedName || "—"}
                      </p>
                    </div>
                  </div>
                  {renderResubmissions(workflowData.nameApplication?.resubmissions)}
                </div>

                {/* Stage 3: DSC Creation */}
                <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">3. DSC Creation</span>
                    {getStatusBadge(workflowData.dscCreation?.status)}
                  </div>
                  <p className="text-xs text-slate-600">
                    DSC Status: <strong>{workflowData.dscCreation?.dscStatus || "Pending"}</strong>
                  </p>
                </div>

                {/* Stage 4: Final Filing */}
                <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">4. Final Filing (SPICe+ Part B / Fillip)</span>
                    {getStatusBadge(workflowData.finalFiling?.status)}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-slate-400 text-[10px]">CIN / LLPIN:</span>
                      <p className="font-mono font-bold text-slate-900">
                        {workflowData.finalFiling?.cinNumber || "—"}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">Company PAN:</span>
                      <p className="font-mono font-bold text-slate-900">
                        {workflowData.finalFiling?.panNumber || "—"}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">Company TAN:</span>
                      <p className="font-mono font-bold text-slate-900">
                        {workflowData.finalFiling?.tanNumber || "—"}
                      </p>
                    </div>
                  </div>
                  {renderResubmissions(workflowData.finalFiling?.resubmissions)}
                </div>

                {/* Conditional Gate: After Allocation */}
                {afterAllocation === "Yes" && (
                  <div className="p-3.5 rounded-xl border border-[#F0944D]/30 bg-orange-50/20 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#F0944D]">
                      <Sparkles className="h-4 w-4" />
                      <span>Post-Incorporation Gate: After Allocation Activities</span>
                    </div>

                    {companyType === "LLP" ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1">
                        <div className="p-2 rounded bg-white border border-slate-200">
                          <span className="font-semibold block">LLP Agreement:</span>
                          {getStatusBadge(workflowData.llpAgreement?.status)}
                        </div>
                        <div className="p-2 rounded bg-white border border-slate-200">
                          <span className="font-semibold block">MSME Udyam:</span>
                          <p className="font-mono text-[11px]">{workflowData.msme?.udyamNumber || "—"}</p>
                          {getStatusBadge(workflowData.msme?.status)}
                        </div>
                        <div className="p-2 rounded bg-white border border-slate-200">
                          <span className="font-semibold block">Form 3:</span>
                          <p className="font-mono text-[11px]">{workflowData.form3?.srnNumber || "—"}</p>
                          {getStatusBadge(workflowData.form3?.status)}
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1">
                        <div className="p-2 rounded bg-white border border-slate-200">
                          <span className="font-semibold block">Board Resolution:</span>
                          {getStatusBadge(workflowData.boardResolution?.status)}
                        </div>
                        <div className="p-2 rounded bg-white border border-slate-200">
                          <span className="font-semibold block">Share Certificates:</span>
                          {getStatusBadge(workflowData.shareCertificate?.status)}
                        </div>
                        <div className="p-2 rounded bg-white border border-slate-200">
                          <span className="font-semibold block">MSME Udyam:</span>
                          <p className="font-mono text-[11px]">{workflowData.msme?.udyamNumber || "—"}</p>
                          {getStatusBadge(workflowData.msme?.status)}
                        </div>
                        <div className="p-2 rounded bg-white border border-slate-200">
                          <span className="font-semibold block">ADT-1 (Auditor):</span>
                          <p className="font-mono text-[11px]">{workflowData.adt1?.srnNumber || "—"}</p>
                          {getStatusBadge(workflowData.adt1?.status)}
                        </div>
                        <div className="p-2 rounded bg-white border border-slate-200">
                          <span className="font-semibold block">INC 20-A (Commence):</span>
                          <p className="font-mono text-[11px]">{workflowData.inc20a?.srnNumber || "—"}</p>
                          {getStatusBadge(workflowData.inc20a?.status)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* B. COMPLIANCE MODULE */}
            {teamType === "Compliance" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div className="p-3 rounded-xl border border-slate-200 bg-white">
                    <span className="font-bold text-slate-800 block">Doc Collection:</span>
                    {getStatusBadge(workflowData.docCollection?.status)}
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 bg-white">
                    <span className="font-bold text-slate-800 block">Director ITR:</span>
                    {getStatusBadge(workflowData.directorItr?.status)}
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 bg-white">
                    <span className="font-bold text-slate-800 block">Accounting:</span>
                    {getStatusBadge(workflowData.accounting?.status)}
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 bg-white">
                    <span className="font-bold text-slate-800 block">Statutory Audit:</span>
                    {getStatusBadge(workflowData.audit?.status)}
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 bg-white">
                    <span className="font-bold text-slate-800 block">Company ITR:</span>
                    {getStatusBadge(workflowData.companyItr?.status)}
                  </div>
                  {companyType === "LLP" ? (
                    <>
                      <div className="p-3 rounded-xl border border-slate-200 bg-white">
                        <span className="font-bold text-slate-800 block">Form 11:</span>
                        {getStatusBadge(workflowData.form11?.status)}
                      </div>
                      <div className="p-3 rounded-xl border border-slate-200 bg-white">
                        <span className="font-bold text-slate-800 block">Form 8:</span>
                        {getStatusBadge(workflowData.form8?.status)}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="p-3 rounded-xl border border-slate-200 bg-white">
                        <span className="font-bold text-slate-800 block">DPT-3:</span>
                        {getStatusBadge(workflowData.dpt3?.status)}
                      </div>
                      <div className="p-3 rounded-xl border border-slate-200 bg-white">
                        <span className="font-bold text-slate-800 block">AOC-4:</span>
                        {getStatusBadge(workflowData.aoc4?.status)}
                      </div>
                      <div className="p-3 rounded-xl border border-slate-200 bg-white">
                        <span className="font-bold text-slate-800 block">MGT-7/7A:</span>
                        {getStatusBadge(workflowData.mgt7?.status)}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* C. FUNDING MODULE */}
            {teamType === "Funding" && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">1. DPR / Investor Pitch Deck</span>
                    {getStatusBadge(workflowData.dprPitchDeck?.status)}
                  </div>
                  {workflowData.dprPitchDeck?.draftUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        openDocumentPreview(
                          workflowData.dprPitchDeck!.draftUrl!,
                          "DPR / Pitch Deck Draft"
                        )
                      }
                      className="text-xs text-[#F0944D] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View Pitch Deck Draft
                    </button>
                  )}
                  {renderAttachments(workflowData.dprPitchDeck?.attachments)}
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">2. Financial Projections & CMA</span>
                    {getStatusBadge(workflowData.finance?.status)}
                  </div>
                  {renderAttachments(workflowData.finance?.attachments)}
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">3. Portal Application Submission</span>
                    {getStatusBadge(workflowData.applicationSubmission?.status)}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-slate-400 text-[10px]">Portal Name:</span>
                      <p className="font-semibold text-slate-800">
                        {workflowData.applicationSubmission?.portalName || "—"}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">Login / User ID:</span>
                      <p className="font-mono font-semibold text-slate-800">
                        {workflowData.applicationSubmission?.loginId || "—"}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">Portal Password:</span>
                      <div className="flex items-center gap-1 font-mono">
                        <span>
                          {showPortalPassword
                            ? workflowData.applicationSubmission?.portalPassword || "—"
                            : "••••••••"}
                        </span>
                        {workflowData.applicationSubmission?.portalPassword && (
                          <button
                            type="button"
                            onClick={() => setShowPortalPassword(!showPortalPassword)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            {showPortalPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </button>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">Application / Ack #:</span>
                      <p className="font-mono font-bold text-slate-900">
                        {workflowData.applicationSubmission?.applicationNumber || "—"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* D. CERTIFICATION MODULE */}
            {teamType === "Certification" && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">1. Document Collection & DSC Verification</span>
                    {getStatusBadge(workflowData.docCollectionDsc?.status)}
                  </div>
                  {renderAttachments(workflowData.docCollectionDsc?.attachments)}
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">2. Final Government / Authority Application</span>
                    {getStatusBadge(workflowData.finalApplication?.status)}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-slate-400 text-[10px]">Certificate #:</span>
                      <p className="font-mono font-bold text-slate-900">
                        {workflowData.finalApplication?.certificateNumber || "—"}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">Issue Date:</span>
                      <p className="font-semibold text-slate-800">
                        {workflowData.finalApplication?.issueDate || "—"}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">Expiry Date:</span>
                      <p className="font-semibold text-slate-800">
                        {workflowData.finalApplication?.expiryDate || "—"}
                      </p>
                    </div>
                  </div>
                  {renderAttachments(workflowData.finalApplication?.attachments)}
                </div>
              </div>
            )}

            {/* E. DIGITAL MARKETING MODULE */}
            {teamType === "Digital Marketing" && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">1. Scope, Target Audience & Strategy</span>
                    <Badge variant="outline" className="bg-orange-50 text-[#F0944D] border-orange-200 text-[10px]">
                      {workflowData.serviceScope?.serviceTrack || "Full Digital Strategy"}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600">
                    Target Audience: <strong>{workflowData.serviceScope?.targetAudience || "General"}</strong>
                  </p>
                  <p className="text-xs text-slate-600">
                    Monthly Deliverables: {workflowData.serviceScope?.monthlyDeliverables || "Not specified"}
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">2. Website & SEO Execution</span>
                    <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200 text-[10px]">
                      {workflowData.websiteSeo?.liveStatus || "In Progress"}
                    </Badge>
                  </div>
                  {workflowData.websiteSeo?.websiteUrl && (
                    <a
                      href={workflowData.websiteSeo.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-sky-600 hover:underline flex items-center gap-1 font-medium"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      {workflowData.websiteSeo.websiteUrl}
                    </a>
                  )}
                  {workflowData.websiteSeo?.monthlySeoReport && (
                    <p className="text-xs text-slate-600">
                      SEO Report: {workflowData.websiteSeo.monthlySeoReport}
                    </p>
                  )}
                </div>

                {/* Social Media Content Calendar Posts */}
                {workflowData.socialMedia?.posts && workflowData.socialMedia.posts.length > 0 && (
                  <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Share2 className="h-3.5 w-3.5 text-[#F0944D]" />
                        Social Media Content Calendar ({workflowData.socialMedia.posts.length} Posts)
                      </span>
                    </div>
                    <div className="space-y-2">
                      {workflowData.socialMedia.posts.map((post: any, idx: number) => (
                        <div
                          key={post.id || idx}
                          className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/60 text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <Badge className="bg-slate-900 text-white text-[10px]">
                                {post.platform}
                              </Badge>
                              <span className="font-bold text-slate-800">
                                {post.scheduledDate || "No date set"}
                              </span>
                              <span className="text-slate-400">•</span>
                              <span className="text-slate-500 font-medium">{post.postType}</span>
                            </div>
                            {getStatusBadge(post.status)}
                          </div>
                          <p className="text-slate-700 bg-white p-2 rounded border border-slate-200/60 font-mono text-[11px]">
                            {post.contentCopy || "No caption written yet"}
                          </p>
                          {renderAttachments(post.creativeAssets)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. Quality Audit Evaluation (if audited or feedback exists) */}
          {(operation.qualityScore !== null || operation.qualityFeedback) && (
            <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-4 space-y-2">
              <div className="flex items-center gap-2 border-b border-purple-200/60 pb-2">
                <ShieldCheck className="h-4 w-4 text-purple-700" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900">
                  Quality Audit Certification
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px]">Quality Score:</span>
                  <p className="font-extrabold text-xl text-purple-800">
                    {operation.qualityScore !== null ? `${operation.qualityScore} / 100` : "—"}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-400 text-[10px]">Auditor Assessment & Feedback:</span>
                  <p className="text-slate-800 font-medium mt-0.5">
                    {operation.qualityFeedback || "Approved without revision remarks."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-xs text-slate-700 font-semibold"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
