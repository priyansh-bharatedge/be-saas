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
import { Badge } from "@/components/ui/badge";
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  X,
  Loader2,
  FileCheck,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { MODULE_REGISTRY, ModuleConfig } from "@/lib/import-export/registry";
import * as XLSX from "xlsx";
import Papa from "papaparse";

interface BulkImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleKey: string;
  onSuccess?: () => void;
  options?: Record<string, any>;
}

type WizardStep = 1 | 2 | 3 | 4;

interface ValidationErrorItem {
  rowNumber: number;
  field: string;
  message: string;
  rawValue?: any;
}

export default function BulkImportWizard({
  open,
  onOpenChange,
  moduleKey,
  onSuccess,
  options = {},
}: BulkImportWizardProps) {
  const config: ModuleConfig | undefined = MODULE_REGISTRY[moduleKey];

  const [step, setStep] = useState<WizardStep>(1);
  const [file, setFile] = useState<File | null>(null);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [workbookRef, setWorkbookRef] = useState<XLSX.WorkBook | null>(null);

  // Raw parsed file data: array of rows as objects
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);

  // Mapping: fileHeader -> moduleFieldKey (or "__SKIP__")
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});

  // Dry run results
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    total: number;
    validCount: number;
    errorCount: number;
    errors: ValidationErrorItem[];
    sampleValidRows?: any[];
  } | null>(null);

  // Final batch import execution
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    createdCount: number;
    failedCount: number;
    message: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetWizard = () => {
    setStep(1);
    setFile(null);
    setAvailableSheets([]);
    setSelectedSheet("");
    setWorkbookRef(null);
    setRawHeaders([]);
    setRawRows([]);
    setFieldMappings({});
    setValidationResult(null);
    setImportResult(null);
  };

  const handleClose = () => {
    resetWizard();
    onOpenChange(false);
  };

  if (!config) return null;

  // 1. TEMPLATE DOWNLOADER
  const handleDownloadTemplate = (format: "csv" | "xlsx") => {
    try {
      const headers = config.fields.map((f) => f.label);
      const sampleRow: Record<string, any> = {};
      config.fields.forEach((f) => {
        sampleRow[f.label] = f.sampleValue ?? (config.sampleRows[0]?.[f.key] || "");
      });

      const worksheet = XLSX.utils.json_to_sheet([sampleRow], { header: headers });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, config.label.slice(0, 31));

      const filename = `${config.key}_sample_template.${format}`;

      if (format === "csv") {
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        XLSX.writeFile(workbook, filename);
      }

      toast.success(`Downloaded ${format.toUpperCase()} template for ${config.label}`);
    } catch (err: any) {
      toast.error("Failed to generate sample template.");
    }
  };

  // 2. PARSE UPLOADED FILE
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > 10 * 1024 * 1024) {
      toast.error("File exceeds 10 MB limit.");
      return;
    }

    setFile(selected);

    const isCsv = selected.name.toLowerCase().endsWith(".csv");

    if (isCsv) {
      Papa.parse(selected, {
        header: true,
        skipEmptyLines: "greedy",
        complete: (results) => {
          const headers = (results.meta.fields || []).map((h) => h.trim());
          const rows = results.data as Record<string, any>[];
          setRawHeaders(headers);
          setRawRows(rows);
          autoMapHeaders(headers);
          setStep(2);
        },
        error: (err) => {
          toast.error(`CSV Parsing error: ${err.message}`);
        },
      });
    } else {
      // Excel (.xlsx, .xls)
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const wb = XLSX.read(data, { type: "array" });
          setWorkbookRef(wb);
          setAvailableSheets(wb.SheetNames);
          const firstSheet = wb.SheetNames[0];
          setSelectedSheet(firstSheet);
          parseSheet(wb, firstSheet);
          setStep(2);
        } catch (err: any) {
          toast.error("Failed to read Excel workbook.");
        }
      };
      reader.readAsArrayBuffer(selected);
    }
  };

  const parseSheet = (wb: XLSX.WorkBook, sheetName: string) => {
    const ws = wb.Sheets[sheetName];
    if (!ws) return;
    const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });
    if (json.length === 0) {
      toast.warning(`Sheet "${sheetName}" is empty.`);
      return;
    }
    const headers = Object.keys(json[0]).map((h) => h.trim());
    setRawHeaders(headers);
    setRawRows(json);
    autoMapHeaders(headers);
  };

  const handleSheetChange = (sheetName: string) => {
    setSelectedSheet(sheetName);
    if (workbookRef) {
      parseSheet(workbookRef, sheetName);
    }
  };

  // 3. AUTO FUZZY MAP HEADERS
  const autoMapHeaders = (headers: string[]) => {
    const mappings: Record<string, string> = {};

    headers.forEach((header) => {
      const cleanHeader = header.toLowerCase().replace(/[^a-z0-9]/g, "");
      let bestMatch = "__SKIP__";

      for (const field of config.fields) {
        const cleanKey = field.key.toLowerCase().replace(/[^a-z0-9]/g, "");
        const cleanLabel = field.label.toLowerCase().replace(/[^a-z0-9]/g, "");

        if (cleanHeader === cleanKey || cleanHeader === cleanLabel) {
          bestMatch = field.key;
          break;
        }

        if (field.aliases) {
          for (const alias of field.aliases) {
            const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, "");
            if (cleanHeader === cleanAlias || cleanHeader.includes(cleanAlias) || cleanAlias.includes(cleanHeader)) {
              bestMatch = field.key;
              break;
            }
          }
        }
      }

      mappings[header] = bestMatch;
    });

    setFieldMappings(mappings);
  };

  // Check required field mappings
  const requiredFields = config.fields.filter((f) => f.required);
  const mappedFieldKeys = Object.values(fieldMappings);
  const missingRequiredFields = requiredFields.filter((f) => !mappedFieldKeys.includes(f.key));
  const isMappingValid = missingRequiredFields.length === 0;

  // 4. TRANSFORM ROWS & RUN DRY-RUN VALIDATION
  const handleProceedToValidation = async () => {
    if (!isMappingValid) {
      toast.error(`Please map all required fields: ${missingRequiredFields.map((f) => f.label).join(", ")}`);
      return;
    }

    setIsValidating(true);
    try {
      // Map raw rows into system schema keys
      const mappedRows = rawRows.map((rawRow) => {
        const systemRow: Record<string, any> = {};
        for (const [header, fieldKey] of Object.entries(fieldMappings)) {
          if (fieldKey !== "__SKIP__") {
            systemRow[fieldKey] = rawRow[header];
          }
        }
        return systemRow;
      });

      const res = await fetch(`/api/import/${config.key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dryRun: true,
          rows: mappedRows,
          options,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Validation failed.");
        return;
      }

      setValidationResult(data);
      setStep(3);
    } catch (err: any) {
      toast.error(err.message || "Failed to validate records.");
    } finally {
      setIsValidating(false);
    }
  };

  // 5. DOWNLOAD ERROR ROWS AS CSV
  const handleDownloadErrors = () => {
    if (!validationResult || validationResult.errors.length === 0) return;

    const errorRowsMap = new Map<number, string[]>();
    validationResult.errors.forEach((err) => {
      const existing = errorRowsMap.get(err.rowNumber) || [];
      existing.push(`${err.field}: ${err.message}`);
      errorRowsMap.set(err.rowNumber, existing);
    });

    const errorData = rawRows
      .map((r, idx) => {
        const rowNum = idx + 1;
        const errMessages = errorRowsMap.get(rowNum);
        if (!errMessages) return null;
        return {
          "Row Number": rowNum,
          ...r,
          "Validation Error Reason": errMessages.join(" | "),
        };
      })
      .filter(Boolean);

    const worksheet = XLSX.utils.json_to_sheet(errorData);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${config.key}_import_errors.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded error rows CSV.");
  };

  // 6. EXECUTE ACTUAL BATCH IMPORT
  const handleExecuteImport = async () => {
    if (!validationResult || validationResult.validCount === 0) {
      toast.error("No valid records to import.");
      return;
    }

    setIsImporting(true);
    try {
      // Filter out invalid rows if any
      const errorRowNumbers = new Set(validationResult.errors.map((e) => e.rowNumber));
      const validMappedRows = rawRows
        .map((rawRow, idx) => {
          if (errorRowNumbers.has(idx + 1)) return null;
          const systemRow: Record<string, any> = {};
          for (const [header, fieldKey] of Object.entries(fieldMappings)) {
            if (fieldKey !== "__SKIP__") {
              systemRow[fieldKey] = rawRow[header];
            }
          }
          return systemRow;
        })
        .filter(Boolean);

      const res = await fetch(`/api/import/${config.key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dryRun: false,
          rows: validMappedRows,
          options,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Import failed.");
        return;
      }

      setImportResult(data);
      setStep(4);
      toast.success(data.message || `Imported ${data.createdCount} records into ${config.label}!`);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred during import.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 rounded-3xl bg-white border border-slate-200 shadow-2xl z-[100] relative">
        {/* Header with Step Wizard Indicator */}
        <div className="p-6 pb-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-orange-50/40 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-[#ACCAD5] to-[#F0944D] flex items-center justify-center text-white shadow-xs">
                  <UploadCloud className="h-4 w-4" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-slate-900">
                    Bulk Import • {config.label}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Step {step} of 4:{" "}
                    {step === 1 && "Upload File & Template"}
                    {step === 2 && "Interactive Column Mapping"}
                    {step === 3 && "Validation & Dry-Run Preview"}
                    {step === 4 && "Import Summary & Confirmation"}
                  </DialogDescription>
                </div>
              </div>
            </div>

            {/* Stepper Dots (mr-10 gives clearance from the absolute close button) */}
            <div className="flex items-center gap-2 mr-10">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`h-2 rounded-full transition-all ${
                    s === step
                      ? "w-7 bg-[#F0944D]"
                      : s < step
                      ? "w-2 bg-[#ACCAD5]"
                      : "w-2 bg-slate-200"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* STEP 1: UPLOAD FILE & TEMPLATE */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Sample Template Section */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#ACCAD5]/15 to-[#F0944D]/10 border border-[#ACCAD5]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <FileSpreadsheet className="h-4 w-4 text-[#F0944D]" />
                    Standard {config.label} Sample Template
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Download our pre-formatted spreadsheet template with exact column headers and example values.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadTemplate("xlsx")}
                    className="h-8 text-xs rounded-full border-slate-200 text-slate-700 bg-white hover:bg-slate-50 gap-1.5 shadow-2xs"
                  >
                    <Download className="h-3.5 w-3.5 text-emerald-600" />
                    Excel (.xlsx)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadTemplate("csv")}
                    className="h-8 text-xs rounded-full border-slate-200 text-slate-700 bg-white hover:bg-slate-50 gap-1.5 shadow-2xs"
                  >
                    <Download className="h-3.5 w-3.5 text-sky-600" />
                    CSV (.csv)
                  </Button>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-[#F0944D]/70 hover:bg-orange-50/20 transition-all rounded-3xl p-10 text-center cursor-pointer group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="h-14 w-14 rounded-2xl bg-[#EBF3F6] group-hover:bg-[#F0944D]/10 text-[#588594] group-hover:text-[#F0944D] flex items-center justify-center mx-auto mb-3 transition-colors">
                  <UploadCloud className="h-7 w-7" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  Click to select CSV or Excel file
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Supports .csv, .xlsx, .xls (Up to 10 MB)
                </p>
              </div>

              {/* Security & Access Notice */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 text-[11px] text-slate-500 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-700">Enterprise Integrity &amp; Ownership: </span>
                  Imported records will be automatically attributed to your user account and scoped according to departmental access controls.
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: INTERACTIVE FIELD MAPPING */}
          {step === 2 && (
            <div className="space-y-5">
              {/* File Info Bar + Multi-Sheet Selector */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200 text-xs">
                <div className="flex items-center gap-2 text-slate-700 font-medium">
                  <FileSpreadsheet className="h-4 w-4 text-[#F0944D]" />
                  <span>{file?.name}</span>
                  <Badge variant="secondary" className="text-[10px] bg-white border border-slate-200">
                    {rawRows.length} rows detected
                  </Badge>
                </div>

                {availableSheets.length > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500">Sheet:</span>
                    <select
                      value={selectedSheet}
                      onChange={(e) => handleSheetChange(e.target.value)}
                      className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 font-semibold focus:outline-none"
                    >
                      {availableSheets.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Required Fields Summary */}
              {!isMappingValid && (
                <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Required fields not yet mapped: </span>
                    {missingRequiredFields.map((f) => f.label).join(", ")}. Please map them below to proceed.
                  </div>
                </div>
              )}

              {/* Mapping Table */}
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <div className="max-h-[380px] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 sticky top-0 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider z-10">
                      <tr>
                        <th className="py-2.5 px-4">Uploaded File Column</th>
                        <th className="py-2.5 px-4">Row 1 Sample Value</th>
                        <th className="py-2.5 px-4 text-center">Direction</th>
                        <th className="py-2.5 px-4">Map to System Field</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rawHeaders.map((header) => {
                        const sampleVal = rawRows[0]?.[header];
                        const currentMappedKey = fieldMappings[header] || "__SKIP__";
                        const targetField = config.fields.find((f) => f.key === currentMappedKey);

                        return (
                          <tr key={header} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-2.5 px-4 font-semibold text-slate-800">
                              {header}
                            </td>
                            <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500 max-w-[180px] truncate">
                              {sampleVal !== undefined && sampleVal !== null && sampleVal !== ""
                                ? String(sampleVal)
                                : <span className="text-slate-300 italic">Empty</span>}
                            </td>
                            <td className="py-2.5 px-4 text-center text-slate-300">
                              <ArrowRight className="h-3.5 w-3.5 mx-auto" />
                            </td>
                            <td className="py-2.5 px-4">
                              <div className="flex items-center gap-2">
                                <select
                                  value={currentMappedKey}
                                  onChange={(e) =>
                                    setFieldMappings((prev) => ({
                                      ...prev,
                                      [header]: e.target.value,
                                    }))
                                  }
                                  className={`h-8 px-2.5 rounded-lg border text-xs font-medium focus:outline-none w-full ${
                                    currentMappedKey === "__SKIP__"
                                      ? "border-slate-200 bg-slate-50/60 text-slate-400"
                                      : targetField?.required
                                      ? "border-[#F0944D]/60 bg-orange-50/30 text-slate-900 font-semibold"
                                      : "border-slate-300 bg-white text-slate-800"
                                  }`}
                                >
                                  <option value="__SKIP__">⛔ (Do not import / Skip)</option>
                                  <optgroup label="Required Fields">
                                    {config.fields
                                      .filter((f) => f.required)
                                      .map((f) => (
                                        <option key={f.key} value={f.key}>
                                          * {f.label}
                                        </option>
                                      ))}
                                  </optgroup>
                                  <optgroup label="Optional Fields">
                                    {config.fields
                                      .filter((f) => !f.required)
                                      .map((f) => (
                                        <option key={f.key} value={f.key}>
                                          {f.label}
                                        </option>
                                      ))}
                                  </optgroup>
                                </select>
                                {targetField?.required && (
                                  <span className="text-[10px] text-[#F0944D] font-bold shrink-0">
                                    *Req
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStep(1)}
                  className="rounded-full text-xs h-9 border-slate-200 text-slate-600"
                >
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                  Back
                </Button>

                <Button
                  type="button"
                  size="sm"
                  disabled={!isMappingValid || isValidating}
                  onClick={handleProceedToValidation}
                  className="rounded-full text-xs font-semibold px-5 h-9 text-white bg-gradient-to-r from-[#ACCAD5] to-[#F0944D] hover:opacity-95 shadow-xs cursor-pointer gap-1.5 disabled:opacity-50"
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Validating Records...
                    </>
                  ) : (
                    <>
                      Validate {rawRows.length} Rows
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: VALIDATION & DRY-RUN PREVIEW */}
          {step === 3 && validationResult && (
            <div className="space-y-5">
              {/* Validation Summary Metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Rows</span>
                  <p className="text-xl font-bold text-slate-800">{validationResult.total}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-center">
                  <span className="text-[10px] uppercase font-bold text-emerald-600 flex items-center justify-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Ready to Import
                  </span>
                  <p className="text-xl font-bold text-emerald-700">{validationResult.validCount}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200 text-center">
                  <span className="text-[10px] uppercase font-bold text-rose-600 flex items-center justify-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Error Rows
                  </span>
                  <p className="text-xl font-bold text-rose-700">{validationResult.errorCount}</p>
                </div>
              </div>

              {/* Error Rows Table (if any) */}
              {validationResult.errors.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4" />
                      Detected Issues ({validationResult.errors.length})
                    </h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadErrors}
                      className="h-7 text-xs rounded-full border-rose-200 text-rose-700 hover:bg-rose-50 gap-1.5 shadow-2xs"
                    >
                      <Download className="h-3 w-3" />
                      Download Error Rows (CSV)
                    </Button>
                  </div>

                  <div className="rounded-2xl border border-rose-200/80 overflow-hidden bg-rose-50/20">
                    <div className="max-h-[200px] overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-rose-100 sticky top-0 text-rose-900 font-bold uppercase text-[10px] z-10 border-b border-rose-200">
                          <tr>
                            <th className="py-2 px-3">Row #</th>
                            <th className="py-2 px-3">Field</th>
                            <th className="py-2 px-3">Error Reason</th>
                            <th className="py-2 px-3">Provided Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-rose-100">
                          {validationResult.errors.map((err, idx) => (
                            <tr key={idx} className="hover:bg-rose-50/60">
                              <td className="py-2 px-3 font-mono font-bold text-slate-700">
                                {err.rowNumber}
                              </td>
                              <td className="py-2 px-3 font-semibold text-rose-800">
                                {err.field}
                              </td>
                              <td className="py-2 px-3 text-rose-700">{err.message}</td>
                              <td className="py-2 px-3 font-mono text-[11px] text-slate-500">
                                {String(err.rawValue ?? "")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStep(2)}
                  className="rounded-full text-xs h-9 border-slate-200 text-slate-600"
                >
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                  Adjust Mappings
                </Button>

                <Button
                  type="button"
                  size="sm"
                  disabled={validationResult.validCount === 0 || isImporting}
                  onClick={handleExecuteImport}
                  className="rounded-full text-xs font-semibold px-6 h-9 text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 shadow-xs cursor-pointer gap-1.5 disabled:opacity-50"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Importing Records...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Import {validationResult.validCount} Valid Records
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: RESULT CONFIRMATION */}
          {step === 4 && importResult && (
            <div className="text-center py-6 space-y-4">
              <div className="h-16 w-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Import Completed Successfully!
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  {importResult.message}
                </p>
              </div>

              <div className="inline-flex items-center gap-4 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Imported</span>
                  <span className="text-base font-bold text-emerald-600">{importResult.createdCount}</span>
                </div>
                {importResult.failedCount > 0 && (
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Failed / Skipped</span>
                    <span className="text-base font-bold text-rose-600">{importResult.failedCount}</span>
                  </div>
                )}
              </div>

              <div className="pt-4">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleClose}
                  className="rounded-full text-xs font-semibold px-6 h-9 text-white bg-gradient-to-r from-[#ACCAD5] to-[#F0944D] hover:opacity-95 shadow-xs cursor-pointer"
                >
                  Finish &amp; Close View
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
