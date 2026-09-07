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
import {
  UserPlus,
  Mail,
  KeyRound,
  User,
  Building2,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const { register, user } = useAuth();

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [company, setCompany] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (user) {
      router.push("/account");
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) return;

    setLoading(true);
    setError(null);
    try {
      await register(name.trim(), email.trim(), password, company.trim());
      router.push("/account");
    } catch (err: any) {
      setError(err.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <AppHeader />

      <main className="flex-1 flex items-center justify-center p-4 py-12">
        <Card className="max-w-md w-full border border-emerald-500/30 bg-zinc-950/80 shadow-2xl backdrop-blur-xl p-6 md:p-8">
          <div className="text-center mb-6">
            <div className="size-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <UserPlus className="size-6" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Create Free Account</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Start auditing websites, tracking scores, and generating reports.
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
              <label className="text-xs text-zinc-300 font-medium">Full Name</label>
              <div className="relative">
                <User className="size-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Rahul Sharma"
                  required
                  className="pl-9 bg-zinc-900 border-zinc-700 text-xs h-10"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-300 font-medium">Email Address</label>
              <div className="relative">
                <Mail className="size-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rahul@agency.in"
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
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                  className="pl-9 bg-zinc-900 border-zinc-700 text-xs h-10 font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-300 font-medium">Company or Agency (Optional)</label>
              <div className="relative">
                <Building2 className="size-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Apex Growth Digital"
                  className="pl-9 bg-zinc-900 border-zinc-700 text-xs h-10"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs h-10 shadow-lg shadow-emerald-500/20 mt-2"
            >
              {loading ? "Creating Account..." : "Create Account"}
              <ArrowRight className="size-4 ml-1.5" />
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-zinc-800 text-center">
            <p className="text-xs text-zinc-400">
              Already have an account?{" "}
              <Link href="/login" className="text-emerald-400 font-semibold hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </Card>
      </main>

      <AppFooter />
    </div>
  );
}
