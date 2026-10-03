"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await login(username, password);
      // Set a cookie so Next.js middleware can detect auth on the server side
      document.cookie = `giftiq_token=${data.access_token}; path=/; max-age=${60 * 60 * 8}; SameSite=Lax`;
      const next = params.get("next") || "/";
      router.replace(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="slip w-full max-w-sm">
        <div className="mb-6 text-center">
          <svg width="36" height="36" viewBox="0 0 32 32" className="mx-auto mb-3" aria-hidden="true">
            <rect width="32" height="32" rx="7" fill="#1B2559" />
            <path d="M9 11h14l3 3-3 3v7a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1v-7l-3-3z" fill="#F0A202" />
            <circle cx="12.5" cy="14" r="1.6" fill="#1B2559" />
          </svg>
          <h1 className="text-2xl font-bold">Sign in to GiftIQ</h1>
          <p className="mt-1 text-sm text-slate2">Demo credentials: admin / giftiq2024</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="login-username" className="mb-1.5 block text-sm font-semibold">
              Username
            </label>
            <input
              id="login-username"
              type="text"
              className="field"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              required
            />
          </div>
          <div>
            <label htmlFor="login-password" className="mb-1.5 block text-sm font-semibold">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              className="field"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            id="login-submit"
            type="submit"
            className="btn-primary w-full"
            disabled={busy || !username || !password}
            aria-busy={busy}
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate2">
          Also try: <strong>sales</strong> / giftiq2024
        </p>
      </div>
    </div>
  );
}
