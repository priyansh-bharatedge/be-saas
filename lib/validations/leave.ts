import { z } from "zod";
import { LeaveType, ApprovalStatus } from "@prisma/client";

export const applyLeaveSchema = z.object({
  leaveType: z.nativeEnum(LeaveType),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  reason: z.string().min(5, "Reason must be at least 5 characters long").max(500, "Reason is too long"),
});

export type ApplyLeaveInput = z.infer<typeof applyLeaveSchema>;

export const reviewLeaveSchema = z.object({
  requestId: z.string().uuid("Invalid request ID"),
  status: z.enum([ApprovalStatus.APPROVED, ApprovalStatus.REJECTED]),
  comments: z.string().optional(),
});

export type ReviewLeaveInput = z.infer<typeof reviewLeaveSchema>;
