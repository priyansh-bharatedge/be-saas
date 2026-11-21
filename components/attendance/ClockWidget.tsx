"use client";

import { useState, useEffect, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Play,
  Square,
  Coffee,
  AlertTriangle,
  History,
  Timer,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIdleTracker } from "@/hooks/useIdleTracker";
import {
  TodayAttendanceState,
  getTodayAttendanceAction,
  clockInAction,
  clockOutAction,
  updateTrackerStatusAction,
} from "@/lib/actions/attendance";

interface ClockWidgetProps {
  initialData?: TodayAttendanceState | null;
  employeeId?: string;
  className?: string;
}

export default function ClockWidget({
  initialData,
  employeeId,
  className = "",
}: ClockWidgetProps) {
  const [data, setData] = useState<TodayAttendanceState | null>(initialData || null);
  const [isPending, startTransition] = useTransition();
  const [liveActiveSeconds, setLiveActiveSeconds] = useState<number>(
    initialData ? initialData.totalActiveSeconds : 0
  );
  const [showSessionLog, setShowSessionLog] = useState(false);

  // Sync initialData changes
  useEffect(() => {
    if (initialData) {
      setData(initialData);
      setLiveActiveSeconds(initialData.totalActiveSeconds);
    }
  }, [initialData]);

  // Fetch initial data if not provided
  useEffect(() => {
    if (!initialData) {
      startTransition(async () => {
        const res = await getTodayAttendanceAction(employeeId);
        if (res.success && res.data) {
          setData(res.data);
          setLiveActiveSeconds(res.data.totalActiveSeconds);
        }
      });
    }
  }, [employeeId, initialData]);

  const currentStatus = data?.currentStatus || "CLOCKED_OUT";

  // Real-time ticking counter (every 1 second when ACTIVE)
  useEffect(() => {
    if (currentStatus !== "ACTIVE") return;

    const interval = setInterval(() => {
      setLiveActiveSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [currentStatus]);

  // Handle Idle Detection via custom hook
  const handleIdleTransition = async () => {
    if (!data || currentStatus !== "ACTIVE") return;

    startTransition(async () => {
      const res = await updateTrackerStatusAction(data.employeeId, "IDLE");
      if (res.success && res.data) {
        setData(res.data);
        setLiveActiveSeconds(res.data.totalActiveSeconds);
      }
    });
  };

  // Handle Auto-Resume via custom hook
  const handleAutoResume = async () => {
    if (!data || currentStatus !== "IDLE") return;

    startTransition(async () => {
      const res = await updateTrackerStatusAction(data.employeeId, "ACTIVE");
      if (res.success && res.data) {
        setData(res.data);
        setLiveActiveSeconds(res.data.totalActiveSeconds);
      }
    });
  };

  const { isIdle, simulateIdle } = useIdleTracker({
    status: currentStatus,
    idleTimeoutMs: 5 * 60 * 1000, // Exactly 5 minutes
    onIdle: handleIdleTransition,
    onAutoResume: handleAutoResume,
  });

  // Clock In handler
  const handleClockIn = () => {
    startTransition(async () => {
      const res = await clockInAction(data?.employeeId || employeeId);
      if (res.success && res.data) {
        setData(res.data);
        setLiveActiveSeconds(res.data.totalActiveSeconds);
      }
    });
  };

  // Clock Out handler
  const handleClockOut = () => {
    startTransition(async () => {
      const res = await clockOutAction(data?.employeeId || employeeId);
      if (res.success && res.data) {
        setData(res.data);
        setLiveActiveSeconds(res.data.totalActiveSeconds);
      }
    });
  };

  // Format seconds to HH:MM:SS
  const formatTimer = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  // Format 12-hour timestamp
  const formatTimeStr = (isoString?: string | null) => {
    if (!isoString) return "--:--";
    const d = new Date(isoString);
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div
      className={`relative overflow-hidden rounded-[32px] bg-white/75 backdrop-blur-2xl border border-white/80 shadow-[0_12px_40px_rgba(0,0,0,0.03)] p-6 sm:p-8 transition-all ${className}`}
    >
      {/* Background ambient subtle brand tint (sky slate #ACCAD5 & sunset amber #F0944D) */}
      <div
        className={`absolute -right-24 -top-24 h-64 w-64 rounded-full blur-3xl pointer-events-none transition-colors duration-700 ${
          currentStatus === "ACTIVE"
            ? "bg-[#ACCAD5]/25"
            : currentStatus === "IDLE"
            ? "bg-[#F0944D]/20"
            : "bg-[#ACCAD5]/15"
        }`}
      />

      {/* Header section with employee info and live status badge */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-[#EBF3F6] border border-[#ACCAD5]/50 flex items-center justify-center text-[#588594]">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900">
                Time & Attendance Tracker
              </h3>
              <span className="text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full bg-[#EBF3F6] text-[#588594] border border-[#ACCAD5]/40 font-medium">
                5m Idle Auto-Detect
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {data?.employeeName || "Staff Member"} • {data?.department || "HRMS"}
            </p>
          </div>
        </div>

        {/* Status Pill Badge: Styled with BharatEdge Brand Accents */}
        <AnimatePresence mode="wait">
          {currentStatus === "ACTIVE" && (
            <motion.div
              key="active-pill"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EBF3F6] border border-[#ACCAD5]/70 text-[#3D6472] text-xs font-semibold shadow-2xs"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#588594] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#588594]"></span>
              </span>
              ACTIVE SESSION
            </motion.div>
          )}

          {currentStatus === "IDLE" && (
            <motion.div
              key="idle-pill"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FDEFE6] border border-[#F0944D]/50 text-[#C66318] text-xs font-semibold shadow-2xs"
            >
              <Coffee className="h-3.5 w-3.5 text-[#F0944D] animate-pulse" />
              IDLE (PAUSED)
            </motion.div>
          )}

          {currentStatus === "CLOCKED_OUT" && (
            <motion.div
              key="out-pill"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100/80 border border-slate-200/80 text-slate-500 text-xs font-semibold"
            >
              <span className="h-2 w-2 rounded-full bg-slate-400" />
              CLOCKED OUT
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Display: Live Counter & Working Hours */}
      <div className="my-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-1 flex items-center gap-1.5">
            <Timer className="h-3.5 w-3.5 text-[#588594]" />
            Active Time Logged Today
          </div>
          <div className="text-4xl sm:text-5xl font-mono font-extrabold tracking-tight text-slate-900">
            {formatTimer(liveActiveSeconds)}
          </div>
          <div className="text-xs text-slate-500 mt-1.5 flex items-center gap-3">
            <span>
              Net Hours:{" "}
              <strong className="text-slate-800 font-bold">
                {(liveActiveSeconds / 3600).toFixed(2)} hrs
              </strong>
            </span>
            {data?.clockInTime && (
              <span>
                First Clock-In:{" "}
                <strong className="text-slate-800 font-bold">
                  {formatTimeStr(data.clockInTime)}
                </strong>
              </span>
            )}
          </div>
        </div>

        {/* Action Toggle Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
          {currentStatus === "CLOCKED_OUT" ? (
            <Button
              onClick={handleClockIn}
              disabled={isPending}
              className="bg-[#588594] hover:bg-[#466C78] text-white shadow-md shadow-[#588594]/20 font-semibold px-6 py-5 rounded-2xl flex items-center justify-center gap-2 text-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Play className="h-4 w-4 fill-white" />
              {isPending ? "Connecting..." : "Clock In for Today"}
            </Button>
          ) : (
            <>
              {currentStatus === "IDLE" ? (
                <Button
                  onClick={handleAutoResume}
                  disabled={isPending}
                  className="bg-[#588594] hover:bg-[#466C78] text-white shadow-md shadow-[#588594]/20 font-semibold px-5 py-5 rounded-2xl flex items-center justify-center gap-2 text-xs transition-all hover:scale-[1.02]"
                >
                  <Zap className="h-4 w-4 fill-white" />
                  Resume Active Session
                </Button>
              ) : (
                <Button
                  onClick={simulateIdle}
                  variant="outline"
                  title="Simulates 5-minute inactivity timeout immediately for testing"
                  className="border border-[#ACCAD5]/60 bg-[#EBF3F6]/80 hover:bg-[#EBF3F6] text-[#3D6472] font-medium text-xs px-4 py-5 rounded-2xl flex items-center gap-1.5 transition-all shadow-2xs"
                >
                  <Coffee className="h-3.5 w-3.5 text-[#588594]" />
                  Simulate 5m Idle
                </Button>
              )}

              {/* Clock Out Button styled with BharatEdge Sunset Amber (#F0944D) */}
              <Button
                onClick={handleClockOut}
                disabled={isPending}
                className="bg-[#F0944D] hover:bg-[#E07E32] text-white shadow-md shadow-[#F0944D]/25 font-semibold px-6 py-5 rounded-2xl flex items-center justify-center gap-2 text-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Square className="h-3.5 w-3.5 fill-white text-white" />
                {isPending ? "Finalizing..." : "Clock Out"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Dynamic Idle Notice Banner (Shows when status is IDLE) */}
      <AnimatePresence>
        {currentStatus === "IDLE" && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            className="mb-4 overflow-hidden"
          >
            <div className="p-4 rounded-2xl bg-[#FDEFE6]/90 border border-[#F0944D]/35 flex items-center justify-between text-[#C66318] text-xs">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="h-4 w-4 text-[#F0944D] shrink-0" />
                <div>
                  <strong className="text-slate-900">Tracker Paused:</strong> Inactive for 5 minutes. Time logging is paused to preserve net working hours accuracy.
                  <div className="text-[11px] text-[#A64F10] mt-0.5">
                    Move mouse, type on keyboard, or scroll anywhere to <strong className="text-[#C66318]">Auto-Resume</strong>.
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleAutoResume}
                className="text-[#C66318] hover:bg-[#F0944D]/10 underline font-semibold text-xs shrink-0"
              >
                Auto-Resume Now
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Activity listener status & Shift Session Link */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#588594] animate-pulse" />
          <span className="text-slate-500">Activity listener active (mouse, keys, scroll)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400">
            Idle pause threshold: <strong className="text-slate-600">5:00</strong>
          </span>
          <button
            onClick={() => setShowSessionLog(!showSessionLog)}
            className="text-[#588594] hover:underline flex items-center gap-1 font-medium cursor-pointer"
          >
            <History className="h-3 w-3" />
            {showSessionLog ? "Hide Shift Sessions" : "View Shift Sessions"}
          </button>
        </div>
      </div>

      {/* Shift Sessions List Expandable */}
      <AnimatePresence>
        {showSessionLog && data?.sessions && data.sessions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-3 border-t border-slate-100"
          >
            <div className="text-xs font-semibold text-slate-800 mb-2 flex items-center gap-1.5">
              <History className="h-3.5 w-3.5 text-[#588594]" />
              Today&apos;s Session Breakdown ({data.sessions.length} intervals)
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {data.sessions.map((sess, idx) => {
                const isOngoing = sess.endTime === null;
                const duration = sess.durationMinutes
                  ? `${sess.durationMinutes.toFixed(1)} mins`
                  : isOngoing
                  ? "Ongoing"
                  : "--";

                return (
                  <div
                    key={sess.id || idx}
                    className="flex items-center justify-between text-xs px-3.5 py-2 rounded-xl bg-white/70 border border-slate-150 shadow-2xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          sess.status === "ACTIVE"
                            ? "bg-[#588594]"
                            : "bg-[#F0944D]"
                        }`}
                      />
                      <span className="font-semibold text-slate-800">
                        {sess.status === "ACTIVE" ? "Active Working" : "Idle Break"}
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        {formatTimeStr(sess.startTime)} -{" "}
                        {isOngoing ? "Now" : formatTimeStr(sess.endTime)}
                      </span>
                    </div>
                    <span className="font-mono font-medium text-slate-600 text-[11px]">
                      {duration}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
