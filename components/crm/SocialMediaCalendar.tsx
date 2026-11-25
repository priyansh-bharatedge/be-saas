"use client";

import { useState } from "react";
import {
  Calendar as CalendarIcon,
  Plus,
  Image as ImageIcon,
  Edit2,
  Trash2,
  X,
  Check,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SocialMediaPost, EmployeeLookupItem, FileAttachment } from "@/lib/validations/operation";
import { R2MultiFileUpload } from "./R2MultiFileUpload";
import { EmployeeSelector } from "./EmployeeSelector";
import { openDocumentPreview } from "@/components/modals/DocumentPreviewModal";

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
);

const LinkedinIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
    <rect width="4" height="12" x="2" y="9"/>
    <circle cx="4" cy="4" r="2"/>
  </svg>
);

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);

const YoutubeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/>
    <polygon points="10 15 15 12 10 9 10 15"/>
  </svg>
);

const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
    <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
  </svg>
);

interface SocialMediaCalendarProps {
  posts?: SocialMediaPost[];
  onChange: (posts: SocialMediaPost[]) => void;
  employees: EmployeeLookupItem[];
  disabled?: boolean;
}

const PLATFORMS = ["Instagram", "LinkedIn", "Facebook", "YouTube", "X"] as const;
const POST_TYPES = [
  "Static Post",
  "Carousel",
  "Reel / Short",
  "Story",
  "Article / Newsletter",
] as const;
const STATUSES = ["Draft", "In-Review", "Approved", "Scheduled", "Published"] as const;

