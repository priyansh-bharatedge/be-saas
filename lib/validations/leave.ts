import { z } from "zod";
import { ApprovalStatus } from "@prisma/client";

// Strictly Supported Leave Types in HRMS Suite
export const ValidLeaveTypes = ["PAID_LEAVE", "SHORT_LEAVE"] as const;
export type ValidLeaveType = (typeof ValidLeaveTypes)[number];

export const applyLeaveSchema = z
  .object({
    leaveType: z.enum(["PAID_LEAVE", "SHORT_LEAVE"], {
      message: "Please select a leave category (Paid Leave or Short Leave)",
    }),
    // Paid Leave fields
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    // Short Leave fields (max 1.5 hrs per request, max 3.0 hrs/month, max 2 requests/month)
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    reason: z
      .string()
      .min(5, "Reason must be at least 5 characters long")
      .max(500, "Reason cannot exceed 500 characters"),
  })
  .superRefine((data, ctx) => {
    if (data.leaveType === "SHORT_LEAVE") {
      if (!data.startTime || !data.endTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["startTime"],
          message: "Start time and end time are mandatory for Short Leave",
        });
        return;
      }

      // Validate duration format "HH:MM"
      const [startH, startM] = data.startTime.split(":").map(Number);
      const [endH, endM] = data.endTime.split(":").map(Number);

      if (
        isNaN(startH) ||
        isNaN(startM) ||
        isNaN(endH) ||
        isNaN(endM)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["startTime"],
          message: "Invalid time format (expected HH:MM)",
        });
        return;
      }

      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      if (endMinutes <= startMinutes) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["endTime"],
          message: "End time must be later than start time",
        });
        return;
      }

      const durationMinutes = endMinutes - startMinutes;
      const durationHours = durationMinutes / 60;

      // Strict Rule: maximum 1.5 hours per single short leave request
      if (durationHours > 1.5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["endTime"],
          message: `Short leave cannot exceed 1.5 hours per request (requested ${durationHours.toFixed(1)} hrs)`,
        });
      }
    } else {
      // Paid leave: validate date order
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      if (end < start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["endDate"],
          message: "End date cannot be prior to start date",
        });
      }
    }
  });

export type ApplyLeaveInput = z.infer<typeof applyLeaveSchema>;

export const reviewLeaveSchema = z.object({
  requestId: z.string().uuid("Invalid request ID"),
  status: z.enum([ApprovalStatus.APPROVED, ApprovalStatus.REJECTED]),
  comments: z.string().optional(),
});

export type ReviewLeaveInput = z.infer<typeof reviewLeaveSchema>;

// HR Admin Balance Adjustment Schema
export const adjustLeaveBalanceSchema = z.object({
  employeeId: z.string().uuid("Invalid employee ID"),
  leaveType: z.enum(["PAID_LEAVE", "SHORT_LEAVE"]),
  newAllocatedDays: z.number().min(0, "Allocated days cannot be negative").optional(),
  newRemainingDays: z.number().min(0, "Remaining days cannot be negative").optional(),
  newMonthlyShortLeaves: z.number().min(0).max(2).optional(),
  newMonthlyShortHours: z.number().min(0).max(3.0).optional(),
  reason: z.string().min(5, "A descriptive audit reason is mandatory (min 5 characters)"),
});

export type AdjustLeaveBalanceInput = z.infer<typeof adjustLeaveBalanceSchema>;
