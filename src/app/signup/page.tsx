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

          {/* Google Sign Up Button */}
          <div className="space-y-4 mb-4">
            <a href="/api/auth/google" className="block w-full">
              <Button
                type="button"
                variant="outline"
                className="w-full bg-zinc-900/90 hover:bg-zinc-800 text-white border-zinc-700 font-semibold text-xs h-10 flex items-center justify-center gap-2.5 transition-all shadow-sm"
              >
                <GoogleIcon className="size-4" />
                <span>Sign up with Google</span>
              </Button>
            </a>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-zinc-800 w-full" />
              <span className="bg-zinc-950 px-2.5 text-[10px] uppercase font-mono text-zinc-500 tracking-wider">
                Or sign up with email
              </span>
              <div className="border-t border-zinc-800 w-full" />
            </div>
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

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" {...props}>
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}
