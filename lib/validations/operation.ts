import { z } from "zod";
import { OperationStage } from "@prisma/client";

export const TEAM_TYPES = [
  "Incorporation",
  "Compliance",
  "Funding",
  "Certification",
  "Digital Marketing",
] as const;

export type TeamType = (typeof TEAM_TYPES)[number];

export function normalizeTeamType(teamType?: string | null): TeamType {
  if (!teamType) return "Incorporation";
  const t = teamType.trim();
  if (t.toLowerCase().includes("incorporation")) return "Incorporation";
  if (t.toLowerCase().includes("compliance")) return "Compliance";
  if (t.toLowerCase().includes("funding")) return "Funding";
  if (t.toLowerCase().includes("certif")) return "Certification";
  if (t.toLowerCase().includes("marketing") || t.toLowerCase().includes("digital")) return "Digital Marketing";
  return "Incorporation";
}

export const STANDARD_STATUSES = [
  "In-process",
  "In-review",
  "Pending",
  "Filed",
  "Approved",
  "Hold",
  "Refund",
  "Ineligible",
  "Transfer",
] as const;

export const RESUBMISSION_STATUSES = [
  "In-process",
  "In-review",
  "Pending",
  "Filed",
  "Approved",
  "Hold",
  "Refund",
  "Ineligible",
  "Transfer",
  "Rejected",
] as const;

export const OPERATION_STAGES = [
  "Doc Collection",
  "Name Application",
  "DSC Creation",
  "Final Filing",
  "Board Resolution",
  "Hold",
  "Refund",
  "Ineligible",
  "Incorporation Pending",
  "Transfer",
  "Closed Won",
] as const;

export const fileAttachmentSchema = z.object({
  url: z.string().min(1, "File URL is required"),
  name: z.string().min(1, "File name is required"),
  size: z.number().optional(),
  key: z.string().optional(),
  mimeType: z.string().optional(),
});

export type FileAttachment = z.infer<typeof fileAttachmentSchema>;

export const socialMediaPostSchema = z.object({
  id: z.string(),
  postDate: z.string().min(1, "Post date is required"),
  platform: z.enum(["Instagram", "LinkedIn", "Facebook", "YouTube", "X"]),
  postType: z.string().default("Static Post"),
  caption: z.string().default(""),
  assets: z.array(fileAttachmentSchema).default([]),
  assignedEmployeeId: z.string().optional().or(z.literal("")),
  status: z.enum(["Draft", "In-Review", "Approved", "Scheduled", "Published"]).default("Draft"),
});

export type SocialMediaPost = z.infer<typeof socialMediaPostSchema>;

export const operationFormSchema = z.object({
  assignedTlId: z.string().optional().or(z.literal("")),
  assignedTmId: z.string().optional().or(z.literal("")),
  caCs1Id: z.string().optional().or(z.literal("")),
  caCs2Id: z.string().optional().or(z.literal("")),
  internalStage: z.string().min(1, "Stage is required").default("Doc Collection"),
  status: z.string().default("IN_PROGRESS"),
  dueDate: z.string().optional().or(z.literal("")),
  completionDate: z.string().optional().or(z.literal("")),
  workflowData: z.record(z.string(), z.any()).default({}),
  qualityFeedback: z.string().trim().optional().or(z.literal("")),
});

export type OperationFormData = z.infer<typeof operationFormSchema>;

export const qualityAuditSchema = z.object({
  qualityScore: z.coerce.number().min(1, "Min score is 1").max(100, "Max score is 100"),
  qualityFeedback: z.string().trim().min(3, "Detailed quality audit feedback is required"),
  decision: z.enum(["APPROVE", "SEND_BACK"]),
});

export type QualityAuditFormData = z.infer<typeof qualityAuditSchema>;

export interface SerializedOperation {
  id: string;
  operationNumber: string;
  dealId: string;
  dealNumber: string;
  dealTitle: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string | null;
  companyName: string;
  companyType?: string | null;
  bookingDate: string;
  dealValue?: number;

  dealServiceId: string | null;
  serviceId: string | null;
  serviceName: string;
  teamType: string;

  stage: OperationStage;
  internalStage: string;
  status: string;

  assignedTlId: string | null;
  assignedTlName?: string | null;
  assignedTmId: string | null;
  assignedTmName?: string | null;
  caCs1Id: string | null;
  caCs1Name?: string | null;
  caCs2Id: string | null;
  caCs2Name?: string | null;
  assignedEmployeeIds: string[];

  workflowData: Record<string, any>;
  qualityScore: number | null;
  qualityFeedback: string | null;
  dueDate: string | null;
  completionDate: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface EmployeeLookupItem {
  id: string;
  name: string;
  department: string;
  designation: string;
}

export interface OperationMasterData {
  teamLeaders: { id: string; name: string; department: string }[];
  teamMembers: { id: string; name: string; department: string; reportingManagerId: string | null }[];
  qualityAuditors: { id: string; name: string; department: string }[];
  allEmployees: EmployeeLookupItem[];
  caCsList: EmployeeLookupItem[];
}

export const bulkOperationSchema = z.object({
  dealId: z.string().min(1, "Deal ID is required"),
  serviceName: z.string().min(1, "Service name is required"),
  teamType: z.string().default("Incorporation"),
  internalStage: z.string().default("Doc Collection"),
});

export type BulkOperationRow = z.infer<typeof bulkOperationSchema>;
