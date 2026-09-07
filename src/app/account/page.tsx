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
  User,
  Crown,
  Building2,
  Globe,
  Sparkles,
  LogOut,
  Shield,
  Activity,
  ArrowRight,
  CheckCircle2,
  Lock,
  ShieldAlert,
  QrCode,
} from "lucide-react";

export default function AccountPage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  const [agencyName, setAgencyName] = React.useState("");
  const [agencyWeb, setAgencyWeb] = React.useState("");
  const [savedSettings, setSavedSettings] = React.useState(false);

  React.useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }

    if (typeof window !== "undefined") {
      const savedName = localStorage.getItem("kodand_agency_name");
      const savedUrl = localStorage.getItem("kodand_agency_web");
      if (savedName) setAgencyName(savedName);
      if (savedUrl) setAgencyWeb(savedUrl);
    }
  }, [user, loading, router]);

  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      localStorage.setItem("kodand_agency_name", agencyName.trim());
      localStorage.setItem("kodand_agency_web", agencyWeb.trim());
      setSavedSettings(true);
      setTimeout(() => setSavedSettings(false), 2500);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <AppHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-xs text-muted-foreground animate-pulse">Loading account profile...</div>
        </main>
        <AppFooter />
      </div>
    );
  }

  const scansPct = Math.min(Math.round((user.scansUsed / user.maxScans) * 100), 100);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <AppHeader />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-8 md:py-12 w-full space-y-8">
        {/* Profile Card */}
        <Card className="border border-emerald-500/30 bg-zinc-950/80 p-6 rounded-2xl shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="size-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold text-xl font-mono">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-white">{user.name}</h1>
                  <Badge className={`text-[10px] font-mono uppercase ${
                    user.tier === "agency"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : user.tier === "starter"
                      ? "bg-teal-500/20 text-teal-300 border-teal-500/40"
                      : "bg-zinc-800 text-zinc-400"
                  }`}>
                    {user.tier === "agency" ? "Agency Pro Plan" : user.tier === "starter" ? "Starter Plan" : "Free Explorer"}
                  </Badge>
                  {user.role === "admin" && (
                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px]">
                      Administrator
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">{user.email}</p>
                {user.company && (
                  <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                    <Building2 className="size-3 text-emerald-400" /> {user.company}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {user.role === "admin" && (
                <Button asChild size="sm" className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs h-9">
                  <Link href="/admin">
                    <Crown className="size-3.5 mr-1" /> Admin Dashboard
                  </Link>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="border-zinc-700 text-zinc-300 hover:text-rose-400 text-xs h-9"
              >
                <LogOut className="size-3.5 mr-1.5" /> Sign Out
              </Button>
            </div>
          </div>

          {/* Usage Quota Bar */}
          <div className="mt-6 pt-6 border-t border-zinc-900 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-400">Monthly Scan Credits Used</span>
              <span className="font-mono text-emerald-400 font-bold">
                {user.scansUsed} / {user.maxScans} scans ({scansPct}%)
              </span>
            </div>
            <div className="h-2 rounded-full bg-zinc-900 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(scansPct, 2)}%` }}
              />
            </div>
            {user.tier !== "agency" && (
              <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-zinc-900 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-white mb-0.5">
                    <span>🇮🇳</span> Instant UPI Upgrade (Starter ₹1,299 / Agency Pro ₹3,499)
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    Pay directly to verified UPI ID: <strong className="text-emerald-400 font-mono">atomicpixel0911-1@okhdfcbank</strong>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button asChild size="sm" className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs h-8">
                    <Link href="/pricing">
                      <QrCode className="size-3.5 mr-1" /> Pay with UPI
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Agency White-Label Branding Settings */}
        <Card className="border border-zinc-800 bg-zinc-950/60 p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="size-4 text-emerald-400" /> Agency White-Label Report Settings
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                These details will replace KODAND logos and headers on all PDF audit deliverables.
              </p>
            </div>
            {user.tier === "agency" ? (
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px]">
                Active on Agency Pro
              </Badge>
            ) : (
              <Badge className="bg-zinc-800 text-zinc-400 text-[10px]">
                Requires Agency Pro
              </Badge>
            )}
          </div>

          <form onSubmit={handleSaveBranding} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-300 block mb-1">Agency Name</label>
                <Input
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  placeholder="e.g. Apex Growth Digital"
                  className="bg-zinc-900 border-zinc-700 text-xs h-9"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-300 block mb-1">Agency Website</label>
                <Input
                  value={agencyWeb}
                  onChange={(e) => setAgencyWeb(e.target.value)}
                  placeholder="e.g. https://apexgrowth.agency"
                  className="bg-zinc-900 border-zinc-700 text-xs h-9"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              {savedSettings ? (
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="size-3.5" /> Branding saved successfully!
                </span>
              ) : (
                <span className="text-[11px] text-zinc-500">Auto-applies to your PDF exports.</span>
              )}

              <Button
                type="submit"
                size="sm"
                className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs h-8 px-4"
              >
                Save Branding
              </Button>
            </div>
          </form>
        </Card>

        {/* Security & Password Management Card */}
        <Card className="border border-zinc-800 bg-zinc-950/60 p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Shield className="size-4 text-emerald-400" /> Security & Password Management
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Update your account password or request a secure time-sensitive reset link.
              </p>
            </div>
          </div>

          <ChangePasswordForm />
        </Card>
      </main>

      <AppFooter />
    </div>
  );
}

function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match. Please re-enter.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to change password.");
      }

      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setSuccess(false), 3500);
    } catch (err: any) {
      setError(err.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handlePasswordSubmit} className="space-y-4 pt-2">
      {error && (
        <div className="p-3 rounded-lg border border-red-500/40 bg-red-950/30 text-red-300 text-xs flex items-center gap-2">
          <ShieldAlert className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 rounded-lg border border-emerald-500/40 bg-emerald-950/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>Password changed successfully. Your account is secured.</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="text-xs text-zinc-300 block mb-1">Current Password</label>
          <div className="relative">
            <Lock className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="bg-zinc-900 border-zinc-700 text-xs pl-8 h-9"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-zinc-300 block mb-1">New Password</label>
          <div className="relative">
            <Lock className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 6 characters"
              required
              className="bg-zinc-900 border-zinc-700 text-xs pl-8 h-9"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-zinc-300 block mb-1">Confirm New Password</label>
          <div className="relative">
            <Lock className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat password"
              required
              className="bg-zinc-900 border-zinc-700 text-xs pl-8 h-9"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <Link
          href="/forgot-password"
          className="text-[11px] text-zinc-500 hover:text-emerald-400 transition-colors"
        >
          Forgot your current password? Request a reset link →
        </Link>

        <Button
          type="submit"
          disabled={loading || !currentPassword || !newPassword || !confirmPassword}
          size="sm"
          className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs h-8 px-4"
        >
          {loading ? "Updating..." : "Update Password"}
        </Button>
      </div>
    </form>
  );
}
