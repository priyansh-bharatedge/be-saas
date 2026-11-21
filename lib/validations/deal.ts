import { z } from "zod";
import { DealStage, LegalStatus, OperationStage } from "@prisma/client";

export const dealServiceItemSchema = z.object({
  id: z.string().optional(),
  serviceId: z.string().optional().or(z.literal("")),
  serviceName: z.string().trim().min(2, "Service name is required"),
  minimumPrice: z.coerce.number().min(0).default(0),
  outsourceCost: z.coerce.number().min(0).default(0),
  totalAmount: z.coerce.number().min(0, "Total amount cannot be negative"),
  withoutGstAmount: z.coerce.number().min(0).default(0),
  gstAmount: z.coerce.number().min(0).default(0),
  amountReceived: z.coerce.number().min(0).default(0),
  receivedWithoutGst: z.coerce.number().min(0).default(0),
  receivedGst: z.coerce.number().min(0).default(0),
  amountPending: z.coerce.number().min(0).default(0),
  remarks: z.string().trim().optional().or(z.literal("")),

  // Legal fields per service row
  teamType: z.string().default("Team Incorporation"),
  legalStatus: z.nativeEnum(LegalStatus).default(LegalStatus.PENDING),
  legalDocType: z.string().optional().or(z.literal("")),
  agreementTerms: z.string().optional().or(z.literal("")),
  legalRemarks: z.string().optional().or(z.literal("")),
});

export type DealServiceItemFormData = z.infer<typeof dealServiceItemSchema>;

export const dealDocumentItemSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1, "Document title required"),
  docType: z.string().default("CLIENT_KYC"),
  fileUrl: z.string().min(1, "File URL required"),
  fileKey: z.string().optional().or(z.literal("")),
});

export type DealDocumentFormData = z.infer<typeof dealDocumentItemSchema>;

export const dealFormSchema = z.object({
  // Basic Info
  title: z.string().trim().min(2, "Deal title is required"),
  bookingDate: z.string().min(1, "Booking date is required"),
  assignedEmployeeId: z.string().min(1, "Primary BDM is required"),
  partnerBdmId: z.string().optional().or(z.literal("")),
  panNumber: z
    .string()
    .trim()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format (e.g. ABCDE1234F)")
    .optional()
    .or(z.literal("")),
  stage: z.nativeEnum(DealStage).default(DealStage.LEAD),

  // Client Section
  clientId: z.string().min(1, "Client is required"),
  clientName: z.string().trim().min(2, "Client name is required"),
  clientPhone: z.string().trim().min(10, "Client phone must be at least 10 digits"),
  clientEmail: z.string().trim().email("Valid email required").optional().or(z.literal("")),
  clientAlternatePhone: z.string().trim().optional().or(z.literal("")),
  clientGender: z.string().trim().optional().or(z.literal("")),
  clientState: z.string().trim().optional().or(z.literal("")),
  clientCity: z.string().trim().optional().or(z.literal("")),
  clientAddress: z.string().trim().optional().or(z.literal("")),

  // Company Section
  companyName: z.string().trim().min(2, "Company / Entity name is required"),
  companyId: z.string().optional().or(z.literal("")),
  companyType: z.string().trim().optional().or(z.literal("")),
  companyIncorporatedDate: z.string().optional().or(z.literal("")),
  companyAddress: z.string().trim().optional().or(z.literal("")),

  // Services Subform
  services: z.array(dealServiceItemSchema).min(1, "At least one service line-item is required"),

  // Financial Totals
  subTotal: z.coerce.number().min(0).default(0),
  gstRate: z.coerce.number().default(18),
  gstAmount: z.coerce.number().min(0).default(0),
  totalValue: z.coerce.number().min(0).default(0),
  amountReceived: z.coerce.number().min(0).default(0),
  amountPending: z.coerce.number().min(0).default(0),

  // Attachments & Screenshot
  paymentScreenshotUrl: z.string().trim().optional().or(z.literal("")),
  paymentScreenshotKey: z.string().trim().optional().or(z.literal("")),
  documents: z.array(dealDocumentItemSchema).default([]),

  // Legal Tracking & Workflow Fields
  agreementTerms: z.string().trim().optional().or(z.literal("")),
  legalRemarks: z.string().trim().optional().or(z.literal("")),
  legalDocSenderName: z.string().trim().optional().or(z.literal("")),
  legalDocSenderDate: z.string().optional().or(z.literal("")),
  legalDocReceiverName: z.string().trim().optional().or(z.literal("")),
  legalDocReceiverDate: z.string().optional().or(z.literal("")),

  accountsStatus: z.string().default("DRAFT"),
  isQualityPassed: z.boolean().default(false),
  qualityRemarks: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
});

