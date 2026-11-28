import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { encryptPassword } from "@/lib/security/encryption";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in first." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const password = (body.password || "").trim();
    const confirmPassword = (body.confirmPassword || "").trim();

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

    // Hash password with bcrypt (10 rounds) & encrypt with AES-256-GCM for Super Admin vault
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const encryptedPassword = encryptPassword(password);

    await db.employee.update({
      where: { id: user.id },
      data: {
        passwordHash,
        encryptedPassword,
        isPasswordSet: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Password set successfully! Welcome to BharatEdge.",
      redirectTo: "/portal",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
