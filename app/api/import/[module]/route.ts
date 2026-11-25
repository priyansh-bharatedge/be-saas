import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { MODULE_REGISTRY } from "@/lib/import-export/registry";
import { db } from "@/lib/db";
import { Role, SystemRole, Prisma, LeadStatus, QuotationStatus, SalaryEntity, PaymentType, PaymentVerificationStatus, DealStage, OperationStage, TrackerStatus, LeaveType, ApprovalStatus, CalendarEventType } from "@prisma/client";

export const dynamic = "force-dynamic";

function parseCleanNumber(val: any): number | null {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number") return isNaN(val) ? null : val;
  const cleaned = String(val).replace(/[^0-9.-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parseCleanDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  // If Excel numeric serial date (e.g. 45200)
  if (typeof val === "number") {
    // Excel base date Dec 30 1899
    const utcDays = val - 25569;
    const utcValue = utcDays * 86400;
    const dateInfo = new Date(utcValue * 1000);
    return isNaN(dateInfo.getTime()) ? null : dateInfo;
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

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

    const isSuperAdmin =
      user.role === Role.Admin || user.systemRole === SystemRole.SUPER_ADMIN;
    const isHrAdmin =
      isSuperAdmin ||
      user.systemRole === SystemRole.HR_ADMIN ||
      (user.department || "").toLowerCase().includes("hr");

    // Check RBAC permission for import
    if (config.restrictedImportRoles && config.restrictedImportRoles.length > 0) {
      const allowed =
        isSuperAdmin ||
        (user.systemRole && config.restrictedImportRoles.includes(user.systemRole));
      if (!allowed) {
        return NextResponse.json(
          { error: "Forbidden: Super Admin or HR Admin authorization required to import records for this module." },
          { status: 403 }
        );
      }
    }

    const body = await req.json().catch(() => ({}));
    const { dryRun = false, rows = [], options = {} } = body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "No records provided for import." },
        { status: 400 }
      );
    }

    // 1. Validation & Relational Lookups
    const validationErrors: { rowNumber: number; field: string; message: string; rawValue?: any }[] = [];
    const validRows: any[] = [];

    // Pre-fetch caches for fast relational lookups
    let clientPhoneMap = new Map<string, string>(); // phone -> clientId
    let employeeEmailMap = new Map<string, string>(); // workEmail -> employeeId
    let dealNumberMap = new Map<string, string>(); // dealNumber -> dealId

    if (moduleKey === "payments") {
      const allClients = await db.client.findMany({ select: { id: true, phone: true } });
      allClients.forEach((c) => clientPhoneMap.set(c.phone.trim(), c.id));
    }

    if (moduleKey === "operations") {
      const allDeals = await db.deal.findMany({
        where: { dealNumber: { not: null } },
        select: { id: true, dealNumber: true },
      });
      allDeals.forEach((d) => d.dealNumber && dealNumberMap.set(d.dealNumber.trim(), d.id));
    }

    if (["attendance", "leaves"].includes(moduleKey)) {
      const allEmployees = await db.employee.findMany({ select: { id: true, workEmail: true } });
      allEmployees.forEach((e) => employeeEmailMap.set(e.workEmail.toLowerCase().trim(), e.id));
    }

    for (let i = 0; i < rows.length; i++) {
      const rawRow = rows[i];
      const rowNum = i + 1;
      let hasRowError = false;
      const cleanRow: Record<string, any> = {};

      for (const field of config.fields) {
        let val = rawRow[field.key];

        // Check required
        if (field.required && (val === undefined || val === null || String(val).trim() === "")) {
          validationErrors.push({
            rowNumber: rowNum,
            field: field.label,
            message: `${field.label} is required.`,
            rawValue: val,
          });
          hasRowError = true;
          continue;
        }

        if (val !== undefined && val !== null && String(val).trim() !== "") {
          if (field.type === "number") {
            const parsedNum = parseCleanNumber(val);
            if (parsedNum === null) {
              validationErrors.push({
                rowNumber: rowNum,
                field: field.label,
                message: `Must be a valid number.`,
                rawValue: val,
              });
              hasRowError = true;
            } else {
              cleanRow[field.key] = parsedNum;
            }
          } else if (field.type === "date") {
            const parsedDate = parseCleanDate(val);
            if (!parsedDate) {
              validationErrors.push({
                rowNumber: rowNum,
                field: field.label,
                message: `Must be a valid date (YYYY-MM-DD).`,
                rawValue: val,
              });
              hasRowError = true;
            } else {
              cleanRow[field.key] = parsedDate;
            }
          } else if (field.type === "boolean") {
            const strVal = String(val).toLowerCase().trim();
            cleanRow[field.key] = strVal === "true" || strVal === "1" || strVal === "yes" || strVal === "active";
          } else if (field.type === "enum" && field.enumValues) {
            const cleanStr = String(val).trim().toUpperCase();
            const matchedEnum = field.enumValues.find((e) => e.toUpperCase() === cleanStr);
            if (!matchedEnum) {
              validationErrors.push({
                rowNumber: rowNum,
                field: field.label,
                message: `Value must be one of: ${field.enumValues.join(", ")}`,
                rawValue: val,
              });
              hasRowError = true;
            } else {
              cleanRow[field.key] = matchedEnum;
            }
          } else {
            cleanRow[field.key] = String(val).trim();
          }
        } else {
          cleanRow[field.key] = null;
        }
      }

      // Relational checks
      if (!hasRowError) {
        if (moduleKey === "payments") {
          const phone = String(cleanRow.clientPhone || "").trim();
          const clientId = clientPhoneMap.get(phone);
          if (!clientId) {
            validationErrors.push({
              rowNumber: rowNum,
              field: "Client Phone Number",
              message: `No existing client matches phone "${phone}". Please register client first.`,
              rawValue: phone,
            });
            hasRowError = true;
          } else {
            cleanRow.clientId = clientId;
          }
        } else if (moduleKey === "operations") {
          const dealNum = String(cleanRow.dealNumber || "").trim();
          const dealId = dealNumberMap.get(dealNum);
          if (!dealId) {
            validationErrors.push({
              rowNumber: rowNum,
              field: "Parent Deal Number",
              message: `Deal "${dealNum}" does not exist.`,
              rawValue: dealNum,
            });
            hasRowError = true;
          } else {
            cleanRow.dealId = dealId;
          }
        } else if (["attendance", "leaves"].includes(moduleKey)) {
          const email = String(cleanRow.workEmail || "").toLowerCase().trim();
          const empId = employeeEmailMap.get(email);
          if (!empId) {
            validationErrors.push({
              rowNumber: rowNum,
              field: "Official Work Email",
              message: `No employee found with work email "${email}".`,
              rawValue: email,
            });
            hasRowError = true;
          } else {
            cleanRow.employeeId = empId;
          }
        }
      }

      if (!hasRowError) {
        validRows.push(cleanRow);
      }
    }

    // DRY RUN RETURN
    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        total: rows.length,
        validCount: validRows.length,
        errorCount: validationErrors.length,
        errors: validationErrors,
        sampleValidRows: validRows.slice(0, 3),
      });
    }

    // 2. ACTUAL BATCH INSERTION
    if (validRows.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No valid rows to import.",
        total: rows.length,
        validCount: 0,
        errorCount: validationErrors.length,
        errors: validationErrors,
      }, { status: 400 });
    }

    let createdCount = 0;
    const executionErrors: string[] = [];

    switch (moduleKey) {
      case "leads": {
        const baseCount = await db.lead.count();
        for (let i = 0; i < validRows.length; i++) {
          const r = validRows[i];
          const leadNumber = `LEAD-${String(baseCount + i + 1).padStart(4, "0")}`;
          try {
            await db.lead.create({
              data: {
                leadNumber,
                name: r.name,
                phone: r.phone,
                email: r.email,
                companyName: r.companyName,
                source: r.source || "BULK_IMPORT",
                status: (r.status as LeadStatus) || LeadStatus.NEW,
                estimatedBudget: r.estimatedBudget ? new Prisma.Decimal(r.estimatedBudget) : null,
                notes: r.notes,
                assignedEmployeeId: user.id,
                createdById: user.id,
              },
            });
            createdCount++;
          } catch (e: any) {
            executionErrors.push(`Row ${i + 1} (${r.name}): ${e.message}`);
          }
        }
        break;
      }

      case "clients": {
        const baseCount = await db.client.count();
        for (let i = 0; i < validRows.length; i++) {
          const r = validRows[i];
          const clientNumber = `CLI-${String(baseCount + i + 1).padStart(4, "0")}`;
          try {
            await db.client.create({
              data: {
                clientNumber,
                name: r.name,
                phone: r.phone,
                alternatePhone: r.alternatePhone,
                email: r.email,
                gender: r.gender,
                companyName: r.companyName,
                gstNumber: r.gstNumber,
                panNumber: r.panNumber,
                address: r.address,
                city: r.city,
                state: r.state,
                country: r.country || "India",
                assignedEmployeeId: user.id,
                createdById: user.id,
              },
            });
            createdCount++;
          } catch (e: any) {
            executionErrors.push(`Row ${i + 1} (${r.name}): ${e.message}`);
          }
        }
        break;
      }

      case "companies": {
        for (let i = 0; i < validRows.length; i++) {
          const r = validRows[i];
          try {
            await db.company.create({
              data: {
                name: r.name,
                industry: r.industry,
                companyType: r.companyType,
                incorporatedDate: r.incorporatedDate,
                website: r.website,
                gstNumber: r.gstNumber,
                panNumber: r.panNumber,
                address: r.address,
                city: r.city,
                state: r.state,
                country: r.country || "India",
                createdById: user.id,
              },
            });
            createdCount++;
          } catch (e: any) {
            executionErrors.push(`Row ${i + 1} (${r.name}): ${e.message}`);
          }
        }
        break;
      }

      case "services": {
        for (let i = 0; i < validRows.length; i++) {
          const r = validRows[i];
          try {
            await db.service.upsert({
              where: { name: r.name },
              create: {
                name: r.name,
                code: r.code,
                category: r.category,
                minimumPrice: new Prisma.Decimal(r.minimumPrice),
                outsourcePrice: new Prisma.Decimal(r.outsourcePrice || 0),
                sacCode: r.sacCode,
                defaultGstRate: r.defaultGstRate || 18,
                description: r.description,
                isActive: r.isActive !== false,
              },
              update: {
                code: r.code,
                category: r.category,
                minimumPrice: new Prisma.Decimal(r.minimumPrice),
                outsourcePrice: new Prisma.Decimal(r.outsourcePrice || 0),
                sacCode: r.sacCode,
                defaultGstRate: r.defaultGstRate || 18,
                description: r.description,
                isActive: r.isActive !== false,
              },
            });
            createdCount++;
          } catch (e: any) {
            executionErrors.push(`Row ${i + 1} (${r.name}): ${e.message}`);
          }
        }
        break;
      }

      case "prospects": {
        // Find or create a default prospect sheet
        let targetSheetId = options.sheetId;
        if (!targetSheetId) {
          const firstSheet = await db.prospectSheet.findFirst();
          if (firstSheet) {
            targetSheetId = firstSheet.id;
          } else {
            const tab = await db.prospectTab.create({
              data: { name: "Default Prospects" },
            });
            const sheet = await db.prospectSheet.create({
              data: { name: "Sheet 1", tabId: tab.id },
            });
            targetSheetId = sheet.id;
          }
        }

        let rowIndex = await db.prospectRow.count({ where: { sheetId: targetSheetId } });
        for (let i = 0; i < validRows.length; i++) {
          const r = validRows[i];
          rowIndex++;
          try {
            await db.prospectRow.create({
              data: {
                sheetId: targetSheetId,
                rowIndex,
                assignedBdmId: user.id,
                data: r,
              },
            });
            createdCount++;
          } catch (e: any) {
            executionErrors.push(`Row ${i + 1}: ${e.message}`);
          }
        }
        break;
      }

      case "quotations": {
        const baseCount = await db.quotation.count();
        for (let i = 0; i < validRows.length; i++) {
          const r = validRows[i];
          const quotationNumber = `QT-${String(baseCount + i + 1).padStart(4, "0")}`;
          try {
            await db.quotation.create({
              data: {
                quotationNumber,
                clientName: r.clientName,
                clientPhone: r.clientPhone,
                clientEmail: r.clientEmail,
                companyName: r.companyName,
                subTotal: new Prisma.Decimal(r.subTotal),
                discountAmount: new Prisma.Decimal(r.discountAmount || 0),
                gstRate: r.gstRate || 18,
                gstAmount: new Prisma.Decimal(
                  ((r.subTotal - (r.discountAmount || 0)) * (r.gstRate || 18)) / 100
                ),
                grandTotal: new Prisma.Decimal(r.grandTotal),
                status: (r.status as QuotationStatus) || QuotationStatus.DRAFT,
                terms: r.terms,
                preparedById: user.id,
              },
            });
            createdCount++;
          } catch (e: any) {
            executionErrors.push(`Row ${i + 1} (${r.clientName}): ${e.message}`);
          }
        }
        break;
      }

      case "payments": {
        const baseCount = await db.paymentRecord.count();
        for (let i = 0; i < validRows.length; i++) {
          const r = validRows[i];
          const receiptNumber = `REC-${String(baseCount + i + 1).padStart(4, "0")}`;
          try {
            await db.paymentRecord.create({
              data: {
                receiptNumber,
                clientId: r.clientId,
                amount: new Prisma.Decimal(r.amount),
                bankType: (r.bankType as SalaryEntity) || SalaryEntity.BSPL,
                paymentType: (r.paymentType as PaymentType) || PaymentType.FIRST_PAYMENT,
                status: PaymentVerificationStatus.UNVERIFIED,
                paymentMode: r.paymentMode || "BANK_TRANSFER",
                transactionRef: r.transactionRef,
                paymentDate: r.paymentDate || new Date(),
                remarks: r.remarks,
                recordedById: user.id,
              },
            });
            createdCount++;
          } catch (e: any) {
            executionErrors.push(`Row ${i + 1}: ${e.message}`);
          }
        }
        break;
      }

      case "deals": {
        const baseCount = await db.deal.count();
        for (let i = 0; i < validRows.length; i++) {
          const r = validRows[i];
          const dealNumber = `DEAL-${new Date().getFullYear()}-${String(baseCount + i + 1).padStart(4, "0")}`;
          try {
            await db.deal.create({
              data: {
                dealNumber,
                title: r.title,
                companyName: r.companyName,
                contactPhone: r.contactPhone,
                contactEmail: r.contactEmail,
                value: new Prisma.Decimal(r.value),
                amountReceived: new Prisma.Decimal(r.amountReceived || 0),
                amountPending: new Prisma.Decimal(r.value - (r.amountReceived || 0)),
                stage: (r.stage as DealStage) || DealStage.LEAD,
                teamType: r.teamType,
                notes: r.notes,
                assignedEmployeeId: user.id,
              },
            });
            createdCount++;
          } catch (e: any) {
            executionErrors.push(`Row ${i + 1} (${r.title}): ${e.message}`);
          }
        }
        break;
      }

      case "operations": {
        const baseCount = await db.internalOperation.count();
        for (let i = 0; i < validRows.length; i++) {
          const r = validRows[i];
          const operationNumber = `OPS-${String(baseCount + i + 1).padStart(4, "0")}`;
          try {
            await db.internalOperation.create({
              data: {
                operationNumber,
                dealId: r.dealId,
                serviceName: r.serviceName,
                teamType: r.teamType,
                internalStage: r.internalStage || "Doc Collection",
                status: r.status || "IN_PROGRESS",
                dueDate: r.dueDate,
                assignedTlId: user.id,
              },
            });
            createdCount++;
          } catch (e: any) {
            executionErrors.push(`Row ${i + 1}: ${e.message}`);
          }
        }
        break;
      }

      case "employees": {
        for (let i = 0; i < validRows.length; i++) {
          const r = validRows[i];
          try {
            const employee = await db.employee.create({
              data: {
                employeeId: r.employeeId,
                firstName: r.firstName,
                lastName: r.lastName,
                workEmail: r.workEmail,
                contactNumber: r.contactNumber,
                personalEmail: r.personalEmail,
                dateOfBirth: r.dateOfBirth,
                gender: r.gender,
                dateOfJoining: r.dateOfJoining,
                department: r.department,
                designation: r.designation,
                systemRole: (r.systemRole as SystemRole) || SystemRole.TEAM_MEMBER,
                employmentType: r.employmentType || "Full-Time",
                branch: r.branch || "Headquarters - Ahmedabad",
                permanentAddress: r.permanentAddress || "N/A",
                currentAddress: r.currentAddress || "N/A",
                emergencyFirstName: r.emergencyFirstName || "N/A",
                emergencyLastName: r.emergencyLastName || "N/A",
                emergencyNumber: r.emergencyNumber || "N/A",
                emergencyRelationship: r.emergencyRelationship || "N/A",
                educationQualification: r.educationQualification || "N/A",
                bankAccountNumber: r.bankAccountNumber || "N/A",
                bankName: r.bankName || "N/A",
                ifscCode: r.ifscCode || "N/A",
                panNumber: r.panNumber || "N/A",
                aadhaarNumber: r.aadhaarNumber || "N/A",
                // Default secure password hash
                passwordHash: "$2b$10$GGaEdLArZYXpp/72WEHUvO0Xu.7zefw9x4NbtNh7/GppPFDl4ru..",
              },
            });

            // Auto-seed default annual leave balances
            await db.leaveBalance.createMany({
              data: [
                { employeeId: employee.id, leaveType: "CASUAL", allocatedDays: 12, usedDays: 0, remainingDays: 12, year: new Date().getFullYear() },
                { employeeId: employee.id, leaveType: "SICK", allocatedDays: 12, usedDays: 0, remainingDays: 12, year: new Date().getFullYear() },
                { employeeId: employee.id, leaveType: "EARNED", allocatedDays: 15, usedDays: 0, remainingDays: 15, year: new Date().getFullYear() },
              ],
            });

            createdCount++;
          } catch (e: any) {
            executionErrors.push(`Row ${i + 1} (${r.workEmail}): ${e.message}`);
          }
        }
        break;
      }

      case "attendance": {
        for (let i = 0; i < validRows.length; i++) {
          const r = validRows[i];
          try {
            await db.attendance.upsert({
              where: {
                employeeId_date: {
                  employeeId: r.employeeId,
                  date: r.date,
                },
              },
              create: {
                employeeId: r.employeeId,
                date: r.date,
                totalActiveHours: r.totalActiveHours || 8,
                currentStatus: (r.currentStatus as TrackerStatus) || TrackerStatus.CLOCKED_OUT,
                remarks: r.remarks,
              },
              update: {
                totalActiveHours: r.totalActiveHours || 8,
                currentStatus: (r.currentStatus as TrackerStatus) || TrackerStatus.CLOCKED_OUT,
                remarks: r.remarks,
              },
            });
            createdCount++;
          } catch (e: any) {
            executionErrors.push(`Row ${i + 1}: ${e.message}`);
          }
        }
        break;
      }

      case "leaves": {
        for (let i = 0; i < validRows.length; i++) {
          const r = validRows[i];
          try {
            await db.leaveRequest.create({
              data: {
                employeeId: r.employeeId,
                leaveType: r.leaveType as LeaveType,
                startDate: r.startDate,
                endDate: r.endDate,
                totalDays: r.totalDays,
                reason: r.reason,
                finalStatus: (r.finalStatus as ApprovalStatus) || ApprovalStatus.APPROVED,
              },
            });
            createdCount++;
          } catch (e: any) {
            executionErrors.push(`Row ${i + 1}: ${e.message}`);
          }
        }
        break;
      }

      case "calendar": {
        for (let i = 0; i < validRows.length; i++) {
          const r = validRows[i];
          try {
            await db.calendarEvent.create({
              data: {
                title: r.title,
                date: r.date,
                type: (r.type as CalendarEventType) || CalendarEventType.EVENT,
                startTime: r.startTime,
                endTime: r.endTime,
                description: r.description,
                createdBy: user.id,
              },
            });
            createdCount++;
          } catch (e: any) {
            executionErrors.push(`Row ${i + 1} (${r.title}): ${e.message}`);
          }
        }
        break;
      }

      default:
        return NextResponse.json({ error: "Unsupported module." }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      createdCount,
      failedCount: executionErrors.length,
      errors: executionErrors,
      message: `Successfully imported ${createdCount} records into ${config.label}.`,
    });
  } catch (error: any) {
    console.error("[Bulk Import API Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process bulk import." },
      { status: 500 }
    );
  }
}
