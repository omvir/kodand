import * as React from "react";
import {
  ScanMode,
  ScanStage,
  SCAN_MODES,
  ProgressEvent,
  ScanResult,
  Severity,
} from "@/lib/audit-types";
import {
  Accessibility as AccessibilityIcon,
  Activity,
  Bug,
  Database,
  Fingerprint,
  Gauge,
  Globe,
  ListTree,
  Network,
  Radar,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export interface LogEntry {
  id: string;
  ts: string;
  kind: "stage" | "log" | "error";
  text: string;
  stage?: ScanStage;
}

export interface LiveMetrics {
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

export const INITIAL_METRICS: LiveMetrics = {
  progress: 0,
  stage: null,
  stageLabel: "",
  findingsCount: 0,
};

export const STAGE_ICON: Record<ScanStage, React.ElementType> = {
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

export const MODE_ICON: Record<ScanMode, React.ElementType> = {
  content: Sparkles,
  security: ShieldAlert,
  seo: Search,
  performance: Gauge,
  accessibility: AccessibilityIcon,
  full: Radar,
};

export const MODE_ACCENT: Record<
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

export function scoreColorClass(s: number): string {
  if (s >= 85) return "text-emerald-300";
  if (s >= 70) return "text-emerald-400";
  if (s >= 50) return "text-yellow-300";
  if (s >= 30) return "text-amber-400";
  return "text-red-400";
}

export function gradeBadgeClass(grade: string): string {
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

export function modeMeta(mode: ScanMode) {
  return SCAN_MODES.find((m) => m.id === mode)!;
}
export function modeLabel(mode: ScanMode) {
  return modeMeta(mode).label;
}
export function modeShort(mode: ScanMode) {
  return modeMeta(mode).short;
}

export function normalizeUrl(input: string): string | null {
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

export function prettyHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0];
  }
}

export function relativeTime(iso: string): string {
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

export function shortTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function countFindings(result: ScanResult): number {
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

const FINDING_TRIGGERS = [
  "found", "detected", "issue", "missing", "vulnerability", "cve",
  "alert", "warning", "fail", "weak", "outdated", "expired",
  "exposed", "leak", "insecure", "violat", "broken", "low", "high", "critical",
];

export function isFindingLine(text: string): boolean {
  const t = text.toLowerCase();
  return FINDING_TRIGGERS.some((k) => t.includes(k));
}

export function foldEvent(mode: ScanMode, prev: LiveMetrics, evt: ProgressEvent): LiveMetrics {
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

  const wordsMatch = text.match(/([\d.,]+)\s*(?:words|word)\s+visible/i) || text.match(/([\d.,]+)\s+words\b/i);
  if (wordsMatch) {
    const n = Number(wordsMatch[1].replace(/[,.]/g, ""));
    if (!Number.isNaN(n)) m.wordCount = n;
  }

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

  if (mode === "seo" || mode === "full") {
    if (/\btitle\b/i.test(text) && t.length < 200) {
      if (t.includes("title:") || t.includes("title =") || t.includes("has title")) m.hasTitle = !t.includes("no ") && !t.includes("missing");
    }
    if (t.includes("description")) m.hasDescription = !t.includes("no ") && !t.includes("missing");
    if (t.includes("canonical")) m.hasCanonical = !t.includes("no ") && !t.includes("missing") && !t.includes("not set");
    if (t.includes("json-ld") || t.includes("structured data")) m.hasJsonLd = !t.includes("no ") && !t.includes("missing") && !t.includes("not found");
  }

  if (mode === "performance" || mode === "full") {
    const kb = text.match(/([\d.,]+)\s*(?:kb|kib)/i);
    if (kb && (t.includes("page") || t.includes("weight") || t.includes("size"))) {
      m.pageSizeKb = Number(kb[1].replace(/[,.]/g, ""));
    }
    const sc = text.match(/(\d+)\s*(?:external\s+)?scripts?\b/i);
    if (sc) m.scriptCount = Number(sc[1]);
    if (t.includes("lazy")) m.lazyLoad = !t.includes("no ") && !t.includes("missing") && !t.includes("not ");
  }

  if (mode === "accessibility" || mode === "full") {
    const alt = text.match(/(\d+)\s*alt/i);
    if (alt && (t.includes("alt text") || t.includes("alt attribute") || t.includes("missing alt"))) m.altIssues = Number(alt[1]);
    const label = text.match(/(\d+)\s*label/i);
    if (label) m.labelIssues = Number(label[1]);
    const heading = text.match(/(\d+)\s*heading/i);
    if (heading) m.headingIssues = Number(heading[1]);
  }

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
