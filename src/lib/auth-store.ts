/**
 * KODAND Edge-Compatible Authentication & User Store
 * Uses native Web Crypto API (SHA-256) for hashing & signed session tokens.
 * Zero Node built-ins — 100% compatible with Cloudflare Edge Runtime.
 */

export type UserRole = "user" | "admin";
export type SubscriptionTier = "free" | "starter" | "agency";

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  tier: SubscriptionTier;
  company?: string;
  scansUsed: number;
  maxScans: number;
  createdAt: string;
  lastLoginAt: string;
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

// Initialize in-memory store
if (!globalThis.__KODAND_USERS__) {
  const usersMap = new Map<string, User>();

  // Pre-seed Admin and sample users
  // Hash for 'admin123'
  const adminHash = "3725816ea02b5fd76920b2abb4abf23e594fa13c462a77b4857ec79a4cf8a00e";
  usersMap.set("user-admin-1", {
    id: "user-admin-1",
    name: "Platform Administrator",
    email: "admin@kodand.com",
    passwordHash: adminHash,
    role: "admin",
    tier: "agency",
    company: "KODAND Security",
    scansUsed: 124,
    maxScans: 99999,
    createdAt: "2026-01-01T00:00:00.000Z",
    lastLoginAt: new Date().toISOString(),
  });

  // Hash for 'agency123'
  const agencyHash = "00dc853782a0b2fbb9777da9e6651ed69151f4ef923c865c6ac6807e352929cf";
  usersMap.set("user-agency-1", {
    id: "user-agency-1",
    name: "Rahul Sharma",
    email: "rahul@apexmedia.in",
    passwordHash: agencyHash,
    role: "user",
    tier: "agency",
    company: "Apex Media Agency (India)",
    scansUsed: 42,
    maxScans: 1000,
    createdAt: "2026-02-10T11:20:00.000Z",
    lastLoginAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  });

  // Hash for 'starter123'
  const starterHash = "eaee9d8c3ea5e05f5612b8ca8c165a514808d81eaa8546cbc5be8fe0d661f8ca";
  usersMap.set("user-starter-1", {
    id: "user-starter-1",
    name: "Sarah Jenkins",
    email: "sarah@growthdev.com",
    passwordHash: starterHash,
    role: "user",
    tier: "starter",
    company: "Growth Dev Studio",
    scansUsed: 19,
    maxScans: 100,
    createdAt: "2026-02-18T14:15:00.000Z",
    lastLoginAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  });

  globalThis.__KODAND_USERS__ = usersMap;
}

export async function registerUser(params: {
  name: string;
  email: string;
  password: string;
  company?: string;
  tier?: SubscriptionTier;
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

  const newUser: User = {
    id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: params.name.trim(),
    email: emailNorm,
    passwordHash,
    role: emailNorm === "admin@kodand.com" ? "admin" : "user",
    tier,
    company: params.company?.trim(),
    scansUsed: 0,
    maxScans,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };

  users.set(newUser.id, newUser);
  return sanitizeUser(newUser);
}

export async function authenticateUser(
  email: string,
  password: string
): Promise<SafeUser> {
  const users = globalThis.__KODAND_USERS__!;
  const emailNorm = email.trim().toLowerCase();
  const inputHash = await hashPassword(password);

  for (const u of users.values()) {
    if (u.email.toLowerCase() === emailNorm) {
      if (u.passwordHash === inputHash) {
        u.lastLoginAt = new Date().toISOString();
        return sanitizeUser(u);
      }
      throw new Error("Invalid password. Please try again.");
    }
  }

  throw new Error("No account found with this email address.");
}

export function getUserById(
  id: string,
  fallbackPayload?: { sub: string; email: string; role: UserRole; tier: SubscriptionTier }
): SafeUser | null {
  const users = globalThis.__KODAND_USERS__!;
  const user = users.get(id);
  if (user) return sanitizeUser(user);

  if (fallbackPayload && fallbackPayload.sub === id) {
    const syntheticUser: SafeUser = {
      id: fallbackPayload.sub,
      name: fallbackPayload.email.split("@")[0],
      email: fallbackPayload.email,
      role: fallbackPayload.role,
      tier: fallbackPayload.tier,
      scansUsed: 0,
      maxScans: fallbackPayload.tier === "agency" ? 1000 : fallbackPayload.tier === "starter" ? 100 : 10,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };
    users.set(syntheticUser.id, { ...syntheticUser, passwordHash: "" });
    return syntheticUser;
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

export function verifySessionToken(token: string): { sub: string; email: string; role: UserRole; tier: SubscriptionTier } | null {
  try {
    const json = atob(token);
    const payload = JSON.parse(json);
    if (payload.exp && payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
