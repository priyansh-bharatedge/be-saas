"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Target, DollarSign, Calendar, FileText, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  salesTargetSchema,
  SalesTargetFormData,
} from "@/lib/validations/dashboard";

interface SalesTargetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bdmsList: Array<{ id: string; name: string; department: string }>;
  defaultMonth: number;
  defaultYear: number;
  onSubmit: (data: SalesTargetFormData) => Promise<void>;
  isSubmitting?: boolean;
}

export default function SalesTargetModal({
  open,
  onOpenChange,
  bdmsList,
  defaultMonth,
  defaultYear,
  onSubmit,
  isSubmitting = false,
}: SalesTargetModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SalesTargetFormData>({
    resolver: zodResolver(salesTargetSchema) as any,
    defaultValues: {
      bdmId: bdmsList[0]?.id || "",
      month: defaultMonth,
      year: defaultYear,
      targetAmount: 500000,
      remarks: "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        bdmId: bdmsList[0]?.id || "",
        month: defaultMonth,
        year: defaultYear,
        targetAmount: 500000,
        remarks: "",
      });
    }
  }, [open, defaultMonth, defaultYear, bdmsList, reset]);

  if (!open) return null;

  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  const handleFormSubmit = async (data: SalesTargetFormData) => {
    await onSubmit(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200/80 bg-gradient-to-r from-amber-50/60 via-white to-sky-50/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#F0944D]/30 to-[#ACCAD5]/30 border border-slate-200/80 flex items-center justify-center text-slate-800 shadow-2xs">
              <Target className="h-5 w-5 text-[#F0944D]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Sales Target Setting Desk
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Assign monthly revenue targets to BDM/CDM personnel
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-4">
          {/* 1. Select BDM */}
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">
              Business Development Representative (BDM / CDM) *
            </label>
            <select
              {...register("bdmId")}
              className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#F0944D]/50 focus:border-[#F0944D]"
            >
              <option value="">-- Choose Sales Representative --</option>
              {bdmsList.map((bdm) => (
                <option key={bdm.id} value={bdm.id}>
                  {bdm.name} ({bdm.department})
                </option>
              ))}
            </select>
            {errors.bdmId && (
              <p className="text-[11px] text-rose-500 mt-1">{errors.bdmId.message}</p>
            )}
          </div>

          {/* 2. Month and Year */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">
                Target Month *
              </label>
              <select
                {...register("month", { valueAsNumber: true })}
                className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#F0944D]/50 focus:border-[#F0944D]"
              >
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">
                Target Year *
              </label>
              <Input
                type="number"
                min="2024"
                max="2035"
                {...register("year", { valueAsNumber: true })}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* 3. Monthly Revenue Target (₹) Only */}
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">
              Monthly Revenue Target (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                ₹
              </span>
              <Input
                type="number"
                step="1000"
                {...register("targetAmount", { valueAsNumber: true })}
                placeholder="500000"
                className="pl-7 h-9 text-xs font-bold text-slate-900"
              />
            </div>
            {errors.targetAmount && (
              <p className="text-[11px] text-rose-500 mt-1">
                {errors.targetAmount.message}
              </p>
            )}
          </div>

          {/* 4. Strategic Remarks */}
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">
              Strategic Notes & Focus Verticals (Optional)
            </label>
            <Textarea
              {...register("remarks")}
              rows={2}
              placeholder="e.g. Focus on Tech Private Limited Incorporations and Seed Round Funding Mandates."
              className="text-xs resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200/80">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-9 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-9 text-xs font-semibold bg-[#F0944D] hover:bg-[#d87c35] text-white shadow-xs gap-1.5"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              Set Monthly Target
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
