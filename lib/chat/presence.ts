/**
 * Formats a user's presence timestamp in WhatsApp style:
 * - "online"
 * - "last seen today at 04:02 PM"
 * - "last seen yesterday at 11:15 AM"
 * - "last seen on DD/MM/YYYY at HH:MM AM/PM"
 */
export function formatWhatsAppLastSeen(
  lastSeen: string | Date | null | undefined,
  defaultSubtitle?: string
): string {
  if (!lastSeen) {
    return defaultSubtitle || "offline";
  }

  try {
    const d = new Date(lastSeen);
    if (isNaN(d.getTime())) {
      return defaultSubtitle || "offline";
    }

    const now = new Date();

    // Format time: "04:02 PM"
    const timeStr = d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    // Check if Today
    if (d.toDateString() === now.toDateString()) {
      return `last seen today at ${timeStr}`;
    }

    // Check if Yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) {
      return `last seen yesterday at ${timeStr}`;
    }

    // Older date: DD/MM/YYYY at HH:MM AM/PM
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();

    return `last seen on ${day}/${month}/${year} at ${timeStr}`;
  } catch {
    return defaultSubtitle || "offline";
  }
}
