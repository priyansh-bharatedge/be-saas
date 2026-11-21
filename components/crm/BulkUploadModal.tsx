"use client";

import { useState, useRef, ChangeEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { ZodType } from "zod";

export interface BulkUploadColumnDef {
  key: string;
  header: string;
  aliases?: string[];
  required?: boolean;
  type?: "string" | "number" | "boolean";
  description?: string;
}

interface BulkUploadModalProps<T> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  sampleFileName: string;
  columns: BulkUploadColumnDef[];
  sampleData: Record<string, string | number>[];
  schema: ZodType<T>;
  onUpload: (validRecords: T[]) => Promise<{
    success: boolean;
    data?: { insertedCount: number; errors?: string[] };
    error?: string;
  }>;
  onSuccess?: () => void;
}

interface RowValidationError {
  rowNumber: number;
  field: string;
  message: string;
  rawValue?: any;
}

/**
 * Universal RFC 4180 compliant CSV line parser supporting quoted commas and escaped quotes
 */
function parseCsvLine(text: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}

export default function BulkUploadModal<T>({
  open,
  onOpenChange,
  title,
  description,
  sampleFileName,
  columns,
  sampleData,
  schema,
  onUpload,
  onSuccess,
}: BulkUploadModalProps<T>) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [validRecords, setValidRecords] = useState<T[]>([]);
  const [validationErrors, setValidationErrors] = useState<RowValidationError[]>([]);
  const [totalRowsParsed, setTotalRowsParsed] = useState(0);

  const resetState = () => {
    setSelectedFile(null);
    setValidRecords([]);
    setValidationErrors([]);
    setTotalRowsParsed(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    if (isUploading) return;
    resetState();
    onOpenChange(false);
  };

  // Generate and download a sample CSV template with clean header names and demo rows
  const handleDownloadTemplate = () => {
    const headers = columns.map((col) => `"${col.header.replace(/"/g, '""')}"`).join(",");
    const rows = sampleData.map((row) =>
      columns
        .map((col) => {
          const val = row[col.key] !== undefined ? String(row[col.key]) : "";
          return `"${val.replace(/"/g, '""')}"`;
        })
        .join(",")
    );

    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", sampleFileName.endsWith(".csv") ? sampleFileName : `${sampleFileName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Sample CSV template downloaded.");
  };

  // Client-side CSV file parsing and row-by-row Zod schema validation
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv") && !file.name.endsWith(".txt")) {
      toast.error("Please upload a standard CSV (.csv) file.");
      return;
    }

    setSelectedFile(file);
    setIsParsing(true);
    setValidRecords([]);
    setValidationErrors([]);

    try {
      const text = await file.text();
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      if (lines.length < 2) {
        toast.error("The CSV file must contain a header row and at least one data row.");
        setIsParsing(false);
        return;
      }

      // Parse headers
      const rawHeaders = parseCsvLine(lines[0]);

      // Map raw CSV header strings to column keys
      const headerMap: Record<number, BulkUploadColumnDef> = {};
      rawHeaders.forEach((rawH, idx) => {
        const normalized = rawH.toLowerCase().replace(/[^a-z0-9]/g, "");
        const matchedCol = columns.find((c) => {
          const colH = c.header.toLowerCase().replace(/[^a-z0-9]/g, "");
          const colK = c.key.toLowerCase().replace(/[^a-z0-9]/g, "");
          const aliases = (c.aliases || []).map((a) => a.toLowerCase().replace(/[^a-z0-9]/g, ""));
          return normalized === colH || normalized === colK || aliases.includes(normalized);
        });
        if (matchedCol) {
          headerMap[idx] = matchedCol;
        }
      });

      const parsedValids: T[] = [];
      const parsedErrors: RowValidationError[] = [];
      let rowCount = 0;

      for (let r = 1; r < lines.length; r++) {
        rowCount++;
        const rowValues = parseCsvLine(lines[r]);

        // Construct object
        const rowObj: Record<string, any> = {};
        for (let c = 0; c < rowValues.length; c++) {
          const colDef = headerMap[c];
          if (colDef) {
            let val: any = rowValues[c];
            if (colDef.type === "number") {
              const num = Number(val);
              val = isNaN(num) ? val : num;
            } else if (colDef.type === "boolean") {
              val = String(val).toLowerCase() === "true" || String(val) === "1" || String(val).toLowerCase() === "yes";
            }
            rowObj[colDef.key] = val;
          }
        }

        // Validate row with Zod schema
        const result = schema.safeParse(rowObj);
        if (result.success) {
          parsedValids.push(result.data);
        } else {
          result.error.issues.forEach((issue) => {
            parsedErrors.push({
              rowNumber: r + 1,
              field: issue.path.join(".") || "Record",
              message: issue.message,
              rawValue: rowObj[issue.path[0] as string],
            });
          });
        }
      }

      setTotalRowsParsed(rowCount);
      setValidRecords(parsedValids);
      setValidationErrors(parsedErrors);

      if (parsedValids.length === 0) {
        toast.error("No valid records found in file. Please review the error list.");
      } else if (parsedErrors.length > 0) {
        toast.warning(
          `${parsedValids.length} rows valid, but ${parsedErrors.length} validation errors were detected.`
        );
      } else {
        toast.success(`All ${parsedValids.length} rows parsed and validated successfully!`);
      }
    } catch (err: any) {
      console.error("[CSV Parsing Error]:", err);
      toast.error("Failed to parse CSV file: " + (err.message || "Unknown error"));
    } finally {
      setIsParsing(false);
    }
  };

  // Submit valid records to the batch insert action
  const handleSubmitBatch = async () => {
    if (validRecords.length === 0) {
      toast.error("No valid records available for import.");
      return;
    }

    setIsUploading(true);
    try {
      const res = await onUpload(validRecords);
      if (res.success) {
        toast.success(
          `Bulk upload complete! ${res.data?.insertedCount || validRecords.length} records processed.`
        );
        if (res.data?.errors && res.data.errors.length > 0) {
          toast.warning(`${res.data.errors.length} records could not be saved.`);
        }
        handleClose();
        if (onSuccess) onSuccess();
      } else {
        toast.error(res.error || "Bulk upload failed.");
      }
    } catch (err: any) {
      console.error("[Bulk Upload Action Error]:", err);
      toast.error("An unexpected error occurred during bulk import.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-hidden flex flex-col rounded-[28px] bg-white/95 backdrop-blur-2xl border border-white/80 p-6 sm:p-7 shadow-2xl">
        <DialogHeader className="shrink-0 pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#ACCAD5]/30 to-[#F0944D]/20 text-[#F0944D] flex items-center justify-center font-bold text-sm shadow-xs border border-orange-100">
                <FileSpreadsheet className="h-5 w-5 text-slate-800" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">{title}</DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  {description}
                </DialogDescription>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="rounded-full text-xs gap-1.5 h-8 border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 shadow-2xs"
            >
              <Download className="h-3.5 w-3.5 text-[#F0944D]" />
              Download Template
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1">
          {/* Upload Drop Area */}
          {!selectedFile ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-[#F0944D]/60 rounded-2xl p-7 text-center cursor-pointer transition-all bg-slate-50/50 hover:bg-white group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="h-12 w-12 rounded-2xl bg-white border border-slate-200/80 mx-auto flex items-center justify-center text-slate-400 group-hover:text-[#F0944D] group-hover:scale-105 transition-all shadow-xs mb-3">
                <UploadCloud className="h-6 w-6" />
              </div>
              <p className="text-xs font-semibold text-slate-800">
                Click to browse or drop your CSV file here
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Standard comma-separated format (.csv) &bull; Up to 500 rows per batch
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
                  <FileSpreadsheet className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{selectedFile.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {(selectedFile.size / 1024).toFixed(1)} KB &bull; {totalRowsParsed} rows parsed
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetState}
                disabled={isParsing || isUploading}
                className="h-7 w-7 p-0 rounded-full text-slate-400 hover:text-rose-600"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Parsing Spinner */}
          {isParsing && (
            <div className="p-6 rounded-2xl bg-slate-50 flex items-center justify-center gap-2.5 text-xs text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin text-[#F0944D]" />
              Parsing file & validating rows against Zod schema...
            </div>
          )}

          {/* Validation Metrics Summary */}
          {selectedFile && !isParsing && (
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Total Parsed
                </span>
                <span className="text-base font-bold text-slate-800">{totalRowsParsed}</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Valid Rows
                </span>
                <span className="text-base font-bold text-emerald-800">{validRecords.length}</span>
              </div>
              <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200">
                <span className="text-[10px] font-semibold text-rose-700 uppercase tracking-wider flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Error Rows
                </span>
                <span className="text-base font-bold text-rose-800">
                  {validationErrors.length}
                </span>
              </div>
            </div>
          )}

          {/* Validation Errors List Table */}
          {validationErrors.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                <span>Issues requiring review ({validationErrors.length}):</span>
              </div>

              <div className="max-h-44 overflow-y-auto border border-rose-100 rounded-xl bg-rose-50/30 divide-y divide-rose-100/80 text-[11px]">
                {validationErrors.slice(0, 50).map((err, idx) => (
                  <div key={idx} className="p-2.5 flex items-start justify-between gap-2">
                    <div>
                      <span className="font-bold text-rose-900 mr-2">Row {err.rowNumber}:</span>
                      <span className="font-semibold text-slate-700">{err.field} &mdash; </span>
                      <span className="text-rose-700">{err.message}</span>
                    </div>
                    {err.rawValue !== undefined && (
                      <span className="font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border border-rose-200 text-slate-500 shrink-0">
                        {String(err.rawValue).slice(0, 20)}
                      </span>
                    )}
                  </div>
                ))}
                {validationErrors.length > 50 && (
                  <div className="p-2 text-center text-slate-400 text-[10px]">
                    + {validationErrors.length - 50} more errors truncated
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="shrink-0 pt-4 border-t border-slate-100 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={isUploading}
            className="rounded-full text-xs px-4"
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSubmitBatch}
            disabled={validRecords.length === 0 || isUploading || isParsing}
            className="rounded-full text-xs font-semibold px-5 text-white bg-gradient-to-r from-[#ACCAD5] to-[#F0944D] hover:opacity-95 shadow-xs cursor-pointer gap-2"
          >
            {isUploading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isUploading
              ? "Importing Records..."
              : `Import ${validRecords.length} Valid Record${validRecords.length === 1 ? "" : "s"}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
