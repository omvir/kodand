/**
 * Shared scanner types and utilities — used by all scanner modules.
 */

import {
  Severity,
  ScanMode,
  ScanResult,
  ProgressEvent,
  ScanStage,
  SCAN_MODES,
} from "@/lib/audit-types";

/* ============================================
 * Shared constants
 * ============================================ */

export const UA =
  "Mozilla/5.0 (compatible; KODAND-Auditor/1.0; +https://kodand.pages.dev; research-only)";

export const SECURITY_HEADERS = [
  "content-security-policy",
  "strict-transport-security",
  "x-frame-options",
  "x-content-type-options",
  "referrer-policy",
  "permissions-policy",
  "cross-origin-opener-policy",
  "cross-origin-embedder-policy",
  "cross-origin-resource-policy",
  "x-xss-protection",
  "x-permitted-cross-domain-policies",
  "x-download-options",
  "x-dns-prefetch-control",
  "set-cookie",
  "content-security-policy-report-only",
] as const;

export const sevPenalty: Record<Severity, number> = {
  critical: 18,
  high: 10,
  medium: 5,
  low: 2,
  info: 0.5,
};

/* ============================================
 * Shared interfaces
 * ============================================ */

export interface FetchedPage {
  url: string;
  finalUrl: string;
  httpStatus: number;
  contentType: string;
  server: string;
  isHttps: boolean;
  rawHtml: string;
  fetchMs: number;
  title?: string;
  description?: string;
  visibleText: string;
  wordCount: number;
  mixedContent: boolean;
  headersSnapshot: Record<string, string | null>;
}

/* ============================================
 * Shared utility functions
 * ============================================ */

export function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

export function gradeFromScore(score: number): ScanResult["grade"] {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 50) return "D";
  return "F";
}

export function makeId(prefix: string, i: number) {
  return `${prefix}-${i.toString().padStart(3, "0")}`;
}

export function modeLabel(mode: ScanMode): string {
  return SCAN_MODES.find((m) => m.id === mode)?.label || mode;
}

export function sevRank(s: Severity): number {
  return { critical: 0, high: 1, medium: 2, low: 3, info: 4 }[s];
}

export function normalizeSeverity(s: any): Severity {
  const v = String(s || "").toLowerCase();
  if (["critical", "high", "medium", "low", "info"].includes(v)) return v as Severity;
  return "medium";
}

export function safeParseJson(s: string): any {
  if (!s) return null;
  let cleaned = s.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  }
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    cleaned = cleaned.slice(first, last + 1);
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

/* ============================================
 * HTML helpers
 * ============================================ */

export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function extractMetaTag(html: string, name: string): string | undefined {
  const re1 = new RegExp(
    `<meta\\s+name=["']${name}["']\\s+content=["']([\\s\\S]*?)["']`,
    "i"
  );
  const m1 = html.match(re1);
  if (m1) return m1[1].trim();
  const re2 = new RegExp(
    `<meta\\s+property=["']${name}["']\\s+content=["']([\\s\\S]*?)["']`,
    "i"
  );
  const m2 = html.match(re2);
  if (m2) return m2[1].trim();
  return undefined;
}

export function extractTitleAndDescription(html: string): {
  title?: string;
  description?: string;
} {
  let title: string | undefined;
  let description: string | undefined;
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) title = titleMatch[1].replace(/\s+/g, " ").trim();
  description = extractMetaTag(html, "description");
  return { title, description };
}

export function countWords(text: string): number {
  if (!text) return 0;
  const words = text.split(/\s+/).filter((w) => w.replace(/[^\w'-]/g, "").length > 0);
  return words.length;
}

export function detectMixedContent(html: string, isHttps: boolean): boolean {
  if (!isHttps) return false;
  return /\s(?:src|href)\s*=\s*["']http:\/\//i.test(html);
}

export function buildExcerptForLLM(text: string, maxChars = 6000): string {
  if (text.length <= maxChars) return text;
  const headLen = Math.floor(maxChars * 0.5);
  const tailLen = Math.floor(maxChars * 0.3);
  const midStart = Math.floor((text.length - tailLen) / 2);
  const head = text.slice(0, headLen);
  const middle = text.slice(midStart, midStart + (maxChars - headLen - tailLen));
  const tail = text.slice(text.length - tailLen);
  return `${head}\n…\n${middle}\n…\n${tail}`;
}

export function sendEvent(controller: ReadableStreamDefaultController, evt: ProgressEvent) {
  const payload = `data: ${JSON.stringify(evt)}\n\n`;
  controller.enqueue(new TextEncoder().encode(payload));
}
