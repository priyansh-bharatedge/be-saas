import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getCalendarDataAction } from "@/lib/actions/calendar";
import PageTransition from "@/components/animations/PageTransition";
import HRMSCalendarView from "@/components/calendar/HRMSCalendarView";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Enterprise Calendar & Events • BharatEdge HRMS",
  description: "Monthly enterprise schedule, public holidays, and employee attendance timeline",
};

export default async function HRMSCalendarPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const today = new Date();
  const currentMonth = today.getMonth() + 1; // 1-12
  const currentYear = today.getFullYear();

  const calendarRes = await getCalendarDataAction({
    month: currentMonth,
    year: currentYear,
  });

  const initialEvents = calendarRes.success && calendarRes.data ? calendarRes.data.events : [];
  const initialAttendance =
    calendarRes.success && calendarRes.data ? calendarRes.data.attendanceDays : [];
  const isHRAdmin = calendarRes.success && calendarRes.data ? calendarRes.data.isHRAdmin : false;

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Company Calendar &amp; Schedule
              </h1>
              <span className="text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full bg-[#EBF3F6] text-[#588594] border border-[#ACCAD5]/50 font-semibold">
                Dynamic Sync
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Enterprise timeline, holidays, team syncs, and your personal daily attendance logs.
            </p>
          </div>
        </div>

        {/* Dynamic Light Glassmorphic Calendar View */}
        <HRMSCalendarView
          initialEvents={initialEvents}
          initialAttendance={initialAttendance}
          initialMonth={currentMonth}
          initialYear={currentYear}
          isHRAdmin={isHRAdmin}
        />
      </div>
    </PageTransition>
  );
}
