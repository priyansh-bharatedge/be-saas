"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  KeyRound,
  Mail,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldAlert,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { requestOtpAction, resetPasswordWithOtpAction } from "@/lib/auth/actions";
import { emailSchema } from "@/lib/validations/auth";

interface ResetPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialEmail?: string;
}

export default function ResetPasswordModal({
  open,
  onOpenChange,
  initialEmail = "",
}: ResetPasswordModalProps) {
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const handleSendOtp = async () => {
    const val = emailSchema.safeParse({ email });
    if (!val.success) {
      toast.error("Please enter a valid enterprise email address.");
      return;
    }

    setSendingOtp(true);
    try {
      const res = await requestOtpAction(email);
      if (res.success) {
        setOtpSent(true);
        setCooldown(60);
        toast.success("Security OTP sent to your enterprise inbox!");

        // Start cooldown timer
        const timer = setInterval(() => {
          setCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        toast.error(res.error || "Failed to send OTP.");
      }
    } catch {
      toast.error("Unable to deliver OTP email.");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otp.trim()) {
      toast.error("Please enter the 6-digit OTP code.");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setResetting(true);
    try {
      const res = await resetPasswordWithOtpAction(email, otp, newPassword, confirmPassword);
      if (res.success) {
        toast.success(res.message || "Password updated successfully!");
        onOpenChange(false);
      } else {
        toast.error(res.error || "Failed to reset password.");
      }
    } catch {
      toast.error("An error occurred resetting password.");
    } finally {
      setResetting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white/95 backdrop-blur-xl border border-slate-200/80 shadow-2xl rounded-2xl p-6">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-orange-100 flex items-center justify-center text-[#C66318]">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Reset Enterprise Password
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Verify your identity via Email OTP to set a new password.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleResetSubmit} className="space-y-4 pt-2">
          {/* Email input + Send OTP */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Enterprise Email</Label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@bharat-edge.com"
                  required
                  className="pl-8 text-xs h-9"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSendOtp}
                disabled={sendingOtp || cooldown > 0 || !email}
                className="h-9 text-xs gap-1 border-slate-300 font-medium text-slate-700 shrink-0"
              >
                {sendingOtp ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Send className="h-3 w-3 text-[#C66318]" />
                )}
                <span>{cooldown > 0 ? `${cooldown}s` : otpSent ? "Resend" : "Send OTP"}</span>
              </Button>
            </div>
          </div>

          {/* OTP Code */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">6-Digit Security OTP</Label>
            <Input
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter 6-digit OTP code..."
              required
              className="text-xs h-9 font-mono tracking-widest text-center"
            />
          </div>

          {/* New Password */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">New Password</Label>
            <div className="relative flex items-center">
              <Input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters..."
                required
                className="text-xs h-9 pr-9"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Confirm New Password</Label>
            <div className="relative flex items-center">
              <Input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password..."
                required
                className="text-xs h-9 pr-9"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-2.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                {showConfirm ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-8 text-slate-600"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={resetting || !otp || newPassword.length < 8}
              className="text-xs h-8 bg-gradient-to-r from-[#141619] to-black text-white font-semibold shadow-xs"
            >
              {resetting ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                  Updating...
                </>
              ) : (
                "Update Password"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
