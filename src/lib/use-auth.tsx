"use client";

import * as React from "react";
import { SafeUser } from "@/lib/auth-store";

interface AuthContextType {
  user: SafeUser | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<SafeUser>;
  register: (name: string, email: string, pass: string, company?: string) => Promise<SafeUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<SafeUser | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refreshUser = React.useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.authenticated && data.user) {
        setUser(data.user);
        // Sync local storage tier
        if (typeof window !== "undefined") {
          localStorage.setItem("kodand_saas_tier", data.user.tier);
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, pass: string): Promise<SafeUser> => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pass }),
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

  const register = async (name: string, email: string, pass: string, company?: string): Promise<SafeUser> => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password: pass, company }),
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
