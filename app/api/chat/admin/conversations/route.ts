import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminConversationsAction } from "@/lib/actions/chat-audit";
import { SystemRole } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.systemRole !== SystemRole.SUPER_ADMIN) {
      return NextResponse.json(
        { error: "Forbidden: Super Admin access required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const chatType = (searchParams.get("chatType") as "ALL" | "DMS" | "GROUPS") || "ALL";
    const department = searchParams.get("department") || undefined;
    const search = searchParams.get("search") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const res = await getAdminConversationsAction({
      chatType,
      department,
      search,
      limit,
    });

    if (!res.success) {
      return NextResponse.json({ error: res.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, conversations: res.data || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
