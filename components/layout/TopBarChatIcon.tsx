"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { MessageSquare } from "lucide-react";

export function TopBarChatIcon() {
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/unread");
      const data = await res.json();
      if (data.success && typeof data.unreadCount === "number") {
        setUnreadCount(data.unreadCount);
      }
    } catch {
      // Ignore network errors in polling
    }
  }, []);

  useEffect(() => {
    fetchUnread();

    // Poll every 8 seconds for live chat unread counts across all pages
    const interval = setInterval(fetchUnread, 8000);

    // Refresh immediately on window focus
    const onFocus = () => fetchUnread();
    window.addEventListener("focus", onFocus);

    // Listen for custom immediate update event from ChatClient
    const onChatUpdate = (e: CustomEvent<{ unreadCount?: number }>) => {
      if (typeof e.detail?.unreadCount === "number") {
        setUnreadCount(e.detail.unreadCount);
      } else {
        fetchUnread();
      }
    };
    window.addEventListener("chat:unread-updated" as unknown as keyof WindowEventMap, onChatUpdate as EventListener);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("chat:unread-updated" as unknown as keyof WindowEventMap, onChatUpdate as EventListener);
    };
  }, [fetchUnread]);

  return (
    <Link
      href="/chat"
      aria-label="Team Chat"
      title={unreadCount > 0 ? `${unreadCount} unread chat messages` : "Team Chat"}
      className="relative p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
    >
      <MessageSquare className="h-4 w-4" />

      {/* Unread Message Pill Counter */}
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center shadow-xs border-2 border-white animate-in zoom-in-75 leading-none">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}

export default TopBarChatIcon;
