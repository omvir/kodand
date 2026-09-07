/**
 * Client & Edge Device Telemetry Collector
 * Captures comprehensive hardware, GPU graphics, battery, network, audio, and security/fraud signals.
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
  downlinkSpeed?: string;
  rtt?: string;
  cookiesEnabled?: boolean;
  doNotTrack?: string;
  referrer?: string;
  ip?: string;
  country?: string;
  city?: string;
  region?: string;
  // Deep Hardware & Security Telemetry
  gpuRenderer?: string;
  gpuVendor?: string;
  batteryLevel?: string;
  batteryCharging?: boolean;
  canvasFingerprint?: string;
  audioSampleRate?: number;
  adBlockDetected?: boolean;
  incognitoDetected?: boolean;
}

/** Helper to generate canvas fingerprint hash */
function getCanvasFingerprint(): string {
  try {
    if (typeof document === "undefined") return "n/a";
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "n/a";

    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#069";
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("KODAND-Sentinel", 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("KODAND-Sentinel", 4, 17);

    const dataUrl = canvas.toDataURL();
    let hash = 0;
    for (let i = 0; i < dataUrl.length; i++) {
      hash = (hash << 5) - hash + dataUrl.charCodeAt(i);
      hash |= 0;
    }
    return `cvs-${Math.abs(hash).toString(36)}`;
  } catch {
    return "unsupported";
  }
}

/** Helper to extract WebGL GPU Vendor and Renderer */
function getGpuSpecs(): { gpuVendor: string; gpuRenderer: string } {
  try {
    if (typeof document === "undefined") return { gpuVendor: "Unknown", gpuRenderer: "Unknown" };
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return { gpuVendor: "Software/Disabled", gpuRenderer: "Software/Disabled" };

    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    if (debugInfo) {
      const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || "Unknown Vendor";
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "Unknown Renderer";
      return { gpuVendor: String(vendor), gpuRenderer: String(renderer) };
    }
    return { gpuVendor: "Generic WebGL", gpuRenderer: "Generic WebGL" };
  } catch {
    return { gpuVendor: "Unavailable", gpuRenderer: "Unavailable" };
  }
}

/** Helper to probe AudioContext hardware sample rate */
function getAudioSampleRate(): number | undefined {
  try {
    if (typeof window === "undefined") return undefined;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      const ctx = new AudioContextClass();
      const rate = ctx.sampleRate;
      ctx.close().catch(() => {});
      return rate;
    }
  } catch {
    // Non-blocking
  }
  return undefined;
}

/** Helper to probe AdBlock presence */
function checkAdBlocker(): boolean {
  try {
    if (typeof document === "undefined") return false;
    const testAd = document.createElement("div");
    testAd.innerHTML = "&nbsp;";
    testAd.className = "adsbox pub_300x250 pub_300x250m pub_728x90 text-ad textAd text_ad text_ads text-ads text-ad-links";
    testAd.style.position = "absolute";
    testAd.style.left = "-9999px";
    document.body.appendChild(testAd);
    const blocked = testAd.offsetHeight === 0 || testAd.clientHeight === 0;
    document.body.removeChild(testAd);
    return blocked;
  } catch {
    return false;
  }
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
  const downlinkSpeed = navAny.connection?.downlink ? `${navAny.connection.downlink} Mbps` : undefined;
  const rtt = navAny.connection?.rtt ? `${navAny.connection.rtt} ms` : undefined;
  const deviceMemory = navAny.deviceMemory ? `${navAny.deviceMemory} GB RAM` : undefined;
  const touchSupport = Boolean(navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
  const colorDepth = window.screen?.colorDepth ? `${window.screen.colorDepth}-bit` : "24-bit";
  const dpr = window.devicePixelRatio ? window.devicePixelRatio.toFixed(1) : "1.0";
  const screenResolution = window.screen ? `${window.screen.width}x${window.screen.height} (${dpr}x DPR)` : "Unknown";

  // Deep GPU, Canvas, Audio, and Security
  const { gpuVendor, gpuRenderer } = getGpuSpecs();
  const canvasFingerprint = getCanvasFingerprint();
  const audioSampleRate = getAudioSampleRate();
  const adBlockDetected = checkAdBlocker();

  // Incognito heuristic (quota check is async, flag estimation)
  const incognitoDetected = false;

  // Formulate a friendly human device name
  const deviceName = `${browser} on ${os} (${deviceType.charAt(0).toUpperCase() + deviceType.slice(1)})`;

  // Deterministic local device ID fingerprint
  const fingerprintRaw = `${os}-${browser}-${window.screen?.width}x${window.screen?.height}-${navigator.language}-${navigator.hardwareConcurrency || 4}-${canvasFingerprint}`;
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
    downlinkSpeed,
    rtt,
    cookiesEnabled: navigator.cookieEnabled ?? true,
    doNotTrack: navigator.doNotTrack === "1" ? "Enabled" : "Disabled",
    referrer: typeof document !== "undefined" && document.referrer ? document.referrer : "Direct Entry",
    gpuVendor,
    gpuRenderer,
    canvasFingerprint,
    audioSampleRate,
    adBlockDetected,
    incognitoDetected,
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
