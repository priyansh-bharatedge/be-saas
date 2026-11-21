"use server";

import crypto from "crypto";
import { db } from "@/lib/db";
import { signIn, signOut } from "@/auth";
import { emailSchema, passwordLoginSchema, otpVerifySchema } from "@/lib/validations/auth";
import { sendOtpEmail } from "@/lib/mail";
import { AuthError } from "next-auth";

export interface ServerActionResult {
  success: boolean;
  error?: string;
  message?: string;
  cooldownRemaining?: number;
  redirectTo?: string;
}

/**
 * Generates a secure 6-digit OTP, stores it in PostgreSQL with a 5-minute expiry,
 * applies rate-limiting (60s cooldown), and dispatches a branded HTML email via Nodemailer.
 */
export async function requestOtpAction(emailInput: string): Promise<ServerActionResult> {
  try {
    const validated = emailSchema.parse({ email: emailInput });
    const email = validated.email;

    const employee = await db.employee.findUnique({
      where: { workEmail: email },
    });

    // Prevent email enumeration: return generic message if employee doesn't exist
    if (!employee) {
      return {
        success: false,
        error: "Invalid credentials or user not found",
      };
    }

    // Rate Limiting: 60-second cooldown between OTP requests
    if (employee.otpExpiry) {
      const remainingMs = employee.otpExpiry.getTime() - Date.now();
      const elapsedMs = 5 * 60 * 1000 - remainingMs;

      if (elapsedMs < 60 * 1000 && remainingMs > 0) {
        const waitSeconds = Math.max(1, Math.ceil((60 * 1000 - elapsedMs) / 1000));
        return {
          success: false,
          error: `Please wait ${waitSeconds} second${waitSeconds === 1 ? "" : "s"} before requesting a new OTP.`,
          cooldownRemaining: waitSeconds,
        };
      }
    }

    // Cryptographically secure 6-digit numeric OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    // Strict 5-minute expiration timestamp
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    // Database transaction: Atomic update clearing prior state and setting new OTP
    await db.employee.update({
      where: { id: employee.id },
      data: {
        otp,
        otpExpiry,
        otpAttempts: 0,
      },
    });

    // Dispatch branded email via Nodemailer
    const employeeFullName = `${employee.firstName} ${employee.lastName}`.trim() || "Enterprise Staff";
    const emailResult = await sendOtpEmail(employee.workEmail, otp, employeeFullName);

    if (!emailResult.success) {
      console.error("[OTP MAIL FAILED]:", emailResult.error);
      return {
        success: false,
        error: "Unable to deliver verification email. Please contact IT support.",
      };
    }

    console.log(`\n=======================================================`);
    console.log(` [ENTERPRISE OTP DISPATCHED VIA NODEMAILER]`);
    console.log(` Recipient:     ${employee.workEmail}`);
    console.log(` MessageId:     ${emailResult.messageId}`);
    console.log(` OTP Code:      ${otp}`);
    console.log(` Expiration:    5 minutes (${otpExpiry.toLocaleTimeString()})`);
    console.log(`=======================================================\n`);

    return {
      success: true,
      message: "Verification OTP sent to your enterprise email.",
    };
  } catch (err: unknown) {
    if (err instanceof Error) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "An unexpected error occurred generating OTP." };
  }
}

/**
 * NextAuth Password-based sign in
 */
export async function loginWithPasswordAction(
  emailInput: string,
  passwordInput: string
): Promise<ServerActionResult> {
  try {
    const validated = passwordLoginSchema.parse({
      email: emailInput,
      password: passwordInput,
    });

    await signIn("credentials", {
      email: validated.email,
      password: validated.password,
      flowType: "password",
      redirect: false,
    });

    return {
      success: true,
      redirectTo: "/portal",
    };
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      switch (err.type) {
        case "CredentialsSignin":
          return { success: false, error: "Invalid credentials or user not found" };
        default:
          return { success: false, error: err.message || "Authentication failed" };
      }
    }
    if (err instanceof Error) {
      const msg = err.message;
      if (msg.includes("Invalid credentials") || msg.includes("User not found")) {
        return { success: false, error: "Invalid credentials or user not found" };
      }
      return { success: false, error: msg };
    }
    return { success: false, error: "Failed to authenticate." };
  }
}

/**
 * NextAuth OTP-based sign in
 */
export async function loginWithOtpAction(
  emailInput: string,
  otpInput: string
): Promise<ServerActionResult> {
  try {
    const validated = otpVerifySchema.parse({
      email: emailInput,
      otp: otpInput,
    });

    await signIn("credentials", {
      email: validated.email,
      otp: validated.otp,
      flowType: "otp",
      redirect: false,
    });

    return {
      success: true,
      redirectTo: "/portal",
    };
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return { success: false, error: "Invalid or expired OTP code" };
    }
    if (err instanceof Error) {
      const msg = err.message;
      if (msg.includes("OTP expired")) return { success: false, error: "OTP expired. Please request a new code." };
      if (msg.includes("Too many failed attempts")) return { success: false, error: msg };
      if (msg.includes("Invalid OTP code")) return { success: false, error: msg };
      if (msg.includes("No active OTP found")) return { success: false, error: "No active OTP found. Please request a new code." };
      if (msg.includes("User not found")) return { success: false, error: "Invalid credentials or user not found" };
      return { success: false, error: msg };
    }
    return { success: false, error: "Failed to verify OTP." };
  }
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
