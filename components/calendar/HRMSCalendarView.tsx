"use client";

import { useState, useTransition, useMemo } from "react";
import {
  SerializedCalendarEvent,
  SerializedEmployeeAttendanceDay,
  createCalendarEventAction,
  updateCalendarEventAction,
  deleteCalendarEventAction,
  getCalendarDataAction,
} from "@/lib/actions/calendar";
import { CalendarEventType } from "@prisma/client";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Trash2,
  Calendar as CalendarIcon,
  Sparkles,
  Info,
  Edit,
  UploadCloud,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import BulkImportWizard from "@/components/shared/BulkImportWizard";
import BulkExportMenu from "@/components/shared/BulkExportMenu";
import { toast } from "sonner";

interface HRMSCalendarViewProps {
  initialEvents: SerializedCalendarEvent[];
  initialAttendance: SerializedEmployeeAttendanceDay[];
  initialMonth: number; // 1-12
  initialYear: number;
  isHRAdmin: boolean;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function HRMSCalendarView({
  initialEvents,
  initialAttendance,
  initialMonth,
  initialYear,
  isHRAdmin,
}: HRMSCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(initialMonth); // 1-12
  const [currentYear, setCurrentYear] = useState(initialYear);
  const [events, setEvents] = useState<SerializedCalendarEvent[]>(initialEvents);
  const [attendanceDays, setAttendanceDays] = useState<SerializedEmployeeAttendanceDay[]>(initialAttendance);
  const [isPending, startTransition] = useTransition();

  // Floating Event Creation Modal State (matching reference screenshot design)
  const [modalOpen, setModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [selectedDateStr, setSelectedDateStr] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [eventType, setEventType] = useState<CalendarEventType>(CalendarEventType.EVENT);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:30");
  const [description, setDescription] = useState("");

  // Inspect detail modal state & delete confirmation
  const [detailEvent, setDetailEvent] = useState<SerializedCalendarEvent | null>(null);
  const [eventToDelete, setEventToDelete] = useState<SerializedCalendarEvent | null>(null);

  // Navigate months
  const handleMonthChange = (delta: number) => {
    let newMonth = currentMonth + delta;
    let newYear = currentYear;

    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    } else if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }

    setCurrentMonth(newMonth);
    setCurrentYear(newYear);

    startTransition(async () => {
      const res = await getCalendarDataAction({ month: newMonth, year: newYear });
      if (res.success && res.data) {
        setEvents(res.data.events);
        setAttendanceDays(res.data.attendanceDays);
      }
    });
  };

  const handleYearChange = (year: number) => {
    setCurrentYear(year);
    startTransition(async () => {
      const res = await getCalendarDataAction({ month: currentMonth, year });
      if (res.success && res.data) {
        setEvents(res.data.events);
        setAttendanceDays(res.data.attendanceDays);
      }
    });
  };

