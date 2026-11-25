"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Download,
  FileSpreadsheet,
  FileText,
  ChevronDown,
  Loader2,
  CheckSquare,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { MODULE_REGISTRY } from "@/lib/import-export/registry";

interface BulkExportMenuProps {
  moduleKey: string;
  selectedIds?: string[];
  totalCount?: number;
  filters?: Record<string, any>;
  searchQuery?: string;
  className?: string;
}

export default function BulkExportMenu({
  moduleKey,
  selectedIds = [],
  totalCount = 0,
  filters = {},
  searchQuery = "",
  className = "",
}: BulkExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const config = MODULE_REGISTRY[moduleKey];
  const selectedCount = selectedIds.length;

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleExport = async (format: "xlsx" | "csv", scope: "selected" | "all") => {
    if (scope === "selected" && selectedCount === 0) {
      toast.warning("Please select at least one record using the checkboxes.");
      return;
    }

    setIsExporting(true);
    setExportingFormat(`${scope}-${format}`);
    setIsOpen(false);

    try {
      const response = await fetch(`/api/export/${moduleKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope,
          selectedIds,
          format,
          search: searchQuery,
          filters,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to download export file.");
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `bharatedge_${moduleKey}_${scope}_${new Date().toISOString().split("T")[0]}.${format}`;

      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) {
          filename = match[1];
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const countLabel = scope === "selected" ? `${selectedCount} selected` : `all ${totalCount}`;
      toast.success(`Exported ${countLabel} ${config?.label || moduleKey} records.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate export file.");
    } finally {
      setIsExporting(false);
      setExportingFormat(null);
    }
  };

  return (
    <div className={`relative inline-block text-left z-30 ${className}`} ref={menuRef}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isExporting}
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-full text-xs gap-1.5 h-9 border-slate-200 bg-white/80 hover:bg-white text-slate-700 hover:text-slate-900 shadow-2xs font-medium cursor-pointer"
      >
        {isExporting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#F0944D]" />
        ) : (
          <Download className="h-3.5 w-3.5 text-[#588594]" />
        )}
        <span>Export</span>
        {selectedCount > 0 && (
          <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#F0944D] text-white">
            {selectedCount}
          </span>
        )}
        <ChevronDown className="h-3 w-3 text-slate-400 ml-0.5" />
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-64 rounded-2xl bg-white border border-slate-200 shadow-2xl z-[100] p-2.5 text-xs space-y-1.5 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2.5 py-1.5 border-b border-slate-100 mb-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Export {config?.label || "Records"}
            </span>
            <div className="flex items-center justify-between text-[11px] text-slate-600 font-medium mt-0.5">
              <span>Selected: <strong className="text-[#F0944D]">{selectedCount}</strong></span>
              <span>Total in View: <strong>{totalCount}</strong></span>
            </div>
          </div>

          {/* Group 1: Selected Records */}
          <div className="space-y-0.5">
            <div className="px-2.5 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <CheckSquare className="h-3 w-3 text-[#F0944D]" />
              Selected Rows ({selectedCount})
            </div>

            <button
              type="button"
              disabled={selectedCount === 0 || isExporting}
              onClick={() => handleExport("xlsx", "selected")}
              className="w-full text-left px-2.5 py-1.5 rounded-xl text-slate-700 hover:bg-slate-100 flex items-center justify-between disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                Excel (.xlsx)
              </span>
              <span className="text-[10px] text-slate-400">Selected</span>
            </button>

            <button
              type="button"
              disabled={selectedCount === 0 || isExporting}
              onClick={() => handleExport("csv", "selected")}
              className="w-full text-left px-2.5 py-1.5 rounded-xl text-slate-700 hover:bg-slate-100 flex items-center justify-between disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-sky-600" />
                CSV (.csv)
              </span>
              <span className="text-[10px] text-slate-400">Selected</span>
            </button>
          </div>

          <div className="border-t border-slate-100 my-1" />

          {/* Group 2: All Records */}
          <div className="space-y-0.5">
            <div className="px-2.5 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Layers className="h-3 w-3 text-[#ACCAD5]" />
              All Filtered Records ({totalCount})
            </div>

            <button
              type="button"
              disabled={isExporting}
              onClick={() => handleExport("xlsx", "all")}
              className="w-full text-left px-2.5 py-1.5 rounded-xl text-slate-700 hover:bg-slate-100 flex items-center justify-between disabled:opacity-40 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                Excel (.xlsx)
              </span>
              <span className="text-[10px] text-slate-400">All</span>
            </button>

            <button
              type="button"
              disabled={isExporting}
              onClick={() => handleExport("csv", "all")}
              className="w-full text-left px-2.5 py-1.5 rounded-xl text-slate-700 hover:bg-slate-100 flex items-center justify-between disabled:opacity-40 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-sky-600" />
                CSV (.csv)
              </span>
              <span className="text-[10px] text-slate-400">All</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
