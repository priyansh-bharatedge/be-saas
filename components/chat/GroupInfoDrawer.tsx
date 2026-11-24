"use client";

import { useState, useRef, useEffect } from "react";
import {
  X,
  Users,
  LogOut,
  Shield,
  ShieldCheck,
  User,
  Loader2,
  Sliders,
  MessageSquare,
  MessageSquareOff,
  Lock,
  Camera,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatParticipantInfo } from "@/lib/actions/chat";
import { formatWhatsAppLastSeen } from "@/lib/chat/presence";

interface GroupInfoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  conversationName: string;
  isGroup: boolean;
  avatarUrl?: string | null;
  sendMessagePermission?: "ALL_MEMBERS" | "ONLY_ADMINS";
  participants: ChatParticipantInfo[];
  currentUserId: string;
  conversationId: string;
  onLeaveGroup: () => void;
  onUpdateGroupPermission?: (permission: "ALL_MEMBERS" | "ONLY_ADMINS") => Promise<void>;
  onUpdateMemberPermission?: (employeeId: string, canSendMessages: boolean) => Promise<void>;
  onUpdateGroupAvatar?: (newAvatarUrl: string | null) => void;
  onSelectMember?: (participant: ChatParticipantInfo) => void;
  onOpenLightbox?: (
    photoUrl: string,
    title: string,
    subtitle?: string,
    canEdit?: boolean,
    onUpload?: (f: File) => Promise<void>,
    onRemove?: () => Promise<void>
  ) => void;
}

