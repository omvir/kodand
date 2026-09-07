"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ScanMode, ScanStage } from "@/lib/audit-types";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import {
  LiveMetrics,
  MODE_ICON,
  STAGE_ICON,
  modeMeta,
} from "./dashboard-types";

export function MiniRadar({ progress, accent }: { progress: number; accent: { hex: string } }) {
  const p = Math.max(0, Math.min(100, progress));
  const circumference = 2 * Math.PI * 49;
  return (
    <div className="relative size-28 sm:size-32 rounded-full flex-shrink-0">
      <svg className="absolute inset-0 size-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="49" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-950/50" />
        <motion.circle
          cx="50"
          cy="50"
          r="49"
          fill="none"
          stroke={accent.hex}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - p / 100) }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 4px ${accent.hex}88)` }}
        />
      </svg>
      <div className="absolute inset-2 rounded-full border border-emerald-500/15" />
      <div className="absolute inset-4 rounded-full border border-emerald-500/10" />
      <div className="absolute inset-6 rounded-full border border-emerald-500/10" />
      <div className="absolute inset-0 rounded-full border-2 kodand-radar-ring" style={{ borderColor: accent.hex }} />
      <div className="absolute inset-0 rounded-full border-2 kodand-radar-ring-2" style={{ borderColor: accent.hex }} />
      <div
        className="absolute inset-2 kodand-radar-sweep rounded-full"
        style={{
          background: `conic-gradient(from 0deg, transparent 0deg, ${accent.hex}33 35deg, ${accent.hex}88 60deg, transparent 90deg)`,
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="size-3 rounded-full kodand-fade-pulse"
          style={{ backgroundColor: accent.hex, boxShadow: `0 0 16px ${accent.hex}` }}
        />
      </div>
      <div className="absolute inset-0 flex items-center justify-center pt-10 sm:pt-12">
        <span className="text-xs font-mono text-emerald-200/80">{Math.round(progress)}%</span>
      </div>
    </div>
  );
}

export function MetricTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  accent: { text: string; border: string; bg: string };
}) {
  return (
    <div className={`px-2.5 py-2 rounded-lg border ${accent.border} ${accent.bg}`}>
      <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider truncate">
        {label}
      </div>
      <div className={`text-sm font-bold ${accent.text} truncate`}>{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground truncate">{hint}</div>}
    </div>
  );
}

export function LiveMetricsPanel({
  mode,
  metrics,
  accent,
}: {
  mode: ScanMode;
  metrics: LiveMetrics;
  accent: { text: string; border: string; bg: string };
}) {
  const dash = "—";
  const yesNo = (v: boolean | undefined) => (v === undefined ? dash : v ? "yes" : "no");
  const yesMissing = (v: boolean | undefined) => (v === undefined ? dash : v ? "yes" : "missing");

  let cols = "grid-cols-2 sm:grid-cols-4";
  let tiles: { label: string; value: React.ReactNode; hint?: string }[] = [];

  if (mode === "content") {
    tiles = [
      { label: "Words", value: metrics.wordCount?.toLocaleString() ?? dash },
      { label: "Reading level", value: metrics.readingLevel ?? dash },
      { label: "Tone", value: metrics.tone ?? dash },
      {
        label: "Top keywords",
        value: metrics.topKeywords?.length ? metrics.topKeywords.join(", ") : dash,
      },
    ];
  } else if (mode === "security") {
    tiles = [
      { label: "CVEs", value: metrics.cveCount ?? (metrics.whoisStatus || metrics.certStatus ? 0 : dash) },
      { label: "WHOIS", value: metrics.whoisStatus ?? "pending" },
      { label: "DNS records", value: metrics.dnsRecords ?? dash },
      { label: "TLS cert", value: metrics.certStatus ?? "pending" },
    ];
  } else if (mode === "seo") {
    tiles = [
      { label: "Title", value: yesMissing(metrics.hasTitle) },
      { label: "Description", value: yesMissing(metrics.hasDescription) },
      { label: "Canonical", value: yesNo(metrics.hasCanonical) },
      { label: "JSON-LD", value: yesNo(metrics.hasJsonLd) },
    ];
  } else if (mode === "performance") {
    cols = "grid-cols-2 sm:grid-cols-3";
    tiles = [
      { label: "Page weight", value: metrics.pageSizeKb ? `${metrics.pageSizeKb} KB` : dash },
      { label: "Scripts", value: metrics.scriptCount ?? dash },
      { label: "Lazy load", value: yesNo(metrics.lazyLoad) },
    ];
  } else if (mode === "accessibility") {
    cols = "grid-cols-3";
    tiles = [
      { label: "Alt issues", value: metrics.altIssues ?? dash },
      { label: "Label issues", value: metrics.labelIssues ?? dash },
      { label: "Heading issues", value: metrics.headingIssues ?? dash },
    ];
  } else {
    cols = "grid-cols-5";
    const ms = metrics.miniScores ?? {};
    tiles = [
      { label: "Content", value: ms.content ?? dash },
      { label: "Security", value: ms.security ?? dash },
      { label: "SEO", value: ms.seo ?? dash },
      { label: "Perf", value: ms.performance ?? dash },
      { label: "A11y", value: ms.accessibility ?? dash },
    ];
  }

  return (
    <div className={`grid ${cols} gap-2`}>
      {tiles.map((t) => (
        <MetricTile key={t.label} label={t.label} value={t.value} hint={t.hint} accent={accent} />
      ))}
    </div>
  );
}

export function ActiveScanCard({
  activeScan,
  accent,
}: {
  activeScan: {
    mode: ScanMode;
    progress: number;
    stageLabel: string;
    stage: ScanStage | null;
    findingsCount: number;
    metrics: LiveMetrics;
  };
  accent: { text: string; border: string; bg: string; ring: string; glow: string; solid: string; hex: string };
}) {
  const m = modeMeta(activeScan.mode);
  const Icon = MODE_ICON[activeScan.mode];
  const StageIcon = activeScan.stage ? STAGE_ICON[activeScan.stage] : Loader2;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`relative overflow-hidden border-2 ${accent.border} ${accent.bg} ${accent.glow} shadow-xl`}>
        <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent.solid}`} />
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`size-10 rounded-xl flex items-center justify-center border ${accent.border} ${accent.bg} ${accent.text} kodand-step-active`}>
                <Icon className="size-5" />
              </div>
              <div className="min-w-0">
                <div className={`text-base sm:text-lg font-bold ${accent.text} flex items-center gap-2`}>
                  {m.label}
                  <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    scanning…
                  </span>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <StageIcon className="size-3.5" />
                  {activeScan.stageLabel || "Working…"}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Findings</div>
              <motion.div
                key={activeScan.findingsCount}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
                className={`text-2xl font-bold ${accent.text}`}
              >
                {activeScan.findingsCount}
              </motion.div>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <div className="relative h-3 rounded-full bg-emerald-950/50 overflow-hidden border border-emerald-500/20">
                <div
                  className={`absolute inset-y-0 left-0 bg-gradient-to-r ${accent.solid} kodand-bar-shimmer transition-[width] duration-500 ease-out`}
                  style={{ width: `${Math.max(2, activeScan.progress)}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-xs text-muted-foreground font-mono">{Math.round(activeScan.progress)}%</span>
                <span className="text-xs text-muted-foreground font-mono">~{m.estSeconds}s</span>
              </div>
            </div>
            <MiniRadar progress={activeScan.progress} accent={accent} />
          </div>

          <LiveMetricsPanel mode={activeScan.mode} metrics={activeScan.metrics} accent={accent} />
        </CardContent>
      </Card>
    </motion.div>
  );
}
