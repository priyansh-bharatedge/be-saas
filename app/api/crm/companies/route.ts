import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getCompaniesAction, createCompanyAction } from "@/lib/actions/crm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const companyType = searchParams.get("companyType") || "ALL";

    const result = await getCompaniesAction({ search, companyType });
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error: any) {
    console.error("[API Get Companies Error]:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to load companies." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json();
    const result = await createCompanyAction(body);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || "Failed to create company." }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.data }, { status: 201 });
  } catch (error: any) {
    console.error("[API Create Company Error]:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to create company." }, { status: 500 });
  }
}
