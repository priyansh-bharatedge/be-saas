import { z } from "zod";
import { PaymentType, PaymentVerificationStatus, SalaryEntity } from "@prisma/client";

export const quickClientSchema = z.object({
  name: z.string().trim().min(2, "Client name is required"),
  phone: z
    .string()
    .trim()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number cannot exceed 15 digits"),
  email: z.string().trim().email("Valid email required").optional().or(z.literal("")),
});

export type QuickClientFormData = z.infer<typeof quickClientSchema>;

export const paymentRecordSchema = z.object({
  clientId: z.string().min(1, "Please select or create a client"),
  clientName: z.string().optional().or(z.literal("")),
  clientPhone: z.string().optional().or(z.literal("")),
  clientEmail: z.string().optional().or(z.literal("")),

  dealId: z.string().optional().or(z.literal("")),

  amount: z.coerce
    .number()
    .positive("Received amount must be greater than 0")
    .min(1, "Amount must be at least ₹1"),

  bankType: z.nativeEnum(SalaryEntity),
  paymentType: z.nativeEnum(PaymentType),
  paymentMode: z.string().default("BANK_TRANSFER"),
  transactionRef: z.string().trim().optional().or(z.literal("")),
  screenshotUrl: z.string().trim().optional().or(z.literal("")),
  screenshotKey: z.string().trim().optional().or(z.literal("")),
  paymentDate: z.string().min(1, "Payment date is required"),
  remarks: z.string().trim().optional().or(z.literal("")),
});

export type PaymentRecordFormData = z.infer<typeof paymentRecordSchema>;

export interface SerializedPaymentRecord {
  id: string;
  receiptNumber: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string | null;
  dealId: string | null;
  dealNumber?: string | null;
  dealTitle?: string | null;
  amount: number;
  bankType: SalaryEntity;
  paymentType: PaymentType;
  status: PaymentVerificationStatus;
  paymentMode: string;
  transactionRef: string | null;
  screenshotUrl: string | null;
  screenshotKey: string | null;
  paymentDate: string;
  remarks: string | null;
  isConvertedToDeal: boolean;
  verifiedById: string | null;
  verifiedByName?: string | null;
  verifiedAt: string | null;
  recordedById: string | null;
  recordedByName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentMasterData {
  clients: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    companyName: string | null;
  }[];
  deals: {
    id: string;
    dealNumber: string | null;
    title: string;
    clientId: string | null;
    clientName?: string | null;
    totalValue: number;
    amountReceived: number;
    amountPending: number;
  }[];
}
