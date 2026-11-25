"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { GeometricFan } from "@/components/animations/GeometricFan";
import {
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ENTERPRISE_SEED_USERS } from "@/lib/db/users";
import {
  requestOtpAction,
  loginWithPasswordAction,
  loginWithOtpAction,
} from "@/lib/auth/actions";
import { emailSchema, otpVerifySchema, passwordLoginSchema } from "@/lib/validations/auth";

interface AuthFormData {
  email: string;
  password?: string;
  otp?: string;
}

export default function LoginPage() {
  const router = useRouter();

  // Authentication mode: idle (just email), password (email + password), otp (email + 6-digit OTP)
  const [authMode, setAuthMode] = useState<"idle" | "password" | "otp">("idle");
  const [loading, setLoading] = useState(false);
  const [showPersonaPicker, setShowPersonaPicker] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // React Hook Form
  const {
    register,
    setValue,
    watch,
  } = useForm<AuthFormData>({
    defaultValues: {
      email: "",
      password: "",
      otp: "",
    },
    mode: "onBlur",
  });

  const emailValue = watch("email");
  const passwordValue = watch("password");
  const otpValue = watch("otp");

  // Cooldown timer countdown effect
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // Validate email format with Zod before triggering any backend call
  const validateEmailFormat = (email: string): boolean => {
    const result = emailSchema.safeParse({ email });
    if (!result.success) {
      const errorMsg = result.error.issues[0]?.message || "Invalid enterprise email address.";
      toast.error(errorMsg);
      return false;
    }
    return true;
  };

  // 1. "Sign In via Password" Trigger & Handler
  const handlePasswordSignInClick = async () => {
    if (!validateEmailFormat(emailValue)) return;

    if (authMode !== "password") {
      setAuthMode("password");
      toast.info("Please enter your enterprise password.");
      return;
    }

    const validation = passwordLoginSchema.safeParse({
      email: emailValue,
      password: passwordValue || "",
    });

    if (!validation.success) {
      const err = validation.error.issues[0]?.message || "Password is required.";
      toast.error(err);
      return;
    }

    setLoading(true);
    try {
      const res = await loginWithPasswordAction(emailValue, passwordValue || "");
      if (res.success && res.redirectTo) {
        toast.success("Authentication successful! Welcome to BharatEdge.");
        router.push(res.redirectTo);
        router.refresh();
      } else {
        toast.error(res.error || "Invalid credentials or user not found.");
      }
    } catch {
      toast.error("A server error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  // 2. "Sign In via OTP" Trigger: Dispatches Nodemailer email & saves OTP with 5m expiry in PostgreSQL
  const handleOtpSignInClick = async () => {
    if (!validateEmailFormat(emailValue)) return;

    if (cooldown > 0) {
      toast.error(`Please wait ${cooldown} seconds before requesting a new OTP.`);
      return;
    }

    setLoading(true);
    try {
      const res = await requestOtpAction(emailValue);
      if (res.success) {
        setAuthMode("otp");
        setValue("otp", "");
        setCooldown(60); // 60-second cooldown timer
        toast.success("Security OTP sent! Check your enterprise inbox.");
      } else {
        if (res.cooldownRemaining) {
          setCooldown(res.cooldownRemaining);
        }
        toast.error(res.error || "Invalid credentials or user not found.");
      }
    } catch {
      toast.error("Unable to connect to authentication mailer.");
    } finally {
      setLoading(false);
    }
  };

  // 3. Confirm OTP Submission
  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = otpVerifySchema.safeParse({
      email: emailValue,
      otp: otpValue || "",
    });

    if (!validation.success) {
      toast.error(validation.error.issues[0]?.message || "Please enter a valid 6-digit OTP code.");
      return;
    }

    setLoading(true);
    try {
      const res = await loginWithOtpAction(emailValue, otpValue || "");
      if (res.success && res.redirectTo) {
        toast.success("OTP verified! Welcome to BharatEdge.");
        router.push(res.redirectTo);
        router.refresh();
      } else {
        toast.error(res.error || "Invalid or expired OTP code.");
        if (res.error?.includes("invalidated") || res.error?.includes("expired")) {
          setValue("otp", "");
        }
      }
    } catch {
      toast.error("An unexpected error occurred verifying OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPersona = (personaEmail: string) => {
    setValue("email", personaEmail);
    setValue("password", "Enterprise@2026");
    setShowPersonaPicker(false);
    toast.info(`Selected ${personaEmail}`);
  };

  return (
    <div className="min-h-screen bg-[#FCFAF7] text-[#18191B] flex flex-col justify-between overflow-x-hidden selection:bg-[#F0944D]/30 selection:text-[#C66318]">
      {/* 1. Header: Official BharatEdge Brand Logo */}
      <header className="w-full max-w-7xl mx-auto px-6 pt-5 pb-2 flex items-center justify-between z-20">
        <div className="flex items-center">
          <img
            src="/be-logo.png"
            alt="BharatEdge Logo"
            className="h-9 w-auto max-w-[170px] object-contain"
          />
        </div>
      </header>

      {/* Main Authentication Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-1 text-center z-10 -mt-2">
        {/* 2. Headline & Animation: "Nothing will work unless you do" in bold with smooth entrance */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-2xl mx-auto"
        >
          <h1 className="font-editorial text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-[#141619] leading-[1.12]">
            Nothing will work <br />
            <span className="italic font-serif font-bold text-[#C66318]">unless you do</span>
          </h1>
        </motion.div>

        {/* 3. Form Inputs & Authentication Logic */}
        <div className="mt-5 w-full max-w-md px-2 flex flex-col items-center">
          {/* Email ID Input Field (functional, styled with Zod & React Hook Form) */}
          <div className="w-full relative">
            <div className="w-full flex items-center gap-2 px-3.5 py-2.5 bg-white/90 border border-slate-300 rounded-md shadow-xs backdrop-blur-xs text-xs text-slate-800 transition-all focus-within:border-[#F0944D] focus-within:ring-2 focus-within:ring-[#F0944D]/25">
              <Mail className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                type="email"
                {...register("email", { required: true })}
                disabled={authMode === "otp"}
                placeholder="Enter your email address"
                autoComplete="off"
                className="w-full bg-transparent outline-none text-slate-900 placeholder:text-slate-400 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setShowPersonaPicker(!showPersonaPicker)}
                title="Select demo employee persona"
                className="text-[11px] font-mono text-slate-400 hover:text-[#C66318] px-1.5 py-0.5 rounded hover:bg-slate-100 transition-colors cursor-pointer shrink-0 flex items-center gap-1"
              >
                <Sparkles className="h-3 w-3 text-[#F0944D]" />
                <span className="hidden sm:inline">Roles</span>
              </button>
            </div>

            {/* Quick Persona Picker Dropdown */}
            {showPersonaPicker && (
              <div className="absolute top-full left-0 right-0 mt-1.5 p-2 bg-white border border-slate-200 rounded-lg shadow-xl z-30 text-left">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                  PostgreSQL Seeded Accounts:
                </div>
                <div className="space-y-1">
                  {ENTERPRISE_SEED_USERS.map((seed) => (
                    <button
                      key={seed.id}
                      type="button"
                      onClick={() => handleSelectPersona(seed.email)}
                      className="w-full p-2 rounded hover:bg-[#FDEFE6]/40 flex items-center justify-between text-left text-xs transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#C66318]" />
                        <span className="font-semibold text-slate-900">{seed.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">({seed.role})</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{seed.email}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Conditional Password Input Expander */}
          <AnimatePresence>
            {authMode === "password" && (
              <motion.form
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 8 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                onSubmit={(e) => {
                  e.preventDefault();
                  handlePasswordSignInClick();
                }}
                className="w-full overflow-hidden"
              >
                <div className="w-full flex items-center gap-2 px-3.5 py-2.5 bg-white/95 border border-slate-300 rounded-md shadow-xs text-xs text-slate-800 focus-within:border-[#F0944D] focus-within:ring-2 focus-within:ring-[#F0944D]/25">
                  <KeyRound className="h-4 w-4 text-slate-400 shrink-0" />
                  <input
                    type="password"
                    {...register("password")}
                    placeholder="Enter your password"
                    autoComplete="new-password"
                    className="w-full bg-transparent outline-none text-slate-900 placeholder:text-slate-400 text-xs"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-3.5 py-1.5 bg-[#141619] hover:bg-black text-white text-[11px] font-bold rounded uppercase cursor-pointer disabled:opacity-50 shrink-0 flex items-center gap-1"
                  >
                    {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Verify"}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Conditional OTP Input Expander with Live Email Dispatch Info & Cooldown */}
          <AnimatePresence>
            {authMode === "otp" && (
              <motion.form
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 8 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                onSubmit={handleVerifyOtpSubmit}
                className="w-full overflow-hidden"
              >
                {/* Nodemailer Email Dispatched Status Banner */}
                <div className="mb-2 p-2.5 rounded-md bg-[#EBF3F6] border border-[#ACCAD5]/70 text-[11px] text-[#588594] text-left">
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1.5 font-bold text-slate-900">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      Code sent to your enterprise email
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("idle");
                        setValue("otp", "");
                      }}
                      className="text-[10px] text-slate-500 hover:text-black underline cursor-pointer"
                    >
                      Change Email
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-600">
                    A 6-digit passcode was dispatched to <strong className="font-mono text-slate-800">{emailValue}</strong>. Valid for 5 minutes.
                  </p>
                </div>

                <div className="w-full flex items-center gap-2 px-3.5 py-2 bg-white/95 border border-slate-300 rounded-md shadow-xs text-xs text-slate-800 focus-within:border-[#F0944D] focus-within:ring-2 focus-within:ring-[#F0944D]/25">
                  <input
                    type="text"
                    maxLength={6}
                    {...register("otp")}
                    placeholder="Enter 6-digit OTP code..."
                    className="w-full bg-transparent outline-none text-slate-900 text-center font-mono text-sm tracking-widest placeholder:tracking-normal placeholder:font-sans placeholder:text-xs"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-3.5 py-1.5 bg-[#141619] hover:bg-black text-white text-[11px] font-bold rounded uppercase cursor-pointer disabled:opacity-50 shrink-0 flex items-center gap-1"
                  >
                    {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Verify & Access"}
                  </button>
                </div>

                {/* Resend OTP button with cooldown countdown */}
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 px-1">
                  <span>Didn&apos;t receive code? Check spam folder</span>
                  <button
                    type="button"
                    onClick={handleOtpSignInClick}
                    disabled={cooldown > 0 || loading}
                    className="flex items-center gap-1 font-semibold text-[#C66318] hover:text-black disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                    <span>{cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}</span>
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Action Buttons: "Sign In via OTP" & "Sign In via Password" */}
          <div className="mt-3.5 flex flex-wrap items-center justify-center gap-3 w-full">
            <button
              type="button"
              onClick={handleOtpSignInClick}
              disabled={loading || (authMode === "otp" && cooldown > 0)}
              className={`px-6 py-2.5 text-xs font-bold tracking-wider uppercase rounded-sm shadow-xs transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2 flex-1 sm:flex-initial min-w-[170px] ${
                authMode === "otp"
                  ? "bg-[#C66318] text-white"
                  : "bg-[#141619] hover:bg-black text-white"
              } disabled:opacity-50`}
            >
              {loading && authMode !== "password" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Sending Email...</span>
                </>
              ) : (
                <>
                  <span>{authMode === "otp" && cooldown > 0 ? `Resend in ${cooldown}s` : "Sign In via OTP"}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handlePasswordSignInClick}
              disabled={loading}
              className={`px-6 py-2.5 bg-white hover:bg-slate-50 border border-slate-400/90 text-slate-900 text-xs font-bold tracking-wider uppercase rounded-sm shadow-2xs transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2 flex-1 sm:flex-initial min-w-[170px] ${
                authMode === "password" ? "ring-2 ring-[#F0944D] border-[#F0944D]" : ""
              } disabled:opacity-50`}
            >
              {loading && authMode === "password" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <span>Sign In via Password</span>
                  <KeyRound className="h-3.5 w-3.5 text-slate-500" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* 4. Layout Adjustments: Tightly connected Geometric Radiant Fan */}
        <div className="w-full max-w-4xl mt-1 sm:mt-2">
          <GeometricFan />
        </div>
      </main>
    </div>
  );
}
