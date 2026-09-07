"use client";

import * as React from "react";
import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { AppFooter } from "@/components/layout/app-footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KeyRound, ArrowLeft, CheckCircle2, ShieldAlert, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [resetData, setResetData] = React.useState<{ resetToken: string; resetUrl: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate password reset link.");
      }

      setResetData({ resetToken: data.resetToken, resetUrl: data.resetUrl });
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <AppHeader />

      <main className="flex-1 flex items-center justify-center p-4 py-12">
        <Card className="max-w-md w-full border border-emerald-500/30 bg-zinc-950/80 p-6 md:p-8 rounded-2xl shadow-2xl backdrop-blur-xl">
          <div className="text-center mb-6">
            <div className="size-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <KeyRound className="size-6" />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Reset Password</h1>
            <p className="text-xs text-muted-foreground mt-1.5">
              Enter your registered email address to receive a secure, time-sensitive reset link.
            </p>
          </div>

          {error && (
            <div className="p-3 mb-5 rounded-lg border border-red-500/40 bg-red-950/30 text-red-300 text-xs flex items-center gap-2">
              <ShieldAlert className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {resetData ? (
            <div className="space-y-4 text-center">
              <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/20 text-emerald-300 text-xs text-left space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-emerald-400">
                  <CheckCircle2 className="size-4" /> Reset Link Ready (Valid 15 Mins)
                </div>
                <p className="text-zinc-300 text-[11px]">
                  A password reset link has been issued for <span className="font-mono text-white">{email}</span>. Click below to set your new password:
                </p>
                <div className="pt-2">
                  <Link href={resetData.resetUrl}>
                    <Button className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs h-9">
                      Proceed to Reset Password
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="pt-2">
                <Link href="/login" className="text-xs text-zinc-400 hover:text-white flex items-center justify-center gap-1">
                  <ArrowLeft className="size-3.5" /> Back to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-300 mb-1.5 block">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    required
                    className="bg-zinc-900 border-zinc-700 text-xs pl-9 h-10"
                    autoFocus
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs h-10 mt-2"
              >
                {loading ? "Generating Link..." : "Send Reset Link"}
              </Button>

              <div className="text-center pt-2">
                <Link
                  href="/login"
                  className="text-xs text-zinc-400 hover:text-white inline-flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="size-3.5" /> Return to Login
                </Link>
              </div>
            </form>
          )}
        </Card>
      </main>

      <AppFooter />
    </div>
  );
}
