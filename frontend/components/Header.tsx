"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { COMPANY } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { API_URL } from "@/lib/api";
import AiModeBadge from "./AiModeBadge";

const LINKS = [
  { href: "/", label: "New quote" },
  { href: "/multi-tier", label: "Multi-Tier 🌟" },
  { href: "/orders", label: "Orders" },
  { href: "/catalog", label: "Catalogue" },
  { href: "/evaluate", label: "Evaluate" },
  { href: "/admin/catalogue", label: "⚙️ Admin" },
];

export default function Header() {
  const path = usePathname();
  const { user, logout } = useAuth();
  const [aiMode, setAiMode] = useState<"ai" | "fallback" | null>(null);

  // Poll health endpoint every 30s to keep the AI status dot live
  useEffect(() => {
    let mounted = true;
    async function check() {
      try {
        const res = await fetch(`${API_URL}/api/health`, { cache: "no-store" });
        if (!mounted) return;
        if (res.ok) {
          const data = await res.json();
          setAiMode(data.ai_configured ? "ai" : "fallback");
        }
      } catch {
        /* backend unreachable — don't show dot */
      }
    }
    check();
    const interval = setInterval(check, 30_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="no-print border-b border-line bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" rx="7" fill="#1B2559" />
            <path d="M9 11h14l3 3-3 3v7a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1v-7l-3-3z" fill="#F0A202" />
            <circle cx="12.5" cy="14" r="1.6" fill="#1B2559" />
          </svg>
          <span className="font-display text-xl font-bold tracking-tight">GiftIQ</span>
          <span className="hidden text-sm text-slate2 sm:inline">for {COMPANY}</span>
        </Link>

        <nav aria-label="Main" className="flex gap-1">
          {LINKS.map((l) => {
            const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
                  active ? "bg-marigold-soft text-ink" : "text-slate2 hover:bg-paper"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          {/* Live AI status dot */}
          {aiMode && <AiModeBadge mode={aiMode} variant="dot" />}

          {/* Auth */}
          {user ? (
            <div className="flex items-center gap-2">
              <span className="hidden text-xs text-slate2 sm:inline">
                {user.username}
                <span className="ml-1 rounded bg-paper px-1.5 py-0.5 text-[10px] font-semibold uppercase">
                  {user.role}
                </span>
              </span>
              <button
                id="header-logout"
                onClick={logout}
                className="btn-quiet !py-1 !text-xs"
                title="Sign out"
              >
                Sign out
              </button>
            </div>
          ) : (
            <Link href="/login" className="btn-primary !py-1 !text-xs">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
