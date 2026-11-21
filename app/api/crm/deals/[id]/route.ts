import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { updateDealAction } from "@/lib/actions/deals";

export const dynamic = "force-dynamic";

/**
 * Deal update API route (PATCH / PUT)
 * Enforces strict department RBAC:
 * - Sales Department / non-Legal: Legal fields (Section 5 tracking and per-service legal fields)
 *   cannot be modified and are preserved from the existing database record.
 * - Legal Department and Super Admin: Full edit access to legal fields.
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await context.params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const result = await updateDealAction(dealId, body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Failed to update deal." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error: any) {
    console.error("[API Update Deal Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update deal." },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return PATCH(req, context);
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await context.params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const deal = await db.deal.findUnique({
      where: { id: dealId },
      include: {
        client: true,
        company: true,
        services: true,
        documents: {
          include: {
            uploadedBy: {
              select: { firstName: true, lastName: true },
            },
          },
        },
        assignedEmployee: {
          select: { firstName: true, lastName: true },
        },
        partnerBdm: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    if (!deal) {
      return NextResponse.json(
        { success: false, error: "Deal not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, deal });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error." },
      { status: 500 }
    );
  }
}
