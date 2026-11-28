"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  LifeBuoy,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageSquare,
  Send,
  ExternalLink,
  ShieldCheck,
  Tag,
} from "lucide-react";
import { HelpdeskStatus, TicketPriority } from "@prisma/client";
import CreateTicketModal from "./CreateTicketModal";
import {
  addHelpdeskCommentAction,
  updateHelpdeskStatusAction,
} from "@/lib/actions/helpdesk";

interface CommentItem {
  id: string;
  authorName: string;
  message: string;
  createdAt: string;
}

interface TicketItem {
  id: string;
  ticketNumber: string;
  employeeName?: string;
  employeeId?: string;
  department?: string;
  targetDepartment: string;
  category: string;
  priority: TicketPriority;
  subject: string;
  description: string;
  attachments: string[];
  status: HelpdeskStatus;
  assignedToName?: string | null;
  createdAt: string;
  comments?: CommentItem[];
  commentsCount?: number;
}

interface HelpdeskViewProps {
  initialMyTickets: TicketItem[];
  initialAllTickets: TicketItem[];
  isSupportStaff: boolean;
}

export default function HelpdeskView({
  initialMyTickets,
  initialAllTickets,
  isSupportStaff,
}: HelpdeskViewProps) {
  const [activeTab, setActiveTab] = useState<"my" | "desk">(isSupportStaff ? "desk" : "my");
  const [myTickets, setMyTickets] = useState<TicketItem[]>(initialMyTickets);
  const [allTickets, setAllTickets] = useState<TicketItem[]>(initialAllTickets);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Thread dialog
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const [commentText, setCommentText] = useState("");
  const [isPending, startTransition] = useTransition();

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !commentText.trim()) return;

    startTransition(async () => {
      const res = await addHelpdeskCommentAction({
        ticketId: selectedTicket.id,
        message: commentText.trim(),
      });

      if (res.success) {
        toast.success("Reply added to ticket thread.");
        setCommentText("");
        window.location.reload();
      } else {
        toast.error(res.error || "Failed to post comment.");
      }
    });
  };

  const handleUpdateStatus = (ticketId: string, status: HelpdeskStatus) => {
    startTransition(async () => {
      const res = await updateHelpdeskStatusAction({ ticketId, status });
      if (res.success) {
        toast.success(`Ticket marked ${status.toLowerCase()}.`);
        setAllTickets((prev) =>
          prev.map((t) => (t.id === ticketId ? { ...t, status } : t))
        );
        if (selectedTicket && selectedTicket.id === ticketId) {
          setSelectedTicket((prev) => (prev ? { ...prev, status } : null));
        }
      } else {
        toast.error(res.error || "Failed to update ticket status.");
      }
    });
  };

  const getPriorityBadge = (priority: TicketPriority) => {
    switch (priority) {
      case "URGENT":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">URGENT</span>;
      case "HIGH":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">HIGH</span>;
      case "MEDIUM":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">MEDIUM</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">LOW</span>;
    }
  };

  const getStatusBadge = (status: HelpdeskStatus) => {
    switch (status) {
      case "RESOLVED":
      case "CLOSED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3" /> {status}
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <Clock className="h-3 w-3" /> In Progress
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle className="h-3 w-3" /> Open
          </span>
        );
    }
  };

  const records = activeTab === "my" ? myTickets : allTickets;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">HRMS Internal Support Desk</h2>
            <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#EBF3F6] text-[#588594] border border-[#ACCAD5]/50">
              Department Ticketing
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Internal query desk for staff inquiries regarding HR policies, IT software & hardware, payroll clarifications, and admin facilities.
          </p>
        </div>

        <Button
          onClick={() => setIsCreateOpen(true)}
          className="rounded-full bg-gradient-to-r from-[#ACCAD5] to-[#F0944D] text-white font-semibold text-xs px-5 py-2.5 shadow-xs cursor-pointer flex items-center gap-2 self-start sm:self-center"
        >
          <Plus className="h-4 w-4" />
          Raise Ticket
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
        <button
          onClick={() => setActiveTab("my")}
          className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "my"
              ? "bg-[#588594] text-white shadow-2xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          My Tickets ({myTickets.length})
        </button>

        {isSupportStaff && (
          <button
            onClick={() => setActiveTab("desk")}
            className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "desk"
                ? "bg-[#1E293B] text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Support Desk Queue ({allTickets.length})</span>
          </button>
        )}
      </div>

      {/* Tickets List */}
      {records.length === 0 ? (
        <div className="text-center py-16 bg-white/60 rounded-3xl border border-slate-200/60 p-8">
          <LifeBuoy className="h-10 w-10 mx-auto text-slate-300 mb-2" />
          <h3 className="text-sm font-bold text-slate-700">No support tickets found</h3>
          <p className="text-xs text-slate-400 mt-1">
            Click &quot;Raise Ticket&quot; to log a question or request assistance.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedTicket(item)}
              className="p-5 rounded-2xl bg-white/85 backdrop-blur-md border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-[#ACCAD5] cursor-pointer"
            >
              <div className="space-y-1.5 flex-1 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-slate-800 text-xs px-2 py-0.5 rounded-full bg-slate-100">
                    {item.ticketNumber}
                  </span>
                  {item.employeeName && (
                    <span className="font-bold text-slate-900">
                      {item.employeeName} ({item.department}) •
                    </span>
                  )}
                  <h4 className="text-sm font-bold text-slate-900">{item.subject}</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EBF3F6] text-[#588594] border border-[#ACCAD5]/50">
                    Dept: {item.targetDepartment}
                  </span>
                  {getPriorityBadge(item.priority)}
                  {getStatusBadge(item.status)}
                </div>

                <p className="text-xs text-slate-500 line-clamp-2 max-w-3xl">
                  {item.description}
                </p>

                <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                  <span>Category: {item.category.replace(/_/g, " ")}</span>
                  <span>•</span>
                  <span>Created {new Date(item.createdAt).toLocaleDateString()}</span>
                  {item.attachments.length > 0 && (
                    <>
                      <span>•</span>
                      <span>{item.attachments.length} attachment(s)</span>
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end md:self-center" onClick={(e) => e.stopPropagation()}>
                {activeTab === "desk" && (
                  <select
                    value={item.status}
                    onChange={(e) => handleUpdateStatus(item.id, e.target.value as HelpdeskStatus)}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800"
                  >
                    <option value="OPEN">Mark Open</option>
                    <option value="IN_PROGRESS">Mark In Progress</option>
                    <option value="RESOLVED">Mark Resolved</option>
                    <option value="CLOSED">Mark Closed</option>
                  </select>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedTicket(item)}
                  className="rounded-xl border-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <MessageSquare className="h-3.5 w-3.5 text-[#588594]" />
                  Discussion Thread
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Ticket Modal */}
      <CreateTicketModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => window.location.reload()}
      />

      {/* Discussion Thread Dialog */}
      {selectedTicket && (
        <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
          <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto rounded-3xl bg-white/95 backdrop-blur-2xl border border-white/80 p-6 shadow-2xl flex flex-col">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800">
                  {selectedTicket.ticketNumber}
                </span>
                <DialogTitle className="text-base font-bold text-slate-900 truncate flex-1">
                  {selectedTicket.subject}
                </DialogTitle>
                {getStatusBadge(selectedTicket.status)}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Target: {selectedTicket.targetDepartment} • Category: {selectedTicket.category.replace(/_/g, " ")}
              </p>
            </DialogHeader>

            {/* Original Ticket Description */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs space-y-1.5 mt-2">
              <span className="font-bold text-slate-700 block">Issue Description:</span>
              <p className="text-slate-600 whitespace-pre-wrap">{selectedTicket.description}</p>
              {selectedTicket.attachments.length > 0 && (
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  {selectedTicket.attachments.map((url, uIdx) => (
                    <a
                      key={uIdx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-[#588594] hover:underline flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-slate-200"
                    >
                      <ExternalLink className="h-3 w-3" /> View Attachment #{uIdx + 1}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Comments Thread */}
            <div className="space-y-2 flex-1 my-3 overflow-y-auto max-h-48">
              <span className="text-[11px] font-semibold text-slate-400 block">
                Conversation Thread ({selectedTicket.comments?.length || 0})
              </span>
              {selectedTicket.comments?.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">No comments posted yet.</p>
              ) : (
                selectedTicket.comments?.map((c) => (
                  <div key={c.id} className="p-3 rounded-2xl bg-[#FCFAF7] border border-slate-200/60 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-900">{c.authorName}</span>
                      <span className="text-slate-400 font-mono">
                        {new Date(c.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-slate-700">{c.message}</p>
                  </div>
                ))
              )}
            </div>

            {/* Reply Form */}
            <form onSubmit={handlePostComment} className="pt-2 border-t border-slate-100 flex gap-2">
              <Textarea
                placeholder="Type your reply to this ticket..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="bg-slate-50 border-slate-200 text-xs rounded-xl resize-none h-14 flex-1"
                required
              />
              <Button
                type="submit"
                size="sm"
                disabled={isPending || !commentText.trim()}
                className="rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold px-4 self-end cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
