"use client";

import { useState } from "react";
import { X, Users, LogOut, Shield, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatParticipantInfo } from "@/lib/actions/chat";
import { formatWhatsAppLastSeen } from "@/lib/chat/presence";

interface GroupInfoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  conversationName: string;
  isGroup: boolean;
  participants: ChatParticipantInfo[];
  currentUserId: string;
  conversationId: string;
  onLeaveGroup: () => void;
}

export function GroupInfoDrawer({
  isOpen,
  onClose,
  conversationName,
  isGroup,
  participants,
  currentUserId,
  conversationId,
  onLeaveGroup,
}: GroupInfoDrawerProps) {
  const [isLeaving, setIsLeaving] = useState(false);

  if (!isOpen) return null;

  const handleLeave = async () => {
    if (!confirm("Are you sure you want to leave this group?")) return;
    setIsLeaving(true);
    try {
      const res = await fetch(`/api/chat/conversations/${conversationId}/leave`, {
        method: "POST",
      });
      // Fallback action if API route is separate or using action
      onLeaveGroup();
    } catch (err) {
      console.error(err);
      onLeaveGroup();
    } finally {
      setIsLeaving(false);
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

        {/* Member List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {isGroup ? `Members (${participants.length})` : "Participants"}
          </div>

          <div className="space-y-2">
            {participants.map((p) => {
              const isCurrentUser = p.employeeId === currentUserId;
              const isAdmin = p.role === "ADMIN";

              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="relative shrink-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ACCAD5] to-[#F0944D] text-white flex items-center justify-center font-bold text-xs">
                        {p.name.charAt(0)}
                      </div>
                      {p.isOnline && (
                        <span
                          className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white shadow-2xs"
                          title="Online"
                        />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-900">
                          {p.name}
                        </span>
                        {isCurrentUser && (
                          <span className="text-[10px] font-medium text-slate-400">(You)</span>
                        )}
                        {p.isOnline && !isCurrentUser && (
                          <span className="text-[10px] text-emerald-600 font-semibold">• Online</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {p.designation} • {p.department}
                      </div>
                    </div>
                  </div>

                  {isAdmin && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EBF3F6] text-[#3D6472] border border-[#ACCAD5]/40">
                      <Shield className="h-3 w-3" />
                      Admin
                    </span>
                  )}
                </div>
              );
            })}
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
