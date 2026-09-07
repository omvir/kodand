/**
 * Client & Edge Device Telemetry Collector
 * Captures comprehensive device, browser, hardware, network, and geolocation details.
 */

export interface DeviceTelemetry {
  deviceId?: string;
  deviceName?: string;
  userAgent?: string;
  browser?: string;
  os?: string;
  deviceType?: "desktop" | "mobile" | "tablet";
  screenResolution?: string;
  colorDepth?: string;
  touchSupport?: boolean;
  language?: string;
  languages?: string[];
  timeZone?: string;
  platform?: string;
  hardwareConcurrency?: number;
  deviceMemory?: string;
  connectionType?: string;
  cookiesEnabled?: boolean;
  doNotTrack?: string;
  referrer?: string;
  ip?: string;
  country?: string;
  city?: string;
  region?: string;
}

/** Client-side helper to collect maximum device specifications */
export function getClientDeviceSpecs(): DeviceTelemetry {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      deviceType: "desktop",
      language: "en",
    };
  }

  const ua = navigator.userAgent;

  // Detect OS
  let os = "Unknown OS";
  if (/windows nt 10/i.test(ua)) os = "Windows 10/11";
  else if (/windows nt 6\.3/i.test(ua)) os = "Windows 8.1";
  else if (/windows nt 6\.1/i.test(ua)) os = "Windows 7";
  else if (/windows/i.test(ua)) os = "Windows";
  else if (/macintosh|mac os x/i.test(ua)) os = "macOS";
  else if (/iphone/i.test(ua)) os = "iOS (iPhone)";
  else if (/ipad/i.test(ua)) os = "iPadOS";
  else if (/android/i.test(ua)) os = "Android";
  else if (/cros/i.test(ua)) os = "ChromeOS";
  else if (/linux/i.test(ua)) os = "Linux";

  // Detect Browser
  let browser = "Unknown Browser";
  if (/edg/i.test(ua)) browser = "Microsoft Edge";
  else if (/chrome|crios/i.test(ua)) browser = "Google Chrome";
  else if (/firefox|fxios/i.test(ua)) browser = "Mozilla Firefox";
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = "Apple Safari";
  else if (/opera|opr/i.test(ua)) browser = "Opera";
  else if (/brave/i.test(ua)) browser = "Brave";

  // Detect Device Type
  let deviceType: "desktop" | "mobile" | "tablet" = "desktop";
  if (/ipad|tablet/i.test(ua)) {
    deviceType = "tablet";
  } else if (/mobile|iphone|android/i.test(ua)) {
    deviceType = "mobile";
  }

  // Network & Memory (navigator extensions)
  const navAny = navigator as any;
  const connectionType = navAny.connection?.effectiveType || navAny.connection?.type || "broadband/wifi";
  const deviceMemory = navAny.deviceMemory ? `${navAny.deviceMemory} GB RAM` : undefined;
  const touchSupport = Boolean(navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
  const colorDepth = window.screen?.colorDepth ? `${window.screen.colorDepth}-bit` : "24-bit";
  const dpr = window.devicePixelRatio ? window.devicePixelRatio.toFixed(1) : "1.0";
  const screenResolution = window.screen ? `${window.screen.width}x${window.screen.height} (${dpr}x DPR)` : "Unknown";

  // Formulate a friendly human device name
  const deviceName = `${browser} on ${os} (${deviceType.charAt(0).toUpperCase() + deviceType.slice(1)})`;

  // Deterministic local device ID fingerprint
  const fingerprintRaw = `${os}-${browser}-${window.screen?.width}x${window.screen?.height}-${navigator.language}-${navigator.hardwareConcurrency || 4}`;
  let hash = 0;
  for (let i = 0; i < fingerprintRaw.length; i++) {
    hash = (hash << 5) - hash + fingerprintRaw.charCodeAt(i);
    hash |= 0;
  }
  const deviceId = `dev-${Math.abs(hash).toString(36)}`;

  return {
    deviceId,
    deviceName,
    userAgent: ua,
    browser,
    os,
    deviceType,
    screenResolution,
    colorDepth,
    touchSupport,
    language: navigator.language || "en-US",
    languages: navigator.languages ? Array.from(navigator.languages) : [navigator.language || "en"],
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    platform: navigator.platform || "unknown",
    hardwareConcurrency: navigator.hardwareConcurrency || 4,
    deviceMemory,
    connectionType,
    cookiesEnabled: navigator.cookieEnabled ?? true,
    doNotTrack: navigator.doNotTrack === "1" ? "Enabled" : "Disabled",
    referrer: typeof document !== "undefined" && document.referrer ? document.referrer : "Direct Entry",
  };
}

/** Edge server-side helper to parse request headers and merge with client specs */
export function parseEdgeClientInfo(headers: Headers): Partial<DeviceTelemetry> {
  const ua = headers.get("user-agent") || "";
  const ip =
    headers.get("cf-connecting-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "127.0.0.1";

  const country = headers.get("cf-ipcountry") || "IN";
  const city = headers.get("cf-ipcity") || "Mumbai";
  const region = headers.get("cf-region") || headers.get("cf-region-code") || undefined;

  // Detect OS
  let os = "Unknown OS";
  if (/windows nt 10/i.test(ua)) os = "Windows 10/11";
  else if (/windows/i.test(ua)) os = "Windows";
  else if (/macintosh|mac os x/i.test(ua)) os = "macOS";
  else if (/iphone/i.test(ua)) os = "iOS (iPhone)";
  else if (/ipad/i.test(ua)) os = "iPadOS";
  else if (/android/i.test(ua)) os = "Android";
  else if (/linux/i.test(ua)) os = "Linux";

  // Detect Browser
  let browser = "Unknown Browser";
  if (/edg/i.test(ua)) browser = "Microsoft Edge";
  else if (/chrome|crios/i.test(ua)) browser = "Google Chrome";
  else if (/firefox|fxios/i.test(ua)) browser = "Mozilla Firefox";
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = "Apple Safari";

  let deviceType: "desktop" | "mobile" | "tablet" = "desktop";
  if (/ipad|tablet/i.test(ua)) deviceType = "tablet";
  else if (/mobile|iphone|android/i.test(ua)) deviceType = "mobile";

  const deviceName = `${browser} on ${os}`;

  return {
    deviceId: `dev-${Math.abs(simpleHash(ua + ip)).toString(36)}`,
    deviceName,
    userAgent: ua,
    browser,
    os,
    deviceType,
    ip,
    country,
    city,
    region,
  };
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
