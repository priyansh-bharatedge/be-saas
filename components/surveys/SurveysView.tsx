"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Activity,
  Plus,
  CheckCircle2,
  Clock,
  Sparkles,
  HelpCircle,
  BarChart3,
  Star,
  Send,
  Users,
} from "lucide-react";
import {
  submitSurveyResponseAction,
  createSurveyAction,
  SurveyQuestion,
} from "@/lib/actions/surveys";

interface SurveyItem {
  id: string;
  title: string;
  description?: string | null;
  targetDepartment?: string;
  questions: SurveyQuestion[];
  startDate: string;
  endDate: string;
  hasResponded?: boolean;
  submittedAt?: string | null;
  responseCount?: number;
  recentResponses?: any[];
}

interface SurveysViewProps {
  initialActiveSurveys: SurveyItem[];
  initialAdminSurveys: SurveyItem[];
  isHrAdmin: boolean;
}

export default function SurveysView({
  initialActiveSurveys,
  initialAdminSurveys,
  isHrAdmin,
}: SurveysViewProps) {
  const [activeTab, setActiveTab] = useState<"available" | "analytics">(
    isHrAdmin ? "analytics" : "available"
  );
  const [activeSurveys, setActiveSurveys] = useState<SurveyItem[]>(initialActiveSurveys);
  const [adminSurveys, setAdminSurveys] = useState<SurveyItem[]>(initialAdminSurveys);

  // Take survey modal
  const [takingSurvey, setTakingSurvey] = useState<SurveyItem | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});

  // Create survey modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDept, setNewDept] = useState("ALL");
  const [isPending, startTransition] = useTransition();

  const handleOpenTake = (survey: SurveyItem) => {
    setTakingSurvey(survey);
    const initialAns: Record<string, any> = {};
    survey.questions.forEach((q) => {
      initialAns[q.id] = q.type === "rating" ? 5 : "";
    });
    setAnswers(initialAns);
  };

  const handleSubmitResponse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!takingSurvey) return;

    startTransition(async () => {
      const res = await submitSurveyResponseAction({
        surveyId: takingSurvey.id,
        answers,
      });

      if (res.success) {
        toast.success("Thank you! Your survey responses have been submitted.");
        setTakingSurvey(null);
        window.location.reload();
      } else {
        toast.error(res.error || "Failed to submit survey.");
      }
    });
  };

  const handleCreateDefaultSurvey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const defaultQuestions: SurveyQuestion[] = [
      {
        id: "q1",
        question: "How satisfied are you with the overall workplace culture & team support?",
        type: "rating",
      },
      {
        id: "q2",
        question: "Do you have the tools, workstation equipment, and access needed to perform effectively?",
        type: "choice",
        options: ["Always Yes", "Mostly Yes", "Need Improvement", "No"],
      },
      {
        id: "q3",
        question: "What is one operational or culture improvement BharatEdge can implement next month?",
        type: "text",
      },
    ];

    const today = new Date().toISOString().split("T")[0];
    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    startTransition(async () => {
      const res = await createSurveyAction({
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        targetDepartment: newDept,
        startDate: today,
        endDate: nextMonth,
        questions: defaultQuestions,
      });

      if (res.success) {
        toast.success("New pulse survey deployed across the company!");
        setIsCreateOpen(false);
        window.location.reload();
      } else {
        toast.error(res.error || "Failed to create survey.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Employee Pulse Surveys</h2>
            <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#EBF3F6] text-[#588594] border border-[#ACCAD5]/50">
              Culture & Feedback
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Gather employee feedback on workplace satisfaction, operational tooling, and team culture.
          </p>
        </div>

        {isHrAdmin && (
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="rounded-full bg-gradient-to-r from-[#ACCAD5] to-[#F0944D] text-white font-semibold text-xs px-5 py-2.5 shadow-xs cursor-pointer flex items-center gap-2 self-start sm:self-center"
          >
            <Plus className="h-4 w-4" />
            Deploy Pulse Survey
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
        <button
          onClick={() => setActiveTab("available")}
          className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "available"
              ? "bg-[#588594] text-white shadow-2xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Available Surveys ({activeSurveys.length})
        </button>

        {isHrAdmin && (
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "analytics"
                ? "bg-[#1E293B] text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Response Analytics ({adminSurveys.length})</span>
          </button>
        )}
      </div>

      {/* Content */}
      {activeTab === "available" ? (
        activeSurveys.length === 0 ? (
          <div className="text-center py-16 bg-white/60 rounded-3xl border border-slate-200/60 p-8">
            <Activity className="h-10 w-10 mx-auto text-slate-300 mb-2" />
            <h3 className="text-sm font-bold text-slate-700">No active pulse surveys</h3>
            <p className="text-xs text-slate-400 mt-1">Check back when the next company survey is launched.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeSurveys.map((item) => (
              <div
                key={item.id}
                className="p-6 rounded-3xl bg-white/85 backdrop-blur-md border border-slate-200/80 shadow-2xs space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                    {item.hasResponded ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3" /> Submitted
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                        <Clock className="h-3 w-3" /> Pending
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-xs text-slate-500">{item.description}</p>
                  )}
                  <p className="text-[11px] text-slate-400">
                    {item.questions.length} questions • Ends {item.endDate}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-end">
                  {item.hasResponded ? (
                    <span className="text-xs text-slate-400 italic">Response recorded</span>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleOpenTake(item)}
                      className="rounded-full bg-slate-900 hover:bg-black text-white text-xs font-semibold px-4 cursor-pointer"
                    >
                      Take Survey
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Analytics View for HR Admin */
        adminSurveys.length === 0 ? (
          <div className="text-center py-16 bg-white/60 rounded-3xl border border-slate-200/60 p-8">
            <BarChart3 className="h-10 w-10 mx-auto text-slate-300 mb-2" />
            <h3 className="text-sm font-bold text-slate-700">No survey campaigns</h3>
            <p className="text-xs text-slate-400 mt-1">Deploy a new pulse survey to start gathering staff feedback.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {adminSurveys.map((item) => (
              <div
                key={item.id}
                className="p-6 rounded-3xl bg-white/85 backdrop-blur-md border border-slate-200/80 shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                    <p className="text-xs text-slate-400">
                      Scope: {item.targetDepartment} • Running {item.startDate} to {item.endDate}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-bold font-mono text-[#F0944D]">
                      {item.responseCount || 0}
                    </span>
                    <span className="text-xs text-slate-400 block">responses received</span>
                  </div>
                </div>

                {item.recentResponses && item.recentResponses.length > 0 && (
                  <div className="pt-2 space-y-1.5 border-t border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Recent Submissions:
                    </span>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {item.recentResponses.map((r: any) => (
                        <div
                          key={r.id}
                          className="p-2 rounded-xl bg-slate-50 border border-slate-200/60 text-xs flex justify-between"
                        >
                          <span className="font-semibold text-slate-800">
                            {r.employeeName} ({r.department})
                          </span>
                          <span className="text-slate-400 text-[10px]">
                            {new Date(r.submittedAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Take Survey Dialog */}
      {takingSurvey && (
        <Dialog open={!!takingSurvey} onOpenChange={(open) => !open && setTakingSurvey(null)}>
          <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto rounded-3xl bg-white/95 backdrop-blur-2xl border border-white/80 p-6 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900">
                {takingSurvey.title}
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-1">{takingSurvey.description}</p>
            </DialogHeader>

            <form onSubmit={handleSubmitResponse} className="space-y-4 mt-3">
              {takingSurvey.questions.map((q, idx) => (
                <div key={q.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2 text-xs">
                  <span className="font-semibold text-slate-800 block">
                    {idx + 1}. {q.question}
                  </span>

                  {q.type === "rating" && (
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: star }))}
                          className="p-1 cursor-pointer"
                        >
                          <Star
                            className={`h-5 w-5 ${
                              (answers[q.id] || 0) >= star
                                ? "fill-amber-400 text-amber-400"
                                : "text-slate-300"
                            }`}
                          />
                        </button>
                      ))}
                      <span className="font-bold text-slate-800 ml-2">{answers[q.id] || 5} / 5</span>
                    </div>
                  )}

                  {q.type === "choice" && q.options && (
                    <div className="space-y-1">
                      {q.options.map((opt) => (
                        <label
                          key={opt}
                          className="flex items-center gap-2 p-2 rounded-xl bg-white border border-slate-200 cursor-pointer text-slate-700"
                        >
                          <input
                            type="radio"
                            name={q.id}
                            value={opt}
                            checked={answers[q.id] === opt}
                            onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {q.type === "text" && (
                    <Textarea
                      placeholder="Your constructive feedback..."
                      value={answers[q.id] || ""}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                      className="bg-white border-slate-200 text-xs rounded-xl h-20 resize-none"
                    />
                  )}
                </div>
              ))}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setTakingSurvey(null)}
                  className="rounded-full text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPending}
                  className="rounded-full text-xs font-semibold px-5 bg-gradient-to-r from-[#ACCAD5] to-[#F0944D] text-white cursor-pointer"
                >
                  {isPending ? "Submitting..." : "Submit Answers"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Deploy Pulse Survey Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[440px] rounded-3xl bg-white/95 backdrop-blur-2xl border border-white/80 p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Deploy Company Pulse Survey
            </DialogTitle>
            <p className="text-xs text-slate-500">
              Deploys a standard 3-question workplace satisfaction pulse to staff.
            </p>
          </DialogHeader>

          <form onSubmit={handleCreateDefaultSurvey} className="space-y-3.5 mt-2">
            <div>
              <Label className="text-xs text-slate-700 font-semibold">Survey Campaign Title *</Label>
              <Input
                placeholder="e.g. Q4 Workplace Culture & Tooling Survey"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="mt-1 bg-slate-50 text-xs font-semibold"
                required
              />
            </div>

            <div>
              <Label className="text-xs text-slate-700 font-semibold">Objective / Context</Label>
              <Textarea
                placeholder="Explain the goal of this feedback cycle..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="mt-1 bg-slate-50 border-slate-200 text-xs rounded-xl h-20 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-full text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isPending || !newTitle.trim()}
                className="rounded-full text-xs font-semibold px-5 bg-slate-900 hover:bg-black text-white cursor-pointer"
              >
                {isPending ? "Deploying..." : "Launch Survey"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
