"use client";

import * as React from "react";
import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { AppFooter } from "@/components/layout/app-footer";
import { UpgradeModal } from "@/components/dashboard/upgrade-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScanResult } from "@/lib/audit-types";
import {
  Swords,
  Globe,
  Loader2,
  Trophy,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Zap,
  FileSearch,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

export default function ComparePage() {
  const [domainA, setDomainA] = React.useState("stripe.com");
  const [domainB, setDomainB] = React.useState("paypal.com");
  const [scanning, setScanning] = React.useState(false);
  const [resultA, setResultA] = React.useState<ScanResult | null>(null);
  const [resultB, setResultB] = React.useState<ScanResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [upgradeOpen, setUpgradeOpen] = React.useState(false);

  const handleRunCompare = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!domainA.trim() || !domainB.trim()) return;

    setScanning(true);
    setError(null);

    try {
      // Execute scans in parallel for both domains
      const [resA, resB] = await Promise.all([
        fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: domainA.trim(), mode: "full" }),
        }),
        fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: domainB.trim(), mode: "full" }),
        }),
      ]);

      if (!resA.ok || !resB.ok) {
        throw new Error("Failed to scan one or both websites. Please check domains.");
      }

      const [dataA, dataB] = await Promise.all([resA.json(), resB.json()]);
      setResultA(dataA);
      setResultB(dataB);
    } catch (err: any) {
      setError(err?.message || "An error occurred during comparison.");
    } finally {
      setScanning(false);
    }
  };

  const scoreA = resultA ? Math.round(resultA.digitalHealthScore) : 0;
  const scoreB = resultB ? Math.round(resultB.digitalHealthScore) : 0;
  const winner = scoreA > scoreB ? "A" : scoreB > scoreA ? "B" : "Tie";

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <AppHeader />

      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 md:py-12 w-full">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-3">
            <Swords className="size-3.5" /> Agency Pro Feature
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-2">
            Side-by-Side <span className="text-emerald-400">Competitor Audit</span>
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Pitch clients by demonstrating exactly where their website outperforms or lags behind their top competitor in security, speed, and SEO.
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleRunCompare} className="max-w-3xl mx-auto mb-10">
          <div className="p-4 rounded-2xl border border-emerald-500/30 bg-zinc-950/80 shadow-xl grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
            <div className="md:col-span-2">
              <label className="text-[10px] text-emerald-400 font-mono uppercase tracking-wider block mb-1">
                Website A (Client)
              </label>
              <div className="relative">
                <Globe className="size-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input
                  value={domainA}
                  onChange={(e) => setDomainA(e.target.value)}
                  placeholder="clientdomain.com"
                  className="pl-8 text-xs h-9 bg-zinc-900 border-zinc-700"
                />
              </div>
            </div>

            <div className="flex justify-center items-center">
              <div className="size-8 rounded-full border border-zinc-800 bg-zinc-900 flex items-center justify-center text-xs font-bold text-zinc-400">
                VS
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="text-[10px] text-amber-400 font-mono uppercase tracking-wider block mb-1">
                Website B (Competitor)
              </label>
              <div className="relative">
                <Globe className="size-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input
                  value={domainB}
                  onChange={(e) => setDomainB(e.target.value)}
                  placeholder="competitordomain.com"
                  className="pl-8 text-xs h-9 bg-zinc-900 border-zinc-700"
                />
              </div>
            </div>

            <div className="md:col-span-5 pt-2">
              <Button
                type="submit"
                disabled={scanning}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs h-10 shadow-lg shadow-emerald-500/20"
              >
                {scanning ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" /> Scanning Both Sites via Edge...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Swords className="size-4" /> Run Competitor Comparison
                  </span>
                )}
              </Button>
            </div>
          </div>
        </form>

        {error && (
          <div className="max-w-3xl mx-auto mb-8 p-3 rounded-lg border border-red-500/40 bg-red-950/20 text-red-300 text-xs text-center">
            {error}
          </div>
        )}

        {/* Results Section */}
        {resultA && resultB && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Winner Banner */}
            <div className="p-4 rounded-xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/40 via-zinc-950 to-zinc-950 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
                  <Trophy className="size-5" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider font-mono">
                    Audit Winner
                  </div>
                  <div className="text-base font-bold text-white">
                    {winner === "A" ? (
                      <span className="text-emerald-400">{domainA} outperforms {domainB} by {scoreA - scoreB} points!</span>
                    ) : winner === "B" ? (
                      <span className="text-amber-400">{domainB} leads {domainA} by {scoreB - scoreA} points!</span>
                    ) : (
                      <span>It&apos;s an exact tie ({scoreA}/100)!</span>
                    )}
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setUpgradeOpen(true)}
                size="sm"
                className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs border border-zinc-700"
              >
                <Sparkles className="size-3.5 mr-1.5 text-emerald-400" />
                Export Comparison Deck (Pro)
              </Button>
            </div>

            {/* Score Cards Side-by-Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Site A Card */}
              <Card className="border border-emerald-500/40 bg-zinc-950/80 rounded-2xl overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] mb-1">
                        Client Target
                      </Badge>
                      <h3 className="text-xl font-bold text-white truncate max-w-[260px]">{domainA}</h3>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-extrabold text-emerald-400">{scoreA}</div>
                      <div className="text-[10px] text-zinc-400 font-mono">Grade {resultA.grade}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                    <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
                      <span className="text-zinc-400 block text-[10px]">Security Score:</span>
                      <span className="font-bold text-white">{resultA.security?.score ?? "—"}/100</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
                      <span className="text-zinc-400 block text-[10px]">SEO Score:</span>
                      <span className="font-bold text-white">{resultA.seo?.score ?? "—"}/100</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
                      <span className="text-zinc-400 block text-[10px]">Performance Score:</span>
                      <span className="font-bold text-white">{resultA.performance?.score ?? "—"}/100</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
                      <span className="text-zinc-400 block text-[10px]">Load Time:</span>
                      <span className="font-bold text-white">{resultA.meta.fetchMs} ms</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Site B Card */}
              <Card className="border border-amber-500/40 bg-zinc-950/80 rounded-2xl overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] mb-1">
                        Competitor
                      </Badge>
                      <h3 className="text-xl font-bold text-white truncate max-w-[260px]">{domainB}</h3>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-extrabold text-amber-400">{scoreB}</div>
                      <div className="text-[10px] text-zinc-400 font-mono">Grade {resultB.grade}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                    <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
                      <span className="text-zinc-400 block text-[10px]">Security Score:</span>
                      <span className="font-bold text-white">{resultB.security?.score ?? "—"}/100</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
                      <span className="text-zinc-400 block text-[10px]">SEO Score:</span>
                      <span className="font-bold text-white">{resultB.seo?.score ?? "—"}/100</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
                      <span className="text-zinc-400 block text-[10px]">Performance Score:</span>
                      <span className="font-bold text-white">{resultB.performance?.score ?? "—"}/100</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
                      <span className="text-zinc-400 block text-[10px]">Load Time:</span>
                      <span className="font-bold text-white">{resultB.meta.fetchMs} ms</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Comparison Matrix Table */}
            <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-950/60">
              <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <FileSearch className="size-4 text-emerald-400" />
                Technical & Security Differential Breakdown
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 font-mono">
                      <th className="pb-3">Audit Dimension</th>
                      <th className="pb-3 text-emerald-400">{domainA}</th>
                      <th className="pb-3 text-amber-400">{domainB}</th>
                      <th className="pb-3 text-right">Advantage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    <tr>
                      <td className="py-2.5 font-semibold text-zinc-300">HTTPS Encryption</td>
                      <td className="py-2.5">{resultA.security?.https ? "✓ Active" : "✗ Missing"}</td>
                      <td className="py-2.5">{resultB.security?.https ? "✓ Active" : "✗ Missing"}</td>
                      <td className="py-2.5 text-right font-mono text-zinc-400">
                        {resultA.security?.https === resultB.security?.https ? "Tied" : resultA.security?.https ? domainA : domainB}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-semibold text-zinc-300">HSTS Header</td>
                      <td className="py-2.5">{resultA.security?.headers.hsts ? "✓ Enabled" : "✗ Missing"}</td>
                      <td className="py-2.5">{resultB.security?.headers.hsts ? "✓ Enabled" : "✗ Missing"}</td>
                      <td className="py-2.5 text-right font-mono text-zinc-400">
                        {resultA.security?.headers.hsts === resultB.security?.headers.hsts ? "Tied" : resultA.security?.headers.hsts ? domainA : domainB}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-semibold text-zinc-300">Content Security Policy (CSP)</td>
                      <td className="py-2.5">{resultA.security?.headers.csp ? "✓ Active" : "✗ Missing"}</td>
                      <td className="py-2.5">{resultB.security?.headers.csp ? "✓ Active" : "✗ Missing"}</td>
                      <td className="py-2.5 text-right font-mono text-zinc-400">
                        {resultA.security?.headers.csp === resultB.security?.headers.csp ? "Tied" : resultA.security?.headers.csp ? domainA : domainB}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-semibold text-zinc-300">Schema.org Structured Data</td>
                      <td className="py-2.5">{resultA.seo?.schemaTypes?.length ? `${resultA.seo.schemaTypes.length} Types` : "None"}</td>
                      <td className="py-2.5">{resultB.seo?.schemaTypes?.length ? `${resultB.seo.schemaTypes.length} Types` : "None"}</td>
                      <td className="py-2.5 text-right font-mono text-zinc-400">
                        {(resultA.seo?.schemaTypes?.length ?? 0) > (resultB.seo?.schemaTypes?.length ?? 0) ? domainA : (resultB.seo?.schemaTypes?.length ?? 0) > (resultA.seo?.schemaTypes?.length ?? 0) ? domainB : "Tied"}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-semibold text-zinc-300">Edge Fetch Latency</td>
                      <td className="py-2.5">{resultA.meta.fetchMs} ms</td>
                      <td className="py-2.5">{resultB.meta.fetchMs} ms</td>
                      <td className="py-2.5 text-right font-mono text-emerald-400 font-bold">
                        {(resultA.meta.fetchMs ?? 0) < (resultB.meta.fetchMs ?? 0) ? domainA : domainB}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      <AppFooter />

      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        defaultTier="agency"
        sourceFeature="Competitor Comparison Export"
      />
    </div>
  );
}
