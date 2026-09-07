"use client";

/* =============================================================================
 * KODAND — 360° Audit Dashboard (two-state: lock-target hero + live dashboard).
 * Consumes the existing /api/scan SSE endpoint (unchanged). Persists results
 * to localStorage via appendHistoryFromResult + notifyHistoryChanged.
 * ============================================================================= */

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { KodandLogo, ImageLogo } from "@/components/kodand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { downloadReportPdf } from "@/lib/pdf-report";
import {
  appendHistoryFromResult,
  notifyHistoryChanged,
  useScanHistory,
  useTargetDomain,
} from "@/lib/scan-history";
import {
  AccessibilityDimension,
  AccessibilityFinding,
  CertificateInfo,
  CertTransparencyEntry,
  ContentDimension,
  ContentFinding,
  CveFinding,
  DnsRecords,
  PerformanceDimension,
  PerformanceFinding,
  ProgressEvent,
  ScanMode,
  ScanResult,
  ScanStage,
  SCAN_MODES,
  SecurityDimension,
  SecurityFinding,
  SeoDimension,
  SeoFinding,
  Severity,
  WhoisRecord,
} from "@/lib/audit-types";
import {
  Accessibility as AccessibilityIcon,
  Activity,
  AlertTriangle,
  Bug,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Cpu,
  Database,
  Download,
  ExternalLink,
  Fingerprint,
  Gauge,
  Globe,
  History,
  ListTree,
  Loader2,
  Lock,
  Network,
  Radar,
  RefreshCw,
  Search,
  Server,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  XCircle,
  Zap,
} from "lucide-react";

/* =============================================================================
 * Static lookups
 * ============================================================================= */

const STAGE_ICON: Record<ScanStage, React.ElementType> = {
  init: Fingerprint,
  fetch: Globe,
  parse: ListTree,
  content: Sparkles,
  grammar: Sparkles,
  "security-headers": ShieldCheck,
  "security-content": ShieldAlert,
  "security-cve": Bug,
  "security-whois": Database,
  "security-dns": Network,
  "security-cert": ShieldCheck,
  "seo-meta": Search,
  "seo-content": Search,
  "performance-metrics": Gauge,
  "performance-analysis": Gauge,
  "accessibility-analysis": AccessibilityIcon,
  score: Activity,
  finalize: Sparkles,
};

const MODE_ICON: Record<ScanMode, React.ElementType> = {
  content: Sparkles,
  security: ShieldAlert,
  seo: Search,
  performance: Gauge,
  accessibility: AccessibilityIcon,
  full: Radar,
};

const MODE_ACCENT: Record<
  ScanMode,
  { bg: string; border: string; text: string; ring: string; glow: string; solid: string; hex: string }
> = {
  content: { bg: "bg-emerald-500/10", border: "border-emerald-500/40", text: "text-emerald-300", ring: "ring-emerald-400/50", glow: "shadow-emerald-500/30", solid: "from-emerald-600 to-emerald-500", hex: "#5c7d66" },
  security: { bg: "bg-rose-500/10", border: "border-rose-500/40", text: "text-rose-300", ring: "ring-rose-400/50", glow: "shadow-rose-500/30", solid: "from-rose-600 to-red-500", hex: "#a65a4e" },
  seo: { bg: "bg-sky-500/10", border: "border-sky-500/40", text: "text-sky-300", ring: "ring-sky-400/50", glow: "shadow-sky-500/30", solid: "from-sky-600 to-cyan-500", hex: "#5a7a9e" },
  performance: { bg: "bg-amber-500/10", border: "border-amber-500/40", text: "text-amber-300", ring: "ring-amber-400/50", glow: "shadow-amber-500/30", solid: "from-amber-600 to-yellow-500", hex: "#b08850" },
  accessibility: { bg: "bg-violet-500/10", border: "border-violet-500/40", text: "text-violet-300", ring: "ring-violet-400/50", glow: "shadow-violet-500/30", solid: "from-violet-600 to-purple-500", hex: "#8a6fa0" },
  full: { bg: "bg-teal-500/10", border: "border-teal-500/40", text: "text-teal-300", ring: "ring-teal-400/50", glow: "shadow-teal-500/30", solid: "from-teal-600 to-emerald-500", hex: "#4a8a76" },
};

function scoreColorClass(s: number): string {
  if (s >= 85) return "text-emerald-300";
  if (s >= 70) return "text-emerald-400";
  if (s >= 50) return "text-yellow-300";
  if (s >= 30) return "text-amber-400";
  return "text-red-400";
}

function gradeBadgeClass(grade: string): string {
  switch (grade) {
    case "A":
      return "bg-emerald-500/20 text-emerald-200 border-emerald-400/50";
    case "B":
      return "bg-emerald-500/15 text-emerald-200 border-emerald-400/40";
    case "C":
      return "bg-yellow-500/15 text-yellow-200 border-yellow-400/40";
    case "D":
      return "bg-amber-500/15 text-amber-200 border-amber-400/40";
    default:
      return "bg-red-500/15 text-red-200 border-red-400/50";
  }
}

function modeMeta(mode: ScanMode) {
  return SCAN_MODES.find((m) => m.id === mode)!;
}
function modeLabel(mode: ScanMode) {
  return modeMeta(mode).label;
}
function modeShort(mode: ScanMode) {
  return modeMeta(mode).short;
}

/* Normalize a raw user input (e.g. "example.com" or "https://x.y") to a
 * fully-qualified https URL, or null if invalid. */
function normalizeUrl(input: string): string | null {
  let v = input.trim();
  if (!v) return null;
  if (!/^https?:\/\//i.test(v)) v = "https://" + v;
  try {
    const u = new URL(v);
    if (!u.hostname || !u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

function prettyHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0];
  }
}

function relativeTime(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 60_000) return `${Math.max(1, Math.round(diff / 1000))}s ago`;
    if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
    return `${Math.round(diff / 86_400_000)}d ago`;
  } catch {
    return "";
  }
}

function shortTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

/** Count all findings across every dimension present on the result. */
function countFindings(result: ScanResult): number {
  let n = 0;
  const content = result.content ?? result.grammar;
  if (content) n += content.findings.length;
  if (result.security) {
    n += result.security.findings.length;
    if (result.security.intel) n += result.security.intel.cveFindings.length;
  }
  if (result.seo) n += result.seo.findings.length;
  if (result.performance) n += result.performance.findings.length;
  if (result.accessibility) n += result.accessibility.findings.length;
  return n;
}

/* =============================================================================
 * Live metric state — extracted heuristically from the SSE log/stage stream.
 * ============================================================================= */

interface LiveMetrics {
  progress: number;
  stage: ScanStage | null;
  stageLabel: string;
  findingsCount: number;
  // content
  wordCount?: number;
  readingLevel?: string;
  tone?: string;
  topKeywords?: string[];
  // security
  cveCount?: number;
  whoisStatus?: "pending" | "ok" | "error";
  dnsRecords?: number;
  certStatus?: "pending" | "ok" | "expiring" | "expired" | "self-signed";
  // seo
  hasTitle?: boolean;
  hasDescription?: boolean;
  hasCanonical?: boolean;
  hasJsonLd?: boolean;
  // performance
  pageSizeKb?: number;
  scriptCount?: number;
  lazyLoad?: boolean;
  // accessibility
  altIssues?: number;
  labelIssues?: number;
  headingIssues?: number;
  // full — mini dimension scores
  miniScores?: { content?: number; security?: number; seo?: number; performance?: number; accessibility?: number };
}

const INITIAL_METRICS: LiveMetrics = {
  progress: 0,
  stage: null,
  stageLabel: "",
  findingsCount: 0,
};

const FINDING_TRIGGERS = [
  "found", "detected", "issue", "missing", "vulnerability", "cve",
  "alert", "warning", "fail", "weak", "outdated", "expired",
  "exposed", "leak", "insecure", "violat", "broken", "low", "high", "critical",
];

function isFindingLine(text: string): boolean {
  const t = text.toLowerCase();
  return FINDING_TRIGGERS.some((k) => t.includes(k));
}

/** Heuristic: extract metric values from a stage/log event for the given mode. */
function foldEvent(mode: ScanMode, prev: LiveMetrics, evt: ProgressEvent): LiveMetrics {
  if (evt.type === "heartbeat") return prev;

  const next: LiveMetrics = { ...prev };

  if (evt.type === "stage") {
    next.progress = Math.max(prev.progress, evt.progress);
    next.stage = evt.stage;
    next.stageLabel = evt.label;
    if (evt.detail) {
      foldText(mode, next, evt.detail);
    }
    return next;
  }

  if (evt.type === "log") {
    foldText(mode, next, evt.message);
    if (isFindingLine(evt.message)) {
      next.findingsCount = prev.findingsCount + 1;
    }
    return next;
  }

  if (evt.type === "error") {
    next.findingsCount = prev.findingsCount + 1;
    return next;
  }

  return prev;
}

