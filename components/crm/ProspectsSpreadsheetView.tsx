"use client";

import { useState, useTransition } from "react";
import {
  Table2,
  Plus,
  Search,
  UploadCloud,
  Trash2,
  Pencil,
  Settings2,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronDown,
  Loader2,
  X,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import BulkImportWizard from "@/components/shared/BulkImportWizard";
import BulkExportMenu from "@/components/shared/BulkExportMenu";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import {
  SerializedProspectTab,
  SerializedProspectSheet,
  SerializedProspectColumn,
  SerializedProspectRow,
  createProspectTabAction,
  updateProspectTabAction,
  deleteProspectTabAction,
  createProspectSheetAction,
  createProspectColumnAction,
  deleteProspectColumnAction,
  addProspectRowAction,
  updateProspectRowCellAction,
  deleteProspectRowAction,
  convertProspectToLeadAction,
  bulkUploadProspectRowsAction,
} from "@/lib/actions/prospects";
import { z } from "zod";

interface ProspectsSpreadsheetViewProps {
  initialTabs: SerializedProspectTab[];
  initialActiveTab: SerializedProspectTab | null;
  initialActiveSheet: SerializedProspectSheet | null;
  initialColumns: SerializedProspectColumn[];
  initialRows: SerializedProspectRow[];
  canManageSchema: boolean;
  canManageTabs: boolean;
  availableEmployees: { id: string; name: string; department: string }[];
}

export default function ProspectsSpreadsheetView({
  initialTabs,
  initialActiveTab,
  initialActiveSheet,
  initialColumns,
  initialRows,
  canManageSchema,
  canManageTabs,
  availableEmployees,
}: ProspectsSpreadsheetViewProps) {
  const [tabs, setTabs] = useState<SerializedProspectTab[]>(initialTabs);
  const [activeTab, setActiveTab] = useState<SerializedProspectTab | null>(initialActiveTab);
  const [activeSheet, setActiveSheet] = useState<SerializedProspectSheet | null>(initialActiveSheet);
  const [columns, setColumns] = useState<SerializedProspectColumn[]>(initialColumns);
  const [rows, setRows] = useState<SerializedProspectRow[]>(initialRows);

  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [savingCellKey, setSavingCellKey] = useState<string | null>(null);

  // Tab & Sheet Modals
  const [isAddTabOpen, setIsAddTabOpen] = useState(false);
  const [newTabName, setNewTabName] = useState("");
  const [newTabTlId, setNewTabTlId] = useState("");
  const [isCreatingTab, setIsCreatingTab] = useState(false);

  // Edit & Delete Tab States (HOD Only)
  const [editingTab, setEditingTab] = useState<SerializedProspectTab | null>(null);
  const [editTabName, setEditTabName] = useState("");
  const [editTabTlId, setEditTabTlId] = useState("");
  const [isUpdatingTab, setIsUpdatingTab] = useState(false);

  const [deletingTab, setDeletingTab] = useState<SerializedProspectTab | null>(null);
  const [isDeletingTab, setIsDeletingTab] = useState(false);

  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [newSheetName, setNewSheetName] = useState("");
  const [newSheetBdmId, setNewSheetBdmId] = useState("");
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);

  // Column Schema Modal (HOD)
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColType, setNewColType] = useState("TEXT");
  const [newColOptions, setNewColOptions] = useState("");
  const [newColWidth, setNewColWidth] = useState(160);

  // Bulk Upload Modal
  const [isBulkOpen, setIsBulkOpen] = useState(false);

  // Row Delete Modal
  const [deletingRowId, setDeletingRowId] = useState<string | null>(null);

  // Switch Active Tab
  const handleSwitchTab = (tab: SerializedProspectTab) => {
    setActiveTab(tab);
    if (tab.sheets.length > 0) {
      setActiveSheet(tab.sheets[0]);
    } else {
      setActiveSheet(null);
    }
    // Reload data for this tab
    window.location.href = `/crm/prospects?tabId=${tab.id}${tab.sheets[0] ? `&sheetId=${tab.sheets[0].id}` : ""}`;
  };

  // Switch Active Sub-Sheet
  const handleSwitchSheet = (sheet: SerializedProspectSheet) => {
    setActiveSheet(sheet);
    window.location.href = `/crm/prospects?tabId=${activeTab?.id}&sheetId=${sheet.id}`;
  };

  // Inline Cell Edit Handler
  const handleCellBlur = async (rowId: string, colKey: string, newValue: any, originalValue: any) => {
    if (newValue === originalValue) return;

    setSavingCellKey(`${rowId}_${colKey}`);
    try {
      // Optimistic update
      setRows((prev) =>
        prev.map((r) =>
          r.id === rowId ? { ...r, data: { ...r.data, [colKey]: newValue } } : r
        )
      );

      const res = await updateProspectRowCellAction(rowId, colKey, newValue);
      if (!res.success) {
        toast.error(res.error || "Failed to persist cell changes.");
      }
    } catch {
      toast.error("Failed to update cell.");
    } finally {
      setSavingCellKey(null);
    }
  };

  // Add New Row to Sheet
  const handleAddRow = async () => {
    if (!activeSheet) return;
    try {
      const res = await addProspectRowAction(activeSheet.id, {
        status: "New",
      });
      if (res.success && res.data) {
        setRows((prev) => [...prev, res.data!]);
        toast.success("New prospect row added.");
      } else {
        toast.error(res.error || "Failed to add row.");
      }
    } catch {
      toast.error("Failed to add prospect row.");
    }
  };

  // Delete Row
  const handleDeleteRowConfirm = async () => {
    if (!deletingRowId) return;
    try {
      const res = await deleteProspectRowAction(deletingRowId);
      if (res.success) {
        setRows((prev) => prev.filter((r) => r.id !== deletingRowId));
        toast.success("Prospect row removed.");
        setDeletingRowId(null);
      } else {
        toast.error(res.error || "Failed to delete row.");
      }
    } catch {
      toast.error("Failed to delete row.");
    }
  };

  // 1-Click Convert to Lead
  const handleConvertToLead = async (rowId: string) => {
    try {
      const res = await convertProspectToLeadAction(rowId);
      if (res.success) {
        toast.success("Converted to active Sales Lead! View in /crm/leads.");
        // Update local status badge
        setRows((prev) =>
          prev.map((r) =>
            r.id === rowId ? { ...r, data: { ...r.data, status: "Converted" } } : r
          )
        );
      } else {
        toast.error(res.error || "Failed to convert prospect.");
      }
    } catch {
      toast.error("Failed to convert prospect to lead.");
    }
  };

  // Create TL Tab (HOD)
  const handleCreateTab = async () => {
    if (!newTabName.trim()) {
      toast.error("Please enter a tab name.");
      return;
    }
    setIsCreatingTab(true);
    try {
      const res = await createProspectTabAction(newTabName.trim(), newTabTlId || undefined);
      if (res.success) {
        toast.success(`Team Leader tab "${newTabName}" created!`);
        setIsAddTabOpen(false);
        setNewTabName("");
        setNewTabTlId("");
        if (res.data?.tabId) {
          window.location.href = `/crm/prospects?tabId=${res.data.tabId}`;
        } else {
          window.location.reload();
        }
      } else {
        toast.error(res.error || "Failed to create tab.");
      }
    } catch {
      toast.error("Failed to create tab.");
    } finally {
      setIsCreatingTab(false);
    }
  };

  // Create Sub-Sheet (HOD / TL)
  const handleCreateSheet = async () => {
    if (!activeTab) return;
    if (!newSheetName.trim()) {
      toast.error("Please enter a sheet name.");
      return;
    }
    setIsCreatingSheet(true);
    try {
      const res = await createProspectSheetAction(
        activeTab.id,
        newSheetName.trim(),
        newSheetBdmId || undefined
      );
      if (res.success) {
        toast.success(`BDM sheet "${newSheetName}" created!`);
        setIsAddSheetOpen(false);
        setNewSheetName("");
        setNewSheetBdmId("");
        if (res.data?.sheetId) {
          window.location.href = `/crm/prospects?tabId=${activeTab.id}&sheetId=${res.data.sheetId}`;
        } else {
          window.location.reload();
        }
      } else {
        toast.error(res.error || "Failed to create sheet.");
      }
    } catch {
      toast.error("Failed to create sheet.");
    } finally {
      setIsCreatingSheet(false);
    }
  };

  // Open Edit Tab Modal (HOD)
  const handleOpenEditTab = (tab: SerializedProspectTab, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingTab(tab);
    setEditTabName(tab.name);
    setEditTabTlId(tab.teamLeaderId || "");
  };

  // Submit Edit Tab (HOD)
  const handleUpdateTabSubmit = async () => {
    if (!editingTab) return;
    const trimmed = editTabName.trim();
    if (!trimmed) {
      toast.error("Tab name cannot be empty.");
      return;
    }
    setIsUpdatingTab(true);
    try {
      const res = await updateProspectTabAction({
        tabId: editingTab.id,
        name: trimmed,
        teamLeaderId: editTabTlId || null,
      });

      if (res.success && res.data) {
        toast.success(`Team Leader tab "${res.data.name}" updated!`);
        const updatedName = res.data.name;
        const updatedTl = res.data.teamLeaderName;

        setTabs((prev) =>
          prev.map((t) =>
            t.id === editingTab.id
              ? {
                  ...t,
                  name: updatedName,
                  teamLeaderName: updatedTl,
                  teamLeaderId: editTabTlId || null,
                }
              : t
          )
        );

        if (activeTab?.id === editingTab.id) {
          setActiveTab((prev) =>
            prev
              ? {
                  ...prev,
                  name: updatedName,
                  teamLeaderName: updatedTl,
                  teamLeaderId: editTabTlId || null,
                }
              : null
          );
        }

        setEditingTab(null);
      } else {
        toast.error(res.error || "Failed to update TL tab.");
      }
    } catch {
      toast.error("An error occurred while updating the tab.");
    } finally {
      setIsUpdatingTab(false);
    }
  };

  // Open Delete Tab Confirmation (HOD)
  const handleOpenDeleteTab = (tab: SerializedProspectTab, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDeletingTab(tab);
  };

  // Confirm Delete Tab (HOD)
  const handleConfirmDeleteTab = async () => {
    if (!deletingTab) return;
    setIsDeletingTab(true);
    try {
      const res = await deleteProspectTabAction(deletingTab.id);
      if (res.success && res.data) {
        toast.success(`Team Leader tab "${deletingTab.name}" deleted.`);
        const wasActive = activeTab?.id === deletingTab.id;
        const nextTabId = res.data.nextTabId;
        const nextSheetId = res.data.nextSheetId;

        setDeletingTab(null);

        if (wasActive) {
          if (nextTabId) {
            window.location.href = `/crm/prospects?tabId=${nextTabId}${nextSheetId ? `&sheetId=${nextSheetId}` : ""}`;
          } else {
            window.location.href = "/crm/prospects";
          }
        } else {
          setTabs((prev) => prev.filter((t) => t.id !== deletingTab.id));
        }
      } else {
        toast.error(res.error || "Failed to delete TL tab.");
      }
    } catch {
      toast.error("An error occurred while deleting the tab.");
    } finally {
      setIsDeletingTab(false);
    }
  };

  // Create Dynamic Column (HOD)
  const handleCreateColumn = async () => {
    if (!activeTab) return;
    if (!newColName.trim()) {
      toast.error("Please enter a column name.");
      return;
    }
    const options = newColOptions
      ? newColOptions.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;

    const res = await createProspectColumnAction({
      tabId: activeTab.id,
      name: newColName.trim(),
      type: newColType,
      options,
      width: Number(newColWidth) || 160,
    });

    if (res.success) {
      toast.success(`Column "${newColName}" added to spreadsheet schema!`);
      setNewColName("");
      setNewColOptions("");
      window.location.reload();
    } else {
      toast.error(res.error || "Failed to add column.");
    }
  };

  // Delete Column (HOD)
  const handleDeleteColumn = async (colId: string, colName: string) => {
    if (!confirm(`Are you sure you want to delete column "${colName}" from this tab?`)) return;
    const res = await deleteProspectColumnAction(colId);
    if (res.success) {
      toast.success(`Column "${colName}" removed.`);
      setColumns((prev) => prev.filter((c) => c.id !== colId));
    } else {
      toast.error(res.error || "Failed to delete column.");
    }
  };

  // Filter Rows by Search
  const filteredRows = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return Object.values(r.data).some((val) =>
      String(val || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* 1. TOP-LEVEL TABS (TL-WISE HIERARCHY) */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
          {tabs.map((tab) => {
            const isActive = activeTab?.id === tab.id;
            return (
              <div
                key={tab.id}
                onClick={() => handleSwitchTab(tab)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer group select-none ${
                  isActive
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white/70 text-slate-600 hover:text-slate-900 hover:bg-white border border-slate-200/80"
                }`}
              >
                <Table2 className="h-3.5 w-3.5 text-[#F0944D]" />
                <span>{tab.name}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    isActive ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {tab.sheets.length} sheets
                </span>

                {/* HOD Tab Action Buttons */}
                {canManageTabs && (
                  <div className="flex items-center gap-0.5 ml-1 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      title={`Edit Tab "${tab.name}"`}
                      onClick={(e) => handleOpenEditTab(tab, e)}
                      className={`p-1 rounded-full transition-colors ${
                        isActive
                          ? "hover:bg-slate-800 text-slate-400 hover:text-white"
                          : "hover:bg-slate-200 text-slate-400 hover:text-slate-800"
                      }`}
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      title={`Delete Tab "${tab.name}"`}
                      onClick={(e) => handleOpenDeleteTab(tab, e)}
                      className={`p-1 rounded-full transition-colors ${
                        isActive
                          ? "hover:bg-rose-900/60 text-slate-400 hover:text-rose-300"
                          : "hover:bg-rose-100 text-slate-400 hover:text-rose-600"
                      }`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {canManageTabs && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddTabOpen(true)}
              className="rounded-2xl text-xs h-8 gap-1.5 border-dashed border-slate-300 text-slate-600 hover:text-slate-900 shrink-0"
            >
              <Plus className="h-3 w-3" />
              New TL Tab
            </Button>
          )}
        </div>

        {activeTab && (
          <div className="flex items-center gap-3 text-xs text-slate-500 shrink-0">
            <div className="hidden lg:flex items-center gap-1.5">
              <span className="font-semibold text-slate-700">Team Leader:</span>
              <span className="font-medium text-slate-900">{activeTab.teamLeaderName}</span>
            </div>

            {canManageTabs && (
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => handleOpenEditTab(activeTab, e)}
                  className="h-7 px-2.5 rounded-full text-[11px] gap-1 text-slate-600 hover:text-slate-900 border-slate-200 bg-white/70 shadow-2xs"
                >
                  <Pencil className="h-3 w-3 text-[#F0944D]" />
                  Edit Tab
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => handleOpenDeleteTab(activeTab, e)}
                  className="h-7 px-2.5 rounded-full text-[11px] gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200/80 bg-white/70 shadow-2xs"
                >
                  <Trash2 className="h-3 w-3 text-rose-500" />
                  Delete Tab
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. SUB-TABS (PERSON-WISE BDM / CDM SHEETS) */}
      {activeTab && activeTab.sheets.length > 0 && (
        <div className="flex items-center justify-between bg-slate-100/70 p-1.5 rounded-2xl border border-slate-200/70">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {activeTab.sheets.map((sheet) => {
              const isActive = activeSheet?.id === sheet.id;
              return (
                <button
                  key={sheet.id}
                  type="button"
                  onClick={() => handleSwitchSheet(sheet)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? "bg-white text-slate-950 font-bold shadow-xs border border-slate-200/80"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                  }`}
                >
                  <FileSpreadsheet className={`h-3.5 w-3.5 ${isActive ? "text-[#F0944D]" : "text-slate-400"}`} />
                  <span>{sheet.name}</span>
                  {sheet.assignedBdmName && sheet.assignedBdmName !== "Unassigned" && (
                    <span className="text-[10px] text-slate-400 font-normal">
                      ({sheet.assignedBdmName})
                    </span>
                  )}
                  <span className="text-[9px] font-mono px-1 rounded-full bg-slate-100 text-slate-500">
                    {sheet.rowsCount}
                  </span>
                </button>
              );
            })}

            {(canManageTabs || canManageSchema) && (
              <button
                type="button"
                onClick={() => setIsAddSheetOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-white/60 transition-colors shrink-0 cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                Add Person Sheet
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. SPREADSHEET TOOLBAR */}
      <div className="relative z-20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search across spreadsheet cells..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 text-xs rounded-full bg-slate-50/70 border-slate-200"
            />
          </div>

          <Badge variant="outline" className="text-[10px] font-mono border-slate-200 text-slate-600">
            {filteredRows.length} rows
          </Badge>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {canManageSchema && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsColumnModalOpen(true)}
              className="rounded-full text-xs gap-1.5 h-8 border-slate-200 text-slate-700 hover:text-slate-900 shadow-2xs"
            >
              <Settings2 className="h-3.5 w-3.5 text-[#F0944D]" />
              Manage Columns
            </Button>
          )}

          <BulkExportMenu
            moduleKey="prospects"
            totalCount={rows.length}
            filters={{ sheetId: activeSheet?.id }}
            searchQuery={search}
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsBulkOpen(true)}
            className="rounded-full text-xs gap-1.5 h-8 border-slate-200 text-slate-700 hover:text-slate-900 shadow-2xs font-medium"
          >
            <UploadCloud className="h-3.5 w-3.5 text-[#F0944D]" />
            Import Prospects
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleAddRow}
            className="rounded-full text-xs font-semibold px-4 h-8 text-white bg-gradient-to-r from-[#ACCAD5] to-[#F0944D] hover:opacity-95 shadow-xs cursor-pointer gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Row
          </Button>
        </div>
      </div>

      {/* 4. GOOGLE SHEETS DYNAMIC INTERACTIVE GRID */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden select-none">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            {/* Sticky Table Header */}
            <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200 text-slate-700 font-bold text-[11px]">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center bg-slate-200/80 border-r border-slate-300 text-slate-500 font-mono">
                  #
                </th>
                {columns.map((col) => (
                  <th
                    key={col.id}
                    style={{ minWidth: col.width }}
                    className="py-2.5 px-3 border-r border-slate-200 tracking-wide font-semibold truncate"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span>{col.name}</span>
                      <span className="text-[9px] font-mono font-normal text-slate-400">
                        {col.type.toLowerCase()}
                      </span>
                    </div>
                  </th>
                ))}
                <th className="py-2.5 px-3 w-28 text-center bg-slate-100">Actions</th>
              </tr>
            </thead>

            {/* Table Body (Inline Editable Cells) */}
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + 2}
                    className="py-16 text-center text-slate-400 bg-slate-50/40"
                  >
                    <FileSpreadsheet className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No prospect records in this sheet</p>
                    <p className="text-[11px] mt-0.5">
                      Click "+ Add Row" above to enter a row or use "Bulk Import CSV".
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, rowIdx) => {
                  const isConverted = row.data?.status === "Converted";
                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-amber-50/20 transition-colors group ${
                        isConverted ? "bg-emerald-50/30" : ""
                      }`}
                    >
                      {/* Sticky Row Index */}
                      <td className="py-1 px-2 text-center bg-slate-50 border-r border-slate-200 text-slate-400 font-mono text-[10px]">
                        {rowIdx + 1}
                      </td>

                      {/* Dynamic Columns Cells */}
                      {columns.map((col) => {
                        const cellValue = row.data[col.key] ?? "";
                        const isSaving = savingCellKey === `${row.id}_${col.key}`;

                        return (
                          <td
                            key={col.id}
                            className="p-1 border-r border-slate-100 relative group/cell hover:bg-white"
                          >
                            {col.type === "BADGE" || col.type === "SELECT" ? (
                              <select
                                defaultValue={cellValue}
                                onChange={(e) =>
                                  handleCellBlur(row.id, col.key, e.target.value, cellValue)
                                }
                                className="w-full h-8 px-2 rounded-lg bg-transparent hover:bg-slate-100 focus:bg-white border-0 text-xs font-semibold focus:ring-1 focus:ring-[#F0944D] cursor-pointer"
                              >
                                <option value="">— Select —</option>
                                {(col.options || []).map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            ) : col.type === "DATE" ? (
                              <input
                                type="date"
                                defaultValue={cellValue}
                                onBlur={(e) =>
                                  handleCellBlur(row.id, col.key, e.target.value, cellValue)
                                }
                                className="w-full h-8 px-2 rounded-lg bg-transparent hover:bg-slate-100 focus:bg-white border-0 text-xs font-mono focus:ring-1 focus:ring-[#F0944D]"
                              />
                            ) : (
                              <input
                                type="text"
                                defaultValue={cellValue}
                                placeholder="—"
                                onBlur={(e) =>
                                  handleCellBlur(row.id, col.key, e.target.value, cellValue)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    (e.target as HTMLInputElement).blur();
                                  }
                                }}
                                className="w-full h-8 px-2 rounded-lg bg-transparent hover:bg-slate-100 focus:bg-white border-0 text-xs focus:ring-1 focus:ring-[#F0944D]"
                              />
                            )}

                            {isSaving && (
                              <span className="absolute right-1 top-1/2 -translate-y-1/2">
                                <Loader2 className="h-3 w-3 animate-spin text-[#F0944D]" />
                              </span>
                            )}
                          </td>
                        );
                      })}

                      {/* Row Action Buttons */}
                      <td className="py-1 px-2 text-center shrink-0">
                        <div className="flex items-center justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          {!isConverted ? (
                            <button
                              type="button"
                              onClick={() => handleConvertToLead(row.id)}
                              title="Convert to Sales Lead"
                              className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <ArrowRight className="h-2.5 w-2.5" />
                              Lead
                            </button>
                          ) : (
                            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                              <CheckCircle2 className="h-3 w-3" /> Won
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => setDeletingRowId(row.id)}
                            title="Delete Row"
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: CREATE TL TAB (HOD) */}
      <Dialog open={isAddTabOpen} onOpenChange={setIsAddTabOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-[28px] bg-white p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Create Team Leader Tab
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-0.5">
              Top-level partitioning by Team Leader hierarchy or sales division.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Tab Title</Label>
              <Input
                placeholder="e.g. Rajesh Iyer Team Pod"
                value={newTabName}
                onChange={(e) => setNewTabName(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Assigned Team Leader</Label>
              <select
                value={newTabTlId}
                onChange={(e) => setNewTabTlId(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-800"
              >
                <option value="">-- Select Team Leader --</option>
                {availableEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.department})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddTabOpen(false)}
              className="rounded-full text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleCreateTab}
              disabled={isCreatingTab}
              className="rounded-full text-xs bg-[#F0944D] hover:bg-[#E07E32] text-white"
            >
              {isCreatingTab ? "Creating..." : "Create Tab"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 1B: EDIT TL TAB (HOD ONLY) */}
      <Dialog open={!!editingTab} onOpenChange={(open) => !open && setEditingTab(null)}>
        <DialogContent className="sm:max-w-[420px] rounded-[28px] bg-white p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Pencil className="h-4 w-4 text-[#F0944D]" />
              Edit Team Leader Tab
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-0.5">
              Modify the tab title and reassigned Team Leader for this division.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleUpdateTabSubmit();
            }}
            className="space-y-4 py-2"
          >
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Tab Title *</Label>
              <Input
                placeholder="e.g. West Region / Rohan Sharma TL"
                value={editTabName}
                onChange={(e) => setEditTabName(e.target.value)}
                className="h-9 text-xs rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Assigned Team Leader</Label>
              <select
                value={editTabTlId}
                onChange={(e) => setEditTabTlId(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-800"
              >
                <option value="">-- Unassigned / Direct --</option>
                {availableEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.department})
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingTab(null)}
                className="rounded-full text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isUpdatingTab}
                className="rounded-full text-xs bg-[#F0944D] hover:bg-[#E07E32] text-white"
              >
                {isUpdatingTab ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 1C: DELETE TL TAB CONFIRMATION (HOD ONLY) */}
      <ConfirmationModal
        open={!!deletingTab}
        onOpenChange={(open) => !open && setDeletingTab(null)}
        title={`Delete "${deletingTab?.name}" Tab?`}
        description={`Are you sure you want to delete this Team Leader tab? All associated sub-sheets (${deletingTab?.sheets.length || 0} sheets) and their prospect rows will be permanently removed. This action cannot be undone.`}
        confirmLabel="Delete Tab & Sheets"
        cancelLabel="Keep Tab"
        isDestructive={true}
        isPending={isDeletingTab}
        onConfirm={handleConfirmDeleteTab}
      />

      {/* MODAL 2: CREATE BDM / CDM SUB-SHEET */}
      <Dialog open={isAddSheetOpen} onOpenChange={setIsAddSheetOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-[28px] bg-white p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Create BDM / CDM Sub-Sheet
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-0.5">
              Adds an individual team member sheet inside "{activeTab?.name}".
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Sheet Label</Label>
              <Input
                placeholder="e.g. Rohan Mehta - Outbound"
                value={newSheetName}
                onChange={(e) => setNewSheetName(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Assign to Sales TM</Label>
              <select
                value={newSheetBdmId}
                onChange={(e) => setNewSheetBdmId(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-800"
              >
                <option value="">-- Select BDM / CDM --</option>
                {availableEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.department})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddSheetOpen(false)}
              className="rounded-full text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleCreateSheet}
              disabled={isCreatingSheet}
              className="rounded-full text-xs bg-[#F0944D] hover:bg-[#E07E32] text-white"
            >
              {isCreatingSheet ? "Creating..." : "Create Sheet"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: HOD COLUMN SCHEMA CONTROLS */}
      <Dialog open={isColumnModalOpen} onOpenChange={setIsColumnModalOpen}>
        <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-hidden flex flex-col rounded-[28px] bg-white p-6 shadow-2xl">
          <DialogHeader className="shrink-0 pb-3 border-b border-slate-100">
            <DialogTitle className="text-base font-bold text-slate-900">
              Manage Spreadsheet Columns (HOD Controls)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-0.5">
              Add, configure, or remove dynamic columns for "{activeTab?.name}".
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-5 py-3 pr-1">
            {/* Add New Column Form */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-[#F0944D]" />
                Add New Column to Grid
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700">Column Name</Label>
                  <Input
                    placeholder="e.g. Lead Source"
                    value={newColName}
                    onChange={(e) => setNewColName(e.target.value)}
                    className="h-8 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700">Data Type</Label>
                  <select
                    value={newColType}
                    onChange={(e) => setNewColType(e.target.value)}
                    className="w-full h-8 px-2 rounded-xl border border-slate-200 bg-white text-xs"
                  >
                    <option value="TEXT">Text</option>
                    <option value="NUMBER">Number</option>
                    <option value="CURRENCY">Currency (₹)</option>
                    <option value="DATE">Date</option>
                    <option value="PHONE">Phone</option>
                    <option value="EMAIL">Email</option>
                    <option value="SELECT">Dropdown Select</option>
                    <option value="BADGE">Status Badge</option>
                  </select>
                </div>
              </div>

              {(newColType === "SELECT" || newColType === "BADGE") && (
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700">
                    Dropdown Options (comma-separated)
                  </Label>
                  <Input
                    placeholder="e.g. High, Medium, Low"
                    value={newColOptions}
                    onChange={(e) => setNewColOptions(e.target.value)}
                    className="h-8 text-xs rounded-xl"
                  />
                </div>
              )}

              <Button
                type="button"
                size="sm"
                onClick={handleCreateColumn}
                className="rounded-full text-xs bg-slate-900 text-white font-semibold h-8 px-4"
              >
                + Add Column
              </Button>
            </div>

            {/* Existing Columns List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800">
                Active Columns in "{activeTab?.name}" ({columns.length})
              </h4>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white text-xs">
                {columns.map((col) => (
                  <div key={col.id} className="p-2.5 flex items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-slate-900">{col.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono ml-2">
                        [{col.type.toLowerCase()}]
                      </span>
                    </div>

                    {!col.isSystem && (
                      <button
                        type="button"
                        onClick={() => handleDeleteColumn(col.id, col.name)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
                        title="Delete Column"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsColumnModalOpen(false)}
              className="rounded-full text-xs px-4"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* BULK IMPORT WIZARD */}
      <BulkImportWizard
        open={isBulkOpen}
        onOpenChange={setIsBulkOpen}
        moduleKey="prospects"
        options={{ sheetId: activeSheet?.id }}
        onSuccess={() => window.location.reload()}
      />

      {/* CONFIRMATION DELETE ROW MODAL */}
      <ConfirmationModal
        open={Boolean(deletingRowId)}
        onOpenChange={(open) => !open && setDeletingRowId(null)}
        title="Delete Prospect Row"
        description="Are you sure you want to remove this row from the spreadsheet? This action cannot be reversed."
        confirmLabel="Delete Row"
        onConfirm={handleDeleteRowConfirm}
      />
    </div>
  );
}
