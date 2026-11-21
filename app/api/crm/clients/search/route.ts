import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Dedicated Global Client Lookup API
 * Enables any authenticated BDM / employee to search across all clients by Phone (primary)
 * or Email (secondary) without department or creator scoping when creating Deals or Payment Records.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please log in to search clients." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query")?.trim() || searchParams.get("q")?.trim() || "";
    const phone = searchParams.get("phone")?.trim() || "";
    const email = searchParams.get("email")?.trim() || "";
    const checkDuplicate = searchParams.get("checkDuplicate") === "true";
    const limit = Math.min(parseInt(searchParams.get("limit") || "15", 10), 50);

    // Duplicate check mode for Client Form real-time validation
    if (checkDuplicate && (phone || email)) {
      const orConditions: any[] = [];
      if (phone) orConditions.push({ phone });
      if (email) orConditions.push({ email: { equals: email, mode: "insensitive" } });

      const existing = await db.client.findFirst({
        where: { OR: orConditions },
        select: {
          id: true,
          clientNumber: true,
          name: true,
          phone: true,
          email: true,
          companyName: true,
          assignedEmployee: {
            select: { firstName: true, lastName: true, workEmail: true },
          },
        },
      });

      return NextResponse.json({
        success: true,
        exists: Boolean(existing),
        client: existing,
      });
    }

    // Direct search mode
    const where: any = {};

    if (phone) {
      where.phone = { contains: phone };
    } else if (email) {
      where.email = { contains: email, mode: "insensitive" };
    } else if (query) {
      where.OR = [
        { phone: { contains: query } },
        { email: { contains: query, mode: "insensitive" } },
        { name: { contains: query, mode: "insensitive" } },
        { clientNumber: { contains: query, mode: "insensitive" } },
        { companyName: { contains: query, mode: "insensitive" } },
      ];
    }

    const clients = await db.client.findMany({
      where,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        clientNumber: true,
        name: true,
        phone: true,
        alternatePhone: true,
        email: true,
        gender: true,
        companyName: true,
        companyId: true,
        company: {
          select: { id: true, name: true, gstNumber: true },
        },
        gstNumber: true,
        panNumber: true,
        address: true,
        city: true,
        state: true,
        country: true,
        assignedEmployeeId: true,
        assignedEmployee: {
          select: { id: true, firstName: true, lastName: true, workEmail: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      count: clients.length,
      clients,
    });
  } catch (error: any) {
    console.error("[Global Client Search API Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to search client registry." },
      { status: 500 }
    );
  }
}
