import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getScopeFilter } from "@/lib/auth/rbac";
import { MODULE_REGISTRY } from "@/lib/import-export/registry";
import { db } from "@/lib/db";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ module: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { module: moduleKey } = await params;
    const config = MODULE_REGISTRY[moduleKey];

    if (!config) {
      return NextResponse.json(
        { error: `Module '${moduleKey}' not found in registry.` },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const {
      scope = "all", // "selected" | "all"
      selectedIds = [],
      format = "xlsx", // "xlsx" | "csv"
      search = "",
      filters = {},
    } = body;

    // RBAC Domain Scoping
    const scopeFilter = await getScopeFilter(user, config.domain);

    let rawRecords: any[] = [];

    // Query based on module
    switch (moduleKey) {
      case "leads": {
        const where: any = {};
        if (scope === "selected" && selectedIds.length > 0) {
          where.id = { in: selectedIds };
        }
        if (scopeFilter.allowedEmployeeIds !== null) {
          where.OR = [
            { assignedEmployeeId: { in: scopeFilter.allowedEmployeeIds } },
            { createdById: { in: scopeFilter.allowedEmployeeIds } },
          ];
        }
        if (search) {
          where.OR = [
            ...(where.OR || []),
            { name: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
            { companyName: { contains: search, mode: "insensitive" } },
            { leadNumber: { contains: search, mode: "insensitive" } },
          ];
        }
        rawRecords = await db.lead.findMany({
          where,
          include: {
            assignedEmployee: { select: { firstName: true, lastName: true } },
          },
          orderBy: { createdAt: "desc" },
        });
        break;
      }

      case "clients": {
        const where: any = {};
        if (scope === "selected" && selectedIds.length > 0) {
          where.id = { in: selectedIds };
        }
        if (scopeFilter.allowedEmployeeIds !== null) {
          where.OR = [
            { assignedEmployeeId: { in: scopeFilter.allowedEmployeeIds } },
            { createdById: { in: scopeFilter.allowedEmployeeIds } },
          ];
        }
        if (search) {
          where.OR = [
            ...(where.OR || []),
            { name: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
            { clientNumber: { contains: search, mode: "insensitive" } },
            { companyName: { contains: search, mode: "insensitive" } },
          ];
        }
        rawRecords = await db.client.findMany({
          where,
          include: {
            assignedEmployee: { select: { firstName: true, lastName: true } },
            company: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
        });
        break;
      }

      case "companies": {
        const where: any = {};
        if (scope === "selected" && selectedIds.length > 0) {
          where.id = { in: selectedIds };
        }
        if (scopeFilter.allowedEmployeeIds !== null) {
          where.createdById = { in: scopeFilter.allowedEmployeeIds };
        }
        if (search) {
          where.OR = [
            { name: { contains: search, mode: "insensitive" } },
            { industry: { contains: search, mode: "insensitive" } },
            { city: { contains: search, mode: "insensitive" } },
          ];
        }
        rawRecords = await db.company.findMany({
          where,
          orderBy: { createdAt: "desc" },
        });
        break;
      }

      case "services": {
        const where: any = {};
        if (scope === "selected" && selectedIds.length > 0) {
          where.id = { in: selectedIds };
        }
        if (search) {
          where.OR = [
            { name: { contains: search, mode: "insensitive" } },
            { category: { contains: search, mode: "insensitive" } },
            { code: { contains: search, mode: "insensitive" } },
          ];
        }
        rawRecords = await db.service.findMany({
          where,
          orderBy: { createdAt: "desc" },
        });
        break;
      }

      case "prospects": {
        const where: any = {};
        if (scope === "selected" && selectedIds.length > 0) {
          where.id = { in: selectedIds };
        }
        if (filters.sheetId) {
          where.sheetId = filters.sheetId;
        }
        rawRecords = await db.prospectRow.findMany({
          where,
          include: { assignedBdm: { select: { firstName: true, lastName: true } } },
          orderBy: { rowIndex: "asc" },
        });
        break;
      }

      case "quotations": {
        const where: any = {};
        if (scope === "selected" && selectedIds.length > 0) {
          where.id = { in: selectedIds };
        }
        if (scopeFilter.allowedEmployeeIds !== null) {
          where.preparedById = { in: scopeFilter.allowedEmployeeIds };
        }
        if (search) {
          where.OR = [
            { quotationNumber: { contains: search, mode: "insensitive" } },
            { clientName: { contains: search, mode: "insensitive" } },
            { companyName: { contains: search, mode: "insensitive" } },
          ];
        }
        rawRecords = await db.quotation.findMany({
          where,
          include: {
            preparedBy: { select: { firstName: true, lastName: true } },
          },
          orderBy: { createdAt: "desc" },
        });
        break;
      }

      case "payments": {
        const where: any = {};
        if (scope === "selected" && selectedIds.length > 0) {
          where.id = { in: selectedIds };
        }
        if (scopeFilter.allowedEmployeeIds !== null) {
          where.recordedById = { in: scopeFilter.allowedEmployeeIds };
        }
        if (search) {
          where.OR = [
            { receiptNumber: { contains: search, mode: "insensitive" } },
            { transactionRef: { contains: search, mode: "insensitive" } },
            { client: { name: { contains: search, mode: "insensitive" } } },
          ];
        }
        rawRecords = await db.paymentRecord.findMany({
          where,
          include: {
            client: { select: { name: true, phone: true } },
            verifiedBy: { select: { firstName: true, lastName: true } },
          },
          orderBy: { paymentDate: "desc" },
        });
        break;
      }

      case "deals": {
        const where: any = {};
        if (scope === "selected" && selectedIds.length > 0) {
          where.id = { in: selectedIds };
        }
        if (scopeFilter.allowedEmployeeIds !== null) {
          where.OR = [
            { assignedEmployeeId: { in: scopeFilter.allowedEmployeeIds } },
            { partnerBdmId: { in: scopeFilter.allowedEmployeeIds } },
          ];
        }
        if (search) {
          where.OR = [
            ...(where.OR || []),
            { title: { contains: search, mode: "insensitive" } },
            { dealNumber: { contains: search, mode: "insensitive" } },
            { companyName: { contains: search, mode: "insensitive" } },
          ];
        }
        rawRecords = await db.deal.findMany({
          where,
          include: {
            assignedEmployee: { select: { firstName: true, lastName: true } },
            partnerBdm: { select: { firstName: true, lastName: true } },
          },
          orderBy: { createdAt: "desc" },
        });
        break;
      }

      case "operations": {
        const where: any = {};
        if (scope === "selected" && selectedIds.length > 0) {
          where.id = { in: selectedIds };
        }
        if (scopeFilter.allowedEmployeeIds !== null) {
          where.OR = [
            { assignedTlId: { in: scopeFilter.allowedEmployeeIds } },
            { assignedTmId: { in: scopeFilter.allowedEmployeeIds } },
          ];
        }
        if (search) {
          where.OR = [
            ...(where.OR || []),
            { operationNumber: { contains: search, mode: "insensitive" } },
            { serviceName: { contains: search, mode: "insensitive" } },
            { deal: { dealNumber: { contains: search, mode: "insensitive" } } },
          ];
        }
        rawRecords = await db.internalOperation.findMany({
          where,
          include: {
            deal: { select: { dealNumber: true, companyName: true } },
            assignedTl: { select: { firstName: true, lastName: true } },
            assignedTm: { select: { firstName: true, lastName: true } },
          },
          orderBy: { createdAt: "desc" },
        });
        break;
      }

      case "employees": {
        const where: any = {};
        if (scope === "selected" && selectedIds.length > 0) {
          where.id = { in: selectedIds };
        }
        if (scopeFilter.allowedEmployeeIds !== null) {
          where.id = { in: scopeFilter.allowedEmployeeIds };
        }
        if (search) {
          where.OR = [
            { employeeId: { contains: search, mode: "insensitive" } },
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { workEmail: { contains: search, mode: "insensitive" } },
            { department: { contains: search, mode: "insensitive" } },
          ];
        }
        rawRecords = await db.employee.findMany({
          where,
          orderBy: { employeeId: "asc" },
        });
        break;
      }

      case "attendance": {
        const where: any = {};
        if (scope === "selected" && selectedIds.length > 0) {
          where.id = { in: selectedIds };
        }
        if (scopeFilter.allowedEmployeeIds !== null) {
          where.employeeId = { in: scopeFilter.allowedEmployeeIds };
        }
        if (filters.startDate && filters.endDate) {
          where.date = {
            gte: new Date(filters.startDate),
            lte: new Date(filters.endDate),
          };
        }
        rawRecords = await db.attendance.findMany({
          where,
          include: {
            employee: { select: { employeeId: true, firstName: true, lastName: true, workEmail: true, department: true } },
          },
          orderBy: { date: "desc" },
        });
        break;
      }

      case "leaves": {
        const where: any = {};
        if (scope === "selected" && selectedIds.length > 0) {
          where.id = { in: selectedIds };
        }
        if (scopeFilter.allowedEmployeeIds !== null) {
          where.OR = [
            { employeeId: { in: scopeFilter.allowedEmployeeIds } },
            { teamLeaderId: { in: scopeFilter.allowedEmployeeIds } },
          ];
        }
        rawRecords = await db.leaveRequest.findMany({
          where,
          include: {
            employee: { select: { employeeId: true, firstName: true, lastName: true, workEmail: true, department: true } },
            teamLeader: { select: { firstName: true, lastName: true } },
          },
          orderBy: { createdAt: "desc" },
        });
        break;
      }

      case "calendar": {
        const where: any = {};
        if (scope === "selected" && selectedIds.length > 0) {
          where.id = { in: selectedIds };
        }
        if (filters.month && filters.year) {
          const start = new Date(filters.year, filters.month - 1, 1);
          const end = new Date(filters.year, filters.month, 0);
          where.date = { gte: start, lte: end };
        }
        rawRecords = await db.calendarEvent.findMany({
          where,
          orderBy: { date: "asc" },
        });
        break;
      }

      default:
        return NextResponse.json({ error: "Unsupported module." }, { status: 400 });
    }

    // Format & sanitize records (STRIP PASSWORDS, OTPS, INTERNAL TOKENS)
    const formattedData = rawRecords.map((r) => {
      const row: Record<string, any> = {};

      // Module-specific friendly formatting
      if (moduleKey === "leads") {
        row["Lead Number"] = r.leadNumber;
        row["Contact Person"] = r.name;
        row["Phone"] = r.phone;
        row["Email"] = r.email || "";
        row["Company"] = r.companyName || "";
        row["Source"] = r.source;
        row["Status"] = r.status;
        row["Estimated Budget (₹)"] = r.estimatedBudget ? Number(r.estimatedBudget) : 0;
        row["Assigned To"] = r.assignedEmployee ? `${r.assignedEmployee.firstName} ${r.assignedEmployee.lastName}`.trim() : "";
        row["Created At"] = r.createdAt ? new Date(r.createdAt).toISOString().split("T")[0] : "";
      } else if (moduleKey === "clients") {
        row["Client Number"] = r.clientNumber;
        row["Name"] = r.name;
        row["Phone"] = r.phone;
        row["Alternate Phone"] = r.alternatePhone || "";
        row["Email"] = r.email || "";
        row["Company"] = r.company?.name || r.companyName || "";
        row["GSTIN"] = r.gstNumber || "";
        row["PAN"] = r.panNumber || "";
        row["City"] = r.city || "";
        row["State"] = r.state || "";
        row["Country"] = r.country || "India";
        row["Assigned Staff"] = r.assignedEmployee ? `${r.assignedEmployee.firstName} ${r.assignedEmployee.lastName}`.trim() : "";
      } else if (moduleKey === "companies") {
        row["Company Name"] = r.name;
        row["Industry"] = r.industry || "";
        row["Entity Type"] = r.companyType || "";
        row["Website"] = r.website || "";
        row["GSTIN"] = r.gstNumber || "";
        row["PAN"] = r.panNumber || "";
        row["City"] = r.city || "";
        row["State"] = r.state || "";
      } else if (moduleKey === "services") {
        row["Service Name"] = r.name;
        row["Code"] = r.code || "";
        row["Category"] = r.category || "";
        row["Base Price (₹)"] = r.minimumPrice ? Number(r.minimumPrice) : 0;
        row["Outsource Cost (₹)"] = r.outsourcePrice ? Number(r.outsourcePrice) : 0;
        row["SAC Code"] = r.sacCode || "";
        row["GST Rate (%)"] = r.defaultGstRate || 18;
        row["Status"] = r.isActive ? "Active" : "Inactive";
      } else if (moduleKey === "quotations") {
        row["Quotation Number"] = r.quotationNumber;
        row["Client Name"] = r.clientName;
        row["Company Name"] = r.companyName || "";
        row["Subtotal (₹)"] = Number(r.subTotal);
        row["Discount (₹)"] = Number(r.discountAmount);
        row["GST Amount (₹)"] = Number(r.gstAmount);
        row["Grand Total (₹)"] = Number(r.grandTotal);
        row["Status"] = r.status;
        row["Prepared By"] = r.preparedBy ? `${r.preparedBy.firstName} ${r.preparedBy.lastName}`.trim() : "";
        row["Date"] = r.createdAt ? new Date(r.createdAt).toISOString().split("T")[0] : "";
      } else if (moduleKey === "payments") {
        row["Receipt Number"] = r.receiptNumber;
        row["Client Name"] = r.client?.name || "";
        row["Client Phone"] = r.client?.phone || "";
        row["Amount (₹)"] = Number(r.amount);
        row["Bank Entity"] = r.bankType;
        row["Milestone"] = r.paymentType;
        row["Verification Status"] = r.status;
        row["Payment Mode"] = r.paymentMode;
        row["Transaction Ref"] = r.transactionRef || "";
        row["Payment Date"] = r.paymentDate ? new Date(r.paymentDate).toISOString().split("T")[0] : "";
      } else if (moduleKey === "deals") {
        row["Deal Number"] = r.dealNumber || "";
        row["Title"] = r.title;
        row["Company / Client"] = r.companyName;
        row["Contact Phone"] = r.contactPhone || "";
        row["Deal Value (₹)"] = Number(r.value);
        row["Amount Received (₹)"] = Number(r.amountReceived);
        row["Amount Pending (₹)"] = Number(r.amountPending);
        row["Pipeline Stage"] = r.stage;
        row["Accounts Status"] = r.accountsStatus;
        row["BDM"] = r.assignedEmployee ? `${r.assignedEmployee.firstName} ${r.assignedEmployee.lastName}`.trim() : "";
      } else if (moduleKey === "operations") {
        row["Operation Number"] = r.operationNumber;
        row["Parent Deal"] = r.deal?.dealNumber || "";
        row["Company"] = r.deal?.companyName || "";
        row["Service Deliverable"] = r.serviceName;
        row["Operations Team"] = r.teamType;
        row["Fulfillment Stage"] = r.internalStage;
        row["Status"] = r.status;
        row["Assigned TL"] = r.assignedTl ? `${r.assignedTl.firstName} ${r.assignedTl.lastName}`.trim() : "";
        row["Assigned TM"] = r.assignedTm ? `${r.assignedTm.firstName} ${r.assignedTm.lastName}`.trim() : "";
      } else if (moduleKey === "employees") {
        row["Employee ID"] = r.employeeId;
        row["Full Name"] = `${r.firstName} ${r.lastName}`.trim();
        row["Work Email"] = r.workEmail;
        row["Contact Number"] = r.contactNumber;
        row["Department"] = r.department;
        row["Designation"] = r.designation;
        row["Hierarchy Role"] = r.systemRole;
        row["Employment Type"] = r.employmentType;
        row["Joining Date"] = r.dateOfJoining ? new Date(r.dateOfJoining).toISOString().split("T")[0] : "";
        row["Branch"] = r.branch;
        // Strictly omit: passwordHash, otp, otpExpiry, otpAttempts!
      } else if (moduleKey === "attendance") {
        row["Employee ID"] = r.employee?.employeeId || "";
        row["Employee Name"] = r.employee ? `${r.employee.firstName} ${r.employee.lastName}`.trim() : "";
        row["Work Email"] = r.employee?.workEmail || "";
        row["Department"] = r.employee?.department || "";
        row["Date"] = r.date ? new Date(r.date).toISOString().split("T")[0] : "";
        row["Clock In"] = r.clockInTime ? new Date(r.clockInTime).toLocaleTimeString("en-IN") : "";
        row["Clock Out"] = r.clockOutTime ? new Date(r.clockOutTime).toLocaleTimeString("en-IN") : "";
        row["Total Active Hours"] = r.totalActiveHours;
        row["Status"] = r.currentStatus;
      } else if (moduleKey === "leaves") {
        row["Employee ID"] = r.employee?.employeeId || "";
        row["Employee Name"] = r.employee ? `${r.employee.firstName} ${r.employee.lastName}`.trim() : "";
        row["Leave Type"] = r.leaveType;
        row["Start Date"] = r.startDate ? new Date(r.startDate).toISOString().split("T")[0] : "";
        row["End Date"] = r.endDate ? new Date(r.endDate).toISOString().split("T")[0] : "";
        row["Total Days"] = r.totalDays;
        row["Reason"] = r.reason;
        row["Status"] = r.finalStatus;
      } else if (moduleKey === "calendar") {
        row["Event Title"] = r.title;
        row["Date"] = r.date ? new Date(r.date).toISOString().split("T")[0] : "";
        row["Type"] = r.type;
        row["Start Time"] = r.startTime || "";
        row["End Time"] = r.endTime || "";
        row["Description"] = r.description || "";
      } else {
        // Fallback: strip sensitive keys
        for (const [k, v] of Object.entries(r)) {
          if (!["passwordHash", "encryptedPassword", "visiblePassword", "otp", "otpExpiry", "otpAttempts"].includes(k)) {
            row[k] = v;
          }
        }
      }

      return row;
    });

    const filename = `bharatedge_${moduleKey}_${scope}_${new Date().toISOString().split("T")[0]}`;

    // Generate Excel or CSV
    const worksheet = XLSX.utils.json_to_sheet(formattedData.length > 0 ? formattedData : [{}]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, config.label.slice(0, 31));

    if (format === "csv") {
      const csvContent = XLSX.utils.sheet_to_csv(worksheet);
      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}.csv"`,
        },
      });
    }

    const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error("[Bulk Export API Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate export file." },
      { status: 500 }
    );
  }
}
