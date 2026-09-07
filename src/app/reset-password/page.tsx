"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { AppFooter } from "@/components/layout/app-footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, CheckCircle2, ShieldAlert, KeyRound } from "lucide-react";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Missing or invalid reset token. Please request a new link.");
      return;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password.");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2500);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-md w-full border border-emerald-500/30 bg-zinc-950/80 p-6 md:p-8 rounded-2xl shadow-2xl backdrop-blur-xl">
      <div className="text-center mb-6">
        <div className="size-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-3">
          <KeyRound className="size-6" />
        </div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Set New Password</h1>
        <p className="text-xs text-muted-foreground mt-1.5">
          Enter your new password below. It must be at least 6 characters long.
        </p>
      </div>

      {error && (
        <div className="p-3 mb-5 rounded-lg border border-red-500/40 bg-red-950/30 text-red-300 text-xs flex items-center gap-2">
          <ShieldAlert className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success ? (
        <div className="p-5 text-center space-y-3">
          <div className="size-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="size-6" />
          </div>
          <h3 className="text-base font-bold text-white">Password Reset Complete!</h3>
          <p className="text-xs text-zinc-400">
            Your password has been securely updated. Redirecting you to the Sign In page...
          </p>
          <div className="pt-2">
            <Link href="/login">
              <Button className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs h-9">
                Sign In Now
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-zinc-300 mb-1.5 block">
              New Password
            </label>
            <div className="relative">
              <Lock className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                className="bg-zinc-900 border-zinc-700 text-xs pl-9 h-10"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-300 mb-1.5 block">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                required
                className="bg-zinc-900 border-zinc-700 text-xs pl-9 h-10"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading || !newPassword || !confirmPassword}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs h-10 mt-2"
          >
            {loading ? "Updating Password..." : "Save New Password"}
          </Button>

          <div className="text-center pt-2">
            <Link href="/login" className="text-xs text-zinc-400 hover:text-white transition-colors">
              Cancel & Return to Login
            </Link>
          </div>
        </form>
      )}
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <AppHeader />
      <main className="flex-1 flex items-center justify-center p-4 py-12">
        <React.Suspense fallback={<div className="text-xs text-zinc-400">Loading token...</div>}>
          <ResetPasswordContent />
        </React.Suspense>
      </main>
      <AppFooter />
    </div>
  );
}
