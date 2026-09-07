"use client";

import * as React from "react";
import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { AppFooter } from "@/components/layout/app-footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TelemetryOverview, ScanTelemetryEvent } from "@/lib/admin-telemetry";
import {
  ShieldAlert,
  Activity,
  Globe2,
  Clock,
  ExternalLink,
  RefreshCw,
  Lock,
  Sparkles,
  Zap,
  TrendingUp,
  Server,
  Layers,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";

export default function AdminMonitoringPage() {
  const [pin, setPin] = React.useState("");
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [authError, setAuthError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [stats, setStats] = React.useState<TelemetryOverview | null>(null);

  // Check saved session PIN on load
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("kodand_admin_pin");
      if (saved) {
        fetchStats(saved);
      }
    }
  }, []);

  const fetchStats = async (authPin: string) => {
    setLoading(true);
    setAuthError(null);
    try {
      const res = await fetch(`/api/admin/telemetry?pin=${encodeURIComponent(authPin)}`);
      if (!res.ok) {
        throw new Error("Invalid Admin PIN. Access denied.");
      }
      const data = await res.json();
      setStats(data.stats);
      setIsAuthenticated(true);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("kodand_admin_pin", authPin);
      }
    } catch (err: any) {
      setAuthError(err.message || "Failed to authenticate.");
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;
    fetchStats(pin.trim());
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("kodand_admin_pin");
    }
    setIsAuthenticated(false);
    setPin("");
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <AppHeader />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full border border-emerald-500/30 bg-zinc-950/80 shadow-2xl backdrop-blur-xl p-6">
            <div className="text-center mb-6">
              <div className="size-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                <Lock className="size-6" />
              </div>
              <h1 className="text-xl font-bold text-white">Admin Control Center</h1>
              <p className="text-xs text-muted-foreground mt-1">
                Enter your secure administrator PIN to monitor live users, audit streams, and edge telemetry.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter Admin PIN (Default: kodand2026)"
                  className="bg-zinc-900 border-zinc-700 text-center text-sm font-mono tracking-widest h-11"
                  autoFocus
                />
              </div>

              {authError && (
                <div className="p-2.5 rounded-lg border border-red-500/40 bg-red-950/20 text-red-300 text-xs text-center flex items-center justify-center gap-1.5">
                  <ShieldAlert className="size-3.5" /> {authError}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || !pin.trim()}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs h-10"
              >
                {loading ? "Authenticating..." : "Unlock Dashboard"}
              </Button>

              <div className="text-[11px] text-zinc-500 text-center">
                Protected via Cloudflare Edge Authentication
              </div>
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

      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 md:py-10 w-full">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-8 border-b border-emerald-500/20">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] font-mono uppercase">
                Live Edge Telemetry
              </Badge>
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse" /> Live
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Platform User & Scan Telemetry
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const saved = sessionStorage.getItem("kodand_admin_pin");
                if (saved) fetchStats(saved);
              }}
              disabled={loading}
              className="border-zinc-700 text-xs h-8"
            >
              <RefreshCw className={`size-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleLogout}
              className="text-xs text-muted-foreground hover:text-rose-300 h-8"
            >
              Lock
            </Button>
          </div>
        </div>

        {stats && (
          <div className="space-y-8">
            {/* KPI Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border border-emerald-500/30 bg-zinc-950/70 p-4 rounded-xl">
                <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
                  <span>Total Scans</span>
                  <Activity className="size-4 text-emerald-400" />
                </div>
                <div className="text-2xl md:text-3xl font-extrabold text-white">
                  {stats.totalScans.toLocaleString()}
                </div>
                <div className="text-[11px] text-emerald-400/80 flex items-center gap-1 mt-1">
                  <TrendingUp className="size-3" /> Real-time edge aggregated
                </div>
              </Card>

              <Card className="border border-emerald-500/30 bg-zinc-950/70 p-4 rounded-xl">
                <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
                  <span>Unique Domains</span>
                  <Globe2 className="size-4 text-teal-400" />
                </div>
                <div className="text-2xl md:text-3xl font-extrabold text-white">
                  {stats.uniqueDomains.toLocaleString()}
                </div>
                <div className="text-[11px] text-zinc-400 mt-1">
                  Distinct websites scanned
                </div>
              </Card>

              <Card className="border border-emerald-500/30 bg-zinc-950/70 p-4 rounded-xl">
                <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
                  <span>Average Health Score</span>
                  <ShieldCheck className="size-4 text-amber-400" />
                </div>
                <div className="text-2xl md:text-3xl font-extrabold text-white">
                  {stats.averageScore} / 100
                </div>
                <div className="text-[11px] text-zinc-400 mt-1">
                  Platform-wide average
                </div>
              </Card>

              <Card className="border border-emerald-500/30 bg-zinc-950/70 p-4 rounded-xl">
                <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
                  <span>Edge Speed Avg</span>
                  <Zap className="size-4 text-emerald-400" />
                </div>
                <div className="text-2xl md:text-3xl font-extrabold text-white">
                  {stats.averageDurationMs} ms
                </div>
                <div className="text-[11px] text-emerald-400 mt-1">
                  Cloudflare Edge Workers
                </div>
              </Card>
            </div>

            {/* Country & Mode Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Traffic By Country */}
              <Card className="border border-zinc-800 bg-zinc-950/60 p-5 rounded-xl">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <Globe2 className="size-4 text-emerald-400" />
                  Traffic by Country (Cloudflare cf-ipcountry)
                </h3>
                <div className="space-y-2">
                  {Object.entries(stats.countryDistribution)
                    .sort(([, a], [, b]) => b - a)
                    .map(([country, count]) => {
                      const pct = Math.round((count / stats.totalScans) * 100);
                      return (
                        <div key={country} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-mono text-zinc-300 font-bold">
                              {country === "IN" ? "🇮🇳 India" : country === "US" ? "🇺🇸 United States" : country === "GB" ? "🇬🇧 United Kingdom" : country === "CA" ? "🇨🇦 Canada" : `🌐 ${country}`}
                            </span>
                            <span className="text-zinc-400">{count} scans ({pct}%)</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.max(pct, 5)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </Card>

              {/* Mode Breakdown */}
              <Card className="border border-zinc-800 bg-zinc-950/60 p-5 rounded-xl">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <Layers className="size-4 text-teal-400" />
                  Popular Scan Dimensions
                </h3>
                <div className="space-y-2">
                  {Object.entries(stats.modeDistribution)
                    .sort(([, a], [, b]) => b - a)
                    .map(([mode, count]) => {
                      const pct = Math.round((count / stats.totalScans) * 100);
                      return (
                        <div key={mode} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-mono capitalize text-zinc-300 font-bold">{mode} Audit</span>
                            <span className="text-zinc-400">{count} scans ({pct}%)</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                            <div className="h-full bg-teal-500 rounded-full" style={{ width: `${Math.max(pct, 5)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </Card>
            </div>

            {/* Live Scan Log Stream */}
            <Card className="border border-zinc-800 bg-zinc-950/60 p-5 rounded-xl">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Clock className="size-4 text-emerald-400" />
                Live User Scan Activity Stream ({stats.recentEvents.length} events)
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 font-mono">
                      <th className="pb-3">Target Domain</th>
                      <th className="pb-3">Mode</th>
                      <th className="pb-3">Score & Grade</th>
                      <th className="pb-3">Latency</th>
                      <th className="pb-3">Country</th>
                      <th className="pb-3 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900 font-mono">
                    {stats.recentEvents.map((evt) => (
                      <tr key={evt.id} className="hover:bg-zinc-900/30 transition-colors">
                        <td className="py-3 font-semibold text-white flex items-center gap-1.5">
                          <a
                            href={evt.url.startsWith("http") ? evt.url : `https://${evt.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-emerald-400 hover:underline flex items-center gap-1"
                          >
                            {evt.domain}
                            <ExternalLink className="size-3 text-zinc-500" />
                          </a>
                        </td>
                        <td className="py-3">
                          <Badge variant="outline" className="text-[10px] uppercase font-mono border-zinc-700">
                            {evt.mode}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <span className={`font-bold ${evt.score >= 80 ? "text-emerald-400" : evt.score >= 60 ? "text-amber-400" : "text-rose-400"}`}>
                            {evt.score}/100
                          </span>
                          <span className="text-zinc-500 ml-1">({evt.grade})</span>
                        </td>
                        <td className="py-3 text-zinc-400">
                          {evt.durationMs} ms
                        </td>
                        <td className="py-3">
                          <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px]">
                            {evt.country === "IN" ? "🇮🇳 IN" : evt.country === "US" ? "🇺🇸 US" : evt.country}
                          </span>
                        </td>
                        <td className="py-3 text-right text-zinc-500">
                          {new Date(evt.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </main>

      <AppFooter />
    </div>
  );
}
