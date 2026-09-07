"use client";

/* =============================================================================
 * KODAND — 360° Audit Dashboard (Composition Root)
 *
 * Modularized v2.0 architecture:
 *   - Lock-target screen + target domain state
 *   - 6 independent scan modes with tab-based focus
 *   - SSE streaming for real-time progress, live metrics, and activity logs
 *   - Modular dashboard panels, score gauges, intel, and findings tables
 * ============================================================================= */

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { XCircle } from "lucide-react";
import { downloadReportPdf } from "@/lib/pdf-report";
import {
  appendHistoryFromResult,
  notifyHistoryChanged,
  useScanHistory,
  useTargetDomain,
} from "@/lib/scan-history";
import {
  ProgressEvent,
  ScanMode,
  ScanResult,
} from "@/lib/audit-types";
import {
  INITIAL_METRICS,
  LogEntry,
  countFindings,
  foldEvent,
  isFindingLine,
} from "@/components/dashboard/dashboard-types";
import { AppHeader } from "@/components/layout/app-header";
import { AppFooter } from "@/components/layout/app-footer";
import { LockTargetScreen } from "@/components/dashboard/hero-lock-screen";
import { ModeStatusBar, ModeTabBar } from "@/components/dashboard/scan-mode-cards";
import {
  CompletedScansGrid,
  FocusedScanView,
  HomeActiveScan,
} from "@/components/dashboard/scan-results-panel";
import { DashboardSidebar } from "@/components/dashboard/scan-history-sidebar";
import { LiveActivityStream } from "@/components/dashboard/live-activity-stream";

let logCounter = 0;
function nextLogId() {
  logCounter += 1;
  return `log-${Date.now().toString(36)}-${logCounter}`;
}

export default function Home() {
  const { domain, set: setTargetDomain, clear: clearTargetDomain } = useTargetDomain();
  const { history, remove: removeHistory, clear: clearHistory } = useScanHistory();

  const [status, setStatus] = React.useState<"idle" | "scanning">("idle");
  const [currentMode, setCurrentMode] = React.useState<ScanMode | null>(null);
  const [viewMode, setViewMode] = React.useState<ScanMode>("security");
  const [activeScan, setActiveScan] = React.useState<HomeActiveScan | null>(null);
  const [completedScans, setCompletedScans] = React.useState<ScanResult[]>([]);
  const [logs, setLogs] = React.useState<LogEntry[]>([]);
  const [activityOpen, setActivityOpen] = React.useState(false);

  const abortControllerRef = React.useRef<AbortController | null>(null);

  const completedByMode = React.useMemo(() => {
    const map: Partial<Record<ScanMode, { score: number; grade: string; result: ScanResult }>> = {};
    for (const r of completedScans) {
      if (!map[r.mode]) {
        map[r.mode] = {
          score: Math.round(r.digitalHealthScore),
          grade: r.grade,
          result: r,
        };
      }
    }
    return map;
  }, [completedScans]);

  const focusedCompleted = completedByMode[viewMode]?.result ?? null;

  const recentScans = React.useMemo(() => {
    return history.map((h) => ({
      id: h.id,
      url: h.url,
      mode: h.mode,
      grade: h.grade,
      score: h.score,
      scannedAt: h.scannedAt,
    }));
  }, [history]);

  const addLog = React.useCallback(
    (kind: LogEntry["kind"], text: string, stage?: import("@/lib/audit-types").ScanStage) => {
      setLogs((prev) => [
        ...prev,
        {
          id: nextLogId(),
          ts: new Date().toISOString(),
          kind,
          text,
          stage,
        },
      ]);
    },
    []
  );

  const resetScanState = React.useCallback(() => {
    setStatus("idle");
    setCurrentMode(null);
    setActiveScan(null);
    abortControllerRef.current = null;
  }, []);

  const startScan = React.useCallback(
    async (targetUrl: string, mode: ScanMode) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setStatus("scanning");
      setCurrentMode(mode);
      setViewMode(mode);
      setActiveScan({
        mode,
        progress: 0,
        stage: "init",
        stageLabel: "Starting scan…",
        findingsCount: 0,
        metrics: { ...INITIAL_METRICS },
      });

      addLog("stage", `Starting ${mode.toUpperCase()} scan on ${targetUrl}`, "init");

      const handleEvent = (evt: ProgressEvent) => {
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
          setViewMode(result.mode);
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
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";

          for (const block of parts) {
            const trimmed = block.trim();
            if (!trimmed) continue;
            const lines = trimmed.split("\n");
            for (const line of lines) {
              if (line.startsWith("data:")) {
                const jsonStr = line.slice(5).trim();
                if (!jsonStr) continue;
                try {
                  const evt = JSON.parse(jsonStr) as ProgressEvent;
                  handleEvent(evt);
                } catch {
                  // ignore malformed lines
                }
              }
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          addLog("error", (err as Error).message || "Scan failed unexpectedly.");
          resetScanState();
        }
      }
    },
    [addLog, resetScanState]
  );

  const onPickMode = React.useCallback(
    (mode: ScanMode) => {
      if (!domain) return;
      startScan(domain, mode);
    },
    [domain, startScan]
  );

  const onFocusMode = React.useCallback((mode: ScanMode) => {
    setViewMode(mode);
  }, []);

  const onReRun = React.useCallback(
    ({ url, mode }: { url: string; mode: ScanMode }) => {
      setTargetDomain(url);
      startScan(url, mode);
    },
    [setTargetDomain, startScan]
  );

  const clearCompletedScans = React.useCallback(() => {
    setCompletedScans([]);
  }, []);

  // State A: No domain locked yet
  if (!domain) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <AppHeader />
        <LockTargetScreen
          onSubmit={setTargetDomain}
          recent={recentScans}
          onReRun={onReRun}
        />
        <AppFooter />
      </div>
    );
  }

  // State B: Domain is locked — Live interactive audit dashboard
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <AppHeader
        domain={domain}
        onChangeDomain={clearTargetDomain}
        scanning={status === "scanning"}
        onToggleActivity={() => setActivityOpen((v) => !v)}
        activityOpen={activityOpen}
      />

      {/* Top horizontal scan status overview bar */}
      <div className="border-b border-emerald-500/10 bg-card/30 backdrop-blur">
        <div className="mx-auto max-w-[1600px] px-3 sm:px-4 py-3">
          <ModeStatusBar
            currentMode={currentMode}
            completedByMode={completedByMode}
            disabled={status === "scanning"}
            onPick={onPickMode}
          />
        </div>
      </div>

      {/* 3-column dashboard layout */}
      <div className="flex-1 mx-auto w-full max-w-[1600px] grid grid-cols-1 lg:grid-cols-[260px_1fr_320px] gap-4 px-3 sm:px-4 py-4">
        {/* Left column: sidebar with modes & recent history */}
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

        {/* Center column: focused scan view */}
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

          {/* If there are other completed scans, show them in a grid below */}
          {completedScans.length > 1 && (
            <div className="pt-4 border-t border-emerald-500/15">
              <CompletedScansGrid
                scans={completedScans}
                onReRun={onPickMode}
                onClear={clearCompletedScans}
              />
            </div>
          )}
        </main>

        {/* Right column: live activity stream */}
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

      <AppFooter />
    </div>
  );
}