  // Generate calendar grid matrix for current month (Sundays through Saturdays)
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth - 1, 1).getDay(); // 0 for Sunday
    const daysInCurrentMonth = new Date(currentYear, currentMonth, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth - 1, 0).getDate();

    const cells: {
      dayNumber: number;
      dateStr: string;
      isCurrentMonth: boolean;
      isToday: boolean;
    }[] = [];

    const todayStr = new Date().toISOString().split("T")[0];

    // 1. Previous month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevM = currentMonth === 1 ? 12 : currentMonth - 1;
      const prevY = currentMonth === 1 ? currentYear - 1 : currentYear;
      const dateStr = `${prevY}-${String(prevM).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      cells.push({
        dayNumber: dayNum,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
    }

    // 2. Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
      });
    }

    // 3. Next month leading days (fill remaining of 35 or 42 grid cells)
    const totalSlots = cells.length <= 35 ? 35 : 42;
    const remainingSlots = totalSlots - cells.length;
    for (let n = 1; n <= remainingSlots; n++) {
      const nextM = currentMonth === 12 ? 1 : currentMonth + 1;
      const nextY = currentMonth === 12 ? currentYear + 1 : currentYear;
      const dateStr = `${nextY}-${String(nextM).padStart(2, "0")}-${String(n).padStart(2, "0")}`;
      cells.push({
        dayNumber: n,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
    }

    return cells;
  }, [currentMonth, currentYear]);

  // Open creation modal for specific date
  const handleCellClick = (dateStr: string) => {
    if (!isHRAdmin) return;
    setEditingEventId(null);
    setSelectedDateStr(dateStr);
    setEventTitle("");
    setEventType(CalendarEventType.EVENT);
    setStartTime("11:30");
    setEndTime("13:00");
    setDescription("");
    setModalOpen(true);
  };

  // Open edit modal pre-populated
  const handleOpenEdit = (event: SerializedCalendarEvent) => {
    setEditingEventId(event.id);
    setSelectedDateStr(event.date);
    setEventTitle(event.title);
    setEventType(event.type);
    setStartTime(event.startTime || "10:00");
    setEndTime(event.endTime || "11:30");
    setDescription(event.description || "");
    setDetailEvent(null);
    setModalOpen(true);
  };

  // Submit new or updated event
  const handleSaveEvent = () => {
    if (!eventTitle.trim()) {
      toast.error("Please enter an event or holiday title.");
      return;
    }

    startTransition(async () => {
      let res;
      if (editingEventId) {
        res = await updateCalendarEventAction({
          id: editingEventId,
          title: eventTitle,
          date: selectedDateStr,
          type: eventType,
          startTime,
          endTime,
          description,
        });
      } else {
        res = await createCalendarEventAction({
          title: eventTitle,
          date: selectedDateStr,
          type: eventType,
          startTime,
          endTime,
          description,
        });
      }

      if (res.success) {
        toast.success(
          editingEventId
            ? "Calendar event updated successfully!"
            : "Calendar event saved and broadcasted to enterprise schedule!"
        );
        setModalOpen(false);
        setEditingEventId(null);
        // Refresh calendar
        const refreshRes = await getCalendarDataAction({ month: currentMonth, year: currentYear });
        if (refreshRes.success && refreshRes.data) {
          setEvents(refreshRes.data.events);
        }
      } else {
        toast.error(res.error || "Failed to save event.");
      }
    });
  };

  // Confirm delete event
  const handleConfirmDeleteEvent = () => {
    if (!eventToDelete) return;
    const id = eventToDelete.id;

    startTransition(async () => {
      const res = await deleteCalendarEventAction(id);
      if (res.success) {
        toast.success("Event removed from calendar.");
        setEventToDelete(null);
        setDetailEvent(null);
        setEvents((prev) => prev.filter((e) => e.id !== id));
      } else {
        toast.error(res.error || "Failed to remove event.");
      }
    });
  };

  // Format month and year label
  const monthName = MONTH_NAMES[currentMonth - 1];

  return (
    <div className="space-y-6">
      {/* Main Glassmorphic Calendar Container */}
      <div className="rounded-[36px] bg-white/70 backdrop-blur-2xl border border-white/80 shadow-[0_12px_40px_rgba(0,0,0,0.03)] p-6 sm:p-8">
        {/* Calendar Top Controls: Month/Year Dropdown & Navigation Chevrons */}
        <div className="relative z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            {/* Month Dropdown */}
            <div className="relative">
              <select
                value={currentMonth}
                onChange={(e) => {
                  const m = Number(e.target.value);
                  setCurrentMonth(m);
                  startTransition(async () => {
                    const res = await getCalendarDataAction({ month: m, year: currentYear });
                    if (res.success && res.data) {
                      setEvents(res.data.events);
                      setAttendanceDays(res.data.attendanceDays);
                    }
                  });
                }}
                className="appearance-none bg-white font-bold text-slate-900 text-lg px-4 py-2 pr-9 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-[#ACCAD5] cursor-pointer focus:outline-none"
              >
                {MONTH_NAMES.map((m, idx) => (
                  <option key={m} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </select>
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                ▼
              </span>
            </div>

            {/* Year Selector */}
            <div className="relative">
              <select
                value={currentYear}
                onChange={(e) => handleYearChange(Number(e.target.value))}
                className="appearance-none bg-white font-bold text-slate-900 text-lg px-4 py-2 pr-9 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-[#ACCAD5] cursor-pointer focus:outline-none"
              >
                {[2025, 2026, 2027, 2028].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                ▼
              </span>
            </div>
          </div>

          {/* Right Action: Previous/Next Month, Export, Import, & Add Event Button */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <BulkExportMenu
              moduleKey="calendar"
              totalCount={events.length}
              filters={{ month: currentMonth, year: currentYear }}
            />

            {isHRAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsImportOpen(true)}
                className="rounded-full text-xs gap-1.5 h-9 border-slate-200 text-slate-700 bg-white hover:bg-slate-50 shadow-2xs font-medium cursor-pointer"
              >
                <UploadCloud className="h-3.5 w-3.5 text-[#F0944D]" />
                Import Events
              </Button>
            )}

            {isHRAdmin && (
              <Button
                onClick={() => handleCellClick(new Date().toISOString().split("T")[0])}
                className="bg-gradient-to-r from-[#588594] to-[#4A7280] hover:from-[#4A7280] hover:to-[#3D606C] text-white font-semibold text-xs px-4 py-2 rounded-full shadow-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer mr-2"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Event / Holiday
              </Button>
            )}

            <button
              onClick={() => handleMonthChange(-1)}
              disabled={isPending}
              className="h-9 w-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-2xs cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleMonthChange(1)}
              disabled={isPending}
              className="h-9 w-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-2xs cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Calendar Day-of-Week Column Headers */}
        <div className="grid grid-cols-7 gap-2 mb-2 text-center">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider py-1.5"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Monthly Grid Cells */}
        <div className="grid grid-cols-7 gap-2">
          {calendarCells.map((cell, idx) => {
            const cellEvents = events.filter((e) => e.date === cell.dateStr);
            const attendance = attendanceDays.find((a) => a.date === cell.dateStr);

            return (
              <div
                key={`${cell.dateStr}-${idx}`}
                onClick={() => handleCellClick(cell.dateStr)}
                className={`min-h-[110px] sm:min-h-[125px] p-2 sm:p-2.5 rounded-2xl border transition-all flex flex-col justify-between ${
                  cell.isCurrentMonth
                    ? "bg-white/80 border-slate-200/70 hover:border-[#ACCAD5] hover:shadow-sm"
                    : "bg-slate-50/50 border-slate-100 text-slate-300 opacity-60"
                } ${
                  cell.isToday
                    ? "ring-2 ring-[#588594] bg-[#EBF3F6]/50 shadow-xs"
                    : ""
                } ${isHRAdmin ? "cursor-pointer" : ""}`}
              >
                {/* Top Row: Day Number & Today indicator */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold ${
                      cell.isToday
                        ? "text-white bg-[#588594] h-6 w-6 rounded-full flex items-center justify-center shadow-xs"
                        : cell.isCurrentMonth
                        ? "text-slate-800"
                        : "text-slate-400"
                    }`}
                  >
                    {cell.dayNumber}
                  </span>

                  {/* Attendance badge if logged-in user worked on this day */}
                  {attendance && (
                    <span
                      title={`Worked: ${attendance.totalActiveHours.toFixed(1)} hrs`}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-[10px] font-bold text-emerald-700 border border-emerald-200"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {attendance.totalActiveHours > 0
                        ? `${attendance.totalActiveHours.toFixed(0)}h`
                        : "Present"}
                    </span>
                  )}
                </div>

                {/* Stacked Event Pills matching Reference Aesthetic */}
                <div className="space-y-1 my-1 overflow-hidden">
                  {cellEvents.slice(0, 3).map((ev) => {
                    let dotColor = "bg-[#588594]";
                    let pillBg = "bg-[#EBF3F6]/90 text-[#274854] border border-[#ACCAD5]/50";

                    if (ev.type === CalendarEventType.HOLIDAY) {
                      dotColor = "bg-[#F0944D]";
                      pillBg = "bg-[#FDEFE6]/90 text-[#9C4206] border border-[#F0944D]/40";
                    } else if (ev.type === CalendarEventType.IMPORTANT) {
                      dotColor = "bg-amber-500";
                      pillBg = "bg-amber-50 text-amber-800 border border-amber-200";
                    }

                    return (
                      <div
                        key={ev.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailEvent(ev);
                        }}
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg truncate flex items-center gap-1.5 cursor-pointer hover:opacity-85 transition-opacity ${pillBg}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotColor}`} />
                        <span className="truncate">{ev.title}</span>
                      </div>
                    );
                  })}

                  {cellEvents.length > 3 && (
                    <div className="text-[9px] text-slate-400 font-semibold pl-1">
                      +{cellEvents.length - 3} more
                    </div>
                  )}
                </div>

                <div />
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Event Creation / Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[440px] rounded-[32px] bg-white/95 backdrop-blur-2xl border border-white/80 shadow-[0_24px_70px_rgba(0,0,0,0.12)] p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-[#588594]" />
              {editingEventId ? "Modify Scheduled Event" : "Schedule Event or Holiday"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-3">
            {/* Date Display */}
            <div>
              <Label className="text-xs font-semibold text-slate-600">Event Date</Label>
              <Input
                type="date"
                value={selectedDateStr}
                onChange={(e) => setSelectedDateStr(e.target.value)}
                className="mt-1 h-10 rounded-2xl bg-slate-50 border-slate-200 text-xs font-semibold"
              />
            </div>

            {/* Type Selector with Colored Dots */}
            <div>
              <Label className="text-xs font-semibold text-slate-600">Event Classification</Label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value as CalendarEventType)}
                className="mt-1 w-full h-10 px-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-[#588594] cursor-pointer"
              >
                <option value={CalendarEventType.EVENT}>● Company Event (Sky Slate)</option>
                <option value={CalendarEventType.IMPORTANT}>● Important / Milestone (Amber)</option>
                <option value={CalendarEventType.HOLIDAY}>● Public / Company Holiday (Orange)</option>
              </select>
            </div>

            {/* Event Title */}
            <div>
              <Label className="text-xs font-semibold text-slate-600">Title / Subject</Label>
              <Input
                placeholder="e.g. Brainstorm Session, Q4 Town Hall"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                className="mt-1 h-10 rounded-2xl bg-slate-50 border-slate-200 text-xs font-medium"
              />
            </div>

            {/* Hours Start & End */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-600">Start Time</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="mt-1 h-10 rounded-2xl bg-slate-50 border-slate-200 text-xs font-medium"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600">End Time</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="mt-1 h-10 rounded-2xl bg-slate-50 border-slate-200 text-xs font-medium"
                />
              </div>
            </div>

            {/* Note / Description */}
            <div>
              <Label className="text-xs font-semibold text-slate-600">Note / Agenda</Label>
              <Textarea
                placeholder="Add meeting agenda or holiday details..."
                value={description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                className="mt-1 rounded-2xl bg-slate-50 border-slate-200 text-xs text-slate-800 resize-none h-20"
              />
            </div>

            {/* Save Button (styled matching reference prominent action) */}
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setModalOpen(false);
                  setEditingEventId(null);
                }}
                className="rounded-full text-xs px-4"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEvent}
                disabled={isPending}
                className="bg-[#588594] hover:bg-[#466C78] text-white rounded-full text-xs font-semibold px-6 shadow-sm transition-all"
              >
                {isPending ? "Saving..." : editingEventId ? "Save Changes" : "Save Event"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Inspect Event Details Modal */}
      <Dialog open={!!detailEvent} onOpenChange={(open: boolean) => !open && setDetailEvent(null)}>
        <DialogContent className="sm:max-w-[400px] rounded-[32px] bg-white/95 backdrop-blur-2xl border border-white/80 p-6">
          {detailEvent && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#EBF3F6] text-[#588594] font-bold">
                  {detailEvent.type}
                </span>
                <span className="text-xs text-slate-400">{detailEvent.date}</span>
              </div>

              <h3 className="text-base font-bold text-slate-900">{detailEvent.title}</h3>

              {(detailEvent.startTime || detailEvent.endTime) && (
                <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                  <Clock className="h-3.5 w-3.5 text-[#588594]" />
                  <span>
                    {detailEvent.startTime || "All Day"} - {detailEvent.endTime || "End"}
                  </span>
                </div>
              )}

              {detailEvent.description && (
                <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-150 leading-relaxed">
                  {detailEvent.description}
                </p>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-[10px] text-slate-400">Created by: {detailEvent.createdBy}</span>
                {isHRAdmin && (
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEdit(detailEvent)}
                      className="rounded-full text-xs font-semibold flex items-center gap-1 border-slate-200 hover:bg-[#EBF3F6] hover:text-[#588594]"
                    >
                      <Edit className="h-3 w-3" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEventToDelete(detailEvent)}
                      className="text-rose-600 hover:bg-rose-50 text-xs rounded-full flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        open={!!eventToDelete}
        onOpenChange={(open) => !open && setEventToDelete(null)}
        title="Delete Calendar Event"
        description={`Are you sure you want to permanently delete "${eventToDelete?.title}" from the calendar? All employees will no longer see this schedule entry.`}
        confirmLabel="Yes, Delete Event"
        cancelLabel="Keep Event"
        isDestructive={true}
        isPending={isPending}
        onConfirm={handleConfirmDeleteEvent}
      />

      {/* Bulk Import Calendar Events Wizard */}
      <BulkImportWizard
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        moduleKey="calendar"
        onSuccess={() => window.location.reload()}
      />
    </div>
  );
}
