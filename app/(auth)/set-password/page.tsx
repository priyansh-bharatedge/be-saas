"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Loader2,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Validation rules
  const hasMinLength = password.length >= 8;
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isValid = hasMinLength && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasMinLength) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }

    if (!passwordsMatch) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/set-initial-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirmPassword }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Password configured successfully! Welcome to BharatEdge.");
        window.location.href = data.redirectTo || "/portal";
      } else {
        toast.error(data.error || "Failed to set password. Please try again.");
      }
    } catch {
      toast.error("Network error. Unable to set password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FCFAF7] text-[#18191B] flex flex-col justify-between overflow-x-hidden selection:bg-[#F0944D]/30 selection:text-[#C66318]">
      {/* Brand Header */}
      <header className="w-full max-w-7xl mx-auto px-6 pt-5 pb-2 flex items-center justify-between z-20">
        <div className="flex items-center">
          <img
            src="/be-logo.png"
            alt="BharatEdge Logo"
            className="h-9 w-auto max-w-[170px] object-contain"
          />
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 z-10 -mt-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md bg-white/90 backdrop-blur-xl border border-slate-200/90 rounded-2xl shadow-xl p-6 sm:p-8"
        >
          {/* Header Icon */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#ACCAD5]/30 to-[#F0944D]/25 flex items-center justify-center shadow-xs mb-3 border border-[#ACCAD5]/40">
              <ShieldCheck className="h-7 w-7 text-[#C66318]" />
            </div>
            <h1 className="font-editorial text-2xl font-bold tracking-tight text-slate-900">
              Set Your Enterprise Password
            </h1>
            <p className="text-xs text-slate-500 mt-1.5 max-w-xs leading-relaxed">
              Welcome to BharatEdge! To complete your onboarding, configure a password to secure your departmental access.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                New Password
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters..."
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#F0944D]/25 focus:border-[#F0944D] pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Confirm Password
              </label>
              <div className="relative flex items-center">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password..."
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#F0944D]/25 focus:border-[#F0944D] pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Password Validation Checklist */}
            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70 space-y-2 text-xs">
              <div className="flex items-center gap-2">
                {hasMinLength ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-slate-300 shrink-0" />
                )}
                <span className={hasMinLength ? "text-slate-800 font-medium" : "text-slate-500"}>
                  Minimum 8 characters
                </span>
              </div>
              <div className="flex items-center gap-2">
                {passwordsMatch ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-slate-300 shrink-0" />
                )}
                <span className={passwordsMatch ? "text-slate-800 font-medium" : "text-slate-500"}>
                  Passwords match
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={!isValid || loading}
              className="w-full py-2.5 bg-gradient-to-r from-[#141619] to-black text-white hover:opacity-95 font-bold text-xs uppercase tracking-wider rounded-lg shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Configuring Password...</span>
                </>
              ) : (
                <>
                  <span>Save Password & Launch Hub</span>
                  <KeyRound className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </form>

          {/* Footer Notice */}
          <div className="mt-5 text-center flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <Lock className="h-3 w-3 text-slate-400" />
            <span>Encrypted with AES-256-GCM & bcrypt standards</span>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
