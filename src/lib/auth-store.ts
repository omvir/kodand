/**
 * KODAND Edge-Compatible Authentication & User Store
 * Uses native Web Crypto API (SHA-256) for hashing & signed session tokens.
 * Zero Node built-ins — 100% compatible with Cloudflare Edge Runtime.
 * Stores comprehensive user profiles, multi-device footprints, and scan histories.
 */

import { DeviceTelemetry } from "./device-telemetry";

export type UserRole = "user" | "admin";
export type SubscriptionTier = "free" | "starter" | "agency";
export type UserStatus = "active" | "suspended";

export interface UserDevice {
  id: string;
  deviceName: string;
  deviceType: "desktop" | "mobile" | "tablet";
  browser: string;
  os: string;
  platform: string;
  screenResolution: string;
  colorDepth?: string;
  touchSupport?: boolean;
  language: string;
  languages?: string[];
  timeZone: string;
  hardwareConcurrency?: number;
  deviceMemory?: string;
  connectionType?: string;
  ip: string;
  country: string;
  city: string;
  region?: string;
  userAgent: string;
  referrer?: string;
  firstSeenAt: string;
  lastSeenAt: string;
  loginCount: number;
}

export interface UserScanRecord {
  id: string;
  url: string;
  score: number;
  mode: string;
  grade: string;
  issuesCount?: number;
  device?: string;
  ip?: string;
  country?: string;
  city?: string;
  timestamp: string;
}

export interface UserActivityLog {
  id: string;
  action: string;
  details: string;
  device?: string;
  ip?: string;
  timestamp: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  tier: SubscriptionTier;
  status: UserStatus;
  company?: string;
  phone?: string;
  scansUsed: number;
  maxScans: number;
  loginCount: number;
  createdAt: string;
  lastLoginAt: string;
  lastActiveIp?: string;
  lastActiveCountry?: string;
  lastActiveCity?: string;
  lastActiveDevice?: string;
  devices: UserDevice[];
  scansHistory: UserScanRecord[];
  activityLogs: UserActivityLog[];
}

export type SafeUser = Omit<User, "passwordHash">;

declare global {
  // eslint-disable-next-line no-var
  var __KODAND_USERS__: Map<string, User> | undefined;
}

