"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isPending?: boolean;
  onConfirm: () => void | Promise<void>;
}

export default function ConfirmationModal({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete Record",
  cancelLabel = "Cancel",
  isDestructive = true,
  isPending = false,
  onConfirm,
}: ConfirmationModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] rounded-[32px] bg-white/95 backdrop-blur-2xl border border-white/80 p-6 sm:p-7">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div
              className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 ${
                isDestructive ? "bg-rose-50 text-rose-600 border border-rose-200" : "bg-amber-50 text-amber-600 border border-amber-200"
              }`}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">{title}</DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 mt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
            className="rounded-full text-xs px-4"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isPending}
            onClick={onConfirm}
            className={`rounded-full text-xs font-semibold px-5 text-white ${
              isDestructive
                ? "bg-rose-600 hover:bg-rose-700 shadow-sm"
                : "bg-[#F0944D] hover:bg-[#E07E32] shadow-sm"
            }`}
          >
            {isPending ? "Processing..." : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
