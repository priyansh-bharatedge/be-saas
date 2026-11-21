"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  User,
  Calendar,
  Building2,
  CheckCircle2,
  PauseCircle,
  LogOut,
  Mail,
} from "lucide-react";

interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  workEmail: string;
  department: string;
  designation: string;
  date: string;
  clockInTime: string | null;
  clockOutTime: string | null;
  totalActiveHours: number;
  totalIdleHours?: number;
  currentStatus: string;
}

interface AttendanceDetailModalProps {
  record: AttendanceRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AttendanceDetailModal({
  record,
  open,
  onOpenChange,
}: AttendanceDetailModalProps) {
  if (!record) return null;

  const formatHours = (hours: number) => {
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}h ${m}m`;
  };

  const formatTime = (isoString?: string | null) => {
    if (!isoString) return "—";
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-xl border border-slate-200/80 shadow-2xl rounded-2xl p-6">
        <DialogHeader className="border-b border-slate-100 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#ACCAD5]/30 to-[#F0944D]/20 flex items-center justify-center text-slate-800">
                <Clock className="h-5 w-5 text-[#F0944D]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-lg font-bold text-slate-900">
                    {record.employeeName}
                  </DialogTitle>
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                    {record.employeeId}
                  </span>
                </div>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  {record.designation} • {record.department}
                </DialogDescription>
              </div>
            </div>

            <Badge
              variant="outline"
              className={`text-xs font-semibold ${
                record.currentStatus === "ACTIVE"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : record.currentStatus === "IDLE"
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-slate-100 text-slate-600 border-slate-300"
              }`}
            >
              {record.currentStatus.replace(/_/g, " ")}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-3 text-xs text-slate-700">
          {/* Shift Time Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Active Hours</span>
              <p className="text-base font-extrabold text-slate-900 mt-1">{formatHours(record.totalActiveHours)}</p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Clock-In Time</span>
              <p className="text-xs font-semibold text-slate-800 mt-1">{formatTime(record.clockInTime)}</p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Clock-Out Time</span>
              <p className="text-xs font-semibold text-slate-800 mt-1">{formatTime(record.clockOutTime)}</p>
            </div>
          </div>

          {/* Employee Details Card */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 space-y-2.5">
            <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
              <User className="h-4 w-4 text-[#F0944D]" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Staff Profile</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 text-[11px]">Work Email:</span>
                <p className="font-semibold text-slate-800 truncate">{record.workEmail}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[11px]">Department:</span>
                <p className="font-medium text-slate-800">{record.department}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[11px]">Designation:</span>
                <p className="font-medium text-slate-800">{record.designation}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[11px]">Attendance Date:</span>
                <p className="font-medium text-slate-800">{record.date}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 mt-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-xs text-slate-600"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
