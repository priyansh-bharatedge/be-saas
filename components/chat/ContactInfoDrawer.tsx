"use client";

import { useState, useMemo, useEffect } from "react";
import {
  X,
  User,
  Mail,
  Briefcase,
  Building2,
  Copy,
  Check,
  MessageSquare,
  FileText,
  Download,
  Image as ImageIcon,
  ExternalLink,
  ZoomIn,
  Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MessageItem } from "@/lib/actions/chat";
import { formatWhatsAppLastSeen } from "@/lib/chat/presence";
import { openDocumentPreview } from "@/components/modals/DocumentPreviewModal";

export interface ContactInfoProfile {
  id: string;
  employeeId?: string;
  name: string;
  email?: string;
  department?: string;
  designation?: string;
  avatarUrl?: string | null;
  isOnline?: boolean;
  lastSeen?: string | null;
}

interface ContactInfoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  contact: ContactInfoProfile | null;
  messages?: MessageItem[];
  currentUserId: string;
  onOpenLightbox: (
    photoUrl: string,
    title: string,
    subtitle?: string,
    canEdit?: boolean,
    onUpload?: (f: File) => Promise<void>,
    onRemove?: () => Promise<void>
  ) => void;
  onStartDM?: (employeeId: string) => void;
}

export function ContactInfoDrawer({
  isOpen,
  onClose,
  contact,
  messages = [],
  currentUserId,
  onOpenLightbox,
  onStartDM,
}: ContactInfoDrawerProps) {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [activeMediaTab, setActiveMediaTab] = useState<"media" | "docs">("media");

  // Extract shared media and documents from conversation messages
  const { sharedMedia, sharedDocs } = useMemo(() => {
    const mediaList: {
      id: string;
      url: string;
      name: string;
      createdAt: string;
    }[] = [];
    const docsList: {
      id: string;
      url: string;
      name: string;
      size: number;
      mimeType: string;
      createdAt: string;
    }[] = [];

    messages.forEach((msg) => {
      // Check multi-attachments array first
      if (msg.attachments && msg.attachments.length > 0) {
        msg.attachments.forEach((att, idx) => {
          const isImg =
            att.messageType === "IMAGE" ||
            att.mimeType.startsWith("image/") ||
            /\.(jpg|jpeg|png|webp|gif|avif)$/i.test(att.name || att.url);

          if (isImg) {
            mediaList.push({
              id: `${msg.id}-${idx}`,
              url: att.url,
              name: att.name || "Image",
              createdAt: msg.createdAt,
            });
          } else {
            docsList.push({
              id: `${msg.id}-${idx}`,
              url: att.url,
              name: att.name || "Document",
              size: att.size || 0,
              mimeType: att.mimeType || "application/octet-stream",
              createdAt: msg.createdAt,
            });
          }
        });
      } else if (msg.attachmentUrl) {
        // Fallback to legacy single attachment fields
        const isImg =
          msg.messageType === "IMAGE" ||
          (msg.attachmentMimeType && msg.attachmentMimeType.startsWith("image/")) ||
          /\.(jpg|jpeg|png|webp|gif|avif)$/i.test(msg.attachmentName || msg.attachmentUrl);

        if (isImg) {
          mediaList.push({
            id: msg.id,
            url: msg.attachmentUrl,
            name: msg.attachmentName || "Image",
            createdAt: msg.createdAt,
          });
        } else {
          docsList.push({
            id: msg.id,
            url: msg.attachmentUrl,
            name: msg.attachmentName || "Document",
            size: msg.attachmentSize || 0,
            mimeType: msg.attachmentMimeType || "application/octet-stream",
            createdAt: msg.createdAt,
          });
        }
      }
    });

    return {
      sharedMedia: mediaList.reverse(),
      sharedDocs: docsList.reverse(),
    };
  }, [messages]);

  if (!isOpen || !contact) return null;

  const targetId = contact.employeeId || contact.id;
  const isSelf = targetId === currentUserId;

  const handleCopyEmail = () => {
    if (!contact.email) return;
    navigator.clipboard.writeText(contact.email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleAvatarClick = () => {
    if (contact.avatarUrl) {
      onOpenLightbox(
        contact.avatarUrl,
        contact.name,
        contact.designation || contact.department || undefined,
        isSelf
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-sm h-full bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-white/90 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">Contact Info</h3>
            {isSelf && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EBF3F6] text-[#3D6472]">
                You
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Profile Hero */}
          <div className="flex flex-col items-center justify-center p-6 rounded-3xl bg-gradient-to-b from-[#FCFAF7] via-white to-slate-50/70 border border-slate-200/70 text-center shadow-xs">
            <div className="relative group/photo mb-3">
              <div
                onClick={handleAvatarClick}
                className={`w-24 h-24 rounded-3xl flex items-center justify-center text-3xl font-bold shadow-md border-3 border-white overflow-hidden transition-all duration-200 ${
                  contact.avatarUrl
                    ? "cursor-pointer group-hover/photo:scale-105 group-hover/photo:shadow-lg"
                    : ""
                } bg-gradient-to-br from-[#ACCAD5] to-[#F0944D] text-white`}
                title={
                  contact.avatarUrl
                    ? "Click to view full-resolution photo"
                    : contact.name
                }
              >
                {contact.avatarUrl ? (
                  <img
                    src={contact.avatarUrl}
                    alt={contact.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  contact.name.charAt(0).toUpperCase()
                )}
              </div>

              {/* Hover Zoom Overlay indicator for photos */}
              {contact.avatarUrl && (
                <div
                  onClick={handleAvatarClick}
                  className="absolute inset-0 rounded-3xl bg-black/35 opacity-0 group-hover/photo:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer pointer-events-none"
                >
                  <ZoomIn className="h-6 w-6 drop-shadow-md" />
                </div>
              )}

              {/* Online Green Indicator Dot */}
              {contact.isOnline && (
                <span
                  className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-xs"
                  title="Online"
                />
              )}
            </div>

            {/* Name & Title */}
            <h4 className="text-base font-bold text-slate-900 tracking-tight">
              {contact.name}
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              {[contact.designation, contact.department].filter(Boolean).join(" • ")}
            </p>

            {/* Online / WhatsApp Last Seen status badge */}
            <div className="mt-3">
              {contact.isOnline ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200/80">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Online</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-medium">
                  <span>
                    {formatWhatsAppLastSeen(contact.lastSeen, "Offline")}
                  </span>
                </span>
              )}
            </div>

            {/* Direct Message button if viewing another colleague */}
            {!isSelf && onStartDM && (
              <div className="mt-4 w-full">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onStartDM(targetId);
                    onClose();
                  }}
                  className="w-full rounded-xl border-slate-200 bg-white hover:bg-[#EBF3F6] text-[#3D6472] font-semibold text-xs shadow-2xs gap-1.5"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Send Direct Message</span>
                </Button>
              </div>
            )}
          </div>

          {/* Contact Details Card */}
          <div className="space-y-3">
            <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Contact Details
            </h5>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/70 shadow-2xs space-y-3.5">
              {/* Email */}
              {contact.email && (
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-400 font-medium">Work Email</p>
                      <a
                        href={`mailto:${contact.email}`}
                        className="text-slate-800 hover:text-[#C66318] font-medium truncate block transition-colors"
                      >
                        {contact.email}
                      </a>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyEmail}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    title="Copy email address"
                  >
                    {copiedEmail ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              )}

              {/* Designation */}
              {contact.designation && (
                <div className="flex items-center gap-2.5 text-xs">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                    <Briefcase className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-400 font-medium">Designation</p>
                    <p className="text-slate-800 font-medium truncate">
                      {contact.designation}
                    </p>
                  </div>
                </div>
              )}

              {/* Department */}
              {contact.department && (
                <div className="flex items-center gap-2.5 text-xs">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-400 font-medium">Department</p>
                    <p className="text-slate-800 font-medium truncate">
                      {contact.department}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Shared Media, Links & Docs Card (WhatsApp Web style) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Shared Files & Media
              </h5>
              <span className="text-[10px] font-semibold text-slate-400">
                {sharedMedia.length + sharedDocs.length} items
              </span>
            </div>

            {/* Segmented Switcher */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100/80 rounded-xl border border-slate-200/70 text-xs">
              <button
                type="button"
                onClick={() => setActiveMediaTab("media")}
                className={`py-1.5 px-3 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  activeMediaTab === "media"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <ImageIcon className="h-3.5 w-3.5" />
                <span>Media ({sharedMedia.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveMediaTab("docs")}
                className={`py-1.5 px-3 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  activeMediaTab === "docs"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Docs ({sharedDocs.length})</span>
              </button>
            </div>

            {/* Tab: Media */}
            {activeMediaTab === "media" && (
              <div>
                {sharedMedia.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-slate-50/70 border border-dashed border-slate-200 text-center text-xs text-slate-400">
                    No shared photos or videos yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {sharedMedia.map((m) => (
                      <div
                        key={m.id}
                        onClick={() =>
                          onOpenLightbox(m.url, m.name, new Date(m.createdAt).toLocaleDateString())
                        }
                        className="group relative aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200/80 cursor-pointer shadow-2xs hover:scale-102 transition-transform"
                        title={m.name}
                      >
                        <img
                          src={m.url}
                          alt={m.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                          <ZoomIn className="h-4 w-4" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Docs */}
            {activeMediaTab === "docs" && (
              <div>
                {sharedDocs.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-slate-50/70 border border-dashed border-slate-200 text-center text-xs text-slate-400">
                    No shared documents yet.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {sharedDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-2.5 rounded-xl bg-white border border-slate-200/70 hover:border-slate-300 hover:bg-slate-50/70 transition-all flex items-center justify-between gap-2 shadow-2xs"
                      >
                        <div
                          onClick={() => openDocumentPreview(doc.url, doc.name)}
                          className="flex items-center gap-2.5 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                          title="Click to preview file"
                        >
                          <div className="w-8 h-8 rounded-lg bg-[#EBF3F6] text-[#3D6472] flex items-center justify-center shrink-0">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-800 truncate hover:underline" title={doc.name}>
                              {doc.name}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {formatFileSize(doc.size)} • {new Date(doc.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={doc.name}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors shrink-0"
                          title="Download document"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
