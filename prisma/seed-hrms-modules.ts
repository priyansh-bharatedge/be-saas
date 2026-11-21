import { PrismaClient, LeaveType, ApprovalStatus, CalendarEventType, PolicyStatus } from "@prisma/client";

const prisma = new PrismaClient();

function getNormalizedDate(date = new Date()): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function main() {
  console.log("Seeding Leave balances, Leave requests, Calendar events, and Company policies...");

  const employees = await prisma.employee.findMany();
  if (employees.length === 0) {
    console.log("No employees found.");
    return;
  }

  // 1. Seed Leave Balances for all employees (Year 2026)
  for (const emp of employees) {
    const balances = [
      { leaveType: LeaveType.CASUAL, allocatedDays: 12, usedDays: 2, remainingDays: 10 },
      { leaveType: LeaveType.SICK, allocatedDays: 10, usedDays: 1, remainingDays: 9 },
      { leaveType: LeaveType.EARNED, allocatedDays: 15, usedDays: 3, remainingDays: 12 },
    ];

    for (const b of balances) {
      await prisma.leaveBalance.upsert({
        where: {
          employeeId_leaveType_year: {
            employeeId: emp.id,
            leaveType: b.leaveType,
            year: 2026,
          },
        },
        update: {
          allocatedDays: b.allocatedDays,
          usedDays: b.usedDays,
          remainingDays: b.remainingDays,
        },
        create: {
          employeeId: emp.id,
          leaveType: b.leaveType,
          year: 2026,
          allocatedDays: b.allocatedDays,
          usedDays: b.usedDays,
          remainingDays: b.remainingDays,
        },
      });
    }
  }
  console.log("✓ Seeded Leave Balances for all employees.");

  // Find key staff for multi-tier approval seeding
  const hrAdmin = employees.find((e) => e.systemRole === "HR_ADMIN") || employees[0];
  const teamLeader = employees.find((e) => e.systemRole === "TEAM_LEADER") || employees[1];
  const member = employees.find((e) => e.systemRole === "TEAM_MEMBER") || employees[2];

  // 2. Seed Sample Leave Requests with 2-tier approval workflow states
  const today = getNormalizedDate();

  // Request 1: Approved by TL & HR (Final Approved)
  const req1Start = new Date(today);
  req1Start.setUTCDate(req1Start.getUTCDate() - 10);
  const req1End = new Date(req1Start);
  req1End.setUTCDate(req1End.getUTCDate() + 1);

  await prisma.leaveRequest.create({
    data: {
      employeeId: member.id,
      leaveType: LeaveType.CASUAL,
      startDate: req1Start,
      endDate: req1End,
      totalDays: 2,
      reason: "Family wedding and personal commitments in hometown.",
      teamLeaderId: teamLeader.id,
      tlStatus: ApprovalStatus.APPROVED,
      tlComments: "Approved. Handover completed with Rohan.",
      tlReviewedAt: new Date(req1Start.getTime() - 86400000 * 3),
      hrAdminId: hrAdmin.id,
      hrStatus: ApprovalStatus.APPROVED,
      hrComments: "Leave granted per company policy.",
      hrReviewedAt: new Date(req1Start.getTime() - 86400000 * 2),
      finalStatus: ApprovalStatus.APPROVED,
    },
  });

  // Request 2: Pending HR Approval (Approved by TL)
  const req2Start = new Date(today);
  req2Start.setUTCDate(req2Start.getUTCDate() + 4);
  const req2End = new Date(req2Start);
  req2End.setUTCDate(req2End.getUTCDate() + 2);

  await prisma.leaveRequest.create({
    data: {
      employeeId: member.id,
      leaveType: LeaveType.EARNED,
      startDate: req2Start,
      endDate: req2End,
      totalDays: 3,
      reason: "Annual vacation and personal travel.",
      teamLeaderId: teamLeader.id,
      tlStatus: ApprovalStatus.APPROVED,
      tlComments: "Coverage planned. Approved from TL side.",
      tlReviewedAt: new Date(),
      hrAdminId: hrAdmin.id,
      hrStatus: ApprovalStatus.PENDING,
      finalStatus: ApprovalStatus.PENDING,
    },
  });

  // Request 3: Pending TL Approval (New Submission)
  const req3Start = new Date(today);
  req3Start.setUTCDate(req3Start.getUTCDate() + 8);

  await prisma.leaveRequest.create({
    data: {
      employeeId: employees[3].id,
      leaveType: LeaveType.SICK,
      startDate: req3Start,
      endDate: req3Start,
      totalDays: 1,
      reason: "Doctor consultation and routine medical checkup.",
      teamLeaderId: teamLeader.id,
      tlStatus: ApprovalStatus.PENDING,
      hrStatus: ApprovalStatus.PENDING,
      finalStatus: ApprovalStatus.PENDING,
    },
  });
  console.log("✓ Seeded sample Leave Requests across workflow stages.");

  // 3. Seed Calendar Events (Holidays & Company Events)
  const calendarEvents = [
    {
      title: "Republic Day",
      date: new Date("2026-01-26"),
      type: CalendarEventType.HOLIDAY,
      description: "National Holiday - All offices closed",
    },
    {
      title: "Holi Festival",
      date: new Date("2026-03-04"),
      type: CalendarEventType.HOLIDAY,
      description: "Festival of Colors - Company holiday",
    },
    {
      title: "Q4 Strategy & Town Hall",
      date: new Date(today.getFullYear(), today.getMonth(), 5),
      type: CalendarEventType.IMPORTANT,
      startTime: "10:00",
      endTime: "12:00",
      description: "All-hands company town hall with executive leadership.",
      createdBy: "HR Operations",
    },
    {
      title: "Sprint Planning & Sync",
      date: new Date(today.getFullYear(), today.getMonth(), 8),
      type: CalendarEventType.EVENT,
      startTime: "11:30",
      endTime: "13:00",
      description: "Bi-weekly sprint planning and departmental sync call.",
      createdBy: "Engineering & IT",
    },
    {
      title: "Marketing Campaign Review",
      date: new Date(today.getFullYear(), today.getMonth(), 15),
      type: CalendarEventType.EVENT,
      startTime: "14:00",
      endTime: "15:30",
      description: "Review of Q4 multi-channel growth campaigns and enterprise leads.",
      createdBy: "Sales & CRM",
    },
    {
      title: "Architecture & Cloud Security",
      date: new Date(today.getFullYear(), today.getMonth(), 20),
      type: CalendarEventType.IMPORTANT,
      startTime: "16:00",
      endTime: "17:30",
      description: "Deep dive on AWS VPC architecture, RBAC audits, and microservices.",
      createdBy: "Arjun Nair",
    },
    {
      title: "Monthly HR Wellness & Yoga",
      date: new Date(today.getFullYear(), today.getMonth(), 22),
      type: CalendarEventType.EVENT,
      startTime: "08:30",
      endTime: "09:30",
      description: "Workplace mental health and ergonomics workshop.",
      createdBy: "Rajesh Iyer",
    },
    {
      title: "Quarterly Financial Audit",
      date: new Date(today.getFullYear(), today.getMonth(), 28),
      type: CalendarEventType.IMPORTANT,
      startTime: "10:00",
      endTime: "13:00",
      description: "Statutory audit review with external auditing partners.",
      createdBy: "Executive Management",
    },
  ];

  for (const ev of calendarEvents) {
    await prisma.calendarEvent.create({
      data: {
        title: ev.title,
        date: getNormalizedDate(ev.date),
        type: ev.type,
        startTime: ev.startTime || null,
        endTime: ev.endTime || null,
        description: ev.description || null,
        createdBy: ev.createdBy || "System Admin",
      },
    });
  }
  console.log("✓ Seeded Calendar Events & Holidays.");

  // 4. Seed Company Policies
  const policies = [
    {
      title: "Code of Business Conduct & Ethics",
      category: "Workplace Conduct",
      content: `## 1. Objective & Scope
BharatEdge Services is committed to integrity, professionalism, and mutual respect. This code governs the standard of behavior expected from every employee, contractor, and executive.

### 2. Core Principles
* **Integrity & Honesty**: Absolute truthfulness in enterprise communications, client contracts, and operational deliverables.
* **Non-Discrimination & Equal Opportunity**: Zero tolerance for discrimination based on gender, caste, religion, age, or disability.
* **Conflict of Interest**: Employees must disclose any personal financial interest or advisory roles in competing enterprises.

### 3. Disciplinary Actions
Violation of this code may lead to corrective counseling, formal reprimand, or termination of employment in severe cases.`,
      documentUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      effectiveDate: new Date("2026-01-01"),
      status: PolicyStatus.PUBLISHED,
      createdBy: "Head of People & HRMS",
    },
    {
      title: "Comprehensive Leave & Attendance Policy",
      category: "Leave & Attendance",
      content: `## 1. Annual Leave Entitlements
All full-time staff at BharatEdge are credited with:
* **Casual Leave (CL)**: 12 days per calendar year for personal engagements and unforeseen needs.
* **Sick Leave (SL)**: 10 days per calendar year. Medical certificate required for absences exceeding 2 consecutive days.
* **Earned/Privilege Leave (EL)**: 15 days per year, credited pro-rata quarterly.

### 2. Two-Tier Approval Process
1. **Tier 1 (Team Leader Review)**: All leave requests must be submitted at least 48 hours in advance (except medical emergencies) and approved by the assigned Team Leader.
2. **Tier 2 (HR Admin Verification)**: Following TL approval, HR Operations validates leave balances and grants final confirmation.

### 3. Biometric & Remote Clock-In
Employees must maintain at least 8 net working hours daily. An automated 5-minute inactivity tracker pauses logging during extended idle periods to preserve time accuracy.`,
      documentUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      effectiveDate: new Date("2026-01-01"),
      status: PolicyStatus.PUBLISHED,
      createdBy: "Rajesh Iyer",
    },
    {
      title: "Information Security & Clean Desk Policy",
      category: "IT & Data Security",
      content: `## 1. Data Classification
All client data, source code, and enterprise databases are classified as **Confidential - Proprietary**.

### 2. Security Protocols
* **Multi-Factor Authentication (MFA)**: Mandatory on all enterprise email and cloud accounts.
* **Device Encryption**: BitLocker/FileVault encryption must remain active on all corporate laptops.
* **Clean Desk & Screen Locking**: Employees must lock workstations (\`Win + L\` or \`Cmd + Ctrl + Q\`) whenever leaving desks.

### 3. Incident Reporting
Any suspected security breach, phishing email, or credential compromise must be reported immediately to \`security@bharatedge.com\`.`,
      documentUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      effectiveDate: new Date("2026-01-15"),
      status: PolicyStatus.PUBLISHED,
      createdBy: "Arjun Nair",
    },
    {
      title: "Prevention of Sexual Harassment (POSH) Policy",
      category: "Workplace Safety",
      content: `## 1. Statement of Commitment
BharatEdge Services is dedicated to providing a safe, respectful, and dignified work environment free from any form of sexual harassment or intimidation.

### 2. Internal Complaints Committee (ICC)
The ICC is headed by a Senior Woman Leader and includes independent external NGO representation.
* Presiding Officer: **Aanya Singhania**
* Member Secretary: **Kavita Patel**
* Independent External Member: Legal Counsel Representative

### 3. Redressal Timeline
Inquiries are completed within 90 days of complaint submission with complete confidentiality and non-retaliation protections.`,
      documentUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      effectiveDate: new Date("2026-02-01"),
      status: PolicyStatus.PUBLISHED,
      createdBy: "Executive Committee",
    },
    {
      title: "Corporate Travel & Expense Reimbursement Policy",
      category: "Compensation & Benefits",
      content: `## 1. Domestic Travel Allowances
* **Air Travel**: Economy class for flights exceeding 4 hours.
* **Hotel Accommodation**: Up to ₹4,500/night in Tier-1 metros (Mumbai, Delhi-NCR, Bengaluru) and ₹3,200/night in other locations.
* **Daily Per Diem (Food & Local Transport)**: Up to ₹1,200/day with itemized GST invoices.

### 2. Submission & Reimbursement Cycle
All expense vouchers must be submitted via the HRMS portal within 15 days of journey completion. Approved reimbursements are settled in the subsequent payroll cycle.`,
      documentUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      effectiveDate: new Date("2026-02-15"),
      status: PolicyStatus.PUBLISHED,
      createdBy: "Finance & Operations",
    },
  ];

  for (const pol of policies) {
    await prisma.companyPolicy.create({
      data: pol,
    });
  }
  console.log("✓ Seeded Company Policies.");

  console.log("All HRMS Modules successfully seeded!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
