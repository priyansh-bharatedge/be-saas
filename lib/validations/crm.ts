import { z } from "zod";
import { LeadStatus } from "@prisma/client";

// ==========================================
// 1. SERVICE VALIDATION SCHEMA
// ==========================================
export const serviceSchema = z.object({
  name: z.string().trim().min(2, "Service name must be at least 2 characters").max(100),
  code: z.string().trim().max(30).optional().or(z.literal("")),
  category: z.string().trim().min(1, "Please select a category"),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  minimumPrice: z.coerce.number().min(0, "Minimum price cannot be negative"),
  outsourcePrice: z.coerce.number().min(0, "Outsource price cannot be negative"),
  sacCode: z.string().trim().max(20).optional().or(z.literal("")),
  defaultGstRate: z.coerce
    .number()
    .min(0, "GST rate cannot be negative")
    .max(100, "GST rate cannot exceed 100%"),
  isActive: z.boolean(),
});

export type ServiceFormData = z.infer<typeof serviceSchema>;

// ==========================================
// 2. COMPANY VALIDATION SCHEMA
// ==========================================
export const companySchema = z.object({
  name: z.string().trim().min(2, "Company name must be at least 2 characters").max(150),
  companyType: z.string().trim().optional().or(z.literal("")),
  incorporatedDate: z.string().optional().or(z.literal("")),
  industry: z.string().trim().optional().or(z.literal("")),
  website: z.string().trim().optional().or(z.literal("")),
  gstNumber: z.string().trim().max(15).optional().or(z.literal("")),
  panNumber: z.string().trim().max(10).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  city: z.string().trim().max(60).optional().or(z.literal("")),
  state: z.string().trim().max(60).optional().or(z.literal("")),
  country: z.string().trim(),
});

export type CompanyFormData = z.infer<typeof companySchema>;

// ==========================================
// 3. CLIENT VALIDATION SCHEMA
// ==========================================
export const clientSchema = z.object({
  name: z.string().trim().min(2, "Client name must be at least 2 characters").max(100),
  phone: z
    .string()
    .trim()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number cannot exceed 15 characters")
    .regex(/^[0-9+() -]+$/, "Phone contains invalid characters"),
  alternatePhone: z.string().trim().max(15).optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .email("Please provide a valid email address")
    .optional()
    .or(z.literal("")),
  gender: z.string().trim().optional().or(z.literal("")),
  companyName: z.string().trim().optional().or(z.literal("")),
  companyId: z.string().trim().optional().or(z.literal("")),
  gstNumber: z.string().trim().max(15).optional().or(z.literal("")),
  panNumber: z.string().trim().max(10).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  city: z.string().trim().max(60).optional().or(z.literal("")),
  state: z.string().trim().max(60).optional().or(z.literal("")),
  country: z.string().trim(),
  assignedEmployeeId: z.string().trim().optional().or(z.literal("")),
});

export type ClientFormData = z.infer<typeof clientSchema>;

// ==========================================
// 4. LEAD VALIDATION SCHEMA
// ==========================================
export const leadSchema = z.object({
  name: z.string().trim().min(2, "Lead contact name must be at least 2 characters").max(100),
  phone: z
    .string()
    .trim()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number cannot exceed 15 characters")
    .regex(/^[0-9+() -]+$/, "Phone contains invalid characters"),
  email: z
    .string()
    .trim()
    .email("Please provide a valid email address")
    .optional()
    .or(z.literal("")),
  companyName: z.string().trim().optional().or(z.literal("")),
  source: z.string().trim().min(1, "Please select lead source"),
  status: z.nativeEnum(LeadStatus),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  estimatedBudget: z.coerce.number().min(0, "Budget cannot be negative"),
  assignedEmployeeId: z.string().trim().optional().or(z.literal("")),
});

export type LeadFormData = z.infer<typeof leadSchema>;
