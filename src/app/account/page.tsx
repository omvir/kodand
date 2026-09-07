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
            {user.tier === "free" && (
              <div className="mt-3 flex items-center justify-between p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs">
                <span className="text-zinc-300">Upgrade to unlock 1,000 scans & white-label reports.</span>
                <Button asChild size="sm" className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs h-7">
                  <Link href="/pricing">Upgrade Plan</Link>
                </Button>
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
      </main>

      <AppFooter />
    </div>
  );
}
