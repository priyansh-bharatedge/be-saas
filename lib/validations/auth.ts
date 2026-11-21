import { z } from "zod";

export const emailSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email address is required")
    .email("Please enter a valid enterprise email address (e.g. name@bharatedge.com)")
    .toLowerCase(),
});

export const passwordLoginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email address is required")
    .email("Please enter a valid enterprise email address")
    .toLowerCase(),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
});

export const otpRequestSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email address is required")
    .email("Please enter a valid enterprise email address")
    .toLowerCase(),
});

export const otpVerifySchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email address is required")
    .email("Please enter a valid enterprise email address")
    .toLowerCase(),
  otp: z
    .string()
    .trim()
    .length(6, "OTP must be exactly 6 digits")
    .regex(/^\d{6}$/, "OTP must contain only numerical digits"),
});

export type EmailFormData = z.infer<typeof emailSchema>;
export type PasswordLoginFormData = z.infer<typeof passwordLoginSchema>;
export type OtpVerifyFormData = z.infer<typeof otpVerifySchema>;
