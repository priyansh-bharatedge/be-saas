import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getMessagesAction,
  sendMessageAction,
  assertConversationMembership,
} from "@/lib/actions/chat";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");
    const before = searchParams.get("before") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId is required." }, { status: 400 });
    }

    // 403 Security Check
    try {
      await assertConversationMembership(conversationId, user.id);
    } catch {
      return NextResponse.json(
        { error: "Forbidden: You are not a member of this conversation." },
        { status: 403 }
      );
    }

    const res = await getMessagesAction(conversationId, limit, before);
    if (!res.success) {
      return NextResponse.json({ error: res.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, messages: res.data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const body = await req.json();
    const { conversationId, content, messageType, attachmentUrl, attachmentName, attachmentSize, attachmentMimeType } = body;

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId is required." }, { status: 400 });
    }

    // 403 Security Check
    try {
      await assertConversationMembership(conversationId, user.id);
    } catch {
      return NextResponse.json(
        { error: "Forbidden: You are not a member of this conversation." },
        { status: 403 }
      );
    }

    const res = await sendMessageAction({
      conversationId,
      content,
      messageType,
      attachmentUrl,
      attachmentName,
      attachmentSize,
      attachmentMimeType,
    });

    if (!res.success) {
      return NextResponse.json({ error: res.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: res.data }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
