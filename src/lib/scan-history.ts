"use client";

import * as React from "react";
import {
  SCAN_HISTORY_KEY,
  SCAN_HISTORY_MAX,
  ScanHistoryEntry,
  ScanResult,
  TARGET_DOMAIN_KEY,
} from "./audit-types";

/**
 * localStorage-backed scan history + target-domain persistence for KODAND.
 *
 * The browser's localStorage IS the "use local storage of the browser to use
 * resource" the user asked for — we keep state client-side, no server-side
 * persistence, no account, fully anonymous.
 */

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/* ============================================
 * Target domain persistence (user sets once, all subsequent scans reuse)
 * ============================================ */

/** Read the saved target domain. Returns null if not set. */
export function readTargetDomain(): string | null {
  if (!isBrowser()) return null;
  const v = window.localStorage.getItem(TARGET_DOMAIN_KEY);
  return v && v.trim() ? v : null;
}

/** Persist a target domain. */
export function writeTargetDomain(domain: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(TARGET_DOMAIN_KEY, domain.trim());
    window.dispatchEvent(new Event("kodand:domain-changed"));
  } catch {
    /* ignore */
  }
}

/** Clear the saved target domain. */
export function clearTargetDomain(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(TARGET_DOMAIN_KEY);
    window.dispatchEvent(new Event("kodand:domain-changed"));
  } catch {
    /* ignore */
  }
}

/** React hook that subscribes to target-domain changes. */
export function useTargetDomain(): {
  domain: string | null;
  set: (d: string) => void;
  clear: () => void;
} {
  const [domain, setDomain] = React.useState<string | null>(null);

  React.useEffect(() => {
    setDomain(readTargetDomain());
    const onDomainChange = () => setDomain(readTargetDomain());
    const onStorage = (e: StorageEvent) => {
      if (e.key === TARGET_DOMAIN_KEY) setDomain(readTargetDomain());
    };
    window.addEventListener("kodand:domain-changed", onDomainChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("kodand:domain-changed", onDomainChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const set = React.useCallback((d: string) => writeTargetDomain(d), []);
  const clear = React.useCallback(() => clearTargetDomain(), []);
  return { domain, set, clear };
}

function safeParse(s: string | null): ScanHistoryEntry[] {
  if (!s) return [];
  try {
    const arr = JSON.parse(s);
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (e): e is ScanHistoryEntry =>
        e && typeof e.id === "string" && typeof e.url === "string"
    );
  } catch {
    return [];
  }
}

/** Read scan history from localStorage (newest first). */
export function readHistory(): ScanHistoryEntry[] {
  if (!isBrowser()) return [];
  return safeParse(window.localStorage.getItem(SCAN_HISTORY_KEY));
}

/** Write a full history array to localStorage. */
function writeHistory(entries: ScanHistoryEntry[]) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(
      SCAN_HISTORY_KEY,
      JSON.stringify(entries.slice(0, SCAN_HISTORY_MAX))
    );
  } catch {
    /* quota / disabled storage — ignore */
  }
}

/** Append a ScanResult to history (deduped by id+url+mode), newest first. */
export function appendHistoryFromResult(result: ScanResult) {
  const entry: ScanHistoryEntry = {
    id: result.id,
    url: result.url,
    mode: result.mode,
    modeLabel: result.modeLabel,
    score: Math.round(result.digitalHealthScore),
    grade: result.grade,
    scannedAt: result.scannedAt,
    summary: result.executiveSummary.slice(0, 200),
  };
  const existing = readHistory();
  const deduped = existing.filter(
    (e) => !(e.url === entry.url && e.mode === entry.mode && e.id === entry.id)
  );
  // Move to top if it's a re-run of an existing URL+mode
  const next = [entry, ...deduped.filter((e) => !(e.url === entry.url && e.mode === entry.mode))];
  writeHistory(next);
}

/** Remove a single entry by id. */
export function removeHistoryEntry(id: string) {
  writeHistory(readHistory().filter((e) => e.id !== id));
}

/** Clear all history. */
export function clearHistory() {
  writeHistory([]);
}

/** React hook that subscribes to scan-history changes from localStorage. */
export function useScanHistory(): {
  history: ScanHistoryEntry[];
  remove: (id: string) => void;
  clear: () => void;
  refresh: () => void;
} {
  const [history, setHistory] = React.useState<ScanHistoryEntry[]>([]);

  const refresh = React.useCallback(() => {
    setHistory(readHistory());
  }, []);

  React.useEffect(() => {
    refresh();
    // Cross-tab sync
    const onStorage = (e: StorageEvent) => {
      if (e.key === SCAN_HISTORY_KEY) refresh();
    };
    window.addEventListener("storage", onStorage);
    // Same-tab custom event (we dispatch this when we write from same tab)
    const onLocal = () => refresh();
    window.addEventListener("kodand:history-changed", onLocal as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("kodand:history-changed", onLocal as EventListener);
    };
  }, [refresh]);

  const remove = React.useCallback((id: string) => {
    removeHistoryEntry(id);
    // Notify same-tab listeners
    window.dispatchEvent(new Event("kodand:history-changed"));
  }, []);

  const clear = React.useCallback(() => {
    clearHistory();
    window.dispatchEvent(new Event("kodand:history-changed"));
  }, []);

  return { history, remove, clear, refresh };
}

/** Notify the hook that history was written (call after appendHistoryFromResult). */
export function notifyHistoryChanged() {
  if (!isBrowser()) return;
  window.dispatchEvent(new Event("kodand:history-changed"));
}
