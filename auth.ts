import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { Role, SystemRole } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    name?: string | null;
    role: Role;
    systemRole?: SystemRole;
    department?: string | null;
    teamLeaderId?: string | null;
    reportingManagerId?: string | null;
  }
  interface Session {
    user: {
      id: string;
      role: Role;
      systemRole?: SystemRole;
      department?: string | null;
      teamLeaderId?: string | null;
      reportingManagerId?: string | null;
    } & DefaultSession["user"];
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "Enterprise Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        otp: { label: "OTP", type: "text" },
        flowType: { label: "FlowType", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          throw new Error("Email address is required.");
        }

        const email = (credentials.email as string).trim().toLowerCase();
        const flowType = (credentials.flowType as string) || (credentials.otp ? "otp" : "password");

        const employee = await db.employee.findUnique({
          where: { workEmail: email },
        });

        // Prevent email enumeration
        if (!employee) {
          throw new Error("Invalid credentials or user not found");
        }

        if (flowType === "otp") {
          const submittedOtp = (credentials.otp as string)?.trim();
          if (!submittedOtp) {
            throw new Error("OTP code is required.");
          }

          if (!employee.otp || !employee.otpExpiry) {
            throw new Error("No active OTP found. Please request a new code.");
          }

          // Check expiration past the 5-minute window
          if (new Date() > new Date(employee.otpExpiry)) {
            await db.employee.update({
              where: { id: employee.id },
              data: { otp: null, otpExpiry: null, otpAttempts: 0 },
            });
            throw new Error("OTP expired. Please request a new code.");
          }

          // Check if OTP matches
          if (employee.otp !== submittedOtp) {
            const nextAttempts = (employee.otpAttempts || 0) + 1;

            if (nextAttempts >= 3) {
              await db.employee.update({
                where: { id: employee.id },
                data: { otp: null, otpExpiry: null, otpAttempts: 0 },
              });
              throw new Error("Too many failed attempts. This OTP has been invalidated. Please request a new code.");
            } else {
              await db.employee.update({
                where: { id: employee.id },
                data: { otpAttempts: nextAttempts },
              });
              const remaining = 3 - nextAttempts;
              throw new Error(`Invalid OTP code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`);
            }
          }

          // Successful OTP verification: reset OTP state
          await db.employee.update({
            where: { id: employee.id },
            data: { otp: null, otpExpiry: null, otpAttempts: 0 },
          });

          return {
            id: employee.id,
            email: employee.workEmail,
            name: `${employee.firstName} ${employee.lastName}`.trim(),
            role: employee.role,
            systemRole: employee.systemRole,
            department: employee.department,
            teamLeaderId: employee.teamLeaderId,
            reportingManagerId: employee.reportingManagerId,
          };
        } else {
          // Password Flow
          const submittedPassword = credentials.password as string;
          if (!submittedPassword) {
            throw new Error("Password is required.");
          }

          const isValid = await bcrypt.compare(submittedPassword, employee.passwordHash);
          if (!isValid) {
            throw new Error("Invalid credentials or user not found");
          }

          return {
            id: employee.id,
            email: employee.workEmail,
            name: `${employee.firstName} ${employee.lastName}`.trim(),
            role: employee.role,
            systemRole: employee.systemRole,
            department: employee.department,
            teamLeaderId: employee.teamLeaderId,
            reportingManagerId: employee.reportingManagerId,
          };
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.systemRole = user.systemRole;
        token.department = user.department;
        token.teamLeaderId = user.teamLeaderId;
        token.reportingManagerId = user.reportingManagerId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.systemRole = token.systemRole as SystemRole;
        session.user.department = token.department as string;
        session.user.teamLeaderId = (token.teamLeaderId as string) || null;
        session.user.reportingManagerId = (token.reportingManagerId as string) || null;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/portal`;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "bharatedge-enterprise-super-secure-jwt-key-2026-edge-saas",
});
