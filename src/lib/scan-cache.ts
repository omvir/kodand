/**
 * In-memory scan cache — prevents re-hitting external APIs (NVD, RDAP, crt.sh)
 * for the same URL+mode within a short window. This is the single most
 * effective way to avoid rate-limit / ban from the upstream services:
 *
 *   1. Repeat scans of the same URL within 5 minutes return cached results
 *      instantly without re-querying NVD / RDAP / crt.sh.
 *   2. Anti-ban: we never hit the same external API more than once per
 *      URL within the cache window.
 *
 * Also exposes per-domain rate-limiting helpers to keep us polite.
 */

import type { ScanMode, ScanResult } from "./audit-types";

interface CacheEntry {
  result: ScanResult;
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, CacheEntry>();

/** Compose a cache key for the (url, mode) pair. */
export function cacheKey(url: string, mode: ScanMode): string {
  try {
    const u = new URL(url);
    // Normalize: lowercase host + path without trailing slash + drop hash
    const host = u.host.toLowerCase();
    const path = u.pathname.replace(/\/$/, "") || "/";
    return `${mode}:${host}${path}`;
  } catch {
    return `${mode}:${url}`;
  }
}

/** Read a cached scan result. Returns null if missing or expired. */
export function readScanCache(url: string, mode: ScanMode): ScanResult | null {
  const key = cacheKey(url, mode);
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.result;
}

/** Write a scan result to the cache. */
export function writeScanCache(url: string, mode: ScanMode, result: ScanResult): void {
  const key = cacheKey(url, mode);
  cache.set(key, {
    result,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

/** Clear the entire cache. */
export function clearScanCache(): void {
  cache.clear();
}

/* ============================================
 * Per-domain rate limiting
 *
 * Tracks the last time we issued an external request to each host. Prevents
 * hammering the same domain (which is what gets you banned).
 * ============================================ */

const PER_DOMAIN_LAST_HIT = new Map<string, number>();
/** Min ms between requests to the same external host (per host). */
const MIN_INTERVAL_MS = 800;

/**
 * Wait until it is polite to issue another request to `host`.
 * Returns true if we waited, false if we proceeded immediately.
 */
export async function throttleForHost(host: string): Promise<boolean> {
  const key = host.toLowerCase();
  const last = PER_DOMAIN_LAST_HIT.get(key) || 0;
  const elapsed = Date.now() - last;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, MIN_INTERVAL_MS - elapsed));
    PER_DOMAIN_LAST_HIT.set(key, Date.now());
    return true;
  }
  PER_DOMAIN_LAST_HIT.set(key, Date.now());
  return false;
}
