import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { uploadToR2 } from "@/lib/storage/r2";
import { ChatMessageType } from "@prisma/client";

export const dynamic = "force-dynamic";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/chat/conversations/[id]/avatar
 * Upload or update group profile photo (Restricted strictly to group ADMINs)
 */
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const { id: conversationId } = await context.params;

    // 1. Verify Conversation is a group and exists
    const conversation = await db.chatConversation.findUnique({
      where: { id: conversationId },
      select: { id: true, isGroup: true, name: true },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 }
      );
    }

    if (!conversation.isGroup) {
      return NextResponse.json(
        { error: "Group icon can only be set on group conversations." },
        { status: 400 }
      );
    }

    // 2. Strict Group Admin RBAC Check
    const participant = await db.chatParticipant.findUnique({
      where: {
        conversationId_employeeId: {
          conversationId,
          employeeId: user.id,
        },
      },
    });

    if (!participant || participant.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only group admins can update the group icon." },
        { status: 403 }
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

    // 3. Validate File Size & MIME Type (max 5 MB; JPEG, PNG, WebP)
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Image size exceeds the 5 MB limit. Please select a smaller photo." },
        { status: 400 }
      );
    }

    const mimeType = file.type?.toLowerCase() || "";
    if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: "Invalid image format. Allowed formats: JPEG, PNG, WebP." },
        { status: 400 }
      );
    }

    // 4. Upload to Cloudflare R2 / storage
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult = await uploadToR2({
      fileBuffer: buffer,
      fileName: file.name,
      contentType: mimeType,
      folder: "avatars/groups",
    });

    const now = new Date();

    // 5. Update Conversation & log subtle system message
    const [updatedConv] = await Promise.all([
      db.chatConversation.update({
        where: { id: conversationId },
        data: {
          avatarUrl: uploadResult.url,
          updatedAt: now,
        },
        select: { id: true, avatarUrl: true },
      }),
      db.chatMessage.create({
        data: {
          conversationId,
          senderId: user.id,
          content: `${user.name?.trim() || "An admin"} changed this group's icon`,
          messageType: ChatMessageType.TEXT,
          createdAt: now,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      avatarUrl: updatedConv.avatarUrl,
      message: "Group icon updated successfully.",
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Failed to update group icon.";
    console.error("[Group Avatar Upload Error]:", error);
    return NextResponse.json({ error: errMessage }, { status: 500 });
  }
}

/**
 * DELETE /api/chat/conversations/[id]/avatar
 * Remove group profile photo (Restricted strictly to group ADMINs)
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const { id: conversationId } = await context.params;

    // 1. Strict Group Admin RBAC Check
    const participant = await db.chatParticipant.findUnique({
      where: {
        conversationId_employeeId: {
          conversationId,
          employeeId: user.id,
        },
      },
    });

    if (!participant || participant.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only group admins can remove the group icon." },
        { status: 403 }
      );
    }

    const now = new Date();

    // 2. Remove group icon & log system notice
    await Promise.all([
      db.chatConversation.update({
        where: { id: conversationId },
        data: {
          avatarUrl: null,
          updatedAt: now,
        },
      }),
      db.chatMessage.create({
        data: {
          conversationId,
          senderId: user.id,
          content: `${user.name?.trim() || "An admin"} removed this group's icon`,
          messageType: ChatMessageType.TEXT,
          createdAt: now,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      avatarUrl: null,
      message: "Group icon removed successfully.",
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Failed to remove group icon.";
    console.error("[Group Avatar Remove Error]:", error);
    return NextResponse.json({ error: errMessage }, { status: 500 });
  }
}
