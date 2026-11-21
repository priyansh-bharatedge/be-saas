"use client";

import { LeaveType } from "@prisma/client";
import { Umbrella, Stethoscope, Briefcase, Calendar } from "lucide-react";

interface LeaveBalanceItem {
  leaveType: LeaveType;
  allocatedDays: number;
  usedDays: number;
  remainingDays: number;
  year: number;
}

interface LeaveBalanceCardsProps {
  balances: LeaveBalanceItem[];
}

export default function LeaveBalanceCards({ balances }: LeaveBalanceCardsProps) {
  const getCardConfig = (type: LeaveType) => {
    switch (type) {
      case LeaveType.CASUAL:
        return {
          title: "Casual Leave (CL)",
          subtitle: "Personal engagements & family",
          icon: Umbrella,
          badgeColor: "bg-[#EBF3F6] border-[#ACCAD5]/60 text-[#3D6472]",
          progressColor: "bg-[#588594]",
        };
      case LeaveType.SICK:
        return {
          title: "Sick Leave (SL)",
          subtitle: "Medical care & recovery",
          icon: Stethoscope,
          badgeColor: "bg-[#FDEFE6] border-[#F0944D]/40 text-[#C66318]",
          progressColor: "bg-[#F0944D]",
        };
      case LeaveType.EARNED:
        return {
          title: "Earned / Privilege (EL)",
          subtitle: "Accrued annual vacation",
          icon: Briefcase,
          badgeColor: "bg-emerald-50 border-emerald-200 text-emerald-700",
          progressColor: "bg-emerald-500",
        };
      default:
        return {
          title: `${type} Leave`,
          subtitle: "Special allowance",
          icon: Calendar,
          badgeColor: "bg-slate-100 border-slate-200 text-slate-600",
          progressColor: "bg-slate-500",
        };
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {balances.map((b) => {
        const config = getCardConfig(b.leaveType);
        const Icon = config.icon;
        const usedPercent = Math.min(100, Math.round((b.usedDays / (b.allocatedDays || 1)) * 100));

        return (
          <div
            key={b.leaveType}
            className="rounded-[28px] bg-white/75 backdrop-blur-xl border border-white/80 shadow-[0_10px_35px_rgba(0,0,0,0.02)] p-6 transition-all hover:shadow-md"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${config.badgeColor}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">{config.title}</h4>
                  <p className="text-[11px] text-slate-400">{config.subtitle}</p>
                </div>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                {b.year}
              </span>
            </div>

            <div className="mt-4 flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {b.remainingDays}
                </span>
                <span className="text-xs text-slate-400 font-medium ml-1.5">days left</span>
              </div>
              <div className="text-xs text-right text-slate-500">
                <span className="font-semibold text-slate-700">{b.usedDays}</span> / {b.allocatedDays} used
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-3 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${config.progressColor}`}
                style={{ width: `${usedPercent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