export function GroupInfoDrawer({
  isOpen,
  onClose,
  conversationName,
  isGroup,
  avatarUrl,
  sendMessagePermission = "ALL_MEMBERS",
  participants,
  currentUserId,
  conversationId,
  onLeaveGroup,
  onUpdateGroupPermission,
  onUpdateMemberPermission,
  onUpdateGroupAvatar,
  onSelectMember,
  onOpenLightbox,
}: GroupInfoDrawerProps) {
  const [isLeaving, setIsLeaving] = useState(false);
  const [isUpdatingGroupPerm, setIsUpdatingGroupPerm] = useState(false);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
  const [groupAvatar, setGroupAvatar] = useState<string | null | undefined>(avatarUrl);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setGroupAvatar(avatarUrl);
  }, [avatarUrl]);

  if (!isOpen) return null;

  const isCurrentUserAdmin = participants.some(
    (p) => p.employeeId === currentUserId && p.role === "ADMIN"
  );

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarError(null);

    // Validate size (max 5 MB)
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("Image size exceeds the 5 MB limit. Please select a smaller photo.");
      return;
    }

    // Validate MIME type
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setAvatarError("Invalid format. Allowed: JPEG, PNG, WebP.");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/chat/conversations/${conversationId}/avatar`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to upload group icon.");
      }

      setGroupAvatar(data.avatarUrl);
      if (onUpdateGroupAvatar) onUpdateGroupAvatar(data.avatarUrl);
    } catch (err: unknown) {
      setAvatarError(err instanceof Error ? err.message : "Failed to upload group photo.");
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveGroupAvatar = async () => {
    if (!confirm("Are you sure you want to remove the group's profile photo?")) return;

    setIsUploadingAvatar(true);
    setAvatarError(null);
    try {
      const res = await fetch(`/api/chat/conversations/${conversationId}/avatar`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to remove group icon.");
      }

      setGroupAvatar(null);
      if (onUpdateGroupAvatar) onUpdateGroupAvatar(null);
    } catch (err: unknown) {
      setAvatarError(err instanceof Error ? err.message : "Failed to remove group photo.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleLeave = async () => {
    if (!confirm("Are you sure you want to leave this group?")) return;
    setIsLeaving(true);
    try {
      await fetch(`/api/chat/conversations/${conversationId}/leave`, {
        method: "POST",
      });
      onLeaveGroup();
    } catch (err) {
      console.error(err);
      onLeaveGroup();
    } finally {
      setIsLeaving(false);
    }
  };

  const handleSetGroupPermission = async (perm: "ALL_MEMBERS" | "ONLY_ADMINS") => {
    if (perm === sendMessagePermission || isUpdatingGroupPerm) return;
    setIsUpdatingGroupPerm(true);
    try {
      if (onUpdateGroupPermission) {
        await onUpdateGroupPermission(perm);
      } else {
        await fetch("/api/chat/permissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "group", conversationId, permission: perm }),
        });
      }
    } catch (err) {
      console.error("Error setting group permission:", err);
    } finally {
      setIsUpdatingGroupPerm(false);
    }
  };

  const handleToggleMember = async (employeeId: string, canSendMessages: boolean) => {
    if (updatingMemberId) return;
    setUpdatingMemberId(employeeId);
    try {
      if (onUpdateMemberPermission) {
        await onUpdateMemberPermission(employeeId, canSendMessages);
      } else {
        await fetch("/api/chat/permissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "member",
            conversationId,
            employeeId,
            canSendMessages,
          }),
        });
      }
    } catch (err) {
      console.error("Error updating member permission:", err);
    } finally {
      setUpdatingMemberId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-sm h-full bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#EBF3F6] border border-[#ACCAD5]/50 flex items-center justify-center text-[#3D6472]">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 truncate max-w-[200px]">
                {conversationName}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isGroup ? `${participants.length} group members` : "Direct Conversation"}
              </p>
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
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Group Profile Photo Showcase (Admin Editable) */}
          {isGroup && (
            <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50/70 border border-slate-200/60 text-center space-y-3">
              <div className="relative group/avatar">
                <div
                  onClick={() => {
                    if (groupAvatar && onOpenLightbox) {
                      onOpenLightbox(
                        groupAvatar,
                        conversationName,
                        "Group Profile Photo",
                        isCurrentUserAdmin,
                        async (file) => {
                          const formData = new FormData();
                          formData.append("file", file);
                          const res = await fetch(`/api/chat/conversations/${conversationId}/avatar`, {
                            method: "POST",
                            body: formData,
                          });
                          const data = await res.json();
                          if (!res.ok || !data.success) {
                            throw new Error(data.error || "Failed to update group icon.");
                          }
                          setGroupAvatar(data.avatarUrl);
                          if (onUpdateGroupAvatar) onUpdateGroupAvatar(data.avatarUrl);
                        },
                        handleRemoveGroupAvatar
                      );
                    }
                  }}
                  className={`w-20 h-20 rounded-3xl bg-gradient-to-br from-[#ACCAD5] to-[#7EA9B8] text-white flex items-center justify-center font-bold text-2xl shadow-md border-2 border-white overflow-hidden ${
                    groupAvatar ? "cursor-pointer hover:scale-105 transition-transform" : ""
                  }`}
                  title={groupAvatar ? "Click to view full-resolution photo" : conversationName}
                >
                  {groupAvatar ? (
                    <img
                      src={groupAvatar}
                      alt={conversationName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Users className="h-9 w-9 text-white" />
                  )}
                </div>

                {/* Admin Camera Overlay Button */}
                {isCurrentUserAdmin && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="absolute -bottom-1 -right-1 p-2 rounded-xl bg-white text-slate-700 hover:text-[#C66318] hover:bg-slate-50 border border-slate-200 shadow-md transition-all cursor-pointer"
                    title="Upload / Change Group Profile Photo"
                  >
                    {isUploadingAvatar ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Camera className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-800">{conversationName}</h4>
                <p className="text-[11px] text-slate-400">
                  {isCurrentUserAdmin
                    ? "Click camera to update group photo (JPEG, PNG, WebP)"
                    : "Group icon managed by group admins"}
                </p>
              </div>

              {isCurrentUserAdmin && groupAvatar && (
                <button
                  type="button"
                  onClick={handleRemoveGroupAvatar}
                  disabled={isUploadingAvatar}
                  className="text-[11px] text-rose-600 hover:text-rose-700 hover:underline inline-flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Remove photo</span>
                </button>
              )}

              {avatarError && (
                <div className="w-full p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px]">
                  {avatarError}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarFileChange}
              />
            </div>
          )}

          {/* Admin Group Messaging Permissions Control */}
          {isGroup && isCurrentUserAdmin && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#EBF3F6]/50 via-white to-slate-50 border border-[#ACCAD5]/50 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-800">
                  <Sliders className="h-4 w-4 text-[#588594]" />
                  <span className="text-xs font-bold">Send Messages</span>
                </div>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-[#588594] text-white">
                  Admin Control
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Control who is allowed to send messages in this group.
              </p>

              {/* Segmented control */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/70">
                <button
                  type="button"
                  onClick={() => handleSetGroupPermission("ALL_MEMBERS")}
                  disabled={isUpdatingGroupPerm}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                    sendMessagePermission === "ALL_MEMBERS"
                      ? "bg-white text-slate-900 shadow-2xs font-bold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>All Members</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSetGroupPermission("ONLY_ADMINS")}
                  disabled={isUpdatingGroupPerm}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                    sendMessagePermission === "ONLY_ADMINS"
                      ? "bg-[#588594] text-white shadow-2xs font-bold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Only Admins</span>
                </button>
              </div>

              {sendMessagePermission === "ONLY_ADMINS" && (
                <div className="flex items-center gap-1.5 text-[11px] text-[#588594] font-medium pt-1">
                  <Lock className="h-3.5 w-3.5 shrink-0" />
                  <span>Regular members can read messages, but cannot send.</span>
                </div>
              )}
            </div>
          )}

          {/* Member List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>{isGroup ? `Members (${participants.length})` : "Participants"}</span>
              {isGroup && isCurrentUserAdmin && (
                <span className="text-[10px] font-normal normal-case text-slate-400">
                  Click to restrict/allow
                </span>
              )}
            </div>

            <div className="space-y-2">
              {participants.map((p) => {
                const isCurrentUser = p.employeeId === currentUserId;
                const isAdmin = p.role === "ADMIN";
                const isRestricted = p.canSendMessages === false;

                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors"
                  >
                    <div
                      onClick={() => onSelectMember?.(p)}
                      className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group/member"
                      title={`View ${p.name}'s profile`}
                    >
                      <div className="relative shrink-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ACCAD5] to-[#F0944D] text-white flex items-center justify-center font-bold text-xs overflow-hidden border border-white group-hover/member:scale-105 transition-transform">
                          {p.avatarUrl ? (
                            <img
                              src={p.avatarUrl}
                              alt={p.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            p.name.charAt(0)
                          )}
                        </div>
                        {p.isOnline && (
                          <span
                            className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white shadow-2xs"
                            title="Online"
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-xs font-semibold text-slate-900 group-hover/member:text-[#C66318] truncate transition-colors">
                            {p.name}
                          </span>
                          {isCurrentUser && (
                            <span className="text-[10px] font-medium text-slate-400 shrink-0">
                              (You)
                            </span>
                          )}
                          {p.isOnline && !isCurrentUser && (
                            <span className="text-[10px] text-emerald-600 font-semibold shrink-0">
                              • Online
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {p.designation} • {p.department}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {isAdmin ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EBF3F6] text-[#3D6472] border border-[#ACCAD5]/40">
                          <Shield className="h-3 w-3" />
                          Admin
                        </span>
                      ) : isCurrentUserAdmin && isGroup ? (
                        <button
                          type="button"
                          onClick={() => handleToggleMember(p.employeeId, isRestricted)}
                          disabled={updatingMemberId === p.employeeId}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg border transition-all flex items-center gap-1 active:scale-95 ${
                            !isRestricted
                              ? "bg-slate-50 border-slate-200 text-slate-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
                              : "bg-rose-50 border-rose-200 text-rose-600 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700"
                          }`}
                          title={
                            !isRestricted
                              ? "Click to restrict this member from sending messages"
                              : "Click to allow this member to send messages"
                          }
                        >
                          {updatingMemberId === p.employeeId ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : !isRestricted ? (
                            <>
                              <MessageSquare className="h-3 w-3 text-slate-400" />
                              <span>Allowed</span>
                            </>
                          ) : (
                            <>
                              <MessageSquareOff className="h-3 w-3 text-rose-500" />
                              <span className="font-bold">Restricted</span>
                            </>
                          )}
                        </button>
                      ) : isRestricted ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                          <MessageSquareOff className="h-3 w-3" />
                          Restricted
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        {isGroup && (
          <div className="p-5 border-t border-slate-100 bg-slate-50/50">
            <Button
              variant="outline"
              onClick={handleLeave}
              disabled={isLeaving}
              className="w-full text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 rounded-xl flex items-center justify-center gap-2"
            >
              {isLeaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <LogOut className="h-3.5 w-3.5" />
              )}
              Leave Group
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
