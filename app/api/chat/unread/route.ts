import { NextResponse } from "next/server";
import { getUnreadChatCountAction } from "@/lib/actions/chat";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await getUnreadChatCountAction();
    if (!res.success) {
      return NextResponse.json({ success: false, unreadCount: 0 }, { status: 400 });
    }
    return NextResponse.json({ success: true, unreadCount: res.data?.unreadCount || 0 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ success: false, unreadCount: 0, error: message }, { status: 500 });
  }
}
