import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getScopeFilter } from "@/lib/auth/rbac";
import { getHrmsWorkflowsAction, createHrmsWorkflowAction } from "@/lib/actions/workflow";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scope = await getScopeFilter(user, "hrms");
  if (!scope.isHrAdmin && !scope.isSuperAdmin) {
    return NextResponse.json(
      { error: "Forbidden: Access restricted to HR Admin and Super Admin." },
      { status: 403 }
    );
  }

  const res = await getHrmsWorkflowsAction();
  if (!res.success) {
    return NextResponse.json({ error: res.error }, { status: 500 });
  }

  return NextResponse.json(res.data);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scope = await getScopeFilter(user, "hrms");
  if (!scope.isHrAdmin && !scope.isSuperAdmin) {
    return NextResponse.json(
      { error: "Forbidden: Access restricted to HR Admin and Super Admin." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const res = await createHrmsWorkflowAction(body);

    if (!res.success) {
      return NextResponse.json({ error: res.error }, { status: 400 });
    }

    return NextResponse.json(res.data, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid payload" },
      { status: 400 }
    );
  }
}
