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
    isPasswordSet?: boolean;
  }
  interface Session {
    user: {
      id: string;
      role: Role;
      systemRole?: SystemRole;
      department?: string | null;
      teamLeaderId?: string | null;
      reportingManagerId?: string | null;
      isPasswordSet?: boolean;
    } & DefaultSession["user"];
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
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

        // Active status check
        if (employee.status !== "ACTIVE") {
          throw new Error("Account is inactive or suspended. Please contact HR.");
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
            isPasswordSet: employee.isPasswordSet,
          };
        } else {
          // Password Flow
          if (!employee.isPasswordSet || !employee.passwordHash) {
            throw new Error("PASSWORD_NOT_SET");
          }

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
            isPasswordSet: employee.isPasswordSet,
          };
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.systemRole = user.systemRole;
        token.department = user.department;
        token.teamLeaderId = user.teamLeaderId;
        token.reportingManagerId = user.reportingManagerId;
        token.isPasswordSet = user.isPasswordSet;
      }
      if (trigger === "update") {
        if (session?.isPasswordSet !== undefined) {
          token.isPasswordSet = session.isPasswordSet;
        }
        // Re-fetch employee record from PostgreSQL to ensure JWT token reflects latest DB state
        const lookupId = (token.id as string) || (token.sub as string);
        const lookupEmail = (token.email as string) || user?.email;
        if (lookupId || lookupEmail) {
          try {
            const emp = await db.employee.findFirst({
              where: lookupId ? { id: lookupId } : { workEmail: lookupEmail },
              select: {
                id: true,
                role: true,
                systemRole: true,
                department: true,
                teamLeaderId: true,
                reportingManagerId: true,
                isPasswordSet: true,
              },
            });
            if (emp) {
              token.id = emp.id;
              token.role = emp.role;
              token.systemRole = emp.systemRole;
              token.department = emp.department;
              token.teamLeaderId = emp.teamLeaderId;
              token.reportingManagerId = emp.reportingManagerId;
              token.isPasswordSet = emp.isPasswordSet;
            }
          } catch (err) {
            console.error("[NextAuth JWT Update Error]:", err);
          }
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) || (token.sub as string) || "";
        session.user.role = token.role as Role;
        session.user.systemRole = token.systemRole as SystemRole;
        session.user.department = token.department as string;
        session.user.teamLeaderId = (token.teamLeaderId as string) || null;
        session.user.reportingManagerId = (token.reportingManagerId as string) || null;
        session.user.isPasswordSet = (token.isPasswordSet as boolean) ?? false;
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
