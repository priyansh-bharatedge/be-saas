"use client";

import { useState, useTransition } from "react";
import {
  SerializedPolicy,
  createPolicyAction,
  updatePolicyAction,
  archivePolicyAction,
  deletePolicyAction,
  getCompanyPoliciesAction,
} from "@/lib/actions/policies";
import { PolicyStatus } from "@prisma/client";
import {
  FileText,
  Search,
  Plus,
  Download,
  Calendar,
  ExternalLink,
  Edit3,
  Archive,
  BookOpen,
  ShieldCheck,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { toast } from "sonner";

interface PolicyDirectoryViewProps {
  initialPolicies: SerializedPolicy[];
  initialCategories: string[];
  isHRAdmin: boolean;
}

export default function PolicyDirectoryView({
  initialPolicies,
  initialCategories,
  isHRAdmin,
}: PolicyDirectoryViewProps) {
  const [policies, setPolicies] = useState<SerializedPolicy[]>(initialPolicies);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  // Reader Modal State
  const [readingPolicy, setReadingPolicy] = useState<SerializedPolicy | null>(null);

  // Policy Creation / Edit Modal State
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Workplace Conduct");
  const [content, setContent] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Confirmation Modals State
  const [policyToDelete, setPolicyToDelete] = useState<SerializedPolicy | null>(null);
  const [policyToArchive, setPolicyToArchive] = useState<SerializedPolicy | null>(null);

  const categories = ["ALL", ...Array.from(new Set([...initialCategories, "Workplace Conduct", "Leave & Attendance", "IT & Data Security", "Workplace Safety", "Compensation & Benefits"]))];

  // Refetch
  const refetch = (cat = selectedCategory, q = search) => {
    startTransition(async () => {
      const res = await getCompanyPoliciesAction({ category: cat, search: q });
      if (res.success && res.data) {
        setPolicies(res.data.policies);
      }
    });
  };

  const handleOpenCreate = () => {
    setEditingPolicyId(null);
    setTitle("");
    setCategory("Workplace Conduct");
    setContent("");
    setDocumentUrl("https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf");
    setEffectiveDate(new Date().toISOString().split("T")[0]);
    setEditorOpen(true);
  };

  const handleOpenEdit = (policy: SerializedPolicy) => {
    setEditingPolicyId(policy.id);
    setTitle(policy.title);
    setCategory(policy.category);
    setContent(policy.content);
    setDocumentUrl(policy.documentUrl || "");
    setEffectiveDate(policy.effectiveDate);
    setEditorOpen(true);
  };

  const handleSavePolicy = () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Please provide both title and policy content.");
      return;
    }

    startTransition(async () => {
      let res;
      if (editingPolicyId) {
        res = await updatePolicyAction({
          id: editingPolicyId,
          title,
          category,
          content,
          documentUrl: documentUrl.trim() || undefined,
          effectiveDate,
          status: PolicyStatus.PUBLISHED,
        });
      } else {
        res = await createPolicyAction({
          title,
          category,
          content,
          documentUrl: documentUrl.trim() || undefined,
          effectiveDate,
        });
      }

      if (res.success) {
        toast.success(editingPolicyId ? "Policy updated successfully!" : "New policy published to workforce!");
        setEditorOpen(false);
        refetch();
      } else {
        toast.error(res.error || "Failed to save policy.");
      }
    });
  };

  const handleConfirmArchivePolicy = () => {
    if (!policyToArchive) return;
    const id = policyToArchive.id;
    startTransition(async () => {
      const res = await archivePolicyAction(id);
      if (res.success) {
        toast.success("Policy archived.");
        setPolicyToArchive(null);
        refetch();
      } else {
        toast.error(res.error || "Failed to archive policy.");
      }
    });
  };

  const handleConfirmDeletePolicy = () => {
    if (!policyToDelete) return;
    const id = policyToDelete.id;
    startTransition(async () => {
      const res = await deletePolicyAction(id);
      if (res.success) {
        toast.success("Policy permanently removed.");
        setPolicyToDelete(null);
        refetch();
      } else {
        toast.error(res.error || "Failed to delete policy.");
      }
    });
  };

  const filteredPolicies = policies.filter((p) => {
    const matchesCat = selectedCategory === "ALL" || p.category === selectedCategory;
    const matchesSearch =
      search.trim() === "" ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.content.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Filter Bar & Search */}
      <div className="rounded-[36px] bg-white/70 backdrop-blur-2xl border border-white/80 shadow-[0_12px_40px_rgba(0,0,0,0.03)] p-6 sm:p-8">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    refetch(cat, search);
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    active
                      ? "text-slate-900 bg-white shadow-2xs border border-slate-200"
                      : "text-slate-500 hover:text-slate-900 font-medium"
                  }`}
                >
                  {cat === "ALL" ? "All Categories" : cat}
                </button>
              );
            })}
          </div>

          {/* HR Admin Action Button */}
          {isHRAdmin && (
            <Button
              onClick={handleOpenCreate}
              className="bg-gradient-to-r from-[#588594] to-[#4A7280] hover:from-[#4A7280] hover:to-[#3D606C] text-white font-semibold text-xs px-5 py-2.5 rounded-full shadow-sm flex items-center gap-1.5 self-start xl:self-auto shrink-0 transition-transform active:scale-95 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Publish New Policy
            </Button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search policies by keyword, regulation, or topic..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              refetch(selectedCategory, e.target.value);
            }}
            className="pl-10 h-10 rounded-2xl bg-white/90 border-slate-200 text-xs text-slate-800 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Grid of Policy Cards */}
      {filteredPolicies.length === 0 ? (
        <div className="rounded-[32px] bg-white/70 border border-white/80 p-12 text-center text-slate-400 text-sm">
          No policies found matching the filter criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPolicies.map((policy) => {
            return (
              <div
                key={policy.id}
                className="rounded-[30px] bg-white/75 backdrop-blur-xl border border-white/80 shadow-[0_10px_35px_rgba(0,0,0,0.02)] p-6 flex flex-col justify-between transition-all hover:shadow-md hover:border-[#ACCAD5]"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-[#EBF3F6] text-[#588594] border border-[#ACCAD5]/50">
                      {policy.category}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                      <Calendar className="h-3 w-3" />
                      {policy.effectiveDate}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mt-4 leading-snug">
                    {policy.title}
                  </h3>

                  <p className="text-xs text-slate-500 mt-2 line-clamp-3 leading-relaxed">
                    {policy.content.replace(/[#*`_]/g, "")}
                  </p>
                </div>

                <div className="pt-5 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setReadingPolicy(policy)}
                    className="rounded-full text-xs font-semibold border-slate-200 hover:bg-[#EBF3F6] hover:text-[#588594] flex items-center gap-1.5"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    Read Policy
                  </Button>

                  <div className="flex items-center gap-1.5">
                    {policy.documentUrl && (
                      <a
                        href={policy.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-8 w-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200 transition-colors shadow-2xs"
                        title="Download / View Attached PDF"
                      >
                        <Download className="h-3.5 w-3.5 text-[#588594]" />
                      </a>
                    )}

                    {isHRAdmin && (
                      <>
                        <button
                          onClick={() => handleOpenEdit(policy)}
                          className="h-8 w-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200 transition-colors shadow-2xs cursor-pointer"
                          title="Edit Policy"
                        >
                          <Edit3 className="h-3.5 w-3.5 text-slate-500" />
                        </button>
                        <button
                          onClick={() => setPolicyToArchive(policy)}
                          className="h-8 w-8 rounded-full bg-slate-50 hover:bg-amber-50 text-slate-600 hover:text-amber-600 flex items-center justify-center border border-slate-200 transition-colors shadow-2xs cursor-pointer"
                          title="Archive Policy"
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setPolicyToDelete(policy)}
                          className="h-8 w-8 rounded-full bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 flex items-center justify-center border border-slate-200 transition-colors shadow-2xs cursor-pointer"
                          title="Delete Policy"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Policy Reader Modal */}
      <Dialog open={!!readingPolicy} onOpenChange={(open: boolean) => !open && setReadingPolicy(null)}>
        <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto rounded-[32px] bg-white/95 backdrop-blur-2xl border border-white/80 p-6 sm:p-8">
          {readingPolicy && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-[#EBF3F6] text-[#588594] border border-[#ACCAD5]/50">
                  {readingPolicy.category}
                </span>
                <span className="text-xs text-slate-400">
                  Effective: <strong>{readingPolicy.effectiveDate}</strong>
                </span>
              </div>

              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {readingPolicy.title}
              </h2>

              <div className="text-xs text-slate-700 leading-relaxed space-y-3 whitespace-pre-wrap bg-slate-50/70 p-5 rounded-2xl border border-slate-150 font-sans">
                {readingPolicy.content}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <span className="text-xs text-slate-400">Issued by: {readingPolicy.createdBy || "HR Operations"}</span>
                <div className="flex items-center gap-2">
                  {readingPolicy.documentUrl && (
                    <a
                      href={readingPolicy.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#588594] hover:bg-[#466C78] text-white text-xs font-semibold shadow-sm transition-all"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download Official Document
                    </a>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setReadingPolicy(null)}
                    className="rounded-full text-xs"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* HR Admin Policy Creation/Editing Modal */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-[560px] rounded-[32px] bg-white/95 backdrop-blur-2xl border border-white/80 p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#588594]" />
              {editingPolicyId ? "Edit Company Policy" : "Publish New Company Policy"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-3">
            <div>
              <Label className="text-xs font-semibold text-slate-600">Policy Title</Label>
              <Input
                placeholder="e.g. Remote Work & Flexibility Guidelines"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 h-10 rounded-2xl bg-slate-50 border-slate-200 text-xs font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-600">Category</Label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 w-full h-10 px-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-[#588594] cursor-pointer"
                >
                  <option value="Workplace Conduct">Workplace Conduct</option>
                  <option value="Leave & Attendance">Leave & Attendance</option>
                  <option value="IT & Data Security">IT & Data Security</option>
                  <option value="Workplace Safety">Workplace Safety</option>
                  <option value="Compensation & Benefits">Compensation & Benefits</option>
                  <option value="General Operations">General Operations</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-600">Effective Date</Label>
                <Input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  className="mt-1 h-10 rounded-2xl bg-slate-50 border-slate-200 text-xs font-medium"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-600">Document URL / PDF Reference</Label>
              <Input
                placeholder="https://.../document.pdf (Optional external/cloud file URL)"
                value={documentUrl}
                onChange={(e) => setDocumentUrl(e.target.value)}
                className="mt-1 h-10 rounded-2xl bg-slate-50 border-slate-200 text-xs font-medium"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-600">Policy Content (Markdown supported)</Label>
              <Textarea
                placeholder="Enter complete policy terms, section clauses, and expectations..."
                value={content}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
                className="mt-1 rounded-2xl bg-slate-50 border-slate-200 text-xs text-slate-800 resize-none h-36 font-mono"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditorOpen(false)}
                className="rounded-full text-xs px-4"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSavePolicy}
                disabled={isPending}
                className="bg-[#588594] hover:bg-[#466C78] text-white rounded-full text-xs font-semibold px-6 shadow-sm transition-all"
              >
                {isPending ? "Publishing..." : editingPolicyId ? "Save Changes" : "Publish Policy"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Modal */}
      <ConfirmationModal
        open={!!policyToArchive}
        onOpenChange={(open) => !open && setPolicyToArchive(null)}
        title="Archive Company Policy"
        description={`Are you sure you want to archive "${policyToArchive?.title}"? It will no longer be visible to general staff in the policy directory.`}
        confirmLabel="Yes, Archive Policy"
        cancelLabel="Cancel"
        isDestructive={false}
        isPending={isPending}
        onConfirm={handleConfirmArchivePolicy}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        open={!!policyToDelete}
        onOpenChange={(open) => !open && setPolicyToDelete(null)}
        title="Delete Company Policy"
        description={`Are you sure you want to permanently delete "${policyToDelete?.title}"? This action cannot be reversed.`}
        confirmLabel="Yes, Delete Policy"
        cancelLabel="Cancel"
        isDestructive={true}
        isPending={isPending}
        onConfirm={handleConfirmDeletePolicy}
      />
    </div>
  );
}
