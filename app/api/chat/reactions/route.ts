import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { toggleMessageReactionAction } from "@/lib/actions/chat";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const body = await req.json();
    const { messageId, emoji } = body;

    if (!messageId || typeof messageId !== "string") {
      return NextResponse.json({ error: "messageId is required." }, { status: 400 });
    }

    if (!emoji || typeof emoji !== "string") {
      return NextResponse.json({ error: "emoji is required." }, { status: 400 });
    }

    const res = await toggleMessageReactionAction({ messageId, emoji });
    if (!res.success) {
      return NextResponse.json({ error: res.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, reactions: res.data?.reactions || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
