"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Info,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { NotificationType } from "@prisma/client";
import {
  SerializedNotification,
  getMyNotificationsAction,
  markNotificationAsReadAction,
  markAllNotificationsAsReadAction,
  deleteNotificationAction,
} from "@/lib/actions/notifications";
import { toast } from "sonner";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<SerializedNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isPending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Load notifications
  const loadNotifications = async () => {
    const res = await getMyNotificationsAction();
    if (res.success && res.data) {
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    }
  };

  useEffect(() => {
    loadNotifications();

    // Poll every 8 seconds for responsive live notifications across modules & chat
    const interval = setInterval(loadNotifications, 8000);

    const onFocus = () => loadNotifications();
    const onNotificationUpdate = () => loadNotifications();

    window.addEventListener("focus", onFocus);
    window.addEventListener("notification-updated", onNotificationUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("notification-updated", onNotificationUpdate);
    };
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Mark all as read
  const handleMarkAllRead = () => {
    startTransition(async () => {
      const res = await markAllNotificationsAsReadAction();
      if (res.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
        toast.success("All notifications marked as read.");
      }
    });
  };

  // Click on notification
  const handleNotificationClick = async (n: SerializedNotification) => {
    if (!n.isRead) {
      await markNotificationAsReadAction(n.id);
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, isRead: true } : item))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    if (n.actionUrl) {
      setOpen(false);
      router.push(n.actionUrl);
    }
  };

  // Delete notification
  const handleDeleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteNotificationAction(id);
    setNotifications((prev) => prev.filter((item) => item.id !== id));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  // Format relative timestamp
  const formatTimeAgo = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.ACTION_REQUIRED:
        return <AlertCircle className="h-4 w-4 text-[#F0944D]" />;
      case NotificationType.SUCCESS:
        return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
      case NotificationType.WARNING:
        return <AlertTriangle className="h-4 w-4 text-rose-600" />;
      case NotificationType.INFO:
      default:
        return <Info className="h-4 w-4 text-[#588594]" />;
    }
  };

  const getTypeBg = (type: NotificationType) => {
    switch (type) {
      case NotificationType.ACTION_REQUIRED:
        return "bg-[#FDEFE6] border-[#F0944D]/40";
      case NotificationType.SUCCESS:
        return "bg-emerald-50 border-emerald-200";
      case NotificationType.WARNING:
        return "bg-rose-50 border-rose-200";
      case NotificationType.INFO:
      default:
        return "bg-[#EBF3F6] border-[#ACCAD5]/50";
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          if (!open) loadNotifications();
        }}
        aria-label="Notifications"
        className="relative p-2 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-[#F0944D] text-white text-[10px] font-bold flex items-center justify-center shadow-xs animate-in zoom-in">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Glassmorphic Dropdown Panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-[30px] bg-white/95 backdrop-blur-2xl border border-white/80 shadow-[0_20px_60px_rgba(0,0,0,0.12)] p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FDEFE6] text-[#C66318] border border-[#F0944D]/30">
                  {unreadCount} unread
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={isPending}
                className="text-[11px] font-semibold text-[#588594] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="h-3 w-3" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="mt-2 max-h-80 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                You&apos;re all caught up! No recent notifications.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-3 rounded-2xl border transition-all flex items-start gap-3 cursor-pointer ${
                    n.isRead
                      ? "bg-slate-50/60 border-slate-100 hover:bg-slate-100/70"
                      : "bg-[#FCFAF7] border-[#ACCAD5]/40 hover:bg-[#EBF3F6]/50 shadow-2xs"
                  }`}
                >
                  {/* Type Icon Badge */}
                  <div
                    className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 border ${getTypeBg(
                      n.type
                    )}`}
                  >
                    {getTypeIcon(n.type)}
                  </div>

                  {/* Notification Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4
                        className={`text-xs truncate ${
                          n.isRead ? "font-semibold text-slate-700" : "font-bold text-slate-900"
                        }`}
                      >
                        {n.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                        {formatTimeAgo(n.createdAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                      {n.message}
                    </p>

                    {n.actionUrl && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#588594] hover:underline mt-1">
                        View Details &rarr;
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 self-center shrink-0">
                    {!n.isRead && (
                      <span className="h-2 w-2 rounded-full bg-[#F0944D]" />
                    )}
                    <button
                      onClick={(e) => handleDeleteNotification(e, n.id)}
                      className="p-1 rounded-md text-slate-300 hover:text-rose-500 hover:bg-slate-100 transition-colors"
                      title="Dismiss"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
