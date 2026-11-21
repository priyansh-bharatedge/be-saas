import { ReactNode } from "react";

interface DepartmentHeaderProps {
  title: string;
  description: string;
  departmentBadge: string;
  actions?: ReactNode;
}

export function DepartmentHeader({
  title,
  description,
  departmentBadge,
  actions,
}: DepartmentHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 mb-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            {title}
          </h1>
          <span className="font-mono text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#EBF3F6] text-[#588594] border border-[#ACCAD5]/60">
            {departmentBadge}
          </span>
        </div>
        <p className="text-xs text-slate-500">
          {description}
        </p>
      </div>
      {actions && <div className="flex items-center gap-2.5">{actions}</div>}
    </div>
  );
}

export default DepartmentHeader;
