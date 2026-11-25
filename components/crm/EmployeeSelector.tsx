"use client";

import { useMemo } from "react";
import { User, ChevronDown } from "lucide-react";
import { EmployeeLookupItem } from "@/lib/validations/operation";

interface EmployeeSelectorProps {
  value?: string | null;
  onChange: (employeeId: string, employeeName?: string) => void;
  employees: EmployeeLookupItem[];
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export function EmployeeSelector({
  value,
  onChange,
  employees = [],
  placeholder = "Select Employee...",
  disabled = false,
  label,
  className = "",
}: EmployeeSelectorProps) {
  const selectedEmp = useMemo(
    () => employees.find((e) => e.id === value),
    [employees, value]
  );

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label className="text-[11px] font-semibold text-slate-700 block">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          value={value || ""}
          onChange={(e) => {
            const id = e.target.value;
            const emp = employees.find((item) => item.id === id);
            onChange(id, emp ? emp.name : "");
          }}
          disabled={disabled}
          className={`w-full h-8 pl-8 pr-7 text-xs rounded-lg border appearance-none transition-colors cursor-pointer ${
            disabled
              ? "bg-slate-100/80 border-slate-200 text-slate-500 cursor-not-allowed"
              : "bg-white border-slate-200 hover:border-slate-300 text-slate-900 focus:outline-none focus:border-[#588594]"
          }`}
        >
          <option value="">{placeholder}</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name} ({[emp.designation, emp.department].filter(Boolean).join(" • ")})
            </option>
          ))}
        </select>
        <User className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        <ChevronDown className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
}
