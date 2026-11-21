import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createDealAction, getDealsAction } from "@/lib/actions/deals";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const stage = searchParams.get("stage") || "ALL";

    const result = await getDealsAction({ search, stage });
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error: any) {
    console.error("[API Get Deals Error]:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to load deals." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json();
    const result = await createDealAction(body);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || "Failed to create deal." }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.data }, { status: 201 });
  } catch (error: any) {
    console.error("[API Create Deal Error]:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to create deal." }, { status: 500 });
  }
}
