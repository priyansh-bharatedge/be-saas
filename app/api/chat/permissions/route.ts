import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  updateGroupSendMessagePermissionAction,
  updateMemberMessagingPermissionAction,
} from "@/lib/actions/chat";
import { GroupSendMessagePermission } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const body = await req.json();
    const { type, conversationId } = body;

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId is required." }, { status: 400 });
    }

    if (type === "group") {
      const { permission } = body;
      if (
        permission !== GroupSendMessagePermission.ALL_MEMBERS &&
        permission !== GroupSendMessagePermission.ONLY_ADMINS
      ) {
        return NextResponse.json(
          { error: "Invalid permission. Must be ALL_MEMBERS or ONLY_ADMINS." },
          { status: 400 }
        );
      }

      const res = await updateGroupSendMessagePermissionAction({
        conversationId,
        permission,
      });

      if (!res.success) {
        return NextResponse.json({ error: res.error }, { status: 400 });
      }

      return NextResponse.json({ success: true, permission: res.data?.permission });
    } else if (type === "member") {
      const { employeeId, canSendMessages } = body;
      if (!employeeId || typeof canSendMessages !== "boolean") {
        return NextResponse.json(
          { error: "employeeId and boolean canSendMessages are required." },
          { status: 400 }
        );
      }

      const res = await updateMemberMessagingPermissionAction({
        conversationId,
        employeeId,
        canSendMessages,
      });

      if (!res.success) {
        return NextResponse.json({ error: res.error }, { status: 400 });
      }

      return NextResponse.json({ success: true, canSendMessages: res.data?.canSendMessages });
    } else {
      return NextResponse.json({ error: "Invalid request type. Must be group or member." }, { status: 400 });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
