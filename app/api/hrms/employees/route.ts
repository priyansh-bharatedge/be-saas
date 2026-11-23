import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { canCreateEmployee } from "@/lib/auth/rbac";
import { createEmployeeAction } from "@/lib/actions/employee";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    // Strict enforcement: Only Super Admin, HR Admin, or HR HOD can create employees
    if (!canCreateEmployee(user)) {
      return NextResponse.json(
        {
          error:
            "Forbidden: Employee creation is strictly restricted to HR Administrators, HR HOD, and Super Admins.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = await createEmployeeAction(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to create employee" }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.data }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
