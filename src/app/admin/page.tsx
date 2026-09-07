"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/use-auth";
import { SafeUser, SubscriptionTier, UserDevice, UserScanRecord, UserStatus } from "@/lib/auth-store";
import { AppHeader } from "@/components/layout/app-header";
import { AppFooter } from "@/components/layout/app-footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TelemetryOverview } from "@/lib/admin-telemetry";
import {
  ShieldAlert,
  Activity,
  Globe2,
  Clock,
  ExternalLink,
  RefreshCw,
  Lock,
  Sparkles,
  Zap,
  TrendingUp,
  Layers,
  ShieldCheck,
  Users,
  UserCheck,
  Building2,
  Crown,
  ChevronDown,
  Download,
  Laptop,
  Smartphone,
  Tablet,
  Eye,
  X,
  MapPin,
  Cpu,
  Monitor,
  Search,
  CheckCircle2,
  AlertTriangle,
  History,
  Info,
} from "lucide-react";

export default function AdminMonitoringPage() {
  const { user: authUser } = useAuth();
  const [pin, setPin] = React.useState("");
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [authError, setAuthError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"users" | "telemetry">("users");

  const [stats, setStats] = React.useState<TelemetryOverview | null>(null);
  const [users, setUsers] = React.useState<SafeUser[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [modifyingTierId, setModifyingTierId] = React.useState<string | null>(null);

  // Deep user inspection modal state
  const [inspectingUser, setInspectingUser] = React.useState<SafeUser | null>(null);
  const [inspectModalTab, setInspectModalTab] = React.useState<"devices" | "scans" | "activity">("devices");

  const fetchAdminData = React.useCallback(async (authPin: string) => {
    setLoading(true);
    setAuthError(null);
    try {
      const [telemetryRes, usersRes] = await Promise.all([
        fetch(`/api/admin/telemetry?pin=${encodeURIComponent(authPin)}`),
        fetch(`/api/admin/users?pin=${encodeURIComponent(authPin)}`),
      ]);

      if (!telemetryRes.ok || !usersRes.ok) {
        throw new Error("Invalid Admin credentials. Access denied.");
      }

      const telemetryData = await telemetryRes.json();
      const usersData = await usersRes.json();

      setStats(telemetryData.stats);
      setUsers(usersData.users);
      setIsAuthenticated(true);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("kodand_admin_pin", authPin);
      }
    } catch (err: any) {
      setAuthError(err.message || "Failed to authenticate.");
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-login if logged in user has role === 'admin' or has session PIN
  React.useEffect(() => {
    if (authUser?.role === "admin") {
      fetchAdminData("kodand2026");
    } else if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("kodand_admin_pin");
      if (saved) {
        fetchAdminData(saved);
      }
    }
  }, [authUser, fetchAdminData]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;
    fetchAdminData(pin.trim());
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("kodand_admin_pin");
    }
    setIsAuthenticated(false);
    setPin("");
  };

  const handleUpdateTier = async (userId: string, newTier: SubscriptionTier) => {
    const currentPin = sessionStorage.getItem("kodand_admin_pin") || "kodand2026";
    setModifyingTierId(userId);
    try {
      const res = await fetch(`/api/admin/users?pin=${encodeURIComponent(currentPin)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, tier: newTier }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, tier: newTier, maxScans: data.user.maxScans } : u))
        );
        if (inspectingUser && inspectingUser.id === userId) {
          setInspectingUser({ ...inspectingUser, tier: newTier, maxScans: data.user.maxScans });
        }
      }
    } catch (err) {
      console.error("Failed to update tier", err);
    } finally {
      setModifyingTierId(null);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: UserStatus) => {
    const nextStatus = currentStatus === "active" ? "suspended" : "active";
    const currentPin = sessionStorage.getItem("kodand_admin_pin") || "kodand2026";
    setModifyingTierId(userId);
    try {
      const res = await fetch(`/api/admin/users?pin=${encodeURIComponent(currentPin)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status: nextStatus }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, status: nextStatus } : u))
        );
        if (inspectingUser && inspectingUser.id === userId) {
          setInspectingUser({ ...inspectingUser, status: nextStatus });
        }
      }
    } catch (err) {
      console.error("Failed to toggle status", err);
    } finally {
      setModifyingTierId(null);
    }
  };

  const triggerExport = (type: "users" | "devices" | "scans", format: "csv" | "json") => {
    const currentPin = sessionStorage.getItem("kodand_admin_pin") || "kodand2026";
    const url = `/api/admin/export?pin=${encodeURIComponent(currentPin)}&type=${type}&format=${format}`;
    window.open(url, "_blank");
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <AppHeader />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full border border-emerald-500/30 bg-zinc-950/80 shadow-2xl backdrop-blur-xl p-6">
            <div className="text-center mb-6">
              <div className="size-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                <Lock className="size-6" />
              </div>
              <h1 className="text-xl font-bold text-white">Admin Control Center</h1>
              <p className="text-xs text-muted-foreground mt-1">
                Enter your administrator PIN to monitor all users, inspect device footprints, and export audit trails.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter Admin PIN (Default: kodand2026)"
                  className="bg-zinc-900 border-zinc-700 text-center text-sm font-mono tracking-widest h-11"
                  autoFocus
                />
              </div>

              {authError && (
                <div className="p-2.5 rounded-lg border border-red-500/40 bg-red-950/20 text-red-300 text-xs text-center flex items-center justify-center gap-1.5">
                  <ShieldAlert className="size-3.5" /> {authError}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || !pin.trim()}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs h-10"
              >
                {loading ? "Authenticating..." : "Unlock Dashboard"}
              </Button>

              <div className="text-[11px] text-zinc-500 text-center">
                Protected via Cloudflare Edge Authentication & Web Crypto
              </div>
            </form>
          </Card>
        </main>
        <AppFooter />
      </div>
    );
  }

  const proCount = users.filter((u) => u.tier === "agency" || u.tier === "starter").length;
  const freeCount = users.filter((u) => u.tier === "free").length;
  const totalDevicesTracked = users.reduce((acc, u) => acc + (u.devices?.length || 0), 0);

  const filteredUsers = users.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.company && u.company.toLowerCase().includes(q)) ||
      (u.lastActiveCity && u.lastActiveCity.toLowerCase().includes(q)) ||
      (u.lastActiveCountry && u.lastActiveCountry.toLowerCase().includes(q)) ||
      (u.lastActiveDevice && u.lastActiveDevice.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <AppHeader />

      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 md:py-10 w-full">
        {/* Top Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 mb-8 border-b border-emerald-500/20">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] font-mono uppercase">
                Admin Control Plane
              </Badge>
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse" /> Connected to Cloudflare Edge
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              User & Device Telemetry Command Center
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Comprehensive device fingerprinting, session auditing, and instant CSV/JSON exports.
            </p>
          </div>

          {/* Action Toolbar & Export Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => triggerExport("users", "csv")}
                className="h-7 text-[11px] text-zinc-300 hover:text-emerald-400 hover:bg-zinc-800 font-medium px-2.5"
                title="Export all user accounts to CSV"
              >
                <Download className="size-3 mr-1 text-emerald-400" />
                Users CSV
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => triggerExport("devices", "csv")}
                className="h-7 text-[11px] text-zinc-300 hover:text-teal-400 hover:bg-zinc-800 font-medium px-2.5"
                title="Export all tracked user devices with hardware & network telemetry"
              >
                <Download className="size-3 mr-1 text-teal-400" />
                Devices CSV
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => triggerExport("users", "json")}
                className="h-7 text-[11px] text-zinc-300 hover:text-amber-400 hover:bg-zinc-800 font-medium px-2.5"
                title="Export complete nested JSON dossier"
              >
                <Download className="size-3 mr-1 text-amber-400" />
                Full JSON
              </Button>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const saved = sessionStorage.getItem("kodand_admin_pin") || "kodand2026";
                fetchAdminData(saved);
              }}
              disabled={loading}
              className="border-zinc-700 text-xs h-8"
            >
              <RefreshCw className={`size-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleLogout}
              className="text-xs text-muted-foreground hover:text-rose-300 h-8"
            >
              Lock
            </Button>
          </div>
        </div>

        {/* Global KPI Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border border-emerald-500/30 bg-zinc-950/70 p-4 rounded-xl">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
              <span>Total Registered Users</span>
              <Users className="size-4 text-emerald-400" />
            </div>
            <div className="text-2xl md:text-3xl font-extrabold text-white">
              {users.length}
            </div>
            <div className="text-[11px] text-zinc-400 mt-1">
              {proCount} Paid Subscribers · {freeCount} Free
            </div>
          </Card>

          <Card className="border border-teal-500/30 bg-zinc-950/70 p-4 rounded-xl">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
              <span>Tracked User Devices</span>
              <Laptop className="size-4 text-teal-400" />
            </div>
            <div className="text-2xl md:text-3xl font-extrabold text-white">
              {totalDevicesTracked}
            </div>
            <div className="text-[11px] text-teal-400/80 flex items-center gap-1 mt-1">
              <Cpu className="size-3" /> Cross-device hardware telemetry
            </div>
          </Card>

          <Card className="border border-amber-500/30 bg-zinc-950/70 p-4 rounded-xl">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
              <span>Total Platform Scans</span>
              <Activity className="size-4 text-amber-400" />
            </div>
            <div className="text-2xl md:text-3xl font-extrabold text-white">
              {stats?.totalScans.toLocaleString() ?? "—"}
            </div>
            <div className="text-[11px] text-zinc-400 mt-1">
              {stats?.uniqueDomains ?? 0} unique domains audited
            </div>
          </Card>

          <Card className="border border-emerald-500/30 bg-zinc-950/70 p-4 rounded-xl">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
              <span>Cloudflare Edge Speed</span>
              <Zap className="size-4 text-emerald-400" />
            </div>
            <div className="text-2xl md:text-3xl font-extrabold text-white">
              {stats?.averageDurationMs ?? "—"} ms
            </div>
            <div className="text-[11px] text-emerald-400 mt-1">
              Sub-second edge analysis
            </div>
          </Card>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6 border-b border-zinc-800 pb-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("users")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "users"
                  ? "bg-emerald-500 text-black shadow-md"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900"
              }`}
            >
              <Users className="size-4" />
              <span>User & Device Dossier ({users.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("telemetry")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "telemetry"
                  ? "bg-emerald-500 text-black shadow-md"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900"
              }`}
            >
              <Activity className="size-4" />
              <span>Global Scan Telemetry & Traffic</span>
            </button>
          </div>

          {activeTab === "users" && (
            <div className="relative w-full sm:w-72">
              <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search user, device, IP, city..."
                className="pl-8 text-xs bg-zinc-900/90 border-zinc-800 h-8"
              />
            </div>
          )}
        </div>

        {/* TAB 1: USERS MONITORING & DEVICE TRACKING */}
        {activeTab === "users" && (
          <Card className="border border-zinc-800 bg-zinc-950/60 p-6 rounded-2xl shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <UserCheck className="size-4 text-emerald-400" /> Registered User Accounts & Devices
                </h3>
                <p className="text-xs text-muted-foreground">
                  Click &quot;Inspect Details&quot; to review hardware specifications, registered devices, and user audit trails.
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-mono border-zinc-700">
                {filteredUsers.length} of {users.length} Users
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 font-mono">
                    <th className="pb-3">User & Status</th>
                    <th className="pb-3">Email & Contact</th>
                    <th className="pb-3">Plan Tier</th>
                    <th className="pb-3">Connected Devices</th>
                    <th className="pb-3">Scans Used</th>
                    <th className="pb-3">Last Active Location</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {filteredUsers.map((u) => {
                    const desktopCount = u.devices?.filter((d) => d.deviceType === "desktop").length || 0;
                    const mobileCount = u.devices?.filter((d) => d.deviceType === "mobile").length || 0;
                    const tabletCount = u.devices?.filter((d) => d.deviceType === "tablet").length || 0;

                    return (
                      <tr key={u.id} className="hover:bg-zinc-900/40 transition-colors">
                        {/* User & Status */}
                        <td className="py-3 font-semibold text-white">
                          <div className="flex items-center gap-2.5">
                            <div className="size-8 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center text-xs">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span>{u.name}</span>
                                {u.role === "admin" && (
                                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[9px] px-1 py-0">
                                    Admin
                                  </Badge>
                                )}
                              </div>
                              <div className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5">
                                <span
                                  className={`size-1.5 rounded-full ${
                                    u.status === "suspended" ? "bg-red-500" : "bg-emerald-400"
                                  }`}
                                />
                                <span className="capitalize font-mono">{u.status || "active"}</span>
                                <span className="text-zinc-600">·</span>
                                <span>{u.loginCount || 1} logins</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Email & Contact */}
                        <td className="py-3 text-zinc-300">
                          <div className="font-mono text-xs text-white">{u.email}</div>
                          {u.company && <div className="text-[11px] text-zinc-400">{u.company}</div>}
                          {u.phone && <div className="text-[10px] text-zinc-500 font-mono">{u.phone}</div>}
                        </td>

                        {/* Plan Tier */}
                        <td className="py-3">
                          <Badge
                            className={`text-[10px] font-mono uppercase ${
                              u.tier === "agency"
                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                : u.tier === "starter"
                                ? "bg-teal-500/20 text-teal-300 border-teal-500/40"
                                : "bg-zinc-800 text-zinc-400"
                            }`}
                          >
                            {u.tier === "agency" ? "Agency Pro" : u.tier === "starter" ? "Starter" : "Free"}
                          </Badge>
                        </td>

                        {/* Connected Devices */}
                        <td className="py-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge
                              variant="outline"
                              className="text-[10px] font-mono border-zinc-700 bg-zinc-900 text-zinc-300"
                            >
                              {u.devices?.length || 0} {u.devices?.length === 1 ? "device" : "devices"}
                            </Badge>
                            <div className="flex items-center gap-1 text-zinc-400">
                              {desktopCount > 0 && (
                                <span className="flex items-center text-[10px] bg-zinc-800/80 px-1 py-0.5 rounded" title={`${desktopCount} Desktop devices`}>
                                  <Laptop className="size-3 mr-0.5 text-zinc-300" /> {desktopCount}
                                </span>
                              )}
                              {mobileCount > 0 && (
                                <span className="flex items-center text-[10px] bg-zinc-800/80 px-1 py-0.5 rounded" title={`${mobileCount} Mobile devices`}>
                                  <Smartphone className="size-3 mr-0.5 text-zinc-300" /> {mobileCount}
                                </span>
                              )}
                              {tabletCount > 0 && (
                                <span className="flex items-center text-[10px] bg-zinc-800/80 px-1 py-0.5 rounded" title={`${tabletCount} Tablet devices`}>
                                  <Tablet className="size-3 mr-0.5 text-zinc-300" /> {tabletCount}
                                </span>
                              )}
                            </div>
                          </div>
                          {u.lastActiveDevice && (
                            <div className="text-[10px] text-zinc-500 truncate max-w-[180px] mt-1" title={u.lastActiveDevice}>
                              {u.lastActiveDevice}
                            </div>
                          )}
                        </td>

                        {/* Scans Used */}
                        <td className="py-3 font-mono">
                          <span className="font-bold text-white">{u.scansUsed}</span>
                          <span className="text-zinc-500"> / {u.maxScans}</span>
                        </td>

                        {/* Last Active Location */}
                        <td className="py-3 text-zinc-300">
                          <div className="flex items-center gap-1 text-xs">
                            <span>{u.lastActiveCountry === "IN" ? "🇮🇳" : u.lastActiveCountry === "US" ? "🇺🇸" : "🌐"}</span>
                            <span className="font-medium text-white">{u.lastActiveCity || "Unknown"}</span>
                            <span className="text-zinc-500 text-[10px]">({u.lastActiveCountry || "IN"})</span>
                          </div>
                          <div className="text-[10px] font-mono text-zinc-500 mt-0.5">
                            IP: {u.lastActiveIp || "127.0.0.1"}
                          </div>
                          <div className="text-[10px] text-zinc-500">
                            {new Date(u.lastLoginAt).toLocaleDateString()} {new Date(u.lastLoginAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setInspectingUser(u);
                                setInspectModalTab("devices");
                              }}
                              className="h-7 text-[10px] border-emerald-500/40 hover:bg-emerald-500/10 text-emerald-300 font-bold px-2.5"
                            >
                              <Eye className="size-3 mr-1" />
                              Details & Devices
                            </Button>

                            {/* Quick Tier change dropdown */}
                            {u.tier !== "agency" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleUpdateTier(u.id, "agency")}
                                disabled={modifyingTierId === u.id}
                                className="h-7 text-[10px] text-zinc-400 hover:text-emerald-400 px-2"
                                title="Promote to Agency Pro"
                              >
                                Set Pro
                              </Button>
                            )}
                            {u.tier === "agency" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleUpdateTier(u.id, "free")}
                                disabled={modifyingTierId === u.id}
                                className="h-7 text-[10px] text-zinc-400 hover:text-amber-400 px-2"
                                title="Demote to Free"
                              >
                                Demote
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* TAB 2: GLOBAL TELEMETRY & SCAN STREAM */}
        {activeTab === "telemetry" && stats && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Traffic By Country */}
              <Card className="border border-zinc-800 bg-zinc-950/60 p-5 rounded-xl">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <Globe2 className="size-4 text-emerald-400" />
                  Traffic by Country (Cloudflare cf-ipcountry)
                </h3>
                <div className="space-y-2">
                  {Object.entries(stats.countryDistribution)
                    .sort(([, a], [, b]) => b - a)
                    .map(([country, count]) => {
                      const pct = Math.round((count / stats.totalScans) * 100);
                      return (
                        <div key={country} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-mono text-zinc-300 font-bold">
                              {country === "IN" ? "🇮🇳 India" : country === "US" ? "🇺🇸 United States" : country === "GB" ? "🇬🇧 United Kingdom" : country === "CA" ? "🇨🇦 Canada" : `🌐 ${country}`}
                            </span>
                            <span className="text-zinc-400 font-mono">
                              {count} scans ({pct}%)
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all"
                              style={{ width: `${Math.max(pct, 4)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </Card>

              {/* Scan Mode Breakdown */}
              <Card className="border border-zinc-800 bg-zinc-950/60 p-5 rounded-xl">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <Layers className="size-4 text-teal-400" />
                  Scan Mode Distribution
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(stats.scansByMode).map(([mode, count]) => (
                    <div key={mode} className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-lg">
                      <div className="text-[11px] uppercase font-mono text-zinc-400">{mode}</div>
                      <div className="text-xl font-bold text-white mt-1">{count}</div>
                      <div className="text-[10px] text-emerald-400 mt-0.5">
                        {Math.round((count / stats.totalScans) * 100)}% of audits
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Live Scan Stream */}
            <Card className="border border-zinc-800 bg-zinc-950/60 p-5 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity className="size-4 text-emerald-400" />
                  Recent Edge Scan Stream
                </h3>
                <Badge variant="outline" className="text-[10px] font-mono border-zinc-700">
                  Last 20 Platform Audits
                </Badge>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 font-mono">
                      <th className="pb-2">Target URL</th>
                      <th className="pb-2">Mode</th>
                      <th className="pb-2">Score</th>
                      <th className="pb-2">Speed</th>
                      <th className="pb-2">Country</th>
                      <th className="pb-2">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {stats.recentScans.map((scan) => (
                      <tr key={scan.id} className="hover:bg-zinc-900/30">
                        <td className="py-2.5 font-mono text-white max-w-[220px] truncate">
                          {scan.url}
                        </td>
                        <td className="py-2.5">
                          <Badge variant="outline" className="text-[10px] font-mono uppercase border-zinc-700">
                            {scan.mode}
                          </Badge>
                        </td>
                        <td className="py-2.5">
                          <span
                            className={`font-bold font-mono px-2 py-0.5 rounded text-[11px] ${
                              scan.score >= 90
                                ? "bg-emerald-500/20 text-emerald-300"
                                : scan.score >= 75
                                ? "bg-teal-500/20 text-teal-300"
                                : scan.score >= 50
                                ? "bg-amber-500/20 text-amber-300"
                                : "bg-red-500/20 text-red-300"
                            }`}
                          >
                            {scan.score}/100 ({scan.grade})
                          </span>
                        </td>
                        <td className="py-2.5 font-mono text-zinc-400">{scan.durationMs}ms</td>
                        <td className="py-2.5 font-mono text-zinc-300">
                          {scan.country === "IN" ? "🇮🇳 IN" : scan.country === "US" ? "🇺🇸 US" : scan.country}
                        </td>
                        <td className="py-2.5 font-mono text-zinc-500 text-[11px]">
                          {new Date(scan.timestamp).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </main>

      {/* USER DEEP PROFILE & DEVICE INSPECTION MODAL */}
      {inspectingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <Card className="max-w-4xl w-full max-h-[90vh] flex flex-col bg-zinc-950 border border-emerald-500/40 rounded-2xl shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center text-sm">
                  {inspectingUser.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white">{inspectingUser.name}</h2>
                    <Badge
                      className={`text-[9px] font-mono uppercase ${
                        inspectingUser.tier === "agency"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : inspectingUser.tier === "starter"
                          ? "bg-teal-500/20 text-teal-300 border-teal-500/40"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {inspectingUser.tier.toUpperCase()} TIER
                    </Badge>
                    <Badge
                      className={`text-[9px] font-mono uppercase ${
                        inspectingUser.status === "suspended"
                          ? "bg-red-500/20 text-red-300 border-red-500/40"
                          : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      }`}
                    >
                      {inspectingUser.status || "ACTIVE"}
                    </Badge>
                  </div>
                  <div className="text-xs text-zinc-400 font-mono mt-0.5">
                    ID: {inspectingUser.id} · {inspectingUser.email}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleToggleStatus(inspectingUser.id, inspectingUser.status || "active")}
                  disabled={modifyingTierId === inspectingUser.id}
                  className={`h-8 text-xs font-semibold ${
                    inspectingUser.status === "suspended"
                      ? "border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
                      : "border-red-500/50 text-red-400 hover:bg-red-500/10"
                  }`}
                >
                  {inspectingUser.status === "suspended" ? "Reactivate Account" : "Suspend Account"}
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setInspectingUser(null)}
                  className="size-8 text-zinc-400 hover:text-white"
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>

            {/* User Meta Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-zinc-900/30 border-b border-zinc-800 text-xs">
              <div>
                <span className="text-zinc-500 block text-[10px]">COMPANY</span>
                <span className="font-semibold text-white">{inspectingUser.company || "Individual Developer"}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px]">PHONE</span>
                <span className="font-mono text-zinc-300">{inspectingUser.phone || "Not provided"}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px]">TOTAL LOGINS</span>
                <span className="font-semibold text-emerald-400">{inspectingUser.loginCount || 1} sessions</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px]">REGISTERED AT</span>
                <span className="font-mono text-zinc-400">{new Date(inspectingUser.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Modal Tab Controls */}
            <div className="flex items-center gap-2 px-5 pt-3 border-b border-zinc-800 bg-zinc-950">
              <button
                type="button"
                onClick={() => setInspectModalTab("devices")}
                className={`flex items-center gap-1.5 pb-2.5 px-2 text-xs font-semibold border-b-2 transition-all ${
                  inspectModalTab === "devices"
                    ? "border-emerald-500 text-emerald-400"
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Laptop className="size-3.5" />
                <span>Connected Devices ({inspectingUser.devices?.length || 0})</span>
              </button>
              <button
                type="button"
                onClick={() => setInspectModalTab("scans")}
                className={`flex items-center gap-1.5 pb-2.5 px-2 text-xs font-semibold border-b-2 transition-all ${
                  inspectModalTab === "scans"
                    ? "border-emerald-500 text-emerald-400"
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Activity className="size-3.5" />
                <span>Scan History ({inspectingUser.scansHistory?.length || 0})</span>
              </button>
              <button
                type="button"
                onClick={() => setInspectModalTab("activity")}
                className={`flex items-center gap-1.5 pb-2.5 px-2 text-xs font-semibold border-b-2 transition-all ${
                  inspectModalTab === "activity"
                    ? "border-emerald-500 text-emerald-400"
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <History className="size-3.5" />
                <span>Activity Audit Trail ({inspectingUser.activityLogs?.length || 0})</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* SUB-TAB 1: DEVICES */}
              {inspectModalTab === "devices" && (
                <div className="space-y-4">
                  {(!inspectingUser.devices || inspectingUser.devices.length === 0) ? (
                    <div className="text-center py-10 text-zinc-500 text-xs">
                      No device telemetry logged for this user yet.
                    </div>
                  ) : (
                    inspectingUser.devices.map((device, idx) => (
                      <Card key={device.id || idx} className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
                        <div className="flex items-start justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="size-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                              {device.deviceType === "mobile" ? (
                                <Smartphone className="size-4" />
                              ) : device.deviceType === "tablet" ? (
                                <Tablet className="size-4" />
                              ) : (
                                <Laptop className="size-4" />
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-white text-xs flex items-center gap-2">
                                <span>{device.deviceName}</span>
                                <Badge className="text-[9px] uppercase font-mono bg-zinc-800 text-zinc-300">
                                  {device.deviceType}
                                </Badge>
                              </div>
                              <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                                Device ID: {device.id}
                              </div>
                            </div>
                          </div>

                          <div className="text-right font-mono text-[11px] text-zinc-400">
                            <div>Active Logins: <span className="text-emerald-400 font-bold">{device.loginCount}</span></div>
                            <div className="text-zinc-500 text-[10px]">
                              Last Seen: {new Date(device.lastSeenAt).toLocaleString()}
                            </div>
                          </div>
                        </div>

                        {/* Specs Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px] bg-zinc-950/60 p-3 rounded-lg border border-zinc-800/80">
                          <div>
                            <span className="text-zinc-500 block text-[9px]">BROWSER & OS</span>
                            <span className="text-zinc-200 font-medium">{device.browser} · {device.os}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 block text-[9px]">SCREEN RESOLUTION</span>
                            <span className="font-mono text-zinc-200">{device.screenResolution}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 block text-[9px]">CPU & MEMORY</span>
                            <span className="text-zinc-200">
                              {device.hardwareConcurrency ? `${device.hardwareConcurrency} Cores` : "4 Cores"}
                              {device.deviceMemory ? ` · ${device.deviceMemory}` : ""}
                            </span>
                          </div>
                          <div>
                            <span className="text-zinc-500 block text-[9px]">TOUCH / COLOR</span>
                            <span className="text-zinc-200">
                              {device.touchSupport ? "Touch Screen" : "Mouse/Trackpad"} · {device.colorDepth || "24-bit"}
                            </span>
                          </div>

                          <div>
                            <span className="text-zinc-500 block text-[9px]">LOCATION & IP</span>
                            <span className="text-zinc-200 font-mono">
                              {device.city}, {device.country} ({device.ip})
                            </span>
                          </div>
                          <div>
                            <span className="text-zinc-500 block text-[9px]">TIME ZONE</span>
                            <span className="text-zinc-200">{device.timeZone}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 block text-[9px]">LANGUAGE</span>
                            <span className="text-zinc-200">{device.language}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 block text-[9px]">FIRST SEEN</span>
                            <span className="text-zinc-400 font-mono text-[10px]">{new Date(device.firstSeenAt).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {/* Full User-Agent string */}
                        <div className="text-[10px] font-mono text-zinc-500 bg-zinc-950/40 p-2 rounded border border-zinc-900 break-all">
                          <span className="text-zinc-400 font-bold">UA: </span>{device.userAgent}
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              )}

              {/* SUB-TAB 2: SCANS */}
              {inspectModalTab === "scans" && (
                <div className="space-y-3">
                  {(!inspectingUser.scansHistory || inspectingUser.scansHistory.length === 0) ? (
                    <div className="text-center py-10 text-zinc-500 text-xs">
                      No scan records for this user yet.
                    </div>
                  ) : (
                    inspectingUser.scansHistory.map((scan) => (
                      <div
                        key={scan.id}
                        className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg flex items-center justify-between flex-wrap gap-2 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="font-mono text-white font-semibold flex items-center gap-2">
                            <span className="text-emerald-400">🌐</span>
                            <span>{scan.url}</span>
                            <Badge variant="outline" className="text-[9px] uppercase font-mono border-zinc-700">
                              {scan.mode}
                            </Badge>
                          </div>
                          <div className="text-[11px] text-zinc-500 flex items-center gap-2">
                            <span>Device: {scan.device || "Web Browser"}</span>
                            <span>·</span>
                            <span>Location: {scan.city || ""}, {scan.country || "IN"}</span>
                            <span>·</span>
                            <span>IP: {scan.ip || "127.0.0.1"}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span
                            className={`font-bold font-mono px-2 py-0.5 rounded text-[11px] ${
                              scan.score >= 90
                                ? "bg-emerald-500/20 text-emerald-300"
                                : scan.score >= 75
                                ? "bg-teal-500/20 text-teal-300"
                                : scan.score >= 50
                                ? "bg-amber-500/20 text-amber-300"
                                : "bg-red-500/20 text-red-300"
                            }`}
                          >
                            {scan.score}/100 ({scan.grade})
                          </span>
                          <div className="text-[10px] font-mono text-zinc-500 mt-1">
                            {new Date(scan.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* SUB-TAB 3: ACTIVITY LOGS */}
              {inspectModalTab === "activity" && (
                <div className="space-y-2.5">
                  {(!inspectingUser.activityLogs || inspectingUser.activityLogs.length === 0) ? (
                    <div className="text-center py-10 text-zinc-500 text-xs">
                      No audit activity logged.
                    </div>
                  ) : (
                    inspectingUser.activityLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-3 bg-zinc-900/40 border border-zinc-800/80 rounded-lg text-xs flex items-start justify-between gap-4"
                      >
                        <div>
                          <div className="font-semibold text-white flex items-center gap-1.5">
                            <span className="size-1.5 rounded-full bg-emerald-400" />
                            <span className="capitalize">{log.action.replace("_", " ")}</span>
                          </div>
                          <div className="text-zinc-400 text-[11px] mt-0.5">{log.details}</div>
                          {log.device && (
                            <div className="text-[10px] font-mono text-zinc-500 mt-1">
                              via {log.device} (IP: {log.ip || "127.0.0.1"})
                            </div>
                          )}
                        </div>
                        <div className="font-mono text-[10px] text-zinc-500 shrink-0">
                          {new Date(log.timestamp).toLocaleString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-900/40 flex items-center justify-between text-xs">
              <span className="text-zinc-500">
                Audited via KODAND Cloudflare Edge Sentinel Engine
              </span>
              <Button
                size="sm"
                onClick={() => setInspectingUser(null)}
                className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs h-8"
              >
                Close Dossier
              </Button>
            </div>
          </Card>
        </div>
      )}

      <AppFooter />
    </div>
  );
}
