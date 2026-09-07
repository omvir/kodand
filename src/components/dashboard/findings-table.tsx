"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AccessibilityFinding,
  ContentFinding,
  CveFinding,
  PerformanceFinding,
  ScanResult,
  SecurityFinding,
  SeoFinding,
  Severity,
} from "@/lib/audit-types";
import { ChevronDown, ChevronRight, ChevronUp, ListTree } from "lucide-react";
import { SEV_ORDER, severityStyle } from "./score-gauge";

export interface FindingItem {
  id: string;
  severity: Severity;
  title: string;
  category?: string;
  detail?: string;
  evidence?: string;
  fix?: string;
}

export function contentItem(f: ContentFinding): FindingItem {
  return { id: f.id, severity: f.severity, title: f.excerpt, category: f.type, detail: f.explanation, fix: f.suggestion };
}
export function securityItem(f: SecurityFinding): FindingItem {
  return { id: f.id, severity: f.severity, title: f.title, category: f.category, detail: f.detail, evidence: f.evidence, fix: f.fix };
}
export function seoItem(f: SeoFinding): FindingItem {
  return { id: f.id, severity: f.severity, title: f.title, category: f.category, detail: f.detail, evidence: f.evidence, fix: f.fix };
}
export function perfItem(f: PerformanceFinding): FindingItem {
  return { id: f.id, severity: f.severity, title: f.title, category: f.category, detail: f.detail, evidence: f.evidence, fix: f.fix };
}
export function a11yItem(f: AccessibilityFinding): FindingItem {
  return { id: f.id, severity: f.severity, title: f.title, category: f.category, detail: f.detail, evidence: f.evidence, fix: f.fix };
}
export function cveItem(c: CveFinding): FindingItem {
  return {
    id: c.id,
    severity: c.severity,
    title: `${c.cveId} · ${c.product}${c.version ? ` ${c.version}` : ""}`,
    category: "cve",
    detail: c.description,
    fix: `Patch or upgrade ${c.product}${c.version ? ` ${c.version}` : ""} to a non-vulnerable release. See NVD: https://nvd.nist.gov/vuln/detail/${c.cveId}`,
  };
}

export function allFindingItems(r: ScanResult): FindingItem[] {
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

export function severityCounts(items: FindingItem[]) {
  const c = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const f of items) c[f.severity]++;
  return c;
}

export function FindingCard({ item, defaultOpen = false }: { item: FindingItem; defaultOpen?: boolean }) {
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

export function FindingsList({ items, defaultOpenCount = 0 }: { items: FindingItem[]; defaultOpenCount?: number }) {
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
