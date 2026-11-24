import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { uploadToR2 } from "@/lib/storage/r2";

export const dynamic = "force-dynamic";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

/**
 * POST /api/user/profile-photo
 * Upload or update current user's profile photo
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No image file provided." },
        { status: 400 }
      );
    }

    // 1. Validate File Size (max 5 MB)
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Image size exceeds the 5 MB limit. Please select a smaller photo." },
        { status: 400 }
      );
    }

    // 2. Validate MIME Type (JPEG, PNG, WebP)
    const mimeType = file.type?.toLowerCase() || "";
    if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: "Invalid image format. Allowed formats: JPEG, PNG, WebP." },
        { status: 400 }
      );
    }

    // 3. Upload to Cloudflare R2 / storage
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult = await uploadToR2({
      fileBuffer: buffer,
      fileName: file.name,
      contentType: mimeType,
      folder: "avatars/users",
    });

    // 4. Update employee record in PostgreSQL
    const updatedEmployee = await db.employee.update({
      where: { id: user.id },
      data: { avatarUrl: uploadResult.url },
      select: { id: true, avatarUrl: true },
    });

    return NextResponse.json({
      success: true,
      avatarUrl: updatedEmployee.avatarUrl,
      message: "Profile photo updated successfully.",
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Failed to upload profile photo.";
    console.error("[Profile Photo Upload Error]:", error);
    return NextResponse.json({ error: errMessage }, { status: 500 });
  }
}

/**
 * DELETE /api/user/profile-photo
 * Remove current user's profile photo
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    await db.employee.update({
      where: { id: user.id },
      data: { avatarUrl: null },
    });

    return NextResponse.json({
      success: true,
      avatarUrl: null,
      message: "Profile photo removed successfully.",
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Failed to remove profile photo.";
    console.error("[Profile Photo Remove Error]:", error);
    return NextResponse.json({ error: errMessage }, { status: 500 });
  }
}
