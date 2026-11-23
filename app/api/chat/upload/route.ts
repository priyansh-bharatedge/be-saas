import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertConversationMembership } from "@/lib/actions/chat";
import { uploadToR2 } from "@/lib/storage/r2";
import { ChatMessageType } from "@prisma/client";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

const ALLOWED_MIME_TYPES = new Set([
  // Images
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/x-zip-compressed",
]);

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const conversationId = formData.get("conversationId") as string | null;

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId is required." }, { status: 400 });
    }

    // 403 Security Check: Must be participant of conversation to upload files for it
    try {
      await assertConversationMembership(conversationId, user.id);
    } catch {
      return NextResponse.json(
        { error: "Forbidden: You are not a member of this conversation." },
        { status: 403 }
      );
    }

    if (!file) {
      return NextResponse.json({ error: "No file was uploaded." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File exceeds maximum size limit of 25MB." },
        { status: 400 }
      );
    }

    const mimeType = file.type || "application/octet-stream";
    if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `File type "${file.type}" is not supported.` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to Cloudflare R2
    const uploadResult = await uploadToR2({
      fileBuffer: buffer,
      fileName: file.name,
      contentType: mimeType,
      folder: `chat/${conversationId}`,
    });

    // Determine message type
    let messageType: ChatMessageType = ChatMessageType.FILE;
    if (mimeType.startsWith("image/")) {
      messageType = ChatMessageType.IMAGE;
    } else if (
      mimeType.includes("pdf") ||
      mimeType.includes("word") ||
      mimeType.includes("sheet") ||
      mimeType.includes("excel") ||
      mimeType.includes("csv") ||
      mimeType.includes("text")
    ) {
      messageType = ChatMessageType.DOCUMENT;
    }

    return NextResponse.json({
      success: true,
      url: uploadResult.url,
      fileName: file.name,
      fileSize: file.size,
      mimeType,
      messageType,
    });
  } catch (err: unknown) {
    console.error("Chat file upload error:", err);
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
