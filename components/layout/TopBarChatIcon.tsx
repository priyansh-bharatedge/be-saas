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

  // Send lightweight online presence heartbeat
  const pingPresence = useCallback(async (status: "online" | "offline" = "online") => {
    try {
      if (status === "offline" && typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon("/api/chat/presence", JSON.stringify({ status: "offline" }));
      } else {
        await fetch("/api/chat/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
          keepalive: status === "offline",
        });
      }
    } catch {
      // Ignore presence ping errors
    }
  }, []);

  useEffect(() => {
    // 1. Initial unread check & initial presence heartbeat
    fetchUnread();
    pingPresence("online");

    // 2. Poll unread messages every 8 seconds
    const unreadInterval = setInterval(fetchUnread, 8000);

    // 3. Heartbeat presence ping every 25 seconds while active
    const presenceInterval = setInterval(() => pingPresence("online"), 25000);

    // 4. On tab focus / visibility change
    const onFocus = () => {
      fetchUnread();
      pingPresence("online");
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchUnread();
        pingPresence("online");
      }
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    // 5. On tab close / navigate away
    const onBeforeUnload = () => {
      pingPresence("offline");
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    // 6. Custom immediate update event from ChatClient
    const onChatUpdate = (e: CustomEvent<{ unreadCount?: number }>) => {
      if (typeof e.detail?.unreadCount === "number") {
        setUnreadCount(e.detail.unreadCount);
      } else {
        fetchUnread();
      }
    };
    window.addEventListener(
      "chat:unread-updated" as unknown as keyof WindowEventMap,
      onChatUpdate as EventListener
    );

    return () => {
      clearInterval(unreadInterval);
      clearInterval(presenceInterval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener(
        "chat:unread-updated" as unknown as keyof WindowEventMap,
        onChatUpdate as EventListener
      );
    };
  }, [fetchUnread, pingPresence]);

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
