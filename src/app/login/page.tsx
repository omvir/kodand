"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/use-auth";
import { AppHeader } from "@/components/layout/app-header";
import { AppFooter } from "@/components/layout/app-footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Lock,
  Mail,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  Building2,
  Crown,
  User,
  AlertCircle,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login, user } = useAuth();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (user) {
      if (user.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/account");
      }
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setLoading(true);
    setError(null);
    try {
      const loggedIn = await login(email.trim(), password);
      if (loggedIn.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/account");
      }
    } catch (err: any) {
      setError(err.message || "Failed to sign in.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <AppHeader />

      <main className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="max-w-md w-full space-y-6">
          <Card className="border border-emerald-500/30 bg-zinc-950/80 shadow-2xl backdrop-blur-xl p-6 md:p-8">
            <div className="text-center mb-6">
              <div className="size-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                <Lock className="size-6" />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Sign In to KODAND</h1>
              <p className="text-xs text-muted-foreground mt-1">
                Access your audit reports, white-label settings, and scan quotas.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg border border-red-500/40 bg-red-950/20 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs text-zinc-300 font-medium">Email Address</label>
                <div className="relative">
                  <Mail className="size-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    className="pl-9 bg-zinc-900 border-zinc-700 text-xs h-10"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-300 font-medium">Password</label>
                <div className="relative">
                  <KeyRound className="size-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="pl-9 bg-zinc-900 border-zinc-700 text-xs h-10 font-mono"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs h-10 shadow-lg shadow-emerald-500/20"
              >
                {loading ? "Signing in..." : "Sign In"}
                <ArrowRight className="size-4 ml-1.5" />
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-zinc-800 text-center">
              <p className="text-xs text-zinc-400">
                Don&apos;t have an account?{" "}
                <Link href="/signup" className="text-emerald-400 font-semibold hover:underline">
                  Sign up for free
                </Link>
              </p>
            </div>
          </Card>

          {/* 1-Click Quick Demo Login Card */}
          <Card className="border border-zinc-800 bg-zinc-950/60 p-4">
            <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-emerald-400" /> Fast Demo Logins (Click to autofill)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin("admin@kodand.com", "admin123")}
                className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 text-left transition-all"
              >
                <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                  <Crown className="size-3" /> Admin
                </div>
                <div className="text-[10px] text-zinc-400 truncate">admin@kodand.com</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin("rahul@apexmedia.in", "agency123")}
                className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 text-left transition-all"
              >
                <div className="flex items-center gap-1 text-[11px] font-bold text-teal-300">
                  <Building2 className="size-3" /> Agency Pro
                </div>
                <div className="text-[10px] text-zinc-400 truncate">rahul@apexmedia.in</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin("sarah@growthdev.com", "starter123")}
                className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 text-left transition-all"
              >
                <div className="flex items-center gap-1 text-[11px] font-bold text-zinc-200">
                  <User className="size-3" /> Starter
                </div>
                <div className="text-[10px] text-zinc-400 truncate">sarah@growthdev.com</div>
              </button>
            </div>
          </Card>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
