"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { KodandLogo } from "@/components/kodand-logo";
import { Activity, Globe, KeyRound, Loader2, Share2, Sparkles, Target, Swords, Crown, User as UserIcon } from "lucide-react";
import { prettyHost } from "@/components/dashboard/dashboard-types";
import { UpgradeModal } from "@/components/dashboard/upgrade-modal";
import { useAuth } from "@/lib/use-auth";

export function AppHeader({
  domain,
  onChangeDomain,
  scanning,
  onToggleActivity,
  activityOpen,
}: {
  domain?: string | null;
  onChangeDomain?: () => void;
  scanning?: boolean;
  onToggleActivity?: () => void;
  activityOpen?: boolean;
}) {
  const pathname = usePathname();
  const [upgradeOpen, setUpgradeOpen] = React.useState(false);
  const { user } = useAuth();

  const navLinks = [
    { href: "/", label: "Audit 360°", icon: Globe },
    { href: "/keywords", label: "Keywords", icon: KeyRound },
    { href: "/marketing", label: "Marketing", icon: Sparkles },
    { href: "/backlinks", label: "Backlinks", icon: Share2 },
    { href: "/compare", label: "Compare", icon: Swords },
    { href: "/pricing", label: "Pricing", icon: Crown },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-emerald-500/15 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/65">
      <div className="mx-auto max-w-[1600px] px-3 sm:px-4 h-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-5 min-w-0">
          <Link href="/" className="flex items-center gap-2">
            <KodandLogo size="md" />
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    active
                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                      : "text-muted-foreground hover:text-emerald-200 hover:bg-emerald-500/5"
                  }`}
                >
                  <Icon className="size-3.5" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Target chip */}
        {domain && (
          <div className="hidden lg:flex items-center gap-2 flex-1 max-w-sm ml-2">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/25 bg-emerald-500/5 text-sm">
              <Target className="size-3.5 text-emerald-400 flex-shrink-0" />
              <span className="text-muted-foreground text-[10px] font-mono uppercase tracking-wider">Target</span>
              <span className="font-semibold text-foreground text-xs truncate max-w-[180px]">
                {prettyHost(domain)}
              </span>
              {onChangeDomain && (
                <button
                  type="button"
                  onClick={onChangeDomain}
                  className="ml-1 text-xs text-emerald-300 hover:text-emerald-200 underline underline-offset-2"
                >
                  Change
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          {scanning && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-mono mr-1">
              <Loader2 className="size-3.5 animate-spin" /> scanning
            </div>
          )}

          <button
            type="button"
            onClick={() => setUpgradeOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all shadow-sm shadow-emerald-500/10"
          >
            <Crown className="size-3 text-amber-400" />
            <span className="hidden sm:inline">Upgrade</span> Pro
          </button>

          {user ? (
            <Link
              href="/account"
              className="flex items-center gap-1.5 p-1 pl-1.5 pr-2.5 rounded-full bg-zinc-900/90 border border-zinc-700 hover:border-emerald-500/50 text-xs transition-all shadow-sm"
            >
              <div className="size-6 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center text-[11px]">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:inline text-xs font-semibold text-zinc-200 truncate max-w-[90px]">
                {user.name.split(" ")[0]}
              </span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono uppercase">
                {user.tier}
              </span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-zinc-700 hover:border-zinc-500 text-xs font-semibold text-zinc-200 transition-colors"
            >
              <UserIcon className="size-3.5 text-zinc-400" />
              <span>Sign In</span>
            </Link>
          )}

          {onToggleActivity && (
            <button
              type="button"
              onClick={onToggleActivity}
              className="lg:hidden p-2 rounded-md border border-emerald-500/20 text-emerald-200 hover:bg-emerald-500/10"
              aria-label="Toggle activity stream"
            >
              <Activity className={`size-4 ${activityOpen ? "text-emerald-300" : ""}`} />
            </button>
          )}
        </div>
      </div>

      {/* Mobile nav and target row */}
      <div className="md:hidden px-3 pb-2 flex flex-col gap-2">
        <div className="flex items-center justify-around gap-1 pt-1 border-t border-emerald-500/10 overflow-x-auto">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors shrink-0 ${
                  active
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                    : "text-muted-foreground hover:text-emerald-200"
                }`}
              >
                <Icon className="size-3" />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>

        {domain && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/25 bg-emerald-500/5 text-sm">
            <Target className="size-3.5 text-emerald-400 flex-shrink-0" />
            <span className="text-muted-foreground text-[10px] font-mono uppercase tracking-wider">Target</span>
            <span className="font-semibold text-foreground text-xs truncate">{prettyHost(domain)}</span>
            {onChangeDomain && (
              <button
                type="button"
                onClick={onChangeDomain}
                className="ml-auto text-xs text-emerald-300 hover:text-emerald-200 underline underline-offset-2"
              >
                Change
              </button>
            )}
          </div>
        )}
      </div>

      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        defaultTier="agency"
      />
    </header>
  );
}
