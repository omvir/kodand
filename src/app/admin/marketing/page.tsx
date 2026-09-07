"use client";

import * as React from "react";
import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { AppFooter } from "@/components/layout/app-footer";
import { AdminMarketingPortal } from "@/components/admin/admin-marketing-portal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Lock, ShieldAlert, ArrowLeft, Users, Activity } from "lucide-react";

export default function AdminMarketingPage() {
  const [pin, setPin] = React.useState("");
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [authError, setAuthError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const savedPin = sessionStorage.getItem("kodand_admin_pin");
    if (savedPin) {
      setPin(savedPin);
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;

    setLoading(true);
    setAuthError(null);

    // Default admin pin check
    if (pin.trim() === "kodand2026") {
      setIsAuthenticated(true);
      sessionStorage.setItem("kodand_admin_pin", pin.trim());
      setLoading(false);
    } else {
      setAuthError("Invalid Administrator PIN.");
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <AppHeader />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full border border-amber-500/30 bg-zinc-950 p-6 rounded-2xl shadow-2xl">
            <div className="text-center mb-6">
              <div className="size-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-3 text-amber-400">
                <Lock className="size-5" />
              </div>
              <h1 className="text-xl font-black text-white">Marketing Command Access</h1>
              <p className="text-xs text-zinc-400 mt-1">
                Enter your administrator PIN to access tele-calling scripts, target personas, and competitor benchmarks.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter Admin PIN (Default: kodand2026)"
                className="bg-zinc-900 border-zinc-700 text-center text-sm font-mono tracking-widest h-11"
                autoFocus
              />

              {authError && (
                <div className="p-2.5 rounded-lg border border-red-500/40 bg-red-950/20 text-red-300 text-xs text-center flex items-center justify-center gap-1.5">
                  <ShieldAlert className="size-3.5" /> {authError}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || !pin.trim()}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs h-10"
              >
                {loading ? "Authenticating..." : "Unlock Marketing Portal"}
              </Button>
            </form>
          </Card>
        </main>
        <AppFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <AppHeader />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        {/* Top Breadcrumb & Link to Users */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="size-3.5" /> Back to Admin Monitoring
            </Link>
            <span className="text-zinc-600">/</span>
            <span className="text-xs text-amber-400 font-semibold">Marketing & Growth Command</span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 hover:text-white transition-colors"
            >
              <Users className="size-3.5" /> User Management
            </Link>
          </div>
        </div>

        {/* Render Marketing Portal */}
        <AdminMarketingPortal />
      </main>

      <AppFooter />
    </div>
  );
}
