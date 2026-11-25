"use client";

import React, { useState } from "react";
import { TicketPriority, TicketStatus } from "@prisma/client";
import {
  getTicketsAction,
  createTicketAction,
  updateTicketStatusAction,
} from "@/lib/actions/support";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Headphones,
  Plus,
  Search,
  Filter,
  Clock,
  User,
  Mail,
  Phone,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

interface TicketItem {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  source: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  assignedEmployeeId: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  assignedEmployee: {
    id: string;
    firstName: string;
    lastName: string;
    workEmail: string;
    department: string | null;
    designation: string | null;
  } | null;
  auditLogs: {
    id: string;
    qualityScore: number;
    complianceStatus: string;
    feedbackComments: string;
    escalatedToHOD: boolean;
    createdAt: string;
    auditor: {
      firstName: string;
      lastName: string;
      department: string | null;
    };
  }[];
}

interface Props {
  initialTickets: TicketItem[];
  total: number;
  userScope: {
    canManageAll: boolean;
    isQualityDept: boolean;
  };
}

export default function SupportTicketsView({ initialTickets, total, userScope }: Props) {
  const [tickets, setTickets] = useState<TicketItem[]>(initialTickets);
  const [totalCount, setTotalCount] = useState(total);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");

  // Create Modal State
  const [createOpen, setCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<{
    subject: string;
    description: string;
    priority: TicketPriority;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    source: string;
  }>({
    subject: "",
    description: "",
    priority: TicketPriority.MEDIUM,
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    source: "PORTAL",
  });

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const res = await getTicketsAction({
        search,
        status: statusFilter,
        priority: priorityFilter,
      });
      if (res.success && res.data) {
        setTickets(res.data.tickets as any);
        setTotalCount(res.data.total);
      } else {
        toast.error(res.error || "Failed to load tickets.");
      }
    } catch {
      toast.error("Error fetching tickets.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject || !formData.description || !formData.customerName || !formData.customerEmail) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createTicketAction(formData);
      if (res.success) {
        toast.success(`Ticket ${res.data?.ticketNumber} created successfully!`);
        setCreateOpen(false);
        setFormData({
          subject: "",
          description: "",
          priority: TicketPriority.MEDIUM,
          customerName: "",
          customerEmail: "",
          customerPhone: "",
          source: "PORTAL",
        });
        fetchTickets();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("notification-updated"));
        }
      } else {
        toast.error(res.error || "Failed to create ticket.");
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: TicketStatus) => {
    try {
      const res = await updateTicketStatusAction({ ticketId, status: newStatus });
      if (res.success) {
        toast.success("Ticket status updated.");
        setTickets((prev) =>
          prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t))
        );
      } else {
        toast.error(res.error || "Failed to update status.");
      }
    } catch {
      toast.error("An error occurred while updating status.");
    }
  };

  const getPriorityBadge = (priority: TicketPriority) => {
    switch (priority) {
      case TicketPriority.URGENT:
        return <Badge className="bg-red-600/90 text-white text-[10px]">Urgent</Badge>;
      case TicketPriority.HIGH:
        return <Badge className="bg-orange-600/90 text-white text-[10px]">High</Badge>;
      case TicketPriority.MEDIUM:
        return <Badge className="bg-blue-600/90 text-white text-[10px]">Medium</Badge>;
      case TicketPriority.LOW:
        return <Badge variant="outline" className="text-slate-600 text-[10px]">Low</Badge>;
    }
  };

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case TicketStatus.OPEN:
        return <Badge className="bg-sky-500/90 text-white text-[10px]">Open</Badge>;
      case TicketStatus.IN_PROGRESS:
        return <Badge className="bg-amber-500/90 text-white text-[10px]">In Progress</Badge>;
      case TicketStatus.PENDING_CUSTOMER:
        return <Badge className="bg-purple-500/90 text-white text-[10px]">Pending Customer</Badge>;
      case TicketStatus.ESCALATED:
        return <Badge className="bg-red-500/90 text-white text-[10px]">Escalated</Badge>;
      case TicketStatus.RESOLVED:
        return <Badge className="bg-emerald-600/90 text-white text-[10px]">Resolved</Badge>;
      case TicketStatus.CLOSED:
        return <Badge variant="outline" className="text-slate-500 text-[10px]">Closed</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-white/40 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 md:w-72">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search ticket #, customer, subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchTickets()}
              className="pl-8 h-8 text-xs bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
            />
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={fetchTickets}
            className="h-8 text-xs bg-white/80 dark:bg-slate-800/80"
          >
            <Filter className="w-3 h-3 mr-1" />
            Filter
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSearch("");
              setStatusFilter("ALL");
              setPriorityFilter("ALL");
              fetchTickets();
            }}
            className="h-8 text-xs text-slate-500"
          >
            Reset
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
            }}
            className="h-8 text-xs px-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300"
          >
            <option value="ALL">All Status</option>
            {Object.values(TicketStatus).map((s) => (
              <option key={s} value={s}>{s.replace("_", " ")}</option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
            }}
            className="h-8 text-xs px-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300"
          >
            <option value="ALL">All Priorities</option>
            {Object.values(TicketPriority).map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <Button
            size="sm"
            variant="outline"
            onClick={fetchTickets}
            disabled={isLoading}
            className="h-8 text-xs bg-white/80 dark:bg-slate-800/80"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </Button>

          <Button
            size="sm"
            onClick={() => setCreateOpen(true)}
            className="h-8 text-xs bg-[#F0944D] hover:bg-[#F0944D]/90 text-white"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            New Ticket
          </Button>
        </div>
      </div>

      {/* Tickets List View */}
      {tickets.length === 0 ? (
        <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-dashed border-slate-300 dark:border-slate-800">
          <CardContent className="p-12 text-center text-slate-500">
            <Headphones className="w-10 h-10 mx-auto text-slate-400 mb-3 opacity-60" />
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No support tickets found
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Tickets will appear here when submitted or assigned to your team.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <Card
              key={ticket.id}
              className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-white/50 dark:border-slate-800 shadow-sm hover:shadow transition-all"
            >
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#F0944D]">
                        {ticket.ticketNumber}
                      </span>
                      {getPriorityBadge(ticket.priority)}
                      {getStatusBadge(ticket.status)}
                      <span className="text-[11px] text-slate-400">
                        via {ticket.source} · {new Date(ticket.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {ticket.subject}
                    </h4>

                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                      {ticket.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1">
                      <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                        <User className="w-3 h-3 text-slate-400" />
                        {ticket.customerName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-400" />
                        {ticket.customerEmail}
                      </span>
                      {ticket.customerPhone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {ticket.customerPhone}
                        </span>
                      )}
                      {ticket.assignedEmployee && (
                        <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300">
                          Assigned: {ticket.assignedEmployee.firstName} {ticket.assignedEmployee.lastName} ({ticket.assignedEmployee.department || "Support"})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions & Status Control */}
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 self-end lg:self-center">
                    {ticket.auditLogs.length > 0 && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        QA Audited: {ticket.auditLogs[0].qualityScore}/100
                      </span>
                    )}

                    <select
                      value={ticket.status}
                      onChange={(e) => handleStatusChange(ticket.id, e.target.value as TicketStatus)}
                      className="h-7 text-xs px-2 rounded border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200"
                    >
                      {Object.values(TicketStatus).map((s) => (
                        <option key={s} value={s}>{s.replace("_", " ")}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {/* Create Ticket Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Headphones className="w-4 h-4 text-[#F0944D]" />
              Create Support Ticket
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateTicket} className="space-y-3.5 mt-2">
            <div>
              <Label className="text-xs">Customer Name *</Label>
              <Input
                placeholder="e.g. Ramesh Patel"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                className="h-8 text-xs mt-1"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Customer Email *</Label>
                <Input
                  type="email"
                  placeholder="client@example.com"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                  className="h-8 text-xs mt-1"
                  required
                />
              </div>
              <div>
                <Label className="text-xs">Phone (Optional)</Label>
                <Input
                  placeholder="+91 9876543210"
                  value={formData.customerPhone}
                  onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Priority</Label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as TicketPriority })}
                  className="w-full h-8 text-xs mt-1 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  {Object.values(TicketPriority).map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">Inbound Source</Label>
                <Input
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Subject *</Label>
              <Input
                placeholder="Brief description of inquiry..."
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="h-8 text-xs mt-1"
                required
              />
            </div>

            <div>
              <Label className="text-xs">Detailed Description *</Label>
              <Textarea
                placeholder="Provide full details of the customer issue..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="text-xs min-h-[80px] mt-1"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="bg-[#F0944D] hover:bg-[#F0944D]/90 text-white"
              >
                {isSubmitting ? "Creating..." : "Submit Ticket"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
