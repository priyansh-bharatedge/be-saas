import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { updatePresenceAction } from "@/lib/actions/chat";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    let status: "online" | "offline" = "online";

    try {
      const text = await req.text();
      if (text) {
        const body = JSON.parse(text);
        if (body.status === "offline" || body.status === "online") {
          status = body.status;
        }
      }
    } catch {
      // Default to "online" if body is empty or non-JSON
    }

    const res = await updatePresenceAction(status);
    if (!res.success) {
      return NextResponse.json({ error: res.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, isOnline: status === "online" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