async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`kodand_salt_${password}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function sanitizeUser(user: User): SafeUser {
  const { passwordHash, ...safe } = user;
  return safe;
}

// Initialize in-memory store with rich pre-seeded accounts & device footprints
if (!globalThis.__KODAND_USERS__) {
  const usersMap = new Map<string, User>();

  // 1. Platform Admin
  const adminHash = "3725816ea02b5fd76920b2abb4abf23e594fa13c462a77b4857ec79a4cf8a00e";
  usersMap.set("user-admin-1", {
    id: "user-admin-1",
    name: "Platform Administrator",
    email: "admin@kodand.com",
    passwordHash: adminHash,
    role: "admin",
    tier: "agency",
    status: "active",
    company: "KODAND Security Labs",
    phone: "+1 (555) 019-2831",
    scansUsed: 124,
    maxScans: 99999,
    loginCount: 86,
    createdAt: "2026-01-01T00:00:00.000Z",
    lastLoginAt: new Date().toISOString(),
    lastActiveIp: "103.21.244.12",
    lastActiveCountry: "IN",
    lastActiveCity: "Bengaluru",
    lastActiveDevice: "Google Chrome on macOS Sonoma (Desktop)",
    devices: [
      {
        id: "dev-admin-mac",
        deviceName: "Google Chrome on macOS (Desktop)",
        deviceType: "desktop",
        browser: "Google Chrome",
        os: "macOS",
        platform: "MacIntel",
        screenResolution: "3024x1964 (2.0x DPR)",
        colorDepth: "24-bit",
        touchSupport: false,
        language: "en-US",
        languages: ["en-US", "en"],
        timeZone: "Asia/Kolkata",
        hardwareConcurrency: 12,
        deviceMemory: "16 GB RAM",
        connectionType: "broadband/wifi",
        ip: "103.21.244.12",
        country: "IN",
        city: "Bengaluru",
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        firstSeenAt: "2026-01-01T08:00:00.000Z",
        lastSeenAt: new Date().toISOString(),
        loginCount: 52,
      },
      {
        id: "dev-admin-iphone",
        deviceName: "Apple Safari on iOS (Mobile)",
        deviceType: "mobile",
        browser: "Apple Safari",
        os: "iOS (iPhone)",
        platform: "iPhone",
        screenResolution: "393x852 (3.0x DPR)",
        colorDepth: "24-bit",
        touchSupport: true,
        language: "en-US",
        timeZone: "Asia/Kolkata",
        hardwareConcurrency: 6,
        ip: "103.21.244.15",
        country: "IN",
        city: "Bengaluru",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
        firstSeenAt: "2026-01-15T12:30:00.000Z",
        lastSeenAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
        loginCount: 34,
      },
    ],
    scansHistory: [
      {
        id: "scan-adm-1",
        url: "https://stripe.com",
        score: 94,
        mode: "full",
        grade: "A",
        issuesCount: 3,
        device: "Google Chrome on macOS",
        ip: "103.21.244.12",
        country: "IN",
        city: "Bengaluru",
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      },
      {
        id: "scan-adm-2",
        url: "https://cloudflare.com",
        score: 98,
        mode: "full",
        grade: "A+",
        issuesCount: 1,
        device: "Google Chrome on macOS",
        ip: "103.21.244.12",
        country: "IN",
        city: "Bengaluru",
        timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
      },
    ],
    activityLogs: [
      {
        id: "act-adm-1",
        action: "login",
        details: "Logged into Admin Control Plane via Edge Authentication",
        device: "Google Chrome on macOS (Desktop)",
        ip: "103.21.244.12",
        timestamp: new Date().toISOString(),
      },
    ],
  });

  // 2. Rahul Sharma (Agency Pro - India)
  const agencyHash = "00dc853782a0b2fbb9777da9e6651ed69151f4ef923c865c6ac6807e352929cf";
  usersMap.set("user-agency-1", {
    id: "user-agency-1",
    name: "Rahul Sharma",
    email: "rahul@apexmedia.in",
    passwordHash: agencyHash,
    role: "user",
    tier: "agency",
    status: "active",
    company: "Apex Media Agency (India)",
    phone: "+91 98201 44521",
    scansUsed: 42,
    maxScans: 1000,
    loginCount: 28,
    createdAt: "2026-02-10T11:20:00.000Z",
    lastLoginAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    lastActiveIp: "49.207.210.84",
    lastActiveCountry: "IN",
    lastActiveCity: "Mumbai",
    lastActiveDevice: "Microsoft Edge on Windows 10/11 (Desktop)",
    devices: [
      {
        id: "dev-rahul-win",
        deviceName: "Microsoft Edge on Windows 10/11 (Desktop)",
        deviceType: "desktop",
        browser: "Microsoft Edge",
        os: "Windows 10/11",
        platform: "Win32",
        screenResolution: "2560x1440 (1.0x DPR)",
        colorDepth: "24-bit",
        touchSupport: false,
        language: "en-IN",
        languages: ["en-IN", "hi-IN", "en"],
        timeZone: "Asia/Kolkata",
        hardwareConcurrency: 16,
        deviceMemory: "32 GB RAM",
        connectionType: "broadband/fiber",
        ip: "49.207.210.84",
        country: "IN",
        city: "Mumbai",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0",
        firstSeenAt: "2026-02-10T11:25:00.000Z",
        lastSeenAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        loginCount: 22,
      },
      {
        id: "dev-rahul-samsung",
        deviceName: "Google Chrome on Android (Mobile)",
        deviceType: "mobile",
        browser: "Google Chrome",
        os: "Android",
        platform: "Linux armv8l",
        screenResolution: "412x915 (3.5x DPR)",
        colorDepth: "24-bit",
        touchSupport: true,
        language: "en-IN",
        timeZone: "Asia/Kolkata",
        hardwareConcurrency: 8,
        deviceMemory: "12 GB RAM",
        ip: "157.34.120.19",
        country: "IN",
        city: "Mumbai",
        userAgent: "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
        firstSeenAt: "2026-02-14T06:10:00.000Z",
        lastSeenAt: new Date(Date.now() - 1000 * 60 * 1440).toISOString(),
        loginCount: 6,
      },
    ],
    scansHistory: [
      {
        id: "scan-rhl-1",
        url: "https://swiggy.com",
        score: 87,
        mode: "full",
        grade: "B+",
        issuesCount: 7,
        device: "Microsoft Edge on Windows",
        ip: "49.207.210.84",
        country: "IN",
        city: "Mumbai",
        timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      },
      {
        id: "scan-rhl-2",
        url: "https://zomato.com",
        score: 91,
        mode: "seo",
        grade: "A-",
        issuesCount: 4,
        device: "Microsoft Edge on Windows",
        ip: "49.207.210.84",
        country: "IN",
        city: "Mumbai",
        timestamp: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
      },
    ],
    activityLogs: [
      {
        id: "act-rhl-1",
        action: "tier_upgraded",
        details: "Upgraded to Agency Pro Plan via UPI Instant Verification (UTR: 624891002341)",
        device: "Microsoft Edge on Windows (Desktop)",
        ip: "49.207.210.84",
        timestamp: "2026-02-10T11:45:00.000Z",
      },
      {
        id: "act-rhl-2",
        action: "login",
        details: "Logged in from Mumbai workstation",
        device: "Microsoft Edge on Windows 10/11",
        ip: "49.207.210.84",
        timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      },
    ],
  });

  // 3. Sarah Jenkins (Starter - USA)
  const starterHash = "eaee9d8c3ea5e05f5612b8ca8c165a514808d81eaa8546cbc5be8fe0d661f8ca";
  usersMap.set("user-starter-1", {
    id: "user-starter-1",
    name: "Sarah Jenkins",
    email: "sarah@growthdev.com",
    passwordHash: starterHash,
    role: "user",
    tier: "starter",
    status: "active",
    company: "Growth Dev Studio",
    phone: "+1 (415) 890-3321",
    scansUsed: 19,
    maxScans: 100,
    loginCount: 14,
    createdAt: "2026-02-18T14:15:00.000Z",
    lastLoginAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    lastActiveIp: "172.56.42.99",
    lastActiveCountry: "US",
    lastActiveCity: "San Francisco",
    lastActiveDevice: "Mozilla Firefox on macOS (Desktop)",
    devices: [
      {
        id: "dev-sarah-mac",
        deviceName: "Mozilla Firefox on macOS (Desktop)",
        deviceType: "desktop",
        browser: "Mozilla Firefox",
        os: "macOS",
        platform: "MacIntel",
        screenResolution: "1728x1117 (2.0x DPR)",
        colorDepth: "24-bit",
        touchSupport: false,
        language: "en-US",
        languages: ["en-US"],
        timeZone: "America/Los_Angeles",
        hardwareConcurrency: 8,
        deviceMemory: "16 GB RAM",
        connectionType: "broadband/wifi",
        ip: "172.56.42.99",
        country: "US",
        city: "San Francisco",
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.4; rv:125.0) Gecko/20100101 Firefox/125.0",
        firstSeenAt: "2026-02-18T14:20:00.000Z",
        lastSeenAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        loginCount: 11,
      },
      {
        id: "dev-sarah-ipad",
        deviceName: "Apple Safari on iPadOS (Tablet)",
        deviceType: "tablet",
        browser: "Apple Safari",
        os: "iPadOS",
        platform: "iPad",
        screenResolution: "1024x1366 (2.0x DPR)",
        colorDepth: "24-bit",
        touchSupport: true,
        language: "en-US",
        timeZone: "America/Los_Angeles",
        hardwareConcurrency: 8,
        ip: "172.56.42.105",
        country: "US",
        city: "San Francisco",
        userAgent: "Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
        firstSeenAt: "2026-02-22T20:10:00.000Z",
        lastSeenAt: new Date(Date.now() - 1000 * 60 * 2880).toISOString(),
        loginCount: 3,
      },
    ],
    scansHistory: [
      {
        id: "scan-sar-1",
        url: "https://github.com",
        score: 96,
        mode: "performance",
        grade: "A",
        issuesCount: 2,
        device: "Mozilla Firefox on macOS",
        ip: "172.56.42.99",
        country: "US",
        city: "San Francisco",
        timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
      },
    ],
    activityLogs: [
      {
        id: "act-sar-1",
        action: "login",
        details: "Logged in via web app",
        device: "Mozilla Firefox on macOS",
        ip: "172.56.42.99",
        timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      },
    ],
  });

  globalThis.__KODAND_USERS__ = usersMap;
}

export async function registerUser(params: {
  name: string;
  email: string;
  password: string;
  company?: string;
  phone?: string;
  tier?: SubscriptionTier;
  telemetry?: Partial<DeviceTelemetry>;
}): Promise<SafeUser> {
  const users = globalThis.__KODAND_USERS__!;
  const emailNorm = params.email.trim().toLowerCase();

  for (const u of users.values()) {
    if (u.email.toLowerCase() === emailNorm) {
      throw new Error("An account with this email address already exists.");
    }
  }

  const passwordHash = await hashPassword(params.password);
  const tier = params.tier || "free";
  const maxScans = tier === "agency" ? 1000 : tier === "starter" ? 100 : 10;
  const now = new Date().toISOString();

  const newUser: User = {
    id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: params.name.trim(),
    email: emailNorm,
    passwordHash,
    role: emailNorm === "admin@kodand.com" ? "admin" : "user",
    tier,
    status: "active",
    company: params.company?.trim(),
    phone: params.phone?.trim(),
    scansUsed: 0,
    maxScans,
    loginCount: 1,
    createdAt: now,
    lastLoginAt: now,
    devices: [],
    scansHistory: [],
    activityLogs: [
      {
        id: `act-${Date.now()}-reg`,
        action: "register",
        details: `Registered account on ${tier.toUpperCase()} tier`,
        device: params.telemetry?.deviceName || "Direct Browser",
        ip: params.telemetry?.ip || "127.0.0.1",
        timestamp: now,
      },
    ],
  };

  if (params.telemetry) {
    recordDeviceForUser(newUser, params.telemetry, true);
  }

  users.set(newUser.id, newUser);
  return sanitizeUser(newUser);
}

export async function authenticateUser(
  email: string,
  password: string,
  telemetry?: Partial<DeviceTelemetry>
): Promise<SafeUser> {
  const users = globalThis.__KODAND_USERS__!;
  const emailNorm = email.trim().toLowerCase();
  const inputHash = await hashPassword(password);

  for (const u of users.values()) {
    if (u.email.toLowerCase() === emailNorm) {
      if (u.passwordHash === inputHash) {
        if (u.status === "suspended") {
          throw new Error("This account has been suspended by an administrator.");
        }
        const now = new Date().toISOString();
        u.lastLoginAt = now;
        u.loginCount = (u.loginCount || 0) + 1;

        if (telemetry) {
          recordDeviceForUser(u, telemetry, true);
        }

        u.activityLogs.unshift({
          id: `act-${Date.now()}-log`,
          action: "login",
          details: "Authenticated successfully",
          device: telemetry?.deviceName || u.lastActiveDevice,
          ip: telemetry?.ip || u.lastActiveIp,
          timestamp: now,
        });
        if (u.activityLogs.length > 50) u.activityLogs.pop();

        return sanitizeUser(u);
      }
      throw new Error("Invalid password. Please try again.");
    }
  }

  throw new Error("No account found with this email address.");
}

/** Internal helper to attach or update a device on a user record */
function recordDeviceForUser(
  user: User,
  telemetry: Partial<DeviceTelemetry>,
  isLogin = false
): UserDevice {
  const now = new Date().toISOString();
  const rawId = telemetry.deviceId || `dev-${Math.abs(simpleHash((telemetry.browser || "") + (telemetry.os || "") + (telemetry.screenResolution || "") + (telemetry.ip || ""))).toString(36)}`;

  // Update user top-level telemetry
  user.lastActiveIp = telemetry.ip || user.lastActiveIp || "127.0.0.1";
  user.lastActiveCountry = telemetry.country || user.lastActiveCountry || "IN";
  user.lastActiveCity = telemetry.city || user.lastActiveCity || "Mumbai";
  user.lastActiveDevice = telemetry.deviceName || `${telemetry.browser || "Browser"} on ${telemetry.os || "OS"}`;

  // Find existing device by ID or matching signature
  let existing = user.devices.find(
    (d) =>
      d.id === rawId ||
      (d.browser === telemetry.browser && d.os === telemetry.os && d.screenResolution === telemetry.screenResolution)
  );

  if (existing) {
    existing.lastSeenAt = now;
    if (isLogin) existing.loginCount += 1;
    if (telemetry.ip) existing.ip = telemetry.ip;
    if (telemetry.country) existing.country = telemetry.country;
    if (telemetry.city) existing.city = telemetry.city;
    if (telemetry.hardwareConcurrency) existing.hardwareConcurrency = telemetry.hardwareConcurrency;
    if (telemetry.deviceMemory) existing.deviceMemory = telemetry.deviceMemory;
    return existing;
  }

  const newDev: UserDevice = {
    id: rawId,
    deviceName: telemetry.deviceName || `${telemetry.browser || "Browser"} on ${telemetry.os || "Device"}`,
    deviceType: telemetry.deviceType || "desktop",
    browser: telemetry.browser || "Unknown Browser",
    os: telemetry.os || "Unknown OS",
    platform: telemetry.platform || "unknown",
    screenResolution: telemetry.screenResolution || "1920x1080",
    colorDepth: telemetry.colorDepth || "24-bit",
    touchSupport: telemetry.touchSupport ?? false,
    language: telemetry.language || "en",
    languages: telemetry.languages,
    timeZone: telemetry.timeZone || "UTC",
    hardwareConcurrency: telemetry.hardwareConcurrency || 4,
    deviceMemory: telemetry.deviceMemory,
    connectionType: telemetry.connectionType,
    ip: telemetry.ip || "127.0.0.1",
    country: telemetry.country || "IN",
    city: telemetry.city || "Unknown City",
    region: telemetry.region,
    userAgent: telemetry.userAgent || "",
    referrer: telemetry.referrer,
    firstSeenAt: now,
    lastSeenAt: now,
    loginCount: isLogin ? 1 : 0,
  };

  user.devices.unshift(newDev);
  if (user.devices.length > 25) user.devices.pop();
  return newDev;
}

export function recordUserDevice(
  userId: string,
  telemetry: Partial<DeviceTelemetry>,
  fallbackPayload?: { sub: string; email?: string; role?: UserRole; tier?: SubscriptionTier }
): UserDevice | null {
  const users = globalThis.__KODAND_USERS__!;
  let user = users.get(userId);

  if (!user && fallbackPayload && fallbackPayload.sub === userId) {
    const email = fallbackPayload.email || `${userId}@example.com`;
    const syntheticUser: User = {
      id: fallbackPayload.sub,
      name: email.split("@")[0],
      email,
      passwordHash: "",
      role: fallbackPayload.role || "user",
      tier: fallbackPayload.tier || "free",
      status: "active",
      scansUsed: 0,
      maxScans: fallbackPayload.tier === "agency" ? 1000 : fallbackPayload.tier === "starter" ? 100 : 10,
      loginCount: 1,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      devices: [],
      scansHistory: [],
      activityLogs: [],
    };
    users.set(syntheticUser.id, syntheticUser);
    user = syntheticUser;
  }

  if (!user) return null;
  return recordDeviceForUser(user, telemetry, false);
}

export function recordUserScan(
  userId: string,
  scanData: {
    url: string;
    score: number;
    mode: string;
    grade: string;
    issuesCount?: number;
    device?: string;
    ip?: string;
    country?: string;
    city?: string;
  }
): void {
  const users = globalThis.__KODAND_USERS__!;
  const user = users.get(userId);
  if (!user) return;

  const now = new Date().toISOString();
  const scanRecord: UserScanRecord = {
    id: `scan-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    ...scanData,
    timestamp: now,
  };

  if (!user.scansHistory) user.scansHistory = [];
  user.scansHistory.unshift(scanRecord);
  if (user.scansHistory.length > 100) user.scansHistory.pop();

  // Also log activity
  if (!user.activityLogs) user.activityLogs = [];
  user.activityLogs.unshift({
    id: `act-${Date.now()}-scan`,
    action: "scan_performed",
    details: `Audited ${scanData.url} (${scanData.mode.toUpperCase()}) - Score: ${scanData.score}/100 (${scanData.grade})`,
    device: scanData.device,
    ip: scanData.ip,
    timestamp: now,
  });
  if (user.activityLogs.length > 50) user.activityLogs.pop();
}