function foldText(mode: ScanMode, m: LiveMetrics, text: string) {
  const t = text.toLowerCase();

  // shared / parse
  const wordsMatch = text.match(/([\d.,]+)\s*(?:words|word)\s+visible/i) || text.match(/([\d.,]+)\s+words\b/i);
  if (wordsMatch) {
    const n = Number(wordsMatch[1].replace(/[,.]/g, ""));
    if (!Number.isNaN(n)) m.wordCount = n;
  }

  // content
  if (mode === "content" || mode === "full") {
    const rl = text.match(/reading\s*level[^:]*:\s*([A-Za-z ]+)/i);
    if (rl) m.readingLevel = rl[1].trim();
    const tone = text.match(/\btone\b[^:]*:\s*(formal|neutral|casual)/i);
    if (tone) m.tone = tone[1].toLowerCase();
    const kw = text.match(/top\s+keywords[^:]*:\s*(.+)/i);
    if (kw) {
      const list = kw[1].split(/[,;|]/).map((s) => s.trim().replace(/^["'`#0-9)\s]+/, "")).filter(Boolean);
      m.topKeywords = list.slice(0, 3);
    }
  }

  // security
  if (mode === "security" || mode === "full") {
    if (t.includes("whois")) {
      if (t.includes("fail") || t.includes("error") || t.includes("no record")) m.whoisStatus = "error";
      else if (t.includes("ok") || t.includes("fetched") || t.includes("registrar") || t.includes("status")) m.whoisStatus = "ok";
    }
    if (t.includes("cve")) {
      const c = text.match(/(\d+)\s*(?:\bcve\b|vulnerabilit)/i);
      if (c) m.cveCount = Number(c[1]);
    }
    if (t.includes("dns")) {
      const d = text.match(/(\d+)\s*dns/i);
      if (d) m.dnsRecords = Number(d[1]);
    }
    if (t.includes("cert") || t.includes("tls") || t.includes("certificate")) {
      if (t.includes("expired")) m.certStatus = "expired";
      else if (t.includes("self-signed") || t.includes("self signed")) m.certStatus = "self-signed";
      else if (t.includes("expiring") || t.includes("soon")) m.certStatus = "expiring";
      else if (t.includes("valid") || t.includes("issuer") || t.includes("subject")) m.certStatus = "ok";
    }
  }

  // seo
  if (mode === "seo" || mode === "full") {
    if (/\btitle\b/i.test(text) && t.length < 200) {
      if (t.includes("title:") || t.includes("title =") || t.includes("has title")) m.hasTitle = !t.includes("no ") && !t.includes("missing");
    }
    if (t.includes("description")) m.hasDescription = !t.includes("no ") && !t.includes("missing");
    if (t.includes("canonical")) m.hasCanonical = !t.includes("no ") && !t.includes("missing") && !t.includes("not set");
    if (t.includes("json-ld") || t.includes("structured data")) m.hasJsonLd = !t.includes("no ") && !t.includes("missing") && !t.includes("not found");
  }

  // performance
  if (mode === "performance" || mode === "full") {
    const kb = text.match(/([\d.,]+)\s*(?:kb|kib)/i);
    if (kb && (t.includes("page") || t.includes("weight") || t.includes("size"))) {
      m.pageSizeKb = Number(kb[1].replace(/[,.]/g, ""));
    }
    const sc = text.match(/(\d+)\s*(?:external\s+)?scripts?\b/i);
    if (sc) m.scriptCount = Number(sc[1]);
    if (t.includes("lazy")) m.lazyLoad = !t.includes("no ") && !t.includes("missing") && !t.includes("not ");
  }

  // accessibility
  if (mode === "accessibility" || mode === "full") {
    const alt = text.match(/(\d+)\s*alt/i);
    if (alt && (t.includes("alt text") || t.includes("alt attribute") || t.includes("missing alt"))) m.altIssues = Number(alt[1]);
    const label = text.match(/(\d+)\s*label/i);
    if (label) m.labelIssues = Number(label[1]);
    const heading = text.match(/(\d+)\s*heading/i);
    if (heading) m.headingIssues = Number(heading[1]);
  }

  // full — mini scores
  if (mode === "full") {
    const cScore = text.match(/content\s*score[^:]*:\s*(\d+)/i);
    if (cScore) (m.miniScores ??= {}).content = Number(cScore[1]);
    const sScore = text.match(/security\s*score[^:]*:\s*(\d+)/i);
    if (sScore) (m.miniScores ??= {}).security = Number(sScore[1]);
    const seoScore = text.match(/seo\s*score[^:]*:\s*(\d+)/i);
    if (seoScore) (m.miniScores ??= {}).seo = Number(seoScore[1]);
    const pScore = text.match(/performance\s*score[^:]*:\s*(\d+)/i);
    if (pScore) (m.miniScores ??= {}).performance = Number(pScore[1]);
    const aScore = text.match(/accessibility\s*score[^:]*:\s*(\d+)/i);
    if (aScore) (m.miniScores ??= {}).accessibility = Number(aScore[1]);
  }
}

/* =============================================================================
 * Activity stream log line type
 * ============================================================================= */

interface LogEntry {
  id: string;
  ts: number;
  kind: "stage" | "log" | "error";
  text: string;
  stage?: ScanStage;
}

let logCounter = 0;
function nextLogId() {
  logCounter += 1;
  return `log-${Date.now().toString(36)}-${logCounter}`;
}

/* =============================================================================
 * Lock target screen (State A)
 * ============================================================================= */

function LockTargetScreen({
  onSubmit,
  recent,
  onReRun,
}: {
  onSubmit: (url: string) => void;
  recent: { id: string; url: string; mode: ScanMode; grade: string; score: number; scannedAt: string }[];
  onReRun: (entry: { url: string; mode: ScanMode }) => void;
}) {
  const [value, setValue] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const submit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const norm = normalizeUrl(value);
    if (!norm) {
      setError("That doesn't look like a valid URL. Try something like example.com");
      return;
    }
    setError(null);
    onSubmit(norm);
  };

  return (
    <div className="relative flex-1 flex flex-col">
      {/* Floating ambient blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="kodand-float absolute -top-20 -left-20 w-72 h-72 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="kodand-float-slow absolute top-1/3 right-0 w-80 h-80 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="kodand-float absolute bottom-0 left-1/3 w-72 h-72 rounded-full bg-emerald-400/10 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-5xl px-4 sm:px-6 py-10 sm:py-14 flex flex-col items-center text-center flex-1">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <KodandLogo size="lg" className="justify-center mb-6" />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-sm sm:text-base text-emerald-200/80 font-mono uppercase tracking-[0.18em] mb-2"
        >
          360° anonymous website audit
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.18 }}
          className="text-muted-foreground max-w-2xl mb-8 text-sm sm:text-base"
        >
          Content · Security · SEO · Performance · Accessibility — six independent
          scanners, one target. Pick a target once; every scan reuses it.
        </motion.p>

        <motion.form
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.25 }}
          onSubmit={submit}
          className="w-full max-w-2xl flex flex-col sm:flex-row gap-2 items-stretch"
        >
          <div className="relative flex-1">
            <Target className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-emerald-400" />
            <Input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Enter your website URL to begin (e.g. example.com)"
              className="pl-10 h-12 text-base bg-card/80 border-emerald-500/30 focus-visible:border-emerald-400 focus-visible:ring-emerald-400/30"
              aria-label="Website URL"
              inputMode="url"
              autoCapitalize="none"
              spellCheck={false}
            />
          </div>
          <Button
            type="submit"
            className="h-12 px-6 text-base bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white border border-emerald-400/40 shadow-lg shadow-emerald-500/25"
          >
            <Lock className="size-4 mr-2" /> Lock Target
          </Button>
        </motion.form>

        {error && (
          <Alert className="mt-3 max-w-2xl border-rose-500/40 bg-rose-500/10 text-rose-200 text-left">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <p className="mt-4 text-xs text-muted-foreground flex items-center justify-center gap-1.5 flex-wrap">
          <Lock className="size-3.5 text-emerald-400" />
          You only enter your domain once. All subsequent scans reuse it.
        </p>

        {/* Mode preview cards */}
        <div className="mt-10 grid grid-cols-2 lg:grid-cols-3 gap-3 w-full">
          {SCAN_MODES.map((m, i) => {
            const Icon = MODE_ICON[m.id];
            const a = MODE_ACCENT[m.id];
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.05 }}
              >
                <Card className={`kodand-mode-card h-full bg-card/60 backdrop-blur border ${a.border} hover:${a.bg} overflow-hidden`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`size-9 rounded-lg flex items-center justify-center ${a.bg} ${a.text} border ${a.border}`}>
                        <Icon className="size-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-bold ${a.text}`}>{m.short}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">~{m.estSeconds}s</div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-snug line-clamp-3">
                      {m.blurb}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Recent scans quick re-run */}
        {recent.length > 0 && (
          <div className="mt-10 w-full">
            <div className="flex items-center justify-center gap-2 mb-3 text-xs text-emerald-300/80 font-mono uppercase tracking-wider">
              <History className="size-3.5" /> Recent scans — click to re-run with locked target
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {recent.slice(0, 6).map((e) => {
                const a = MODE_ACCENT[e.mode];
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => onReRun({ url: e.url, mode: e.mode })}
                    className="kodand-chip text-xs px-3 py-1.5 rounded-full border border-emerald-500/20 bg-card/60 hover:bg-emerald-500/10 flex items-center gap-2"
                  >
                    <span className={`font-mono px-1.5 py-0.5 rounded border text-[10px] ${gradeBadgeClass(e.grade)}`}>
                      {e.grade} {e.score}
                    </span>
                    <span className={`${a.text} font-semibold`}>{modeShort(e.mode)}</span>
                    <span className="text-muted-foreground truncate max-w-[160px]">
                      {prettyHost(e.url)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* =============================================================================
 * Dashboard header (sticky)
 * ============================================================================= */

function DashboardHeader({
  domain,
  onChange,
  scanning,
  onToggleActivity,
  activityOpen,
}: {
  domain: string;
  onChange: () => void;
  scanning: boolean;
  onToggleActivity: () => void;
  activityOpen: boolean;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-emerald-500/15 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/65">
      <div className="mx-auto max-w-[1600px] px-3 sm:px-4 h-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <KodandLogo size="md" />
        </div>

        {/* Target chip */}
        <div className="hidden md:flex items-center gap-2 flex-1 max-w-md ml-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/5 text-sm">
            <Target className="size-3.5 text-emerald-400 flex-shrink-0" />
            <span className="text-muted-foreground text-xs font-mono uppercase tracking-wider">Target</span>
            <span className="font-semibold text-foreground truncate max-w-[260px]">
              {prettyHost(domain)}
            </span>
            <button
              type="button"
              onClick={onChange}
              className="ml-1 text-xs text-emerald-300 hover:text-emerald-200 underline underline-offset-2"
            >
              Change
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {scanning && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-mono">
              <Loader2 className="size-3.5 animate-spin" /> scanning
            </div>
          )}
          <button
            type="button"
            onClick={onToggleActivity}
            className="lg:hidden p-2 rounded-md border border-emerald-500/20 text-emerald-200 hover:bg-emerald-500/10"
            aria-label="Toggle activity stream"
          >
            <Activity className={`size-4 ${activityOpen ? "text-emerald-300" : ""}`} />
          </button>
        </div>
      </div>

      {/* Mobile target row */}
      <div className="md:hidden px-3 pb-2 flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/5 text-sm flex-1 min-w-0">
          <Target className="size-3.5 text-emerald-400 flex-shrink-0" />
          <span className="text-muted-foreground text-[10px] font-mono uppercase tracking-wider">Target</span>
          <span className="font-semibold text-foreground truncate">{prettyHost(domain)}</span>
          <button
            type="button"
            onClick={onChange}
            className="ml-auto text-xs text-emerald-300 hover:text-emerald-200 underline underline-offset-2"
          >
            Change
          </button>
        </div>
      </div>
    </header>
  );
}

/* =============================================================================
 * Mode status boxes (the "all scans in boxes and blinking" row)
 * ============================================================================= */

type ModeStatus = "idle" | "running" | "complete";

function ModeStatusBox({
  mode,
  status,
  score,
  grade,
  disabled,
  onClick,
}: {
  mode: ScanMode;
  status: ModeStatus;
  score?: number;
  grade?: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  const m = modeMeta(mode);
  const Icon = MODE_ICON[mode];
  const a = MODE_ACCENT[mode];

  return (
    <TooltipProvider delayDuration={250}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            aria-pressed={status === "running"}
            className={[
              "kodand-mode-card relative w-full text-left p-3 rounded-xl border transition-colors overflow-hidden",
              "disabled:opacity-60 disabled:cursor-not-allowed",
              status === "running"
                ? `${a.border} ${a.bg} kodand-step-active shadow-lg ${a.glow}`
                : status === "complete"
                ? `border-emerald-500/40 bg-emerald-500/5`
                : "border-emerald-500/10 bg-card/40 hover:bg-emerald-500/5 hover:border-emerald-400/30",
            ].join(" ")}
          >
            {/* running glow stripe */}
            {status === "running" && (
              <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${a.solid} kodand-bar-shimmer`} />
            )}

            <div className="flex items-center gap-2">
              <div
                className={[
                  "size-9 rounded-lg flex items-center justify-center border flex-shrink-0",
                  status === "running"
                    ? `${a.border} ${a.bg} ${a.text}`
                    : status === "complete"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-emerald-500/15 bg-emerald-500/5 text-muted-foreground",
                ].join(" ")}
              >
                {status === "complete" ? (
                  <CheckCircle2 className="size-5" />
                ) : status === "running" ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <Icon className="size-5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className={[
                    "text-sm font-bold truncate",
                    status === "running" ? a.text : status === "complete" ? "text-emerald-200" : "text-foreground",
                  ].join(" ")}
                >
                  {m.short}
                </div>
                <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
                  {status === "running"
                    ? "scanning…"
                    : status === "complete"
                    ? `done · ${shortTime(new Date().toISOString())}`
                    : "idle"}
                </div>
              </div>
              {status === "complete" && typeof score === "number" && grade && (
                <div className={`px-1.5 py-0.5 rounded border text-[10px] font-mono ${gradeBadgeClass(grade)}`}>
                  {grade} {score}
                </div>
              )}
            </div>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {status === "running"
            ? `${m.label} is scanning…`
            : status === "complete"
            ? `${m.label} · ${grade} ${score}/100 — click to re-run`
            : `Start ${m.label}`}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ModeStatusBar({
  currentMode,
  completedByMode,
  disabled,
  onPick,
}: {
  currentMode: ScanMode | null;
  completedByMode: Partial<Record<ScanMode, { score: number; grade: string }>>;
  disabled: boolean;
  onPick: (mode: ScanMode) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
      {SCAN_MODES.map((m) => {
        const status: ModeStatus =
          currentMode === m.id ? "running" : completedByMode[m.id] ? "complete" : "idle";
        const done = completedByMode[m.id];
        return (
          <ModeStatusBox
            key={m.id}
            mode={m.id}
            status={status}
            score={done?.score}
            grade={done?.grade}
            disabled={disabled && status !== "running"}
            onClick={() => onPick(m.id)}
          />
        );
      })}
    </div>
  );
}

/* =============================================================================
 * Mini radar visualizer (used in the active scan card)
 * ============================================================================= */

function MiniRadar({ progress, accent }: { progress: number; accent: { hex: string } }) {
  const p = Math.max(0, Math.min(100, progress));
  const circumference = 2 * Math.PI * 49;
  return (
    <div className="relative size-28 sm:size-32 rounded-full flex-shrink-0">
      {/* progress ring (outermost) */}
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
      {/* inner decorative rings */}
      <div className="absolute inset-2 rounded-full border border-emerald-500/15" />
      <div className="absolute inset-4 rounded-full border border-emerald-500/10" />
      <div className="absolute inset-6 rounded-full border border-emerald-500/10" />
      {/* pulse rings */}
      <div className="absolute inset-0 rounded-full border-2 kodand-radar-ring" style={{ borderColor: accent.hex }} />
      <div className="absolute inset-0 rounded-full border-2 kodand-radar-ring-2" style={{ borderColor: accent.hex }} />
      {/* sweep */}
      <div
        className="absolute inset-2 kodand-radar-sweep rounded-full"
        style={{
          background: `conic-gradient(from 0deg, transparent 0deg, ${accent.hex}33 35deg, ${accent.hex}88 60deg, transparent 90deg)`,
        }}
      />
      {/* center dot */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="size-3 rounded-full kodand-fade-pulse"
          style={{ backgroundColor: accent.hex, boxShadow: `0 0 16px ${accent.hex}` }}
        />
      </div>
      {/* progress text */}
      <div className="absolute inset-0 flex items-center justify-center pt-10 sm:pt-12">
        <span className="text-xs font-mono text-emerald-200/80">{Math.round(progress)}%</span>
      </div>
    </div>
  );
}

/* =============================================================================
 * Active scan card (the big one)
 * ============================================================================= */

function MetricTile({
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

function LiveMetricsPanel({
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
    // full
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

function ActiveScanCard({
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
        {/* top accent stripe */}
        <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent.solid}`} />
        <CardContent className="p-4 sm:p-5">
          {/* header */}
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

            {/* findings counter */}
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

          {/* progress bar + radar */}
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

          {/* live metrics */}
          <LiveMetricsPanel mode={activeScan.mode} metrics={activeScan.metrics} accent={accent} />
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* =============================================================================
 * Completed scan card + grid (sticky)
 * ============================================================================= */

/* =============================================================================
 * Rich dashboard helpers — finding cards, score gauge, intel cards,
 * dimension dashboards, and the new expandable CompletedScanCard.
 * ============================================================================= */

const SEV_ORDER: Severity[] = ["critical", "high", "medium", "low", "info"];

function severityStyle(sev: Severity) {
  switch (sev) {
    case "critical":
      return { border: "border-red-500/40", pill: "bg-red-500/20 text-red-200 border-red-500/40", text: "text-red-300", dot: "bg-red-500" };
    case "high":
      return { border: "border-rose-500/40", pill: "bg-rose-500/20 text-rose-200 border-rose-500/40", text: "text-rose-300", dot: "bg-rose-500" };
    case "medium":
      return { border: "border-amber-500/40", pill: "bg-amber-500/20 text-amber-200 border-amber-500/40", text: "text-amber-300", dot: "bg-amber-500" };
    case "low":
      return { border: "border-sky-500/40", pill: "bg-sky-500/20 text-sky-200 border-sky-500/40", text: "text-sky-300", dot: "bg-sky-500" };
    default:
      return { border: "border-emerald-500/30", pill: "bg-emerald-500/15 text-emerald-200 border-emerald-500/30", text: "text-emerald-300", dot: "bg-emerald-500" };
  }
}

function scoreHex(s: number): string {
  if (s >= 85) return "#34d399";
  if (s >= 70) return "#10b981";
  if (s >= 50) return "#facc15";
  if (s >= 30) return "#f59e0b";
  return "#ef4444";
}

interface FindingItem {
  id: string;
  severity: Severity;
  title: string;
  category?: string;
  detail?: string;
  evidence?: string;
  fix?: string;
}

function contentItem(f: ContentFinding): FindingItem {
  return { id: f.id, severity: f.severity, title: f.excerpt, category: f.type, detail: f.explanation, fix: f.suggestion };
}
function securityItem(f: SecurityFinding): FindingItem {
  return { id: f.id, severity: f.severity, title: f.title, category: f.category, detail: f.detail, evidence: f.evidence, fix: f.fix };
}
function seoItem(f: SeoFinding): FindingItem {
  return { id: f.id, severity: f.severity, title: f.title, category: f.category, detail: f.detail, evidence: f.evidence, fix: f.fix };
}
function perfItem(f: PerformanceFinding): FindingItem {
  return { id: f.id, severity: f.severity, title: f.title, category: f.category, detail: f.detail, evidence: f.evidence, fix: f.fix };
}
function a11yItem(f: AccessibilityFinding): FindingItem {
  return { id: f.id, severity: f.severity, title: f.title, category: f.category, detail: f.detail, evidence: f.evidence, fix: f.fix };
}
function cveItem(c: CveFinding): FindingItem {
  return {
    id: c.id,
    severity: c.severity,
    title: `${c.cveId} · ${c.product}${c.version ? ` ${c.version}` : ""}`,
    category: "cve",
    detail: c.description,
    fix: `Patch or upgrade ${c.product}${c.version ? ` ${c.version}` : ""} to a non-vulnerable release. See NVD: https://nvd.nist.gov/vuln/detail/${c.cveId}`,
  };
}

function allFindingItems(r: ScanResult): FindingItem[] {
  const items: FindingItem[] = [];
  const c = r.content ?? r.grammar;
  if (c) c.findings.forEach((f) => items.push(contentItem(f)));
  if (r.security) {
    r.security.findings.forEach((f) => items.push(securityItem(f)));
    if (r.security.intel) r.security.intel.cveFindings.forEach((c2) => items.push(cveItem(c2)));
  }
  if (r.seo) r.seo.findings.forEach((f) => items.push(seoItem(f)));
  if (r.performance) r.performance.findings.forEach((f) => items.push(perfItem(f)));
  if (r.accessibility) r.accessibility.findings.forEach((f) => items.push(a11yItem(f)));
  return items;
}

function severityCounts(items: FindingItem[]) {
  const c = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const f of items) c[f.severity]++;
  return c;
}

/* ----- CountUp: animated number counter ----- */
function CountUp({ value, duration = 800, className }: { value: number; duration?: number; className?: string }) {
  const [display, setDisplay] = React.useState(0);
  React.useEffect(() => {
    let raf = 0;
    let start: number | null = null;
    const tick = (t: number) => {
      if (start === null) start = t;
      const pct = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - pct, 3);
      setDisplay(Math.round(value * eased));
      if (pct < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <span className={className}>{display}</span>;
}

/* ----- ScoreGauge: 270° circular SVG arc (animated, colored by score) ----- */
function ScoreGauge({
  score,
  size = 92,
  color = "#10b981",
  suffix = "/ 100",
}: {
  score: number;
  size?: number;
  color?: string;
  suffix?: string;
}) {
  const r = 38;
  const cx = 50;
  const cy = 50;
  const polar = (a: number) => {
    const rad = (a * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };
  const sp = polar(135);
  const ep = polar(135 + 270);
  const arc = `M ${sp.x} ${sp.y} A ${r} ${r} 0 1 1 ${ep.x} ${ep.y}`;
  const circumference = 2 * Math.PI * r * (270 / 360);
  const dashLen = (Math.max(0, Math.min(100, score)) / 100) * circumference;
  const [display, setDisplay] = React.useState(0);
  React.useEffect(() => {
    let raf = 0;
    let t0: number | null = null;
    const tick = (t: number) => {
      if (t0 === null) t0 = t;
      const pct = Math.min(1, (t - t0) / 800);
      const eased = 1 - Math.pow(1 - pct, 3);
      setDisplay(Math.round(score * eased));
      if (pct < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);
  return (
    <motion.svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className="flex-shrink-0"
      initial={{ scale: 0.85, opacity: 0.4 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <path d={arc} fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" className="text-emerald-950/40" />
      <motion.path
        d={arc}
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
        initial={{ strokeDasharray: `0 ${circumference}` }}
        animate={{ strokeDasharray: `${dashLen} ${circumference}` }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        style={{ filter: `drop-shadow(0 0 6px ${color}66)` }}
      />
      <text x="50" y="48" textAnchor="middle" dominantBaseline="central" fill={color} style={{ font: "800 22px ui-sans-serif, system-ui" }}>
        {display}
      </text>
      <text x="50" y="68" textAnchor="middle" fill="currentColor" style={{ font: "500 7px ui-sans-serif, system-ui", opacity: 0.7 }}>
        {suffix}
      </text>
    </motion.svg>
  );
}

/* ----- SeverityBreakdown: colored dots for severity counts ----- */
function SeverityBreakdown({
  counts,
}: {
  counts: { critical: number; high: number; medium: number; low: number; info: number };
}) {
  const items: [Severity, number][] = [
    ["critical", counts.critical],
    ["high", counts.high],
    ["medium", counts.medium],
    ["low", counts.low],
    ["info", counts.info],
  ];
  const visible = items.filter(([, n]) => n > 0);
  if (visible.length === 0) {
    return <span className="text-[10px] text-emerald-300 font-mono">no findings</span>;
  }
  return (
    <div className="flex items-center gap-2 text-[10px] font-mono">
      {visible.map(([sev, n]) => {
        const s = severityStyle(sev);
        return (
          <span key={sev} className="flex items-center gap-1">
            <span className={`size-1.5 rounded-full ${s.dot}`} />
            <span className={s.text}>{n}</span>
          </span>
        );
      })}
    </div>
  );
}

/* ----- KeywordBarChart: horizontal bars of top keywords (gold for #1) ----- */
function KeywordBarChart({ keywords }: { keywords: { word: string; count: number; density: number }[] }) {
  if (keywords.length === 0) return null;
  const max = keywords[0].density || 1;
  return (
    <div className="space-y-1.5">
      {keywords.map((kw, i) => (
        <div key={kw.word + i} className="flex items-center gap-2 text-xs">
          <div className="w-20 truncate font-mono text-muted-foreground" title={kw.word}>
            {kw.word}
          </div>
          <div className="flex-1 h-3 rounded bg-emerald-950/40 overflow-hidden border border-emerald-500/10">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(8, (kw.density / max) * 100)}%` }}
              transition={{ duration: 0.6, delay: i * 0.04, ease: "easeOut" }}
              className={`h-full rounded ${i === 0 ? "bg-gradient-to-r from-amber-500 to-yellow-400" : "bg-gradient-to-r from-emerald-600 to-emerald-400"} kodand-bar-shimmer`}
            />
          </div>
          <div className="w-14 text-right font-mono text-[10px] text-muted-foreground">
            <span className="text-foreground font-bold">{kw.count}</span>
            <span> · {kw.density.toFixed(1)}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ----- FindingCard + FindingsList: expandable cards with inline SOLUTION ----- */
function FindingCard({ item, defaultOpen = false }: { item: FindingItem; defaultOpen?: boolean }) {
  const [open, setOpen] = React.useState(defaultOpen);
  const sev = severityStyle(item.severity);
  const fixText = item.fix?.trim();
  return (
    <div className={`rounded-lg border ${sev.border} bg-card/40 overflow-hidden`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left p-2.5 flex items-center gap-2 hover:bg-emerald-500/5 transition-colors"
      >
        <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border flex-shrink-0 ${sev.pill}`}>
          {item.severity}
        </span>
        {item.category && (
          <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider flex-shrink-0 hidden sm:inline">
            {item.category}
          </span>
        )}
        <span className="flex-1 text-xs font-semibold text-foreground truncate">{item.title}</span>
        {open ? (
          <ChevronUp className="size-3.5 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown className="size-3.5 text-muted-foreground flex-shrink-0" />
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="p-2.5 pt-0 space-y-2">
              {item.detail && <p className="text-xs text-foreground/80 leading-relaxed">{item.detail}</p>}
              {item.evidence && (
                <pre className="text-[10px] font-mono text-emerald-100 bg-emerald-950/50 border border-emerald-500/20 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
                  {item.evidence}
                </pre>
              )}
              {fixText && (
                <div className="flex items-start gap-1.5 text-xs text-emerald-200 bg-emerald-500/10 border border-emerald-500/30 rounded p-2">
                  <ChevronRight className="size-3.5 mt-0.5 flex-shrink-0 text-emerald-300" />
                  <span>
                    <span className="font-bold text-emerald-100">Fix:</span> {fixText}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FindingsList({ items, defaultOpenCount = 0 }: { items: FindingItem[]; defaultOpenCount?: number }) {
  const sorted = [...items].sort((a, b) => SEV_ORDER.indexOf(a.severity) - SEV_ORDER.indexOf(b.severity));
  if (sorted.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic px-2 py-3 text-center">
        No findings in this dimension. 🎉
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-mono uppercase text-emerald-300/80 tracking-wider mb-1 flex items-center gap-1.5">
        <ListTree className="size-3" /> Findings · {sorted.length}
      </div>
      {sorted.map((it, i) => (
        <FindingCard key={it.id} item={it} defaultOpen={defaultOpenCount > 0 && i < defaultOpenCount} />
      ))}
    </div>
  );
}

/* ----- IntelCard wrapper + Stat tile ----- */
function IntelCard({ icon: I, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-emerald-500/20 bg-card/40 p-3">
      <div className="flex items-center gap-1.5 mb-2 text-xs">
        <I className="size-3.5 text-emerald-300" />
        <span className="font-bold text-emerald-200">{title}</span>
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value, accent = "border-emerald-500/20" }: { label: string; value: React.ReactNode; accent?: string }) {
  return (
    <div className={`px-2.5 py-2 rounded-lg border bg-emerald-950/20 ${accent}`}>
      <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider truncate">{label}</div>
      <div className="text-sm font-bold text-emerald-200 truncate">{value}</div>
    </div>
  );
}

/* ----- InfoRow: shared key/value row for Intel cards ----- */
function InfoRow({ k, v, breakAll = false }: { k: string; v?: string | null; breakAll?: boolean }) {
  if (!v) return null;
  return (
    <div className="flex gap-2 text-[11px]">
      <span className="text-muted-foreground w-20 flex-shrink-0">{k}:</span>
      <span className={`text-foreground/90 ${breakAll ? "break-all" : "truncate"}`}>{v}</span>
    </div>
  );
}

/* ----- CveCard: single CVE finding card ----- */
function CveCard({ cve }: { cve: CveFinding }) {
  const sev = severityStyle(cve.severity);
  const nvdUrl = cve.referenceUrls[0] || `https://nvd.nist.gov/vuln/detail/${cve.cveId}`;
  return (
    <div className={`rounded-lg border ${sev.border} bg-card/40 p-3`}>
      <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
        <div className="flex items-center gap-1.5 min-w-0">
          <Bug className={`size-3.5 ${sev.text} flex-shrink-0`} />
          <a href={nvdUrl} target="_blank" rel="noreferrer" className="font-mono font-bold text-xs hover:underline truncate">
            {cve.cveId}
          </a>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${sev.pill}`}>{cve.severity}</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-200 border border-emerald-500/30">
            CVSS {cve.cvssScore}
          </span>
        </div>
      </div>
      <div className="text-[10px] text-muted-foreground mb-1 font-mono">
        Product: <span className="text-foreground">{cve.product}{cve.version ? ` ${cve.version}` : ""}</span>
      </div>
      <p className="text-xs text-foreground/80 line-clamp-2 mb-1.5">{cve.description}</p>
      <a href={nvdUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] text-emerald-300 hover:text-emerald-200 underline">
        <ExternalLink className="size-3" /> NVD detail
      </a>
    </div>
  );
}

/* ----- WhoisCard ----- */
function WhoisCard({ whois }: { whois: WhoisRecord }) {
  if (whois.error) {
    return (
      <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 text-xs text-rose-200">
        <Database className="size-3 inline mr-1" />
        WHOIS error: {whois.error}
      </div>
    );
  }
  return (
    <IntelCard icon={Database} title="RDAP / WHOIS">
      <div className="space-y-0.5">
        <InfoRow k="Registrar" v={whois.registrar} />
        <InfoRow k="Registrant" v={whois.registrantOrg} />
        <InfoRow k="Country" v={whois.registrantCountry} />
        <InfoRow k="Registered" v={whois.registeredOn} />
        <InfoRow k="Expires" v={whois.expiresOn} />
        <InfoRow k="Updated" v={whois.updatedOn} />
      </div>
      {whois.nameservers.length > 0 && (
        <div className="mt-2">
          <div className="text-[10px] text-muted-foreground font-mono uppercase mb-0.5">Nameservers ({whois.nameservers.length})</div>
          <div className="text-[10px] font-mono text-foreground/80 break-all">{whois.nameservers.join(" · ")}</div>
        </div>
      )}
      {whois.statuses.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {whois.statuses.map((s, i) => (
            <span key={i} className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-200">
              {s}
            </span>
          ))}
        </div>
      )}
    </IntelCard>
  );
}

/* ----- DnsCard ----- */
function DnsCard({ dns }: { dns: DnsRecords }) {
  if (dns.error) {
    return (
      <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 text-xs text-rose-200">
        <Network className="size-3 inline mr-1" />
        DNS error: {dns.error}
      </div>
    );
  }
  const sections: [string, string[]][] = [
    ["A", dns.A],
    ["AAAA", dns.AAAA],
    ["MX", dns.MX],
    ["NS", dns.NS],
    ["TXT", dns.TXT],
    ["CNAME", dns.CNAME],
  ];
  return (
    <IntelCard icon={Network} title="DNS Records">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {sections.map(([t, records]) => (
          <div key={t} className="rounded border border-emerald-500/15 bg-emerald-950/20 p-2">
            <div className="text-[10px] font-mono uppercase text-emerald-300 mb-1">{t} ({records.length})</div>
            {records.length === 0 ? (
              <div className="text-[10px] text-muted-foreground italic">none</div>
            ) : (
              <ul className="space-y-0.5 text-[10px] font-mono text-foreground/80 break-all">
                {records.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </IntelCard>
  );
}

/* ----- TlsCard ----- */
function TlsCard({ cert }: { cert: CertificateInfo }) {
  if (cert.error) {
    return (
      <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 text-xs text-rose-200">
        <ShieldCheck className="size-3 inline mr-1" />
        TLS error: {cert.error}
      </div>
    );
  }
  const status = cert.isExpired ? "EXPIRED" : cert.isExpiringSoon ? "EXPIRING SOON" : cert.selfSigned ? "SELF-SIGNED" : "VALID";
  const statusCls = cert.isExpired
    ? "bg-red-500/20 text-red-200 border-red-500/40"
    : cert.isExpiringSoon || cert.selfSigned
    ? "bg-amber-500/20 text-amber-200 border-amber-500/40"
    : "bg-emerald-500/20 text-emerald-200 border-emerald-500/40";
  return (
    <IntelCard icon={ShieldCheck} title="TLS Certificate">
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${statusCls}`}>{status}</span>
        {cert.selfSigned && (
          <span className="text-[10px] text-amber-300 flex items-center gap-1">
            <AlertTriangle className="size-3" /> self-signed
          </span>
        )}
      </div>
      <div className="space-y-0.5">
        <InfoRow k="Issuer" v={cert.issuer} breakAll />
        <InfoRow k="Subject" v={cert.subject} breakAll />
        <InfoRow k="Valid from" v={cert.validFrom} />
        <InfoRow k="Valid to" v={cert.validTo} />
        <InfoRow k="Key" v={cert.keyAlgorithm && cert.keyBits ? `${cert.keyAlgorithm} · ${cert.keyBits} bits` : undefined} />
        <InfoRow k="SAN entries" v={String(cert.san.length)} />
      </div>
    </IntelCard>
  );
}

/* ----- CtCard (Certificate Transparency) ----- */
function CtCard({ entries, subdomains }: { entries: CertTransparencyEntry[]; subdomains: string[] }) {
  return (
    <IntelCard icon={ListTree} title={`Certificate Transparency (${entries.length})`}>
      {subdomains.length > 0 && (
        <div className="mb-2">
          <div className="text-[10px] font-mono uppercase text-emerald-300 mb-1">Discovered subdomains ({subdomains.length})</div>
          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto kodand-chat-scroll">
            {subdomains.map((s) => (
              <span key={s} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-200">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
      {entries.length > 0 && (
        <div className="space-y-0.5 max-h-40 overflow-y-auto kodand-chat-scroll">
          {entries.slice(0, 15).map((e) => (
            <div key={e.id} className="text-[10px] font-mono text-muted-foreground border-l-2 border-emerald-500/30 pl-1.5">
              <div className="text-foreground/80 truncate">{e.commonName}</div>
              <div className="text-[9px]">{e.notBefore} → {e.notAfter}</div>
            </div>
          ))}
        </div>
      )}
      {entries.length === 0 && subdomains.length === 0 && (
        <div className="text-[10px] text-muted-foreground italic">No CT log entries found.</div>
      )}
    </IntelCard>
  );
}

/* ----- HeadersTable (security headers, missing ones highlighted red) ----- */
function HeadersTable({ headers }: { headers: Record<string, string | null> }) {
  const entries = Object.entries(headers);
  const securityHeaders = [
    "strict-transport-security",
    "content-security-policy",
    "x-frame-options",
    "x-content-type-options",
    "referrer-policy",
    "permissions-policy",
  ];
  if (entries.length === 0) return null;
  return (
    <IntelCard icon={Server} title="HTTP Headers">
      <div className="space-y-0.5 max-h-48 overflow-y-auto kodand-chat-scroll">
        {entries.map(([k, v]) => {
          const missing = v === null;
          const isSec = securityHeaders.includes(k.toLowerCase());
          return (
            <div
              key={k}
              className={`flex items-start gap-2 text-[10px] p-1.5 rounded ${missing && isSec ? "bg-red-500/10 border border-red-500/30" : "bg-emerald-950/20"}`}
            >
              <span className="font-mono text-muted-foreground flex-shrink-0">{k}:</span>
              <span className={`font-mono break-all ${missing ? "text-red-300 italic" : "text-foreground/80"}`}>
                {missing ? "MISSING" : (v as string).slice(0, 120)}
              </span>
              {missing && isSec && <XCircle className="size-3 text-red-400 ml-auto flex-shrink-0 mt-0.5" />}
            </div>
          );
        })}
      </div>
    </IntelCard>
  );
}

/* ----- ContentMetricsDashboard ----- */
function ContentMetricsDashboard({ dim }: { dim: ContentDimension }) {
  const m = dim.metrics;
  const readabilityColor = m
    ? m.fleschReadingEase >= 70
      ? "#10b981"
      : m.fleschReadingEase >= 50
      ? "#facc15"
      : m.fleschReadingEase >= 30
      ? "#f59e0b"
      : "#ef4444"
    : "#10b981";
  return (
    <div className="space-y-3">
      {dim.summary && <p className="text-xs text-foreground/80 italic">{dim.summary}</p>}
      {m && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-3 items-center">
            <div className="flex justify-center">
              <ScoreGauge score={m.fleschReadingEase} size={110} color={readabilityColor} suffix="Flesch" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Reading level" value={m.readingLevel} />
              <Stat label="Reading time" value={`${m.readingTimeMin} min`} />
              <Stat label="Tone" value={<span className="capitalize">{m.tone}</span>} />
              <Stat label="F-K Grade" value={m.fleschKincaidGrade} />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Stat label="Words" value={m.wordCount.toLocaleString()} />
            <Stat label="Sentences" value={m.sentenceCount.toLocaleString()} />
            <Stat label="Paragraphs" value={m.paragraphCount.toLocaleString()} />
            <Stat label="Unique words" value={m.uniqueWords.toLocaleString()} />
          </div>
          {m.topKeywords.length > 0 && (
            <IntelCard icon={Sparkles} title="Top 10 keywords · density">
              <KeywordBarChart keywords={m.topKeywords} />
            </IntelCard>
          )}
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Passive voice" value={m.passiveVoiceSentences} />
            <Stat label="Long sentences" value={m.longSentences} />
            <Stat label="Type-token ratio" value={m.typeTokenRatio.toFixed(3)} />
          </div>
        </>
      )}
      <FindingsList items={dim.findings.map(contentItem)} defaultOpenCount={1} />
    </div>
  );
}

/* ----- SecurityIntelDashboard ----- */
function SecurityIntelDashboard({ dim }: { dim: SecurityDimension }) {
  const intel = dim.intel;
  const dnsCount = intel?.dns
    ? intel.dns.A.length + intel.dns.AAAA.length + intel.dns.MX.length + intel.dns.NS.length
    : 0;
  return (
    <div className="space-y-3">
      {dim.summary && <p className="text-xs text-foreground/80 italic">{dim.summary}</p>}
      {intel && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
          <Stat label="CVEs" value={intel.cveFindings.length} accent="border-rose-500/30" />
          <Stat label="WHOIS" value={intel.whois?.error ? "err" : "ok"} accent="border-emerald-500/30" />
          <Stat label="DNS records" value={dnsCount} accent="border-emerald-500/30" />
          <Stat
            label="TLS cert"
            value={intel.certificate?.isExpired ? "exp" : intel.certificate?.isExpiringSoon ? "soon" : "ok"}
            accent="border-emerald-500/30"
          />
          <Stat label="CT entries" value={intel.certTransparency.length} accent="border-emerald-500/30" />
          <Stat label="Subdomains" value={intel.discoveredSubdomains.length} accent="border-emerald-500/30" />
        </div>
      )}
      {intel && intel.detectedProducts.length > 0 && (
        <IntelCard icon={Cpu} title={`Detected software (${intel.detectedProducts.length})`}>
          <div className="flex flex-wrap gap-1.5">
            {intel.detectedProducts.map((p, i) => (
              <span
                key={i}
                className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-200"
              >
                {p.name}
                {p.version ? ` ${p.version}` : ""} <span className="text-muted-foreground">({p.source})</span>
              </span>
            ))}
          </div>
        </IntelCard>
      )}
      {intel && intel.cveFindings.length > 0 && (
        <div>
          <div className="text-[10px] font-mono uppercase text-rose-300 mb-1.5 flex items-center gap-1.5">
            <Bug className="size-3" /> NVD CVE Deep Scan · {intel.cveFindings.length}
          </div>
          <div className="space-y-1.5">
            {intel.cveFindings.map((c) => (
              <CveCard key={c.id} cve={c} />
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {intel?.whois && <WhoisCard whois={intel.whois} />}
        {intel?.dns && <DnsCard dns={intel.dns} />}
      </div>
      {intel?.certificate && <TlsCard cert={intel.certificate} />}
      {intel && (intel.certTransparency.length > 0 || intel.discoveredSubdomains.length > 0) && (
        <CtCard entries={intel.certTransparency} subdomains={intel.discoveredSubdomains} />
      )}
      <HeadersTable headers={dim.headers} />
      <FindingsList items={dim.findings.map(securityItem)} defaultOpenCount={2} />
    </div>
  );
}

/* ----- SeoSignalsDashboard ----- */
function SeoSignalsDashboard({ dim }: { dim: SeoDimension }) {
  const c = dim.checks;
  const signals: [string, boolean, string][] = [
    ["Title", c.hasTitle, c.hasTitle ? `${c.titleLength} chars` : "missing"],
    ["Description", c.hasDescription, c.hasDescription ? `${c.descriptionLength} chars` : "missing"],
    ["Canonical", c.hasCanonical, c.hasCanonical ? "set" : "missing"],
    ["Open Graph", c.hasOgTags, c.hasOgTags ? "yes" : "missing"],
    ["Twitter Card", c.hasTwitterCard, c.hasTwitterCard ? "yes" : "missing"],
    ["H1", c.h1Count > 0, `${c.h1Count} found`],
    ["H2", c.h2Count > 0, `${c.h2Count}`],
    ["H3", c.h3Count > 0, `${c.h3Count}`],
    ["JSON-LD", c.hasStructuredData, c.hasStructuredData ? "yes" : "missing"],
    ["Viewport", c.hasViewport, c.hasViewport ? "yes" : "missing"],
    ["Lang", c.hasLang, c.lang || "missing"],
    ["Favicon", c.hasFavicon, c.hasFavicon ? "yes" : "missing"],
    ["Robots meta", c.hasRobotsMeta, c.hasRobotsMeta ? "yes" : "missing"],
  ];
  return (
    <div className="space-y-3">
      {dim.summary && <p className="text-xs text-foreground/80 italic">{dim.summary}</p>}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {signals.map(([label, ok, hint]) => (
          <div
            key={label}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded border text-xs ${ok ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}`}
          >
            {ok ? (
              <CheckCircle2 className="size-3.5 text-emerald-300 flex-shrink-0" />
            ) : (
              <XCircle className="size-3.5 text-red-400 flex-shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <div className={`font-semibold truncate ${ok ? "text-emerald-200" : "text-red-200"}`}>{label}</div>
              <div className="text-[10px] text-muted-foreground truncate">{hint}</div>
            </div>
          </div>
        ))}
      </div>
      <FindingsList items={dim.findings.map(seoItem)} defaultOpenCount={2} />
    </div>
  );
}

/* ----- PerformanceMetricsDashboard ----- */
function PerformanceMetricsDashboard({ dim }: { dim: PerformanceDimension }) {
  const m = dim.metrics;
  const yn = (v: boolean) => (v ? "yes" : "no");
  const ynAccent = (v: boolean) => (v ? "border-emerald-500/30" : "border-amber-500/30");
  return (
    <div className="space-y-3">
      {dim.summary && <p className="text-xs text-foreground/80 italic">{dim.summary}</p>}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="HTML size" value={`${(m.htmlBytes / 1024).toFixed(1)} KB`} />
        <Stat label="Page weight" value={`${m.pageSizeKb} KB`} />
        <Stat label="Inline scripts" value={m.inlineScriptCount} />
        <Stat label="External scripts" value={m.externalScriptCount} />
        <Stat label="Stylesheets" value={m.externalStylesheetCount} />
        <Stat label="Images" value={m.imgCount} />
        <Stat label="Lazy load" value={yn(m.hasLazyLoading)} accent={ynAccent(m.hasLazyLoading)} />
        <Stat label="Compression" value={yn(m.hasCompression)} accent={ynAccent(m.hasCompression)} />
        <Stat label="Preconnect" value={yn(m.hasPreconnect)} accent={ynAccent(m.hasPreconnect)} />
        <Stat label="Async/defer" value={yn(m.hasAsyncDeferScripts)} accent={ynAccent(m.hasAsyncDeferScripts)} />
      </div>
      <FindingsList items={dim.findings.map(perfItem)} defaultOpenCount={2} />
    </div>
  );
}

/* ----- AccessibilityFindingsDashboard ----- */
function AccessibilityFindingsDashboard({ dim }: { dim: AccessibilityDimension }) {
  return (
    <div className="space-y-3">
      {dim.summary && <p className="text-xs text-foreground/80 italic">{dim.summary}</p>}
      <FindingsList items={dim.findings.map(a11yItem)} defaultOpenCount={2} />
    </div>
  );
}

/* ----- FullScanTabsDashboard: tabbed view of all dimensions ----- */
function FullScanTabsDashboard({ result }: { result: ScanResult }) {
  const content = result.content ?? result.grammar;
  const tabs: [string, boolean, React.ReactNode][] = [
    ["Content", !!content, content ? <ContentMetricsDashboard dim={content} /> : null],
    ["Security", !!result.security, result.security ? <SecurityIntelDashboard dim={result.security} /> : null],
    ["SEO", !!result.seo, result.seo ? <SeoSignalsDashboard dim={result.seo} /> : null],
    ["Performance", !!result.performance, result.performance ? <PerformanceMetricsDashboard dim={result.performance} /> : null],
    ["A11y", !!result.accessibility, result.accessibility ? <AccessibilityFindingsDashboard dim={result.accessibility} /> : null],
  ];
  const first = tabs.find(([, e]) => e)?.[0] || "Content";
  return (
    <Tabs defaultValue={first} className="w-full">
      <TabsList className="w-full justify-start flex-wrap h-auto">
        {tabs.map(([label, enabled]) => (
          <TabsTrigger key={label} value={label} disabled={!enabled} className="text-xs">
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map(([label, , node]) => (
        <TabsContent key={label} value={label} className="mt-3">
          {node}
        </TabsContent>
      ))}
    </Tabs>
  );
}

/* =============================================================================
 * Completed scan card (rich expandable mini-dashboard)
 * ============================================================================= */

function CompletedScanCard({
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

  // dimension mini-score tiles (only show if more than 1 dimension present, i.e. full mode)
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
          {/* header: mode icon + label + timestamp + grade badge */}
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

          {/* score gauge + findings + severity dots */}
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

          {/* top priorities (only when collapsed) */}
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

          {/* actions: PDF + Re-run + Show/Hide details toggle */}
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

          {/* expanded rich dashboard with the actual scanned data */}
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

function CompletedScansGrid({
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

/* =============================================================================
 * Live activity stream (right panel)
 * ============================================================================= */

function LiveActivityStream({
  logs,
  onClear,
}: {
  logs: LogEntry[];
  onClear: () => void;
}) {
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex flex-col h-full min-h-0 rounded-xl border border-emerald-500/15 bg-card/40 backdrop-blur overflow-hidden">
      <div className="flex items-center justify-between px-3 h-10 border-b border-emerald-500/15 bg-emerald-950/30">
        <div className="flex items-center gap-2 text-xs text-emerald-300 font-mono uppercase tracking-wider">
          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live activity
          {logs.length > 0 && (
            <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0 h-4 border-emerald-500/30 text-emerald-200">
              {logs.length}
            </Badge>
          )}
        </div>
        {logs.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-[10px] text-muted-foreground hover:text-rose-300 flex items-center gap-1"
          >
            <Trash2 className="size-3" /> Clear
          </button>
        )}
      </div>

      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto kodand-chat-scroll p-2 font-mono text-[11px] leading-relaxed space-y-0.5 max-h-[60vh] lg:max-h-none"
      >
        {logs.length === 0 ? (
          <div className="text-muted-foreground italic px-2 py-6 text-center">
            Activity stream is idle. Start a scan to see live log lines here.
          </div>
        ) : (
          logs.map((l) => {
            const t = new Date(l.ts).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });
            const cls =
              l.kind === "error"
                ? "text-rose-300"
                : l.kind === "stage"
                ? "text-emerald-300"
                : "text-muted-foreground";
            const prefix =
              l.kind === "error" ? "✗" : l.kind === "stage" ? "▸" : "·";
            return (
              <div key={l.id} className={`kodand-line-fade ${cls} flex gap-1.5`}>
                <span className="text-muted-foreground/60 flex-shrink-0">{t}</span>
                <span className="flex-shrink-0 opacity-70">{prefix}</span>
                <span className="break-words min-w-0">{l.text}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* =============================================================================
 * Dashboard sidebar (left)
 * ============================================================================= */

function SidebarModeButton({
  mode,
  selected,
  disabled,
  onClick,
}: {
  mode: ScanMode;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const m = modeMeta(mode);
  const Icon = MODE_ICON[mode];
  const a = MODE_ACCENT[mode];
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selected}
      className={[
        "kodand-side-mode w-full text-left p-2.5 rounded-lg border flex items-start gap-2.5 transition-colors",
        selected
          ? `${a.border} ${a.bg} ${a.text} kodand-step-active`
          : "border-emerald-500/10 bg-card/40 text-muted-foreground hover:bg-emerald-500/5 hover:border-emerald-400/30",
        "disabled:opacity-50",
      ].join(" ")}
    >
      <Icon
        className={[
          "size-4 mt-0.5 flex-shrink-0",
          selected ? a.text : "text-muted-foreground",
        ].join(" ")}
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold flex items-center justify-between gap-2">
          <span className={selected ? a.text : "text-foreground"}>{m.short}</span>
          <span className="text-[10px] text-muted-foreground font-mono">~{m.estSeconds}s</span>
        </div>
        <div className="text-[11px] text-muted-foreground leading-tight mt-0.5 line-clamp-2">
          {m.blurb}
        </div>
      </div>
    </button>
  );
}

function DashboardSidebar({
  viewMode,
  status,
  onView,
  onRun,
  history,
  onReRun,
  onClearHistory,
  onRemoveHistory,
}: {
  viewMode: ScanMode;
  status: "idle" | "scanning";
  onView: (mode: ScanMode) => void;
  onRun: (mode: ScanMode) => void;
  history: { id: string; url: string; mode: ScanMode; grade: string; score: number; scannedAt: string }[];
  onReRun: (entry: { url: string; mode: ScanMode }) => void;
  onClearHistory: () => void;
  onRemoveHistory: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-2 px-1">
          <Radar className="size-3.5 text-emerald-300" />
          <h2 className="text-xs font-mono uppercase tracking-wider text-emerald-300/80">Scan modes</h2>
        </div>
        <div className="space-y-1.5">
          {SCAN_MODES.map((m) => (
            <SidebarModeButton
              key={m.id}
              mode={m.id}
              selected={viewMode === m.id}
              disabled={status === "scanning"}
              onClick={() => onView(m.id)}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-2">
            <History className="size-3.5 text-emerald-300" />
            <h2 className="text-xs font-mono uppercase tracking-wider text-emerald-300/80">Recent scans</h2>
          </div>
          {history.length > 0 && (
            <button
              type="button"
              onClick={onClearHistory}
              className="text-[10px] text-muted-foreground hover:text-rose-300 flex items-center gap-1"
            >
              <Trash2 className="size-3" /> Clear
            </button>
          )}
        </div>
        {history.length === 0 ? (
          <p className="text-xs text-muted-foreground italic px-2 py-2">
            No scans yet. History is saved in this browser only.
          </p>
        ) : (
          <ul className="space-y-1 max-h-64 overflow-y-auto kodand-chat-scroll">
            {history.slice(0, 20).map((e) => {
              const a = MODE_ACCENT[e.mode];
              return (
                <li key={e.id}>
                  <div className="group flex items-start gap-2 p-2 rounded-md hover:bg-emerald-500/5 border border-transparent hover:border-emerald-500/15 transition-colors">
                    <button
                      type="button"
                      onClick={() => onReRun({ url: e.url, mode: e.mode })}
                      disabled={status === "scanning"}
                      className="flex-1 text-left min-w-0 disabled:opacity-50"
                    >
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className={`font-mono px-1.5 py-0.5 rounded border text-[10px] ${gradeBadgeClass(e.grade)}`}>
                          {e.grade} {e.score}
                        </span>
                        <span className={`${a.text} text-[10px] uppercase tracking-wider`}>{modeShort(e.mode)}</span>
                      </div>
                      <div className="text-xs text-foreground/90 truncate mt-0.5">{prettyHost(e.url)}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{relativeTime(e.scannedAt)}</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveHistory(e.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-rose-300 p-1 transition-opacity"
                      aria-label="Remove from history"
                    >
                      <XCircle className="size-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/* =============================================================================
 * Focused scan view — one scan at a time, full focus (V6 redesign)
 * Each scan is managed separately. The main area shows exactly one of:
 *   - the active scan card (if the focused mode is currently scanning)
 *   - the completed scan dashboard for the focused mode (if it has results)
 *   - an empty "run this scan" prompt (if no results yet)
 * =============================================================================
 */

function FocusedScanView({
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
      {/* Focused mode header — big banner showing which scan type is in focus */}
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

      {/* Body: exactly one of three states */}
      <AnimatePresence mode="wait">
        {/* STATE 1: this mode is actively scanning */}
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

        {/* STATE 2: this mode has a completed scan — show its rich dashboard */}
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

        {/* STATE 3: no results yet for this mode — empty state */}
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

// Type alias for the active scan shape used by FocusedScanView
type HomeActiveScan = {
  mode: ScanMode;
  progress: number;
  stage: ScanStage | null;
  stageLabel: string;
  findingsCount: number;
  metrics: LiveMetrics;
};

/* =============================================================================
 * Mode tab bar — horizontal tabs to switch which scan is in focus.
 * Clicking a tab SWITCHES FOCUS only (does NOT start a scan). Each tab has
 * a separate "Run" button if no scan exists, or a score badge if completed.
 * =============================================================================
 */

function ModeTabBar({
  viewMode,
  completedByMode,
  scanning,
  scanningMode,
  onView,
  onRun,
}: {
  viewMode: ScanMode;
  completedByMode: Partial<Record<ScanMode, { score: number; grade: string }>>;
  scanning: boolean;
  scanningMode: ScanMode | null;
  onView: (mode: ScanMode) => void;
  onRun: (mode: ScanMode) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
      {SCAN_MODES.map((m) => {
        const a = MODE_ACCENT[m.id];
        const Icon = MODE_ICON[m.id];
        const isFocused = viewMode === m.id;
        const isScanningThis = scanning && scanningMode === m.id;
        const done = completedByMode[m.id];
        return (
          <motion.button
            key={m.id}
            type="button"
            onClick={() => onView(m.id)}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            className={[
              "kodand-mode-card relative w-full text-left p-3 rounded-xl border transition-colors overflow-hidden",
              isFocused
                ? `${a.border} ${a.bg} shadow-lg ${a.glow}`
                : "border-emerald-500/15 bg-card/40 hover:bg-emerald-500/5 hover:border-emerald-400/30",
            ].join(" ")}
            aria-pressed={isFocused}
          >
            {/* focus accent stripe */}
            {isFocused && (
              <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${a.solid}`} />
            )}
            {/* scanning shimmer */}
            {isScanningThis && (
              <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${a.solid} kodand-bar-shimmer`} />
            )}
            <div className="flex items-center gap-2">
              <div
                className={[
                  "size-8 rounded-lg flex items-center justify-center border flex-shrink-0",
                  isFocused
                    ? `${a.border} ${a.bg} ${a.text}`
                    : isScanningThis
                    ? `${a.border} ${a.bg} ${a.text}`
                    : done
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-emerald-500/15 bg-emerald-500/5 text-muted-foreground",
                ].join(" ")}
              >
                {isScanningThis ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : done ? (
                  <CheckCircle2 className="size-4" />
                ) : (
                  <Icon className="size-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className={[
                    "text-xs font-bold truncate",
                    isFocused ? a.text : "text-foreground",
                  ].join(" ")}
                >
                  {m.short}
                </div>
                <div className="text-[9px] text-muted-foreground font-mono uppercase tracking-wider">
                  {isScanningThis
                    ? "scanning…"
                    : done
                    ? `done · ${done.grade} ${done.score}`
                    : "idle"}
                </div>
              </div>
              {done && (
                <div className={`px-1 py-0 rounded border text-[9px] font-mono ${gradeBadgeClass(done.grade)}`}>
                  {done.grade}
                </div>
              )}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

/* =============================================================================
 * Footer (sticky bottom + amber privacy callout)
 * ============================================================================= */

function DashboardFooter() {
  return (
    <footer className="mt-auto border-t border-emerald-500/15 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/65">
      <div className="mx-auto max-w-[1600px] px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <ImageLogo height={18} />
          <span className="font-mono uppercase tracking-wider hidden sm:inline">· 360° audit</span>
        </div>
        <div className="flex items-center gap-2 text-center flex-wrap justify-center">
          <span className="font-mono">Free public sources:</span>
          {["NVD CVE", "RDAP WHOIS", "DNS", "TLS", "crt.sh"].map((s) => (
            <Badge key={s} variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-emerald-500/30 text-emerald-200 bg-emerald-500/5">
              {s}
            </Badge>
          ))}
          <span className="font-mono opacity-70">KODAND is polite (1 req/800ms · 5-min cache)</span>
        </div>
      </div>
      <div className="mx-auto max-w-[1600px] px-4 pb-2 text-[10px] text-muted-foreground/70 text-center">
        🔒 Your data stays in your browser — we never upload or store it. Save your PDFs; your scan history clears when you close the browser.
      </div>
    </footer>
  );
}

/* =============================================================================
 * Main page
 * ============================================================================= */

export default function Home() {
  const { domain, set: setTargetDomain, clear: clearTargetDomain } = useTargetDomain();
  const { history, remove: removeHistory, clear: clearHistory } = useScanHistory();

  const [status, setStatus] = React.useState<"idle" | "scanning">("idle");
  const [currentMode, setCurrentMode] = React.useState<ScanMode | null>(null);
  /** Which scan mode is currently in focus in the main area. Defaults to "security". */
  const [viewMode, setViewMode] = React.useState<ScanMode>("security");
  const [activeScan, setActiveScan] = React.useState<{
    mode: ScanMode;
    progress: number;
    stage: ScanStage | null;
    stageLabel: string;
    findingsCount: number;
    metrics: LiveMetrics;
  } | null>(null);
  const [logs, setLogs] = React.useState<LogEntry[]>([]);
  const [completedScans, setCompletedScans] = React.useState<ScanResult[]>([]);
  const [activityOpen, setActivityOpen] = React.useState(false);

  const abortRef = React.useRef<AbortController | null>(null);

  /* ---------- Lock target ---------- */
  const lockTarget = React.useCallback(
    (url: string) => {
      setTargetDomain(url);
    },
    [setTargetDomain]
  );

  /* ---------- Start a scan ---------- */
  const startScan = React.useCallback(
    async (targetUrl: string, mode: ScanMode) => {
      if (status === "scanning") return;

      setStatus("scanning");
      setCurrentMode(mode);
      setViewMode(mode); // focus the main area on the scan we're starting
      setLogs([]);
      setActiveScan({
        mode,
        progress: 0,
        stage: null,
        stageLabel: "Initializing scan…",
        findingsCount: 0,
        metrics: { ...INITIAL_METRICS },
      });

      const controller = new AbortController();
      abortRef.current = controller;

      const addLog = (kind: LogEntry["kind"], text: string, stage?: ScanStage) =>
        setLogs((p) => [...p, { id: nextLogId(), ts: Date.now(), kind, text, stage }]);
      const resetScanState = () => {
        setStatus("idle");
        setActiveScan(null);
        setCurrentMode(null);
      };

      const handleEvent = (evt: ProgressEvent) => {
        if (evt.type === "heartbeat") return;
        if (evt.type === "stage") {
          setActiveScan((prev) =>
            prev
              ? {
                  ...prev,
                  progress: Math.max(prev.progress, evt.progress),
                  stage: evt.stage,
                  stageLabel: evt.label,
                  metrics: foldEvent(mode, prev.metrics, evt),
                }
              : prev
          );
          addLog("stage", evt.label + (evt.detail ? ` — ${evt.detail}` : ""), evt.stage);
        } else if (evt.type === "log") {
          setActiveScan((prev) =>
            prev
              ? {
                  ...prev,
                  metrics: foldEvent(mode, prev.metrics, evt),
                  findingsCount: prev.findingsCount + (isFindingLine(evt.message) ? 1 : 0),
                }
              : prev
          );
          addLog("log", evt.message);
        } else if (evt.type === "complete") {
          const result = evt.result;
          appendHistoryFromResult(result);
          notifyHistoryChanged();
          setCompletedScans((prev) => [result, ...prev]);
          setViewMode(result.mode); // focus the main area on the just-completed scan
          addLog(
            "stage",
            `✓ ${result.modeLabel} complete · ${result.grade} ${Math.round(result.digitalHealthScore)}/100 · ${countFindings(result)} findings`,
            "finalize"
          );
          resetScanState();
        } else if (evt.type === "error") {
          addLog("error", evt.message);
          resetScanState();
        }
      };

      try {
        const resp = await fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
          body: JSON.stringify({ url: targetUrl, mode }),
          signal: controller.signal,
        });
        if (!resp.ok || !resp.body) {
          const text = await resp.text().catch(() => "");
          throw new Error(`Scan request failed (${resp.status}). ${text.slice(0, 200)}`);
        }
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() || "";
          for (const evt of events) {
            for (const l of evt.split("\n").filter((x) => x.startsWith("data:"))) {
              const data = l.slice(5).trim();
              if (!data) continue;
              try {
                handleEvent(JSON.parse(data) as ProgressEvent);
              } catch {
                /* skip malformed */
              }
            }
          }
        }
      } catch (err: unknown) {
        if ((err as Error)?.name === "AbortError") {
          addLog("log", "Scan aborted.");
          resetScanState();
          return;
        }
        addLog("error", (err as Error)?.message || "Unknown error during scan.");
        resetScanState();
      } finally {
        abortRef.current = null;
      }
    },
    [status]
  );

  /* ---------- Mode pick (from sidebar or status box) ---------- */
  const onPickMode = React.useCallback(
    (mode: ScanMode) => {
      if (!domain || status === "scanning") return;
      startScan(domain, mode);
    },
    [domain, status, startScan]
  );

  /* ---------- Re-run from history / completed card ---------- */
  const onReRun = React.useCallback(
    (entry: { url: string; mode: ScanMode }) => {
      if (!entry.url || status === "scanning") return;
      startScan(entry.url, entry.mode);
    },
    [status, startScan]
  );

  /* ---------- Clear completed (session) ---------- */
  const clearCompletedScans = () => setCompletedScans([]);

  /* ---------- Change target ---------- */
  const onChangeTarget = () => {
    if (status === "scanning" && abortRef.current) {
      abortRef.current.abort();
    }
    clearTargetDomain();
    setCompletedScans([]);
    setLogs([]);
    setActiveScan(null);
    setCurrentMode(null);
    setViewMode("security");
    setStatus("idle");
  };

  /* ---------- Compute completed-by-mode for current target ---------- */
  const completedByMode = React.useMemo(() => {
    const map: Partial<Record<ScanMode, { score: number; grade: string }>> = {};
    for (const s of completedScans) {
      const score = Math.round(s.digitalHealthScore);
      if (!map[s.mode]) map[s.mode] = { score, grade: s.grade };
    }
    if (domain) {
      for (const e of history) {
        if (e.url === domain && !map[e.mode]) {
          map[e.mode] = { score: e.score, grade: e.grade };
        }
      }
    }
    return map;
  }, [completedScans, history, domain]);

  /* ---------- The latest completed ScanResult for the currently focused mode ---------- */
  const focusedCompleted = React.useMemo(() => {
    // Prefer a session completed scan; fall back to history for the same URL+mode.
    const fromSession = completedScans.find((s) => s.mode === viewMode);
    if (fromSession) return fromSession;
    if (domain) {
      const fromHistory = history.find(
        (h) => h.url === domain && h.mode === viewMode
      );
      // We don't have a full ScanResult from history; return null — the empty state
      // will offer to re-run. (Could reconstruct a minimal ScanResult but the
      // rich dashboard needs the full dimension data which history doesn't store.)
      return null;
    }
    return null;
  }, [completedScans, viewMode, domain, history]);

  /* ---------- Switch focus to a mode (just viewing, not starting a scan) ---------- */
  const onFocusMode = React.useCallback(
    (mode: ScanMode) => {
      if (status === "scanning") return; // don't switch focus while scanning
      setViewMode(mode);
    },
    [status]
  );

  // Shared: history mapped to a compact shape for both lock screen & sidebar
  const recentScans = React.useMemo(
    () =>
      history.map((h) => ({
        id: h.id,
        url: h.url,
        mode: h.mode,
        grade: h.grade,
        score: h.score,
        scannedAt: h.scannedAt,
      })),
    [history]
  );

  /* ---------- STATE A: lock target ---------- */
  if (!domain) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground kodand-bg-grid relative">
        <div className="border-b border-emerald-500/15 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto max-w-[1600px] px-3 sm:px-4 h-14 flex items-center gap-3">
            <KodandLogo size="sm" />
            <span className="ml-auto text-xs text-muted-foreground font-mono flex items-center gap-1.5">
              <Lock className="size-3.5 text-emerald-400" /> No sign-up · Anonymous
            </span>
          </div>
        </div>
        <LockTargetScreen
          onSubmit={lockTarget}
          recent={recentScans}
          onReRun={(entry) => {
            // Lock the target AND start the scan; small delay lets domain state propagate
            lockTarget(entry.url);
            setTimeout(() => startScan(entry.url, entry.mode), 50);
          }}
        />
        <DashboardFooter />
      </div>
    );
  }

  /* ---------- STATE B: dashboard ---------- */
  const accent = currentMode ? MODE_ACCENT[currentMode] : MODE_ACCENT.security;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground kodand-bg-grid relative">
      <DashboardHeader
        domain={domain}
        onChange={onChangeTarget}
        scanning={status === "scanning"}
        onToggleActivity={() => setActivityOpen((v) => !v)}
        activityOpen={activityOpen}
      />

      {/* Mobile horizontal mode row — tap to switch focus, separate run button per mode */}
      <div className="lg:hidden border-b border-emerald-500/15 bg-background/60 backdrop-blur px-3 py-2">
        <div className="flex gap-2 overflow-x-auto kodand-chat-scroll pb-1">
          {SCAN_MODES.map((m) => {
            const a = MODE_ACCENT[m.id];
            const Icon = MODE_ICON[m.id];
            const isFocused = viewMode === m.id;
            const isScanning = status === "scanning" && currentMode === m.id;
            const isDone = completedByMode[m.id];
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onFocusMode(m.id)}
                className={[
                  "flex-shrink-0 px-3 py-2 rounded-lg border flex items-center gap-1.5 text-xs",
                  isFocused
                    ? `${a.border} ${a.bg} ${a.text} kodand-step-active`
                    : isDone
                    ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-200"
                    : "border-emerald-500/15 bg-card/40 text-muted-foreground",
                ].join(" ")}
              >
                {isScanning ? <Loader2 className="size-3.5 animate-spin" /> : isDone ? <CheckCircle2 className="size-3.5" /> : <Icon className="size-3.5" />}
                {m.short}
                {isDone && (
                  <span className={`font-mono px-1 py-0 rounded text-[9px] ml-1 ${gradeBadgeClass(isDone.grade)}`}>
                    {isDone.grade}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3-column dashboard */}
      <div className="flex-1 mx-auto w-full max-w-[1600px] grid grid-cols-1 lg:grid-cols-[260px_1fr_320px] gap-4 px-3 sm:px-4 py-4">
        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <DashboardSidebar
              viewMode={viewMode}
              status={status}
              onView={onFocusMode}
              onRun={onPickMode}
              history={recentScans}
              onReRun={onReRun}
              onClearHistory={clearHistory}
              onRemoveHistory={removeHistory}
            />
          </div>
        </aside>

        <main className="space-y-4 min-w-0">
          <ModeTabBar
            viewMode={viewMode}
            completedByMode={completedByMode}
            scanning={status === "scanning"}
            scanningMode={currentMode}
            onView={onFocusMode}
            onRun={onPickMode}
          />

          <FocusedScanView
            viewMode={viewMode}
            activeScan={activeScan}
            focusedCompleted={focusedCompleted}
            completedScans={completedScans}
            domain={domain}
            scanning={status === "scanning"}
            onRun={onPickMode}
            onReRun={onPickMode}
            onDownload={downloadReportPdf}
            onClearCompleted={clearCompletedScans}
          />
        </main>

        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <LiveActivityStream logs={logs} onClear={() => setLogs([])} />
          </div>
        </aside>
      </div>

      {/* Mobile activity drawer */}
      <AnimatePresence>
        {activityOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-40 bg-background/90 backdrop-blur p-3"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs text-emerald-300 font-mono uppercase tracking-wider">Live activity</div>
              <button
                type="button"
                onClick={() => setActivityOpen(false)}
                className="p-2 rounded-md border border-emerald-500/20 text-emerald-200"
              >
                <XCircle className="size-4" />
              </button>
            </div>
            <div className="h-[calc(100vh-80px)]">
              <LiveActivityStream logs={logs} onClear={() => setLogs([])} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <DashboardFooter />
    </div>
  );
}
