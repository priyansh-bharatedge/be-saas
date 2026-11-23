import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getConversationsAction,
  getOrCreateDMAction,
  createGroupAction,
} from "@/lib/actions/chat";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const res = await getConversationsAction();
    if (!res.success) {
      return NextResponse.json({ error: res.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, conversations: res.data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    if (body.isGroup) {
      const { name, participantIds } = body;
      if (!name || !participantIds || !Array.isArray(participantIds)) {
        return NextResponse.json(
          { error: "Group name and participantIds array are required." },
          { status: 400 }
        );
      }
      const res = await createGroupAction({ name, participantIds });
      if (!res.success) {
        return NextResponse.json({ error: res.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, ...res.data }, { status: 201 });
    } else {
      const { targetEmployeeId } = body;
      if (!targetEmployeeId) {
        return NextResponse.json(
          { error: "targetEmployeeId is required for direct messages." },
          { status: 400 }
        );
      }
      const res = await getOrCreateDMAction(targetEmployeeId);
      if (!res.success) {
        return NextResponse.json({ error: res.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, ...res.data }, { status: 200 });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