export type DealFormData = z.infer<typeof dealFormSchema>;

export interface SyncedOperationStatus {
  id: string;
  operationNumber: string;
  stage: OperationStage;
  internalStage: string;
  status: string;
  assignedTlName: string | null;
  assignedTmName: string | null;
  updatedAt: string;
}

export interface SerializedDealService {
  id: string;
  dealId: string;
  serviceId: string | null;
  serviceName: string;
  minimumPrice: number;
  outsourceCost: number;
  totalPrice: number;
  withoutGstAmount: number;
  gstAmount: number;
  amountReceived: number;
  receivedGst: number;
  receivedWithoutGst: number;
  amountPending: number;
  remarks: string | null;

  // Legal Subform
  teamType: string;
  legalStatus: LegalStatus;
  legalDocType: string | null;
  agreementTerms: string | null;
  legalRemarks: string | null;

  // Live Operation Child Sync
  operation?: SyncedOperationStatus | null;
}

export interface SerializedDealDocument {
  id: string;
  dealId: string;
  title: string;
  docType: string;
  fileUrl: string;
  fileKey: string;
  uploadedByName?: string | null;
  createdAt: string;
}

export interface SerializedDeal {
  id: string;
  dealNumber: string;
  title: string;
  bookingDate: string;
  value: number;
  totalValue: number;
  subTotal: number;
  gstAmount: number;
  amountReceived: number;
  amountPending: number;
  currency: string;
  stage: DealStage;
  accountsStatus: string;
  internalLegalStatus: LegalStatus;
  panNumber: string | null;

  clientId: string | null;
  clientName: string;
  clientPhone: string;
  clientEmail: string | null;
  clientAlternatePhone: string | null;
  clientGender: string | null;
  clientState: string | null;
  clientCity: string | null;
  clientAddress: string | null;

  companyId: string | null;
  companyName: string;
  companyType: string | null;
  companyIncorporatedDate: string | null;
  companyAddress: string | null;

  assignedEmployeeId: string | null;
  assignedEmployeeName?: string | null;
  partnerBdmId: string | null;
  partnerBdmName?: string | null;

  paymentScreenshotUrl: string | null;
  paymentScreenshotKey: string | null;

  // Legal Tracking Fields
  agreementTerms: string | null;
  legalRemarks: string | null;
  legalDocSenderName: string | null;
  legalDocSenderDate: string | null;
  legalDocReceiverName: string | null;
  legalDocReceiverDate: string | null;

  isQualityPassed: boolean;
  qualityRemarks: string | null;
  notes: string | null;

  services: SerializedDealService[];
  documents: SerializedDealDocument[];

  createdAt: string;
  updatedAt: string;
}

export interface DealMasterData {
  services: {
    id: string;
    name: string;
    minimumPrice: number;
    outsourcePrice: number;
    category: string | null;
    defaultGstRate: number;
  }[];
  clients: {
    id: string;
    name: string;
    phone: string;
    alternatePhone: string | null;
    email: string | null;
    gender: string | null;
    state: string | null;
    city: string | null;
    address: string | null;
    companyId: string | null;
    companyName: string | null;
  }[];
  companies: {
    id: string;
    name: string;
    companyType: string | null;
    incorporatedDate: string | null;
    address: string | null;
  }[];
  employees: {
    id: string;
    name: string;
    department: string;
    systemRole: string;
  }[];
}
