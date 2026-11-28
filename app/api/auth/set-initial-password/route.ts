import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { encryptPassword } from "@/lib/security/encryption";
import { Role, SystemRole } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getCurrentUser();
    const body = await req.json();

    const email = (body.email || sessionUser?.email || "").trim().toLowerCase();
    const password = (body.password || "").trim();
    const confirmPassword = (body.confirmPassword || "").trim();

    if (!email) {
      return NextResponse.json(
        { error: "Enterprise email address is required." },
        { status: 400 }
      );
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match." },
        { status: 400 }
      );
    }

    // Lookup employee by session user ID or work email
    const employee = await db.employee.findUnique({
      where: sessionUser?.id ? { id: sessionUser.id } : { workEmail: email },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee account not found." },
        { status: 404 }
      );
    }

    if (employee.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Account is inactive or suspended. Please contact HR." },
        { status: 403 }
      );
    }

    // Security check: if not in an active session, initial password setup is ONLY allowed if isPasswordSet is false
    if (employee.isPasswordSet && !sessionUser) {
      return NextResponse.json(
        { error: "Password has already been configured for this account. Please sign in." },
        { status: 400 }
      );
    }

    // Hash password with bcrypt (10 rounds) & encrypt with AES-256-GCM for Super Admin vault
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const encryptedPassword = encryptPassword(password);

    await db.employee.update({
      where: { id: employee.id },
      data: {
        passwordHash,
        encryptedPassword,
        isPasswordSet: true,
      },
    });

    const isSuperAdmin =
      employee.role === Role.Admin ||
      employee.systemRole === SystemRole.SUPER_ADMIN;
    const redirectTo = isSuperAdmin ? "/admin" : "/portal";

    return NextResponse.json({
      success: true,
      message: "Password configured successfully! Welcome to BharatEdge.",
      redirectTo,
      email: employee.workEmail,
      isSuperAdmin,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
