import { z } from "zod";
import { TicketPriority, TicketStatus } from "@prisma/client";

export const ticketCreateSchema = z.object({
  subject: z.string().min(3, "Subject must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  priority: z.nativeEnum(TicketPriority).default(TicketPriority.MEDIUM),
  customerName: z.string().min(2, "Customer name is required"),
  customerEmail: z.string().email("Valid email is required"),
  customerPhone: z.string().optional().nullable(),
  source: z.string().default("PORTAL"),
  assignedEmployeeId: z.string().optional().nullable(),
});

export const ticketStatusUpdateSchema = z.object({
  ticketId: z.string().uuid("Invalid ticket ID"),
  status: z.nativeEnum(TicketStatus),
  remarks: z.string().optional().nullable(),
});

export const qualityAuditSchema = z.object({
  ticketId: z.string().uuid("Invalid ticket ID"),
  qualityScore: z.number().int().min(1).max(100, "Quality score must be between 1 and 100"),
  complianceStatus: z.string().min(2, "Compliance status is required"),
  feedbackComments: z.string().min(5, "Feedback comments must be at least 5 characters"),
  escalatedToHOD: z.boolean().default(false),
});

export type TicketCreateData = z.infer<typeof ticketCreateSchema>;
export type TicketStatusUpdateData = z.infer<typeof ticketStatusUpdateSchema>;
export type QualityAuditData = z.infer<typeof qualityAuditSchema>;
