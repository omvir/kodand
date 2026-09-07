"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ScanMode, ScanResult } from "@/lib/audit-types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Download,
  Loader2,
  Radar,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { downloadReportPdf } from "@/lib/pdf-report";
import {
  LiveMetrics,
  MODE_ACCENT,
  MODE_ICON,
  gradeBadgeClass,
  modeMeta,
  prettyHost,
  relativeTime,
  scoreColorClass,
  shortTime,
} from "./dashboard-types";
import { CountUp, ScoreGauge, SeverityBreakdown, scoreHex } from "./score-gauge";
import { allFindingItems, severityCounts } from "./findings-table";
import { ContentMetricsDashboard } from "./content-metrics-panel";
import { SecurityIntelDashboard } from "./security-intel-panel";
import {
  AccessibilityFindingsDashboard,
  FullScanTabsDashboard,
  PerformanceMetricsDashboard,
  SeoSignalsDashboard,
} from "./dimension-panels";
import { ActiveScanCard } from "./scan-progress";

export function CompletedScanCard({
  result,
  onReRun,
  index = 0,
  defaultOpen = false,
}: {
  result: ScanResult;
  onReRun: (mode: ScanMode) => void;
  index?: number;
  defaultOpen?: boolean;
}) {
  const accent = MODE_ACCENT[result.mode];
  const Icon = MODE_ICON[result.mode];
  const score = Math.round(result.digitalHealthScore);
  const allItems = React.useMemo(() => allFindingItems(result), [result]);
  const sevCounts = React.useMemo(() => severityCounts(allItems), [allItems]);
  const [expanded, setExpanded] = React.useState(defaultOpen);

  const dims: { label: string; score: number }[] = [];
  const content = result.content ?? result.grammar;
  if (content) dims.push({ label: "Cnt", score: content.score });
  if (result.security) dims.push({ label: "Sec", score: result.security.score });
  if (result.seo) dims.push({ label: "SEO", score: result.seo.score });
  if (result.performance) dims.push({ label: "Perf", score: result.performance.score });
  if (result.accessibility) dims.push({ label: "A11y", score: result.accessibility.score });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.3) }}
      whileHover={{ y: -2 }}
    >
      <Card className={`relative overflow-hidden border ${accent.border} bg-card/70 backdrop-blur kodand-card-pop`}>
        <div className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${accent.solid}`} />
        <CardContent className="p-4 pl-5">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`size-8 rounded-lg flex items-center justify-center border ${accent.border} ${accent.bg} ${accent.text}`}>
                <Icon className="size-4" />
              </div>
              <div className="min-w-0">
                <div className={`text-sm font-bold ${accent.text} truncate`}>{result.modeLabel}</div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
                  <Clock className="size-2.5" />
                  {shortTime(result.scannedAt)} · {relativeTime(result.scannedAt)}
                </div>
              </div>
            </div>
            <div className={`px-2 py-1 rounded-md border text-xs font-mono font-bold ${gradeBadgeClass(result.grade)}`}>
              {result.grade}
            </div>
          </div>

          <div className="flex items-center gap-3 mb-3">
            <ScoreGauge score={score} size={92} color={scoreHex(score)} />
            <div className="flex-1 min-w-0 space-y-2">
              <div>
                <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Findings</div>
                <div className="flex items-baseline gap-2">
                  <div className={`text-xl font-bold ${accent.text}`}>
                    <CountUp value={allItems.length} />
                  </div>
                  <SeverityBreakdown counts={sevCounts} />
                </div>
              </div>
              {dims.length > 1 && (
                <div className="grid grid-cols-5 gap-1">
                  {dims.map((d) => (
                    <div key={d.label} className="px-1 py-1 rounded border border-emerald-500/15 bg-emerald-500/5 text-center">
                      <div className="text-[9px] text-muted-foreground font-mono">{d.label}</div>
                      <div className={`text-xs font-bold ${scoreColorClass(Math.round(d.score))}`}>{Math.round(d.score)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {!expanded && result.topPriorities.length > 0 && (
            <div className="mb-3">
              <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1">Top priorities</div>
              <ul className="space-y-0.5">
                {result.topPriorities.slice(0, 3).map((p, i) => (
                  <li key={i} className="text-xs text-foreground/85 truncate flex items-start gap-1.5">
                    <ChevronRight className={`size-3 mt-0.5 flex-shrink-0 ${accent.text}`} />
                    <span className="truncate">{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="default"
              className="flex-1 h-8 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white"
              onClick={() => downloadReportPdf(result)}
            >
              <Download className="size-3.5 mr-1.5" /> PDF
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-8 border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/10"
              onClick={() => onReRun(result.mode)}
            >
              <RefreshCw className="size-3.5 mr-1.5" /> Re-run
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-muted-foreground hover:text-foreground"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
            >
              {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              <span className="ml-1 text-xs">{expanded ? "Hide" : "Details"}</span>
            </Button>
          </div>

          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="pt-3 mt-3 border-t border-emerald-500/15 space-y-3">
                  {result.mode === "content" && result.content && <ContentMetricsDashboard dim={result.content} />}
                  {result.mode === "security" && result.security && <SecurityIntelDashboard dim={result.security} />}
                  {result.mode === "seo" && result.seo && <SeoSignalsDashboard dim={result.seo} />}
                  {result.mode === "performance" && result.performance && (
                    <PerformanceMetricsDashboard dim={result.performance} />
                  )}
                  {result.mode === "accessibility" && result.accessibility && (
                    <AccessibilityFindingsDashboard dim={result.accessibility} />
                  )}
                  {result.mode === "full" && <FullScanTabsDashboard result={result} />}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function CompletedScansGrid({
  scans,
  onReRun,
  onClear,
}: {
  scans: ScanResult[];
  onReRun: (mode: ScanMode) => void;
  onClear: () => void;
}) {
  if (scans.length === 0) {
    return (
      <Card className="border-dashed border-emerald-500/20 bg-card/30">
        <CardContent className="p-8 text-center">
          <Radar className="size-8 mx-auto mb-3 text-emerald-400/50" />
          <p className="text-sm text-muted-foreground">
            No completed scans yet. Pick a mode on the left or click a status box above to start.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Completed scans stay here — accumulate them as you run more.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs text-emerald-300/80 font-mono uppercase tracking-wider">
          <CheckCircle2 className="size-3.5" />
          Completed scans · {scans.length}
        </div>
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-muted-foreground hover:text-rose-300 flex items-center gap-1"
        >
          <Trash2 className="size-3" /> Clear session
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 items-start">
        <AnimatePresence initial={false}>
          {scans.map((s, i) => (
            <CompletedScanCard key={s.id} result={s} onReRun={onReRun} index={i} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

export type HomeActiveScan = {
  mode: ScanMode;
  progress: number;
  stage: import("@/lib/audit-types").ScanStage | null;
  stageLabel: string;
  findingsCount: number;
  metrics: LiveMetrics;
};

export function FocusedScanView({
  viewMode,
  activeScan,
  focusedCompleted,
  completedScans,
  domain,
  scanning,
  onRun,
  onReRun,
  onDownload,
  onClearCompleted,
}: {
  viewMode: ScanMode;
  activeScan: HomeActiveScan | null;
  focusedCompleted: ScanResult | null;
  completedScans: ScanResult[];
  domain: string;
  scanning: boolean;
  onRun: (mode: ScanMode) => void;
  onReRun: (mode: ScanMode) => void;
  onDownload: (result: ScanResult) => void;
  onClearCompleted: () => void;
}) {
  const m = modeMeta(viewMode);
  const accent = MODE_ACCENT[viewMode];
  const Icon = MODE_ICON[viewMode];
  const isActiveForThisMode = activeScan && activeScan.mode === viewMode;

  return (
    <div className="space-y-4">
      <motion.div
        key={`focus-header-${viewMode}`}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className={`relative overflow-hidden rounded-2xl border-2 ${accent.border} bg-gradient-to-br ${accent.bg} via-card/60 to-card/40 backdrop-blur p-4 sm:p-5`}
      >
        <div className={`absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b ${accent.solid}`} />
        <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`size-12 sm:size-14 rounded-xl bg-gradient-to-br ${accent.solid} flex items-center justify-center shadow-lg ${accent.glow} flex-shrink-0`}>
              <Icon className="size-6 sm:size-7 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className={`text-lg sm:text-xl font-bold ${accent.text} leading-tight`}>
                  {m.label}
                </h2>
                {scanning && isActiveForThisMode && (
                  <Badge className={`border ${accent.border} ${accent.bg} ${accent.text}`} variant="outline">
                    <Loader2 className="size-3 mr-1 animate-spin" /> scanning
                  </Badge>
                )}
                {focusedCompleted && !isActiveForThisMode && (
                  <Badge className={`border ${gradeBadgeClass(focusedCompleted.grade)}`} variant="outline">
                    {focusedCompleted.grade} {Math.round(focusedCompleted.digitalHealthScore)}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">{m.blurb}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {scanning && isActiveForThisMode ? (
              <span className="text-xs text-muted-foreground font-mono">
                running… {Math.round(activeScan!.progress)}%
              </span>
            ) : focusedCompleted ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className={`border ${accent.border} ${accent.text} hover:bg-emerald-500/10`}
                  disabled={scanning}
                  onClick={() => onReRun(viewMode)}
                >
                  <RefreshCw className="size-3.5 mr-1.5" /> Re-run
                </Button>
                <Button
                  size="sm"
                  className={`bg-gradient-to-r ${accent.solid} hover:brightness-110 text-white`}
                  onClick={() => onDownload(focusedCompleted)}
                >
                  <Download className="size-3.5 mr-1.5" /> PDF
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                className={`bg-gradient-to-r ${accent.solid} hover:brightness-110 text-white`}
                disabled={scanning}
                onClick={() => onRun(viewMode)}
              >
                {MODE_ICON[viewMode] && React.createElement(MODE_ICON[viewMode], { className: "size-3.5 mr-1.5" })}
                Run {m.short} scan
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {isActiveForThisMode && activeScan && (
          <motion.div
            key={`active-${viewMode}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <ActiveScanCard activeScan={activeScan} accent={accent} />
          </motion.div>
        )}

        {!isActiveForThisMode && focusedCompleted && (
          <motion.div
            key={`completed-${viewMode}-${focusedCompleted.id}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <CompletedScanCard
              result={focusedCompleted}
              onReRun={onReRun}
              index={0}
              defaultOpen
            />
          </motion.div>
        )}

        {!isActiveForThisMode && !focusedCompleted && (
          <motion.div
            key={`empty-${viewMode}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <Card className={`border-dashed border-2 ${accent.border} bg-card/40`}>
              <CardContent className="p-8 sm:p-10 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className={`size-20 rounded-2xl bg-gradient-to-br ${accent.solid} flex items-center justify-center shadow-xl ${accent.glow}`}>
                      <Icon className="size-10 text-white" />
                    </div>
                    <div className="absolute -inset-1 rounded-2xl border-2 border-emerald-400/30 kodand-radar-ring opacity-60" />
                  </div>
                  <div>
                    <div className={`text-lg font-semibold ${accent.text}`}>
                      No {m.label} scan yet
                    </div>
                    <p className="text-sm text-muted-foreground max-w-md mt-1">
                      Run a {m.short} scan on{" "}
                      <span className="font-mono text-emerald-200">{prettyHost(domain)}</span> to see
                      its full data dashboard here. {m.blurb}
                    </p>
                  </div>
                  <Button
                    size="lg"
                    className={`bg-gradient-to-r ${accent.solid} hover:brightness-110 text-white shadow-lg ${accent.glow}`}
                    disabled={scanning}
                    onClick={() => onRun(viewMode)}
                  >
                    {MODE_ICON[viewMode] && React.createElement(MODE_ICON[viewMode], { className: "size-4 mr-2" })}
                    Run {m.label} scan
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
