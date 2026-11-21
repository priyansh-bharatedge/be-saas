import DepartmentHeader from "@/components/layout/DepartmentHeader";
import PageTransition from "@/components/animations/PageTransition";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GitBranch, Plus } from "lucide-react";

export default function CRMWorkflowsPage() {
  return (
    <PageTransition>
      <DepartmentHeader
        title="CRM Automation & Workflows"
        description="Automate deal assignment, email sequences, and SLA triggers."
        departmentBadge="CRM-AUTOMATION"
        actions={
          <Button><Plus className="h-4 w-4 mr-1" /> New Workflow</Button>
        }
      />
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-indigo-600" />
            <CardTitle>Workflow Triggers & Rules</CardTitle>
          </div>
          <CardDescription>Event-driven state transitions for sales automation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-8 border border-dashed border-slate-300 dark:border-slate-800 rounded-lg text-center text-slate-500 text-sm">
            Modular workflow engine pipeline scaffolded.
          </div>
        </CardContent>
      </Card>
    </PageTransition>
  );
}

