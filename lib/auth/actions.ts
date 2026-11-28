"use server";

import crypto from "crypto";
import { db } from "@/lib/db";
import { signIn, signOut } from "@/auth";
import { emailSchema, passwordLoginSchema, otpVerifySchema } from "@/lib/validations/auth";
import { sendOtpEmail } from "@/lib/mail";
import { AuthError } from "next-auth";
import { Role, SystemRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { encryptPassword } from "@/lib/security/encryption";

export interface ServerActionResult {
  success: boolean;
  error?: string;
  message?: string;
  cooldownRemaining?: number;
  redirectTo?: string;
  requiresOtpSetup?: boolean;
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

    const email = validated.email.trim().toLowerCase();

    // Check if employee exists and whether their password has been set
    const employee = await db.employee.findUnique({
      where: { workEmail: email },
      select: {
        id: true,
        status: true,
        isPasswordSet: true,
        passwordHash: true,
      },
    });

    if (!employee) {
      return { success: false, error: "Invalid credentials or user not found." };
    }

    if (employee.status !== "ACTIVE") {
      return { success: false, error: "Account is inactive or suspended. Please contact HR." };
    }

    // Prompt user to log in via Email OTP to set their password on first login
    if (employee.isPasswordSet === false || !employee.passwordHash) {
      return {
        success: false,
        requiresOtpSetup: true,
        error: "Your password has not been set yet. Please log in using Email OTP to verify your account and set your password.",
      };
    }

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
        case "CallbackRouteError":
          return { success: false, error: "Invalid credentials or user not found." };
        default:
          return { success: false, error: "Invalid credentials or user not found." };
      }
    }
    if (err instanceof Error) {
      const msg = err.message;
      if (msg.includes("PASSWORD_NOT_SET")) {
        return {
          success: false,
          requiresOtpSetup: true,
          error: "Your password has not been set yet. Please log in using Email OTP to verify your account and set your password.",
        };
      }
      if (
        msg.includes("Invalid credentials") ||
        msg.includes("User not found") ||
        msg.includes("callbackrouteerror") ||
        msg.includes("errors.authjs.dev")
      ) {
        return { success: false, error: "Invalid credentials or user not found." };
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

    const email = validated.email.trim().toLowerCase();

    const employee = await db.employee.findUnique({
      where: { workEmail: email },
      select: { id: true, isPasswordSet: true, status: true },
    });

    if (!employee) {
      return { success: false, error: "Invalid credentials or user not found" };
    }

    if (employee.status !== "ACTIVE") {
      return { success: false, error: "Account is inactive or suspended. Please contact HR." };
    }

    await signIn("credentials", {
      email: validated.email,
      otp: validated.otp,
      flowType: "otp",
      redirect: false,
    });

    // If first-time user (password not set), route directly to set-password screen!
    const destination = employee.isPasswordSet ? "/portal" : "/set-password";

    return {
      success: true,
      redirectTo: destination,
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

/**
 * Reset / Update password via verified OTP
 */
export async function resetPasswordWithOtpAction(
  emailInput: string,
  otpInput: string,
  newPasswordInput: string,
  confirmPasswordInput: string
): Promise<ServerActionResult> {
  try {
    const email = emailInput.trim().toLowerCase();
    const otp = otpInput.trim();

    if (!email || !otp) {
      return { success: false, error: "Email and OTP code are required." };
    }

    if (!newPasswordInput || newPasswordInput.length < 8) {
      return { success: false, error: "New password must be at least 8 characters." };
    }

    if (newPasswordInput !== confirmPasswordInput) {
      return { success: false, error: "Passwords do not match." };
    }

    const employee = await db.employee.findUnique({
      where: { workEmail: email },
    });

    if (!employee) {
      return { success: false, error: "Invalid credentials or user not found." };
    }

    if (employee.status !== "ACTIVE") {
      return { success: false, error: "Account is inactive or suspended. Please contact HR." };
    }

    if (!employee.otp || !employee.otpExpiry) {
      return { success: false, error: "No active OTP found. Please request a new code." };
    }

    if (new Date() > new Date(employee.otpExpiry)) {
      await db.employee.update({
        where: { id: employee.id },
        data: { otp: null, otpExpiry: null, otpAttempts: 0 },
      });
      return { success: false, error: "OTP expired. Please request a new code." };
    }

    if (employee.otp !== otp) {
      const nextAttempts = (employee.otpAttempts || 0) + 1;
      if (nextAttempts >= 3) {
        await db.employee.update({
          where: { id: employee.id },
          data: { otp: null, otpExpiry: null, otpAttempts: 0 },
        });
        return { success: false, error: "Too many failed attempts. This OTP has been invalidated. Please request a new code." };
      } else {
        await db.employee.update({
          where: { id: employee.id },
          data: { otpAttempts: nextAttempts },
        });
        const remaining = 3 - nextAttempts;
        return { success: false, error: `Invalid OTP code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.` };
      }
    }

    // Hash with bcrypt and encrypt with AES-256-GCM
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPasswordInput, salt);
    const encryptedPassword = encryptPassword(newPasswordInput);

    await db.employee.update({
      where: { id: employee.id },
      data: {
        passwordHash,
        encryptedPassword,
        isPasswordSet: true,
        otp: null,
        otpExpiry: null,
        otpAttempts: 0,
      },
    });

    return {
      success: true,
      message: "Password reset successfully! You can now log in with your new password.",
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to reset password.";
    return { success: false, error: message };
  }
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
