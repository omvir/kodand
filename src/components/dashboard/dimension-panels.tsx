"use client";

import * as React from "react";
import {
  AccessibilityDimension,
  PerformanceDimension,
  ScanResult,
  SeoDimension,
} from "@/lib/audit-types";
import { CheckCircle2, XCircle } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Stat } from "./security-intel-panel";
import { FindingsList, a11yItem, perfItem, seoItem } from "./findings-table";
import { ContentMetricsDashboard } from "./content-metrics-panel";
import { SecurityIntelDashboard } from "./security-intel-panel";

export function SeoSignalsDashboard({ dim }: { dim: SeoDimension }) {
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

export function PerformanceMetricsDashboard({ dim }: { dim: PerformanceDimension }) {
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

export function AccessibilityFindingsDashboard({ dim }: { dim: AccessibilityDimension }) {
  return (
    <div className="space-y-3">
      {dim.summary && <p className="text-xs text-foreground/80 italic">{dim.summary}</p>}
      <FindingsList items={dim.findings.map(a11yItem)} defaultOpenCount={2} />
    </div>
  );
}

export function FullScanTabsDashboard({ result }: { result: ScanResult }) {
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
