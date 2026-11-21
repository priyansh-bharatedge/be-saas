import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import PageTransition from "@/components/animations/PageTransition";
import { KeyRound } from "lucide-react";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <PageTransition className="w-full max-w-md">
        <Card className="border-slate-200 shadow-xl dark:border-slate-800">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white mb-3 shadow-md">
              <KeyRound className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">Enterprise Password Recovery</CardTitle>
            <CardDescription>
              Submit your corporate email address to receive password reset authorization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Registered Work Email
              </label>
              <Input type="email" placeholder="name@bharatedge.com" />
            </div>
            <Button className="w-full font-medium">Send Reset Link</Button>
          </CardContent>
          <CardFooter className="flex justify-center border-t border-slate-100 dark:border-slate-800 pt-4">
            <Link href="/login" className="text-xs text-indigo-600 hover:underline">
              ← Return to Login
            </Link>
          </CardFooter>
        </Card>
      </PageTransition>
    </div>
  );
}

