import { z } from "zod";
import { QuotationStatus } from "@prisma/client";

export const quotationServiceItemSchema = z.object({
  serviceId: z.string().optional().or(z.literal("")),
  serviceName: z.string().trim().min(2, "Service name is required"),
  totalAmount: z.coerce.number().min(0, "Total amount cannot be negative"),
  withoutGstAmount: z.coerce.number().min(0),
  gstAmount: z.coerce.number().min(0),
  remarks: z.string().trim().optional().or(z.literal("")),
});

export type QuotationServiceItemData = z.infer<typeof quotationServiceItemSchema>;

export const quotationFormSchema = z.object({
  // Client Section
  clientName: z.string().trim().min(2, "Client name is required"),
  clientPhone: z.string().trim().min(10, "Valid phone number is required"),
  clientEmail: z.string().trim().email("Valid email is required").optional().or(z.literal("")),
  clientAlternatePhone: z.string().trim().optional().or(z.literal("")),
  clientGender: z.string().trim().optional().or(z.literal("")),
  clientState: z.string().trim().optional().or(z.literal("")),
  clientCity: z.string().trim().optional().or(z.literal("")),
  clientAddress: z.string().trim().optional().or(z.literal("")),
  clientId: z.string().optional().or(z.literal("")),

  // Company Section
  companyName: z.string().trim().optional().or(z.literal("")),
  companyId: z.string().optional().or(z.literal("")),
  companyType: z.string().trim().optional().or(z.literal("")),
  companyIncorporatedDate: z.string().optional().or(z.literal("")),
  companyAddress: z.string().trim().optional().or(z.literal("")),

  // Services Subform
  services: z
    .array(quotationServiceItemSchema)
    .min(1, "At least one service line-item is required"),

  // Totals & Terms
  subTotal: z.coerce.number().min(0),
  discountAmount: z.coerce.number().min(0).default(0),
  gstRate: z.coerce.number().default(18),
  gstAmount: z.coerce.number().min(0),
  grandTotal: z.coerce.number().min(0),
  validUntil: z.string().optional().or(z.literal("")),
  terms: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
});

export type QuotationFormData = z.infer<typeof quotationFormSchema>;

export interface SerializedQuotationService {
  id: string;
  serviceId: string | null;
  serviceName: string;
  totalAmount: number;
  withoutGstAmount: number;
  gstAmount: number;
  remarks: string | null;
}

export interface SerializedQuotation {
  id: string;
  quotationNumber: string;
  clientName: string;
  clientPhone: string | null;
  clientEmail: string | null;
  clientAlternatePhone: string | null;
  clientGender: string | null;
  clientState: string | null;
  clientCity: string | null;
  clientAddress: string | null;
  clientId: string | null;

  companyName: string | null;
  companyId: string | null;
  companyType: string | null;
  companyIncorporatedDate: string | null;
  companyAddress: string | null;

  subTotal: number;
  discountAmount: number;
  gstRate: number;
  gstAmount: number;
  grandTotal: number;
  status: QuotationStatus;
  validUntil: string | null;
  terms: string | null;
  notes: string | null;
  pdfUrl: string | null;
  emailSentAt: string | null;
  preparedById: string | null;
  preparedByName?: string;
  services: SerializedQuotationService[];
  createdAt: string;
  updatedAt: string;
}

export interface QuotationMasterData {
  services: {
    id: string;
    name: string;
    category: string | null;
    minimumPrice: number;
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
}
