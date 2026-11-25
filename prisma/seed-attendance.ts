import { PrismaClient, TrackerStatus } from "@prisma/client";

const prisma = new PrismaClient();

function getNormalizedDate(date = new Date()): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function main() {
  console.log("Seeding realistic Attendance and AttendanceSession records...");

  const employees = await prisma.employee.findMany();
  if (employees.length === 0) {
    console.log("No employees found to seed attendance for.");
    return;
  }

  const today = getNormalizedDate(new Date());

  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  // Status distributions for realistic demo
  const samplePlans = [
    {
      empId: "BE-EMP-001", // Rajesh Iyer (HR)
      todayStatus: TrackerStatus.ACTIVE,
      clockInOffsetHours: 7.5, // 09:00 AM (if now is ~16:30)
      sessions: [
        { startOffset: 7.5, endOffset: 3.5, status: TrackerStatus.ACTIVE }, // 9:00 - 13:00 (4h)
        { startOffset: 3.5, endOffset: 3.0, status: TrackerStatus.IDLE },   // 13:00 - 13:30 (30m break)
        { startOffset: 3.0, endOffset: 0, status: TrackerStatus.ACTIVE },    // 13:30 - ongoing
      ],
    },
    {
      empId: "BE-EMP-002", // Vimlendu Mishra (Managing Director & Super Admin)
      todayStatus: TrackerStatus.ACTIVE,
      clockInOffsetHours: 8.0,
      sessions: [
        { startOffset: 8.0, endOffset: 4.0, status: TrackerStatus.ACTIVE },
        { startOffset: 4.0, endOffset: 3.2, status: TrackerStatus.IDLE },
        { startOffset: 3.2, endOffset: 0, status: TrackerStatus.ACTIVE },
      ],
    },
    {
      empId: "BE-EMP-003", // Aanya Singhania (CRM)
      todayStatus: TrackerStatus.IDLE,
      clockInOffsetHours: 6.5,
      sessions: [
        { startOffset: 6.5, endOffset: 1.0, status: TrackerStatus.ACTIVE },
        { startOffset: 1.0, endOffset: 0, status: TrackerStatus.IDLE }, // currently idle for break
      ],
    },
    {
      empId: "BE-EMP-004", // Pooja Deshmukh (Support)
      todayStatus: TrackerStatus.ACTIVE,
      clockInOffsetHours: 7.0,
      sessions: [
        { startOffset: 7.0, endOffset: 0, status: TrackerStatus.ACTIVE },
      ],
    },
    {
      empId: "BE-EMP-005", // Kavita Patel (HR)
      todayStatus: TrackerStatus.CLOCKED_OUT,
      clockInOffsetHours: 8.5,
      clockOutOffsetHours: 0.5,
      sessions: [
        { startOffset: 8.5, endOffset: 4.5, status: TrackerStatus.ACTIVE },
        { startOffset: 4.5, endOffset: 4.0, status: TrackerStatus.IDLE },
        { startOffset: 4.0, endOffset: 0.5, status: TrackerStatus.ACTIVE },
      ],
    },
    {
      empId: "BE-EMP-006", // Rohan Mehta (Sales)
      todayStatus: TrackerStatus.ACTIVE,
      clockInOffsetHours: 6.0,
      sessions: [
        { startOffset: 6.0, endOffset: 0, status: TrackerStatus.ACTIVE },
      ],
    },
    {
      empId: "BE-EMP-007", // Sneha Kulkarni (Support)
      todayStatus: TrackerStatus.IDLE,
      clockInOffsetHours: 7.2,
      sessions: [
        { startOffset: 7.2, endOffset: 2.0, status: TrackerStatus.ACTIVE },
        { startOffset: 2.0, endOffset: 0, status: TrackerStatus.IDLE },
      ],
    },
    {
      empId: "BE-EMP-008", // Arjun Nair (Engineering)
      todayStatus: TrackerStatus.ACTIVE,
      clockInOffsetHours: 8.0,
      sessions: [
        { startOffset: 8.0, endOffset: 3.8, status: TrackerStatus.ACTIVE },
        { startOffset: 3.8, endOffset: 3.3, status: TrackerStatus.IDLE },
        { startOffset: 3.3, endOffset: 0, status: TrackerStatus.ACTIVE },
      ],
    },
    {
      empId: "BE-EMP-891", // Vrunda Fadadu (HR)
      todayStatus: TrackerStatus.ACTIVE,
      clockInOffsetHours: 7.0,
      sessions: [
        { startOffset: 7.0, endOffset: 0, status: TrackerStatus.ACTIVE },
      ],
    },
  ];

  const now = new Date();

  for (const plan of samplePlans) {
    const emp = employees.find((e) => e.employeeId === plan.empId);
    if (!emp) continue;

    // 1. Seed Yesterday Record (Completed full day shift)
    const yesterdayIn = new Date(yesterday);
    yesterdayIn.setUTCHours(9, 15, 0, 0);
    const yesterdayOut = new Date(yesterday);
    yesterdayOut.setUTCHours(18, 0, 0, 0);

    const yesterdayAtt = await prisma.attendance.upsert({
      where: {
        employeeId_date: {
          employeeId: emp.id,
          date: yesterday,
        },
      },
      update: {
        clockInTime: yesterdayIn,
        clockOutTime: yesterdayOut,
        currentStatus: TrackerStatus.CLOCKED_OUT,
        totalActiveHours: 8.25,
      },
      create: {
        employeeId: emp.id,
        date: yesterday,
        clockInTime: yesterdayIn,
        clockOutTime: yesterdayOut,
        currentStatus: TrackerStatus.CLOCKED_OUT,
        totalActiveHours: 8.25,
      },
    });

    // 2. Seed Today Record
    const clockInTime = new Date(now.getTime() - plan.clockInOffsetHours * 3600 * 1000);
    const clockOutTime =
      plan.clockOutOffsetHours != null
        ? new Date(now.getTime() - plan.clockOutOffsetHours * 3600 * 1000)
        : null;

    // Delete existing sessions to recreate clean realistic timeline
    const existingToday = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: emp.id,
          date: today,
        },
      },
    });
    if (existingToday) {
      await prisma.attendanceSession.deleteMany({
        where: { attendanceId: existingToday.id },
      });
    }

    const todayAtt = await prisma.attendance.upsert({
      where: {
        employeeId_date: {
          employeeId: emp.id,
          date: today,
        },
      },
      update: {
        clockInTime,
        clockOutTime,
        currentStatus: plan.todayStatus,
      },
      create: {
        employeeId: emp.id,
        date: today,
        clockInTime,
        clockOutTime,
        currentStatus: plan.todayStatus,
        totalActiveHours: 0,
      },
    });

    let totalActiveMins = 0;

    for (const s of plan.sessions) {
      const sStart = new Date(now.getTime() - s.startOffset * 3600 * 1000);
      const isOngoing = s.endOffset === 0 && plan.todayStatus !== TrackerStatus.CLOCKED_OUT;
      const sEnd = isOngoing ? null : new Date(now.getTime() - s.endOffset * 3600 * 1000);
      const diffMs = (sEnd ? sEnd.getTime() : now.getTime()) - sStart.getTime();
      const durationMinutes = Math.max(0, Number((diffMs / 60000).toFixed(2)));

      if (s.status === TrackerStatus.ACTIVE) {
        totalActiveMins += durationMinutes;
      }

      await prisma.attendanceSession.create({
        data: {
          attendanceId: todayAtt.id,
          startTime: sStart,
          endTime: sEnd,
          status: s.status,
          durationMinutes: isOngoing ? null : durationMinutes,
        },
      });
    }

    const totalActiveHours = Number((totalActiveMins / 60).toFixed(2));
    await prisma.attendance.update({
      where: { id: todayAtt.id },
      data: { totalActiveHours },
    });

    console.log(
      `✓ Seeded attendance for ${emp.employeeId} - ${emp.firstName} ${emp.lastName} (${plan.todayStatus}, ${totalActiveHours} hrs)`
    );
  }

  console.log("Seeding attendance completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