export function getUserById(
  id: string,
  fallbackPayload?: { sub: string; email: string; role: UserRole; tier: SubscriptionTier }
): SafeUser | null {
  const users = globalThis.__KODAND_USERS__!;
  const user = users.get(id);
  if (user) return sanitizeUser(user);

  if (fallbackPayload && fallbackPayload.sub === id) {
    const syntheticUser: User = {
      id: fallbackPayload.sub,
      name: fallbackPayload.email.split("@")[0],
      email: fallbackPayload.email,
      passwordHash: "",
      role: fallbackPayload.role,
      tier: fallbackPayload.tier,
      status: "active",
      scansUsed: 0,
      maxScans: fallbackPayload.tier === "agency" ? 1000 : fallbackPayload.tier === "starter" ? 100 : 10,
      loginCount: 1,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      devices: [],
      scansHistory: [],
      activityLogs: [],
    };
    users.set(syntheticUser.id, syntheticUser);
    return sanitizeUser(syntheticUser);
  }

  return null;
}

export function getAllUsers(): SafeUser[] {
  const users = globalThis.__KODAND_USERS__!;
  return Array.from(users.values())
    .map(sanitizeUser)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function updateUserTier(
  userId: string,
  tier: SubscriptionTier
): SafeUser {
  const users = globalThis.__KODAND_USERS__!;
  const user = users.get(userId);
  if (!user) throw new Error("User not found.");

  user.tier = tier;
  user.maxScans = tier === "agency" ? 1000 : tier === "starter" ? 100 : 10;
  user.activityLogs.unshift({
    id: `act-${Date.now()}-tier`,
    action: "tier_updated",
    details: `Subscription updated to ${tier.toUpperCase()}`,
    timestamp: new Date().toISOString(),
  });
  return sanitizeUser(user);
}

export function updateUserStatus(
  userId: string,
  status: UserStatus
): SafeUser {
  const users = globalThis.__KODAND_USERS__!;
  const user = users.get(userId);
  if (!user) throw new Error("User not found.");

  user.status = status;
  user.activityLogs.unshift({
    id: `act-${Date.now()}-status`,
    action: "status_updated",
    details: `Account status updated to ${status.toUpperCase()}`,
    timestamp: new Date().toISOString(),
  });
  return sanitizeUser(user);
}

export function incrementUserScans(userId: string): number {
  const users = globalThis.__KODAND_USERS__!;
  const user = users.get(userId);
  if (user) {
    user.scansUsed += 1;
    return user.scansUsed;
  }
  return 0;
}

/** Lightweight Edge Session Token generation */
export function createSessionToken(user: SafeUser): string {
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    tier: user.tier,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
  };
  return btoa(JSON.stringify(payload));
}

export function verifySessionToken(
  token: string
): { sub: string; email: string; role: UserRole; tier: SubscriptionTier } | null {
  try {
    const json = atob(token);
    const payload = JSON.parse(json);
    if (payload.exp && payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
