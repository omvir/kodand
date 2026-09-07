/**
 * KODAND scan endpoint — thin controller.
 *
 * POST /api/scan { url: string, mode: ScanMode }
 * Returns: text/event-stream of ProgressEvent items.
 *
 * All scanning logic lives in src/lib/scanners/*. This file only:
 *   1. Validates the request
 *   2. Creates the SSE stream
 *   3. Orchestrates the scan phases
 *   4. Sends progress events
 */

import {
  PageMeta,
  ProgressEvent,
  ScanMode,
  ScanResult,
} from "@/lib/audit-types";
import { readScanCache, writeScanCache } from "@/lib/scan-cache";
import {
  fetchPage,
  analyzeContent,
  analyzeSecurity,
  analyzeSeo,
  extractSeoChecks,
  analyzePerformance,
  extractPerformanceMetrics,
  analyzeAccessibility,
  sendEvent,
  modeLabel,
  computeDigitalHealthScore,
  buildExecutiveSummary,
  buildTopPriorities,
  gradeFromScore,
  type DimensionPack,
} from "@/lib/scanners";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  let body: { url?: string; mode?: ScanMode };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }
  const url = (body.url || "").trim();
  const mode = (body.mode as ScanMode) || "full";
  if (!url) return new Response("Missing url", { status: 400 });
  if (
    !["content", "security", "seo", "performance", "accessibility", "full"].includes(
      mode
    )
  ) {
    return new Response("Invalid mode", { status: 400 });
  }
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return new Response("Invalid url", { status: 400 });
  }
  if (!/^https?:$/.test(parsedUrl.protocol)) {
    return new Response("Only http(s) URLs are supported", { status: 400 });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: ProgressEvent) => sendEvent(controller, e);
      const startTime = Date.now();
      const scanId = `kodand-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;

      // Heartbeat keep-alive: emit a heartbeat every 12s
      const heartbeatTimer = setInterval(() => {
        try {
          sendEvent(controller, { type: "heartbeat" });
        } catch {
          /* controller already closed */
        }
      }, 12000);

      try {
        // Cache check
        const cached = readScanCache(url, mode);
        if (cached) {
          send({
            type: "stage",
            stage: "init",
            label: `Cached result available`,
            progress: 100,
            detail: `Returning cached scan from ${new Date(cached.scannedAt).toLocaleTimeString()}`,
          });
          send({
            type: "log",
            message: `Cache hit — returning prior ${modeLabel(mode)} scan for ${url}.`,
          });
          send({ type: "complete", result: cached });
          return;
        }

        send({
          type: "stage",
          stage: "init",
          label: `Initializing ${modeLabel(mode)} scan`,
          progress: 4,
          detail: `Target: ${url}`,
        });
        send({
          type: "log",
          message: `KODAND agent dispatched. Mode: ${modeLabel(mode)}. Target: ${url}`,
        });

        // Phase 1: fetch + parse
        const page = await fetchPage(url, send);
        if (!page) {
          controller.close();
          return;
        }

        const dims: ScanMode[] =
          mode === "full"
            ? ["content", "security", "seo", "performance", "accessibility"]
            : [mode];

        const dimWindow = 72 / dims.length;
        const meta: PageMeta = {
          title: page.title,
          description: page.description,
          url,
          httpStatus: page.httpStatus,
          finalUrl: page.finalUrl,
          contentType: page.contentType,
          server: page.server,
          wordCount: page.wordCount,
          fetchMs: page.fetchMs,
        };

        const pack: DimensionPack = {};

        for (let di = 0; di < dims.length; di++) {
          const dim = dims[di];
          const baseProgress = 24 + di * dimWindow;
          const endProgress = 24 + (di + 1) * dimWindow;

          if (dim === "content") {
            send({ type: "stage", stage: "content", label: "Content optimization analysis", progress: baseProgress });
            send({ type: "log", message: "Computing readability, tone, and keyword metrics…" });
            send({ type: "log", message: "Dispatching LLM content optimization review…" });
            pack.content = await analyzeContent(page.visibleText);
            send({ type: "log", message: `Content review complete: ${pack.content.findings.length} finding(s), readability ${Math.round(pack.content.metrics?.fleschReadingEase ?? 0)}/100 (${pack.content.metrics?.readingLevel || "—"}).` });
            send({ type: "stage", stage: "content", label: "Content analysis done", progress: endProgress });
          } else if (dim === "security") {
            send({ type: "stage", stage: "security-headers", label: "Security headers check", progress: baseProgress });
            const midProgress = baseProgress + (endProgress - baseProgress) * 0.3;
            send({ type: "stage", stage: "security-content", label: "Security content analysis", progress: midProgress });
            pack.security = await analyzeSecurity(page, send);
            send({ type: "log", message: `Security deep scan complete: ${pack.security.findings.length} finding(s), score ${Math.round(pack.security.score)}/100.` });
            if (pack.security.intel) {
              const intel = pack.security.intel;
              send({ type: "log", message: `Intel summary — ${intel.cveFindings.length} CVEs, ${intel.whois ? "WHOIS ✓" : "WHOIS ✗"}, ${intel.dns ? "DNS ✓" : "DNS ✗"}, ${intel.certificate ? "TLS ✓" : "TLS ✗"}, ${intel.certTransparency.length} CT-log entries, ${intel.discoveredSubdomains.length} subdomains.` });
            }
            send({ type: "stage", stage: "security-content", label: "Security deep scan done", progress: endProgress });
          } else if (dim === "seo") {
            send({ type: "stage", stage: "seo-meta", label: "SEO meta & on-page checks", progress: baseProgress });
            send({ type: "log", message: "Inspecting meta tags, headings, structured data…" });
            const midProgress = baseProgress + (endProgress - baseProgress) * 0.5;
            send({ type: "stage", stage: "seo-content", label: "SEO content analysis", progress: midProgress });
            send({ type: "log", message: "Dispatching LLM SEO content review…" });
            pack.seo = await analyzeSeo(page);
            send({ type: "log", message: `SEO review complete: ${pack.seo.findings.length} finding(s).` });
            send({ type: "stage", stage: "seo-content", label: "SEO analysis done", progress: endProgress });
          } else if (dim === "performance") {
            send({ type: "stage", stage: "performance-metrics", label: "Measuring page weight & assets", progress: baseProgress });
            send({ type: "log", message: "Counting scripts, stylesheets, images, inline blocks…" });
            const midProgress = baseProgress + (endProgress - baseProgress) * 0.5;
            send({ type: "stage", stage: "performance-analysis", label: "Performance analysis", progress: midProgress });
            send({ type: "log", message: "Dispatching LLM performance review…" });
            pack.performance = await analyzePerformance(page);
            send({ type: "log", message: `Performance review complete: ${pack.performance.findings.length} finding(s).` });
            send({ type: "stage", stage: "performance-analysis", label: "Performance analysis done", progress: endProgress });
          } else if (dim === "accessibility") {
            send({ type: "stage", stage: "accessibility-analysis", label: "Accessibility analysis", progress: baseProgress });
            send({ type: "log", message: "Checking alt text, labels, headings, ARIA…" });
            const midProgress = baseProgress + (endProgress - baseProgress) * 0.5;
            send({ type: "stage", stage: "accessibility-analysis", label: "WCAG content review", progress: midProgress });
            send({ type: "log", message: "Dispatching LLM WCAG review…" });
            pack.accessibility = await analyzeAccessibility(page);
            send({ type: "log", message: `Accessibility review complete: ${pack.accessibility.findings.length} finding(s).` });
            send({ type: "stage", stage: "accessibility-analysis", label: "Accessibility analysis done", progress: endProgress });
          }
        }

        // Score
        send({ type: "stage", stage: "score", label: "Computing score", progress: 96 });
        const digitalHealthScore = computeDigitalHealthScore(mode, pack);
        const grade = gradeFromScore(digitalHealthScore);
        send({ type: "log", message: `Score computed: ${Math.round(digitalHealthScore)}/100 (Grade ${grade}).` });

        // Finalize
        send({ type: "stage", stage: "finalize", label: "Finalizing report", progress: 99 });

        const topPriorities = buildTopPriorities(pack);
        const executiveSummary = buildExecutiveSummary({
          url: page.finalUrl,
          mode,
          modeLabel: modeLabel(mode),
          digitalHealthScore,
          grade,
          pack,
        });

        const result: ScanResult = {
          id: scanId,
          url,
          mode,
          modeLabel: modeLabel(mode),
          scannedAt: new Date().toISOString(),
          meta,
          content: pack.content,
          grammar: pack.content,
          security: pack.security,
          seo: pack.seo,
          performance: pack.performance,
          accessibility: pack.accessibility,
          digitalHealthScore,
          grade,
          executiveSummary,
          topPriorities,
        };

        writeScanCache(url, mode, result);

        send({ type: "stage", stage: "finalize", label: "Report ready", progress: 100 });
        send({ type: "complete", result });
        send({
          type: "log",
          message: `${modeLabel(mode)} scan complete in ${((Date.now() - startTime) / 1000).toFixed(1)}s. PDF report ready.`,
        });
      } catch (err) {
        const msg = (err as Error)?.message || "Unknown error during scan.";
        send({ type: "error", message: msg });
      } finally {
        clearInterval(heartbeatTimer);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
