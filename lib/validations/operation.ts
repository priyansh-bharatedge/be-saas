import { z } from "zod";
import { OperationStage } from "@prisma/client";

export const TEAM_TYPES = [
  "Team Incorporation",
  "Team Funding",
  "Team Compliance",
  "Team Digital Marketing",
] as const;

export type TeamType = (typeof TEAM_TYPES)[number];

export const INTERNAL_STAGES_BY_TEAM: Record<string, string[]> = {
  "Team Incorporation": [
    "Initiation & KYC Intake",
    "DIN & Digital Signature (DSC) Allocation",
    "Name Reservation (RUN / SPICe+ Part A)",
    "Document Drafting (MOA / AOA / INC-9)",
    "Filing on MCA Portal (SPICe+ Part B)",
    "Certificate of Incorporation (COI) Issued",
    "PAN, TAN & Bank Account Setup",
    "Completed",
  ],
  "Team Funding": [
    "Pitch Deck & Executive Summary Review",
    "Financial Projections & Valuation Modeling",
    "Investor Long-List & Outreach Campaign",
    "Due Diligence Data Room Setup",
    "Term Sheet Negotiation",
    "Shareholder Agreement (SHA) Finalization",
    "Capital Disbursement & ROC Filing",
    "Completed",
  ],
  "Team Compliance": [
    "Document & Statutory Register Audit",
    "ROC Annual Filing (AOC-4 / MGT-7)",
    "GST Monthly / Quarterly Reconciliations",
    "Income Tax & Audit Return Prep",
    "Director KYC (DIR-3 KYC) Completion",
    "Statutory Clearances Handed Over",
    "Completed",
  ],
  "Team Digital Marketing": [
    "Brand Identity & Positioning Discovery",
    "Website Architecture & Wireframing",
    "SEO & Content Strategy Formulation",
    "Meta & Google Ads Campaign Setup",
    "Conversion Rate Optimization (CRO)",
    "Performance Reporting & Handover",
    "Completed",
  ],
};

export const DEFAULT_STAGES = [
  "Initiation",
  "Document Collection",
  "Drafting & Processing",
  "Filing & Verification",
  "Government Review",
  "Completed",
];

export const operationFormSchema = z.object({
  assignedTlId: z.string().optional().or(z.literal("")),
  assignedTmId: z.string().optional().or(z.literal("")),
  internalStage: z.string().min(1, "Internal stage is required"),
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
  companyName: string;
  bookingDate: string;

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

  workflowData: Record<string, any>;
  qualityScore: number | null;
  qualityFeedback: string | null;
  dueDate: string | null;
  completionDate: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface OperationMasterData {
  teamLeaders: { id: string; name: string; department: string }[];
  teamMembers: { id: string; name: string; department: string; reportingManagerId: string | null }[];
  qualityAuditors: { id: string; name: string; department: string }[];
}

export const bulkOperationSchema = z.object({
  dealId: z.string().min(1, "Deal ID is required"),
  serviceName: z.string().min(1, "Service name is required"),
  teamType: z.string().default("Team Incorporation"),
  internalStage: z.string().default("Initiation"),
});

export type BulkOperationRow = z.infer<typeof bulkOperationSchema>;
