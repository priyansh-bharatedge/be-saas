"use client";

import { useState, useTransition } from "react";
import {
  GitBranch,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Award,
  UploadCloud,
  Edit2,
  AlertCircle,
  Building2,
  User,
  Users,
  Calendar,
  RotateCcw,
  Loader2,
  ArrowRight,
  ShieldCheck,
  CheckCheck,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import OperationFormModal from "@/components/crm/OperationFormModal";
import OperationDetailModal from "@/components/crm/OperationDetailModal";
import QualityAuditModal from "@/components/crm/QualityAuditModal";
import BulkUploadModal, { BulkUploadColumnDef } from "@/components/crm/BulkUploadModal";
import {
  SerializedOperation,
  OperationMasterData,
  OperationFormData,
  QualityAuditFormData,
  bulkOperationSchema,
  TEAM_TYPES,
} from "@/lib/validations/operation";
import {
  updateOperationWorkflowAction,
  sendOperationToQualityAction,
  qualityAuditOperationAction,
  bulkUploadOperationsAction,
} from "@/lib/actions/operations";
import { OperationStage } from "@prisma/client";

interface OperationsViewProps {
  initialOperations: SerializedOperation[];
  masterData: OperationMasterData;
  isOperationHod: boolean;
  isOperationTl: boolean;
  isQualityUser: boolean;
  canManageAll: boolean;
}

export default function OperationsView({
  initialOperations,
  masterData,
  isOperationHod,
  isOperationTl,
  isQualityUser,
  canManageAll,
}: OperationsViewProps) {
  const [operations, setOperations] = useState<SerializedOperation[]>(initialOperations);
  const [activeTab, setActiveTab] = useState<"ALL" | "COMPLETED" | "PENDING">("ALL");
  const [selectedTeamType, setSelectedTeamType] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<SerializedOperation | null>(null);
  const [viewOperation, setViewOperation] = useState<SerializedOperation | null>(null);
  const [isSubmittingWorkflow, setIsSubmittingWorkflow] = useState(false);

  // Quality Audit Modal
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditTarget, setAuditTarget] = useState<SerializedOperation | null>(null);
  const [isSubmittingAudit, setIsSubmittingAudit] = useState(false);

  // Bulk Upload Modal
  const [isBulkOpen, setIsBulkOpen] = useState(false);

  // Quick Action Pending
  const [actionPendingId, setActionPendingId] = useState<string | null>(null);

  // Metrics
  const totalCount = operations.length;
  const pendingOperationsCount = operations.filter((op) => op.stage === OperationStage.OPERATION).length;
  const qualityReviewCount = operations.filter((op) => op.stage === OperationStage.QUALITY).length;
  const completedApprovedCount = operations.filter((op) => op.status === "COMPLETED").length;

  // Filtered List
  const filteredOperations = operations.filter((op) => {
    // 1. 3 Dynamic Tabs
    if (activeTab === "COMPLETED" && op.stage !== OperationStage.QUALITY) return false;
    if (activeTab === "PENDING" && op.stage !== OperationStage.OPERATION) return false;

    // 2. Team Type Filter
    if (selectedTeamType !== "ALL" && op.teamType !== selectedTeamType) return false;

    // 3. Search Query
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const match =
        op.operationNumber.toLowerCase().includes(q) ||
        op.dealNumber.toLowerCase().includes(q) ||
        op.companyName.toLowerCase().includes(q) ||
        op.clientName.toLowerCase().includes(q) ||
        op.clientPhone.includes(q) ||
        op.serviceName.toLowerCase().includes(q) ||
        op.internalStage.toLowerCase().includes(q) ||
        (op.assignedTlName && op.assignedTlName.toLowerCase().includes(q)) ||
        (op.assignedTmName && op.assignedTmName.toLowerCase().includes(q));
      if (!match) return false;
    }

    return true;
  });

  // Handle Workflow Save
  const handleWorkflowSubmit = async (data: OperationFormData) => {
    if (!selectedOperation) return;
    setIsSubmittingWorkflow(true);
    try {
      const res = await updateOperationWorkflowAction(selectedOperation.id, data);
      if (res.success) {
        setOperations((prev) =>
          prev.map((op) =>
            op.id === selectedOperation.id
              ? {
                  ...op,
                  assignedTlId: data.assignedTlId || null,
                  assignedTlName:
                    masterData.teamLeaders.find((tl) => tl.id === data.assignedTlId)?.name ||
                    op.assignedTlName,
                  assignedTmId: data.assignedTmId || null,
                  assignedTmName:
                    masterData.teamMembers.find((tm) => tm.id === data.assignedTmId)?.name ||
                    op.assignedTmName,
                  internalStage: data.internalStage,
                  status: data.status,
                  dueDate: data.dueDate || null,
                  completionDate: data.completionDate || null,
                  workflowData: data.workflowData,
                }
              : op
          )
        );
        toast.success(`Operation ${selectedOperation.operationNumber} updated successfully!`);
        setIsFormOpen(false);
        setSelectedOperation(null);
      } else {
        toast.error(res.error || "Failed to update operation.");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred.");
    } finally {
      setIsSubmittingWorkflow(false);
    }
  };

  // Handle Send to Quality (with Automatic Parent Roll-Up feedback)
  const handleSendToQuality = async (operationId: string) => {
    setActionPendingId(operationId);
    try {
      const res = await sendOperationToQualityAction(operationId);
      if (res.success) {
        setOperations((prev) =>
          prev.map((op) =>
            op.id === operationId
              ? {
                  ...op,
                  stage: OperationStage.QUALITY,
                  internalStage: "Completed — Ready for Quality Audit",
                }
              : op
          )
        );

        if (res.data?.rolledUpToParent) {
          toast.success(
            "Operation submitted to Quality! All service operations completed — Parent Deal automatically rolled up to Quality Review!",
            { duration: 6000 }
          );
        } else {
          toast.success("Operation file submitted to Quality Audit!");
        }
      } else {
        toast.error(res.error || "Failed to submit to quality.");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred.");
    } finally {
      setActionPendingId(null);
    }
  };

  // Handle Quality Audit
  const handleQualityAuditSubmit = async (data: QualityAuditFormData) => {
    if (!auditTarget) return;
    setIsSubmittingAudit(true);
    try {
      const res = await qualityAuditOperationAction(auditTarget.id, data);
      if (res.success) {
        if (data.decision === "APPROVE") {
          setOperations((prev) =>
            prev.map((op) =>
              op.id === auditTarget.id
                ? {
                    ...op,
                    qualityScore: data.qualityScore,
                    qualityFeedback: data.qualityFeedback,
                    status: "COMPLETED",
                  }
                : op
            )
          );
          toast.success(`Quality Audit Passed (Score: ${data.qualityScore}/100) for ${auditTarget.operationNumber}!`);
        } else {
          setOperations((prev) =>
            prev.map((op) =>
              op.id === auditTarget.id
                ? {
                    ...op,
                    stage: OperationStage.OPERATION,
                    internalStage: "Correction / Revision Required",
                    status: "REJECTED",
                    qualityScore: data.qualityScore,
                    qualityFeedback: data.qualityFeedback,
                  }
                : op
            )
          );
          toast.warning(
            `Operation ${auditTarget.operationNumber} returned to Operations TM for revisions.`
          );
        }
        setIsAuditModalOpen(false);
        setAuditTarget(null);
      } else {
        toast.error(res.error || "Failed to record quality audit.");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred.");
    } finally {
      setIsSubmittingAudit(false);
    }
  };

  const bulkColumns: BulkUploadColumnDef[] = [
    { key: "dealId", header: "Parent Deal ID", required: true },
    { key: "serviceName", header: "Service Name", required: true },
    { key: "teamType", header: "Team Type", required: false },
    { key: "internalStage", header: "Internal Stage", required: false },
  ];

  const sampleBulkData = [
    {
      dealId: "cm...deal_id",
      serviceName: "Private Limited Company Incorporation",
      teamType: "Team Incorporation",
      internalStage: "Initiation & KYC Intake",
    },
    {
      dealId: "cm...deal_id",
      serviceName: "Pitch Deck & Financial Modeling",
      teamType: "Team Funding",
      internalStage: "Pitch Deck & Executive Summary Review",
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white/70 backdrop-blur-md border-slate-200/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Total Operations
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalCount}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Auto-spawned service child records</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <GitBranch className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-md border-slate-200/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Pending Execution
              </p>
              <h3 className="text-2xl font-bold text-[#F0944D] mt-1">{pendingOperationsCount}</h3>
              <p className="text-[11px] text-[#F0944D] font-medium mt-0.5">Stage: Operations TM / TL</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-[#F0944D]/20 flex items-center justify-center text-[#F0944D]">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-md border-slate-200/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                In Quality Review
              </p>
              <h3 className="text-2xl font-bold text-purple-700 mt-1">{qualityReviewCount}</h3>
              <p className="text-[11px] text-purple-600 font-medium mt-0.5">Stage: Quality Audit Desk</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
              <Award className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-md border-slate-200/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Audit Completed
              </p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">{completedApprovedCount}</h3>
              <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Verified & certified files</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. DYNAMIC WORKFLOW TABS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "ALL"
                ? "bg-slate-900 text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            All Files ({totalCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("COMPLETED")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "COMPLETED"
                ? "bg-purple-100 text-purple-900 border border-purple-300 shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Completed Files (Stage = Quality) ({qualityReviewCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("PENDING")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "PENDING"
                ? "bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Pending Files (Stage ≠ Quality) ({pendingOperationsCount})
          </button>
        </div>

        {/* Bulk Upload Button */}
        {(isOperationHod || canManageAll) && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsBulkOpen(true)}
            className="h-8 text-xs font-semibold text-slate-700 hover:bg-slate-100 gap-1.5 shrink-0"
          >
            <UploadCloud className="h-3.5 w-3.5 text-slate-500" />
            Bulk Import CSV
          </Button>
        )}
      </div>

      {/* 3. FILTERS & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white/60 backdrop-blur-md p-3 rounded-2xl border border-slate-200/80">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search operation #, deal, company, client, TM..."
            className="pl-9 h-9 text-xs bg-white/80"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          <select
            value={selectedTeamType}
            onChange={(e) => setSelectedTeamType(e.target.value)}
            className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-[#F0944D]/50 focus:border-[#F0944D]"
          >
            <option value="ALL">All Team Departments</option>
            {TEAM_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4. OPERATIONS DATA TABLE */}
      <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Operation #</th>
                <th className="py-3 px-4">Parent Deal & Company</th>
                <th className="py-3 px-4">Service & Team Type</th>
                <th className="py-3 px-4">Stage</th>
                <th className="py-3 px-4">Internal Stage</th>
                <th className="py-3 px-4">Assigned TL & TM</th>
                <th className="py-3 px-4">Status & Score</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOperations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <GitBranch className="h-8 w-8 text-slate-300" />
                      <p className="font-semibold text-slate-600">No operations found</p>
                      <p className="text-xs text-slate-400">
                        {search
                          ? "Try adjusting your search criteria"
                          : "Commercial deals handed to Operations will auto-spawn here."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOperations.map((op) => {
                  const isPendingAction = actionPendingId === op.id;

                  return (
                    <tr
                      key={op.id}
                      className="hover:bg-slate-50/60 transition-colors group"
                    >
                      {/* Operation Number */}
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-900 flex items-center gap-1.5">
                          <GitBranch className="h-3.5 w-3.5 text-[#F0944D]" />
                          {op.operationNumber}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {new Date(op.createdAt).toLocaleDateString("en-IN")}
                        </span>
                      </td>

                      {/* Parent Deal & Company */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[150px]">{op.companyName || "N/A"}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          Deal: {op.dealNumber}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                          {op.clientName} ({op.clientPhone})
                        </div>
                      </td>

                      {/* Service & Team Type */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 truncate max-w-[180px]">
                          {op.serviceName}
                        </div>
                        <Badge
                          variant="outline"
                          className="bg-amber-50 text-amber-800 border-amber-300 text-[10px] font-bold mt-1"
                        >
                          {op.teamType}
                        </Badge>
                      </td>

                      {/* Stage (OPERATION vs QUALITY) */}
                      <td className="py-3 px-4">
                        {op.stage === OperationStage.QUALITY ? (
                          <Badge
                            variant="outline"
                            className="bg-purple-50 text-purple-800 border-purple-300 text-[10px] font-bold flex items-center gap-1 w-fit"
                          >
                            <Award className="h-3 w-3" />
                            Quality Stage
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-sky-50 text-sky-800 border-sky-300 text-[10px] font-bold flex items-center gap-1 w-fit"
                          >
                            <Clock className="h-3 w-3" />
                            Operation Stage
                          </Badge>
                        )}
                      </td>

                      {/* Internal Sub-Stage */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-700 max-w-[160px] truncate" title={op.internalStage}>
                          {op.internalStage}
                        </div>
                      </td>

                      {/* Assigned TL & TM */}
                      <td className="py-3 px-4">
                        <div className="text-[11px] text-slate-700 flex items-center gap-1">
                          <span className="text-slate-400 font-medium">TL:</span>
                          <span className="font-semibold">{op.assignedTlName || "Unassigned"}</span>
                        </div>
                        <div className="text-[11px] text-slate-700 flex items-center gap-1 mt-0.5">
                          <span className="text-slate-400 font-medium">TM:</span>
                          <span className="font-semibold">{op.assignedTmName || "Unassigned"}</span>
                        </div>
                      </td>

                      {/* Status & Score */}
                      <td className="py-3 px-4">
                        <div>
                          {op.status === "COMPLETED" ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300">
                              Completed
                            </Badge>
                          ) : op.status === "REJECTED" ? (
                            <Badge variant="outline" className="bg-rose-50 text-rose-800 border-rose-300">
                              Revision Needed
                            </Badge>
                          ) : op.status === "ON_HOLD" ? (
                            <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300">
                              On Hold
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-sky-50 text-sky-800 border-sky-300">
                              In Progress
                            </Badge>
                          )}
                        </div>

                        {op.qualityScore !== null && (
                          <div className="text-[10px] font-bold text-purple-700 mt-1 flex items-center gap-1">
                            <Award className="h-3 w-3" />
                            Score: {op.qualityScore}/100
                          </div>
                        )}
                      </td>

                      {/* Due Date */}
                      <td className="py-3 px-4 text-slate-600 text-[11px]">
                        {op.dueDate ? new Date(op.dueDate).toLocaleDateString("en-IN") : "—"}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* TM / TL Action: Send to Quality */}
                          {op.stage === OperationStage.OPERATION && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isPendingAction}
                              onClick={() => handleSendToQuality(op.id)}
                              className="h-7 text-[11px] font-semibold text-purple-700 border-purple-300 hover:bg-purple-50 gap-1 shadow-2xs"
                              title="Submit Operation File to Quality Audit"
                            >
                              {isPendingAction ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Award className="h-3 w-3" />
                              )}
                              Send to Quality
                            </Button>
                          )}

                          {/* Quality Department Action: Quality Audit / Grade */}
                          {(isQualityUser || canManageAll) && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setAuditTarget(op);
                                setIsAuditModalOpen(true);
                              }}
                              className="h-7 text-[11px] font-semibold bg-purple-600 hover:bg-purple-700 text-white gap-1 shadow-xs"
                              title="Audit compliance and score operation file"
                            >
                              <ShieldCheck className="h-3 w-3" />
                              Audit File
                            </Button>
                          )}

                          {/* View Operation Details */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewOperation(op)}
                            className="h-7 w-7 text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                            title="View Operation Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>

                          {/* Edit / Manage Workflow Modal */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedOperation(op);
                              setIsFormOpen(true);
                            }}
                            className="h-7 w-7 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                            title="Edit Assignment & Stage"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. MODALS */}
      <OperationDetailModal
        open={Boolean(viewOperation)}
        onOpenChange={(open) => !open && setViewOperation(null)}
        operation={viewOperation}
        onEdit={() => {
          if (viewOperation) {
            setSelectedOperation(viewOperation);
            setIsFormOpen(true);
          }
        }}
        canEdit={true}
      />

      <OperationFormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        operation={selectedOperation}
        masterData={masterData}
        onSubmit={handleWorkflowSubmit}
        onSendToQuality={handleSendToQuality}
        isSubmitting={isSubmittingWorkflow}
      />

      <QualityAuditModal
        open={isAuditModalOpen}
        onOpenChange={setIsAuditModalOpen}
        operation={auditTarget}
        onAuditSubmit={handleQualityAuditSubmit}
        isSubmitting={isSubmittingAudit}
      />

      <BulkUploadModal
        open={isBulkOpen}
        onOpenChange={setIsBulkOpen}
        title="Bulk Import Internal Operations"
        description="Upload CSV spreadsheet to batch import service child operations mapped to deals."
        sampleFileName="operations_template.csv"
        columns={bulkColumns}
        sampleData={sampleBulkData}
        schema={bulkOperationSchema as any}
        onUpload={bulkUploadOperationsAction as any}
        onSuccess={() => {
          toast.success("Operations batch import completed!");
        }}
      />
    </div>
  );
}
