"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { KodandLogo } from "@/components/kodand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  BarChart3,
  Search,
  TrendingUp,
  Loader2,
  Link2,
  Globe,
  ExternalLink,
  Shield,
  PieChart,
} from "lucide-react";
import Link from "next/link";
import { AppFooter } from "@/components/layout/app-footer";

const QUALITY_COLORS: Record<string, string> = {
  high: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  medium: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  low: "bg-rose-500/20 text-rose-300 border-rose-500/40",
};

export default function BacklinksPage() {
  const [url, setUrl] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);

  const analyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    let normalizedUrl = url.trim();
    if (!normalizedUrl) return;
    if (!/^https?:\/\//i.test(normalizedUrl)) normalizedUrl = "https://" + normalizedUrl;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/backlinks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalizedUrl }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); } else { setResult(data.backlinks); }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-30 border-b border-emerald-500/15 bg-background/85 backdrop-blur">
        <div className="mx-auto max-w-[1600px] px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 text-emerald-300 hover:text-emerald-200 text-sm">
              <ArrowLeft className="size-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <div className="w-px h-6 bg-emerald-500/20" />
            <KodandLogo size="md" />
          </div>
          <div className="flex items-center gap-2">
            <Link href="/keywords">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-emerald-300">
                <Search className="size-3.5 mr-1" /> Keywords
              </Button>
            </Link>
            <Link href="/marketing">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-emerald-300">
                <BarChart3 className="size-3.5 mr-1" /> Marketing
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center justify-center gap-3 mb-2">
              <Link2 className="size-7 text-teal-400" />
              Backlink Checker
            </h1>
            <p className="text-muted-foreground text-sm max-w-xl mx-auto">
              Analyze your backlink profile, anchor text distribution, and get actionable link-building recommendations.
            </p>
          </div>

          <form onSubmit={analyze} className="max-w-2xl mx-auto flex gap-2 mb-8">
            <div className="relative flex-1">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-teal-400" />
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Enter domain (e.g. example.com)" className="pl-10 h-12 bg-card/80 border-teal-500/30 focus-visible:border-teal-400 focus-visible:ring-teal-400/30" />
            </div>
            <Button type="submit" disabled={loading} className="h-12 px-6 bg-gradient-to-r from-teal-600 to-emerald-500 text-white border border-teal-400/40">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
              <span className="ml-2 hidden sm:inline">Analyze</span>
            </Button>
          </form>

          {error && <div className="max-w-2xl mx-auto mb-6 p-3 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-200 text-sm">{error}</div>}

          {loading && (
            <div className="text-center py-12">
              <Loader2 className="size-8 animate-spin text-teal-400 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Analyzing backlink profile…</p>
            </div>
          )}

          {result && (
            <div className="space-y-6">
              {/* Overview cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-card/60 border-teal-500/20">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-teal-300">{result.estimatedBacklinks?.toLocaleString() || "—"}</div>
                    <div className="text-xs text-muted-foreground font-mono uppercase mt-1">Est. Backlinks</div>
                  </CardContent>
                </Card>
                <Card className="bg-card/60 border-teal-500/20">
                  <CardContent className="p-4 text-center">
                    <Badge className={`text-sm ${QUALITY_COLORS[result.qualityScore] || "bg-gray-500/20 text-gray-300"}`}>
                      {result.qualityScore?.toUpperCase() || "—"}
                    </Badge>
                    <div className="text-xs text-muted-foreground font-mono uppercase mt-2">Link Quality</div>
                  </CardContent>
                </Card>
                <Card className="bg-card/60 border-teal-500/20">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-teal-300">{result.topReferringDomains?.length || 0}</div>
                    <div className="text-xs text-muted-foreground font-mono uppercase mt-1">Referring Types</div>
                  </CardContent>
                </Card>
              </div>

              {/* Anchor text distribution */}
              {result.anchorTextDistribution && (
                <Card className="bg-card/60 border-teal-500/20">
                  <CardContent className="p-5">
                    <h2 className="text-sm font-bold text-teal-300 flex items-center gap-2 mb-4">
                      <PieChart className="size-4" /> Anchor Text Distribution
                    </h2>
                    <div className="space-y-2">
                      {result.anchorTextDistribution.map((item: any, i: number) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-28 capitalize">{item.type}</span>
                          <div className="flex-1 h-5 bg-teal-950/50 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-teal-600 to-emerald-500 rounded-full transition-all" style={{ width: `${item.percentage}%` }} />
                          </div>
                          <span className="text-xs font-mono text-teal-200 w-10 text-right">{item.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Referring domain types */}
              {result.topReferringDomains && (
                <Card className="bg-card/60 border-teal-500/20">
                  <CardContent className="p-5">
                    <h2 className="text-sm font-bold text-teal-300 flex items-center gap-2 mb-3">
                      <ExternalLink className="size-4" /> Top Referring Domain Types
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {result.topReferringDomains.map((d: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-[11px] border-teal-500/25 text-teal-200">{d}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recommendations */}
              {result.recommendations && (
                <Card className="bg-card/60 border-emerald-500/20">
                  <CardContent className="p-5">
                    <h2 className="text-sm font-bold text-emerald-300 flex items-center gap-2 mb-3">
                      <Shield className="size-4" /> Link Building Recommendations
                    </h2>
                    <div className="space-y-2">
                      {result.recommendations.map((rec: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg border border-emerald-500/10 bg-emerald-500/5">
                          <TrendingUp className="size-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{rec}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </motion.div>
      </main>
      <AppFooter />
    </div>
  );
}
