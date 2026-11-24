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
    <PageTransition className="h-full flex flex-col min-h-0">
      {/* 
        Clean viewport-constrained container:
        Matches exact available content height within DashboardLayout's main padding 
        preventing any outer window scrolling so the message composer remains sticky.
      */}
      <div className="h-[calc(100vh-7.5rem)] sm:h-[calc(100vh-8.5rem)] lg:h-[calc(100vh-9.5rem)] w-full flex flex-col overflow-hidden min-h-0">
        <ChatClient
          initialConversations={initialConversations}
          currentUserId={user.id}
          initialColleagues={initialColleagues}
        />
      </div>
    </PageTransition>
  );
}