export function SocialMediaCalendar({
  posts = [],
  onChange,
  employees,
  disabled = false,
}: SocialMediaCalendarProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingPost, setEditingPost] = useState<SocialMediaPost | null>(null);
  const [filterPlatform, setFilterPlatform] = useState<string>("ALL");

  const postList = Array.isArray(posts) ? posts : [];

  const handleOpenNew = () => {
    setEditingPost({
      id: `post-${Date.now()}`,
      postDate: new Date().toISOString().split("T")[0],
      platform: "Instagram",
      postType: "Static Post",
      caption: "",
      assets: [],
      assignedEmployeeId: "",
      status: "Draft",
    });
    setIsEditing(true);
  };

  const handleOpenEdit = (post: SocialMediaPost) => {
    setEditingPost({ ...post });
    setIsEditing(true);
  };

  const handleSavePost = () => {
    if (!editingPost) return;
    const exists = postList.some((p) => p.id === editingPost.id);
    let updated: SocialMediaPost[];
    if (exists) {
      updated = postList.map((p) => (p.id === editingPost.id ? editingPost : p));
    } else {
      updated = [editingPost, ...postList];
    }
    onChange(updated);
    setIsEditing(false);
    setEditingPost(null);
  };

  const handleDeletePost = (id: string) => {
    if (confirm("Delete this scheduled social post?")) {
      onChange(postList.filter((p) => p.id !== id));
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "Instagram":
        return <InstagramIcon className="h-3.5 w-3.5 text-pink-600" />;
      case "LinkedIn":
        return <LinkedinIcon className="h-3.5 w-3.5 text-blue-700" />;
      case "Facebook":
        return <FacebookIcon className="h-3.5 w-3.5 text-blue-600" />;
      case "YouTube":
        return <YoutubeIcon className="h-3.5 w-3.5 text-red-600" />;
      case "X":
        return <XIcon className="h-3.5 w-3.5 text-slate-800" />;
      default:
        return <Sparkles className="h-3.5 w-3.5 text-slate-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Published":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Scheduled":
        return "bg-sky-50 text-sky-700 border-sky-200";
      case "Approved":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "In-Review":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  const filteredPosts = postList.filter((p) => {
    if (filterPlatform !== "ALL" && p.platform !== filterPlatform) return false;
    return true;
  });

  return (
    <div className="space-y-3">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-2xl bg-gradient-to-r from-[#ACCAD5]/20 via-white to-orange-50/20 border border-slate-200/80">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-[#588594]" />
          <div>
            <h5 className="text-xs font-bold text-slate-900">
              Interactive Social Media Content Calendar
            </h5>
            <p className="text-[10px] text-slate-500">
              Schedule, track, and align creatives for client social media campaigns
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Platform Filter */}
          <select
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value)}
            className="text-[11px] h-7 px-2 rounded-lg border border-slate-200 bg-white text-slate-700"
          >
            <option value="ALL">All Platforms</option>
            {PLATFORMS.map((plat) => (
              <option key={plat} value={plat}>
                {plat}
              </option>
            ))}
          </select>

          {!disabled && (
            <Button
              type="button"
              size="sm"
              onClick={handleOpenNew}
              className="h-7 text-xs px-2.5 rounded-lg bg-[#588594] hover:bg-[#3D6472] text-white gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Post</span>
            </Button>
          )}
        </div>
      </div>

      {/* Editor Sub-Card */}
      {isEditing && editingPost && (
        <div className="p-4 rounded-2xl bg-white border border-[#ACCAD5] shadow-md space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h6 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span>{editingPost.id.startsWith("post-") ? "New Post" : "Edit Post"}</span>
            </h6>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
            <div>
              <label className="text-[10px] font-semibold text-slate-600 block mb-1">
                Post Date
              </label>
              <Input
                type="date"
                value={editingPost.postDate}
                onChange={(e) =>
                  setEditingPost({ ...editingPost, postDate: e.target.value })
                }
                className="h-8 text-xs bg-slate-50"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-600 block mb-1">
                Platform
              </label>
              <select
                value={editingPost.platform}
                onChange={(e) =>
                  setEditingPost({
                    ...editingPost,
                    platform: e.target.value as any,
                  })
                }
                className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs bg-slate-50"
              >
                {PLATFORMS.map((plat) => (
                  <option key={plat} value={plat}>
                    {plat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-600 block mb-1">
                Post Type
              </label>
              <select
                value={editingPost.postType}
                onChange={(e) =>
                  setEditingPost({ ...editingPost, postType: e.target.value })
                }
                className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs bg-slate-50"
              >
                {POST_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-600 block mb-1">
                Status
              </label>
              <select
                value={editingPost.status}
                onChange={(e) =>
                  setEditingPost({
                    ...editingPost,
                    status: e.target.value as any,
                  })
                }
                className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs bg-slate-50"
              >
                {STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 md:col-span-4">
              <label className="text-[10px] font-semibold text-slate-600 block mb-1">
                Caption / Copy
              </label>
              <Textarea
                value={editingPost.caption}
                onChange={(e) =>
                  setEditingPost({ ...editingPost, caption: e.target.value })
                }
                rows={2}
                placeholder="Write post copy, hashtags, or creative hook..."
                className="text-xs bg-slate-50"
              />
            </div>

            <div className="sm:col-span-2">
              <EmployeeSelector
                label="Assigned Creator / Designer"
                value={editingPost.assignedEmployeeId}
                onChange={(id) =>
                  setEditingPost({ ...editingPost, assignedEmployeeId: id })
                }
                employees={employees}
              />
            </div>

            <div className="sm:col-span-2">
              <R2MultiFileUpload
                label="Creative Assets (Images / Videos)"
                value={editingPost.assets}
                onChange={(assets) =>
                  setEditingPost({ ...editingPost, assets })
                }
                folder="social-assets"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(false)}
              className="h-7 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSavePost}
              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Save Post</span>
            </Button>
          </div>
        </div>
      )}

      {/* Posts List View */}
      {filteredPosts.length === 0 ? (
        <div className="p-6 rounded-2xl bg-slate-50/70 border border-dashed border-slate-200 text-center text-xs text-slate-400">
          No scheduled social posts yet. Click &quot;+ Add Post&quot; to plan deliverables.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {filteredPosts.map((post) => {
            const assignedEmp = employees.find((e) => e.id === post.assignedEmployeeId);

            return (
              <div
                key={post.id}
                className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {getPlatformIcon(post.platform)}
                    <span className="font-bold text-xs text-slate-900">
                      {post.platform}
                    </span>
                    <span className="text-[10px] text-slate-400">• {post.postType}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${getStatusBadge(
                        post.status
                      )}`}
                    >
                      {post.status}
                    </span>
                    {!disabled && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(post)}
                          className="p-1 rounded text-slate-400 hover:text-slate-700"
                          title="Edit"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePost(post.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600"
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1 font-mono">
                    <CalendarIcon className="h-3 w-3 text-slate-400" />
                    {post.postDate}
                  </span>
                  {assignedEmp && (
                    <span className="truncate max-w-[150px]">
                      👤 {assignedEmp.name}
                    </span>
                  )}
                </div>

                {post.caption && (
                  <p className="text-[11px] text-slate-700 line-clamp-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    {post.caption}
                  </p>
                )}

                {post.assets && post.assets.length > 0 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
                    {post.assets.map((ast, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => openDocumentPreview(ast.url, ast.name, "image")}
                        className="h-8 px-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] inline-flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                        title={`Preview ${ast.name}`}
                      >
                        <ImageIcon className="h-3 w-3 text-[#588594]" />
                        <span className="max-w-[100px] truncate">{ast.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
