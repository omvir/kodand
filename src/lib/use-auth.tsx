"use client";

import * as React from "react";
import { SafeUser } from "@/lib/auth-store";
import { getClientDeviceSpecs } from "@/lib/device-telemetry";

interface AuthContextType {
  user: SafeUser | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<SafeUser>;
  register: (name: string, email: string, pass: string, company?: string, phone?: string) => Promise<SafeUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<SafeUser | null>(null);
  const [loading, setLoading] = React.useState(true);

  // Sync client device specs with the edge server
  const syncDeviceSpecs = React.useCallback(async () => {
    try {
      const specs = getClientDeviceSpecs();
      await fetch("/api/auth/device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceSpecs: specs }),
      });
    } catch {
      // Non-blocking telemetry sync
    }
  }, []);

  const refreshUser = React.useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.authenticated && data.user) {
        setUser(data.user);
        if (typeof window !== "undefined") {
          localStorage.setItem("kodand_saas_tier", data.user.tier);
        }
        // Sync device in the background
        syncDeviceSpecs();
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [syncDeviceSpecs]);

  React.useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, pass: string): Promise<SafeUser> => {
    const specs = getClientDeviceSpecs();
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password: pass,
        deviceSpecs: specs,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Login failed.");
    }

    setUser(data.user);
    if (typeof window !== "undefined") {
      localStorage.setItem("kodand_saas_tier", data.user.tier);
    }
    return data.user;
  };

  const register = async (
    name: string,
    email: string,
    pass: string,
    company?: string,
    phone?: string
  ): Promise<SafeUser> => {
    const specs = getClientDeviceSpecs();
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password: pass,
        company,
        phone,
        deviceSpecs: specs,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Registration failed.");
    }

    setUser(data.user);
    if (typeof window !== "undefined") {
      localStorage.setItem("kodand_saas_tier", data.user.tier);
    }
    return data.user;
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("kodand_saas_tier");
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
