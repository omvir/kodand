/**
 * KODAND score calculator — computes final score, grade, executive summary, and top priorities.
 */

import {
  ContentDimension,
  SecurityDimension,
  SeoDimension,
  PerformanceDimension,
  AccessibilityDimension,
  ScanMode,
  ScanResult,
  Severity,
  SCAN_MODES,
} from "@/lib/audit-types";
import { clamp, gradeFromScore, sevRank, modeLabel } from "./types";

export interface DimensionPack {
  content?: ContentDimension;
  security?: SecurityDimension;
  seo?: SeoDimension;
  performance?: PerformanceDimension;
  accessibility?: AccessibilityDimension;
}

export function computeDigitalHealthScore(mode: ScanMode, pack: DimensionPack): number {
  if (mode === "full") {
    const g = pack.content?.score ?? 100;
    const s = pack.security?.score ?? 100;
    const seo = pack.seo?.score ?? 100;
    const p = pack.performance?.score ?? 100;
    const a = pack.accessibility?.score ?? 100;
    return clamp(g * 0.1 + s * 0.28 + seo * 0.18 + p * 0.22 + a * 0.22);
  }
  return clamp(pack[mode]?.score ?? 100);
}

export function buildExecutiveSummary(args: {
  url: string;
  mode: ScanMode;
  modeLabel: string;
  digitalHealthScore: number;
  grade: string;
  pack: DimensionPack;
}): string {
  const host = (() => {
    try {
      return new URL(args.url).host;
    } catch {
      return args.url;
    }
  })();
  const tone =
    args.digitalHealthScore >= 85
      ? "in strong shape"
      : args.digitalHealthScore >= 70
      ? "in acceptable shape with clear room for improvement"
      : args.digitalHealthScore >= 50
      ? "in poor shape requiring prompt remediation"
      : "in critical shape requiring immediate action";
  const dimParts: string[] = [];
  if (args.pack.content)
    dimParts.push(`content optimization at ${Math.round(args.pack.content.score)}/100 (${args.pack.content.findings.length} findings)`);
  if (args.pack.security)
    dimParts.push(`security/privacy at ${Math.round(args.pack.security.score)}/100 (${args.pack.security.findings.length} findings)`);
  if (args.pack.seo)
    dimParts.push(`SEO at ${Math.round(args.pack.seo.score)}/100 (${args.pack.seo.findings.length} findings)`);
  if (args.pack.performance)
    dimParts.push(`performance at ${Math.round(args.pack.performance.score)}/100 (${args.pack.performance.findings.length} findings)`);
  if (args.pack.accessibility)
    dimParts.push(`accessibility at ${Math.round(args.pack.accessibility.score)}/100 (${args.pack.accessibility.findings.length} findings)`);

  return `KODAND's ${args.modeLabel} audit of ${host} found the site ${tone}. The score is ${Math.round(
    args.digitalHealthScore
  )}/100 (Grade ${args.grade}).${
    dimParts.length ? ` ${dimParts.join("; ")}.` : ""
  } The downloadable PDF report lists every issue and its recommended fix in priority order.`;
}

export function buildTopPriorities(pack: DimensionPack): string[] {
  const priorities: string[] = [];
  const all = [
    ...(pack.security?.findings || []).map((f) => ({ sev: f.severity, src: "Security", title: f.title, fix: f.fix })),
    ...(pack.content?.findings || []).map((f) => ({ sev: f.severity, src: "Content", title: `${f.type}: ${f.excerpt.slice(0, 60)}`, fix: f.suggestion })),
    ...(pack.seo?.findings || []).map((f) => ({ sev: f.severity, src: "SEO", title: f.title, fix: f.fix })),
    ...(pack.performance?.findings || []).map((f) => ({ sev: f.severity, src: "Performance", title: f.title, fix: f.fix })),
    ...(pack.accessibility?.findings || []).map((f) => ({ sev: f.severity, src: "Accessibility", title: f.title, fix: f.fix })),
  ].sort((a, b) => sevRank(a.sev) - sevRank(b.sev));
  for (const f of all.slice(0, 6)) {
    priorities.push(`[${f.src}] ${f.title}: ${f.fix}`);
  }
  if (priorities.length === 0) {
    priorities.push("No critical issues — maintain current standards and schedule regular re-audits.");
  }
  return priorities;
}

export { gradeFromScore, modeLabel };
