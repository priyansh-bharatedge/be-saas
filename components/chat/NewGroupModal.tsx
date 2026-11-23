"use client";

import { useState, useEffect } from "react";
import { Users, X, Search, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Colleague {
  id: string;
  name: string;
  email: string;
  department: string;
  designation: string;
}

interface NewGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: (conversationId: string) => void;
}

export function NewGroupModal({ isOpen, onClose, onGroupCreated }: NewGroupModalProps) {
  const [groupName, setGroupName] = useState("");
  const [search, setSearch] = useState("");
  const [colleagues, setColleagues] = useState<Colleague[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingColleagues, setLoadingColleagues] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setGroupName("");
    setSelectedIds(new Set());
    setSearch("");

    const fetchColleagues = async () => {
      setLoadingColleagues(true);
      try {
        const res = await fetch("/api/chat/search?q=");
        const data = await res.json();
        if (data.success && data.employees) {
          setColleagues(data.employees);
        }
      } catch (err) {
        console.error("Failed to fetch colleagues:", err);
      } finally {
        setLoadingColleagues(false);
      }
    };

    fetchColleagues();
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredColleagues = colleagues.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.department.toLowerCase().includes(search.toLowerCase()) ||
      c.designation.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!groupName.trim()) {
      setError("Please enter a group name.");
      return;
    }
    if (selectedIds.size === 0) {
      setError("Please select at least one colleague to add.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isGroup: true,
          name: groupName.trim(),
          participantIds: Array.from(selectedIds),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create group");
      }

      onGroupCreated(data.conversationId);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error creating group");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-[28px] bg-white border border-slate-200/80 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#EBF3F6] border border-[#ACCAD5]/50 flex items-center justify-center text-[#3D6472]">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Create New Group</h3>
              <p className="text-xs text-slate-400">Collaborate with multiple team members</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {error}
            </div>
          )}

          {/* Group Name Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Group Name *
            </label>
            <Input
              type="text"
              placeholder="e.g. Sales Q4 Campaign, Tech Leads, Legal Review"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="h-10 rounded-xl bg-slate-50/80 border-slate-200 text-xs focus-visible:ring-1 focus-visible:ring-[#588594]"
            />
          </div>

          {/* Member Search */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Select Members ({selectedIds.size} selected)
              </label>
              {selectedIds.size > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="text-[11px] text-[#588594] hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                type="text"
                placeholder="Filter by name, department, or role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 rounded-xl bg-slate-50/80 border-slate-200 text-xs focus-visible:ring-1 focus-visible:ring-[#588594]"
              />
            </div>

            {/* Colleagues Picklist */}
            <div className="border border-slate-200/80 rounded-2xl overflow-y-auto max-h-56 divide-y divide-slate-100 bg-white">
              {loadingColleagues ? (
                <div className="p-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-[#588594]" />
                  Loading colleagues...
                </div>
              ) : filteredColleagues.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No active colleagues match your search.
                </div>
              ) : (
                filteredColleagues.map((colleague) => {
                  const isChecked = selectedIds.has(colleague.id);
                  return (
                    <div
                      key={colleague.id}
                      onClick={() => toggleSelect(colleague.id)}
                      className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                        isChecked ? "bg-[#EBF3F6]/50" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ACCAD5] to-[#F0944D] text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {colleague.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-900">
                            {colleague.name}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {colleague.designation} • {colleague.department}
                          </div>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                          isChecked
                            ? "bg-[#588594] border-[#588594] text-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs rounded-xl"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleCreate}
            disabled={isSubmitting || !groupName.trim() || selectedIds.size === 0}
            className="bg-[#588594] hover:bg-[#466C78] text-white text-xs font-semibold rounded-xl px-5"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                Creating...
              </>
            ) : (
              `Create Group (${selectedIds.size})`
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
