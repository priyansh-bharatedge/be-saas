import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getConversationsAction, searchEmployeesForChatAction } from "@/lib/actions/chat";
import { ChatClient } from "@/components/chat/ChatClient";
import PageTransition from "@/components/animations/PageTransition";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Team Chat • BharatEdge Enterprise",
  description: "Internal WhatsApp-style real-time team messaging and document sharing.",
};

export default async function TeamChatPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [convsRes, colleaguesRes] = await Promise.all([
    getConversationsAction(),
    searchEmployeesForChatAction(""),
  ]);

  const initialConversations = convsRes.success && convsRes.data ? convsRes.data : [];
  const initialColleagues = colleaguesRes.success && colleaguesRes.data ? colleaguesRes.data : [];

  return (
    <PageTransition>
      <div className="space-y-4">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Team Chat & Collaboration
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Secure real-time internal messaging, departmental groups, and document sharing.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-white/80 border border-slate-200/80 text-slate-700 font-semibold shadow-2xs">
              {user.department || "Enterprise"} • {user.role}
            </span>
          </div>
        </div>

        {/* Master WhatsApp-Style Chat Client */}
        <ChatClient
          initialConversations={initialConversations}
          currentUserId={user.id}
          initialColleagues={initialColleagues}
        />
      </div>
    </PageTransition>
  );
}
