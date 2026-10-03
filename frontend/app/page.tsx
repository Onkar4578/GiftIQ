"use client";

import { useEffect, useState } from "react";
import BriefForm from "@/components/BriefForm";
import ErrorBanner from "@/components/ErrorBanner";
import QuoteSlip from "@/components/QuoteSlip";
import LoginPage from "@/components/LoginPage";
import { ApiError, createRecommendation, updateStatus } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Quote } from "@/lib/types";

export default function AdvisorPage() {
  const { user, isLoading } = useAuth();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastBrief, setLastBrief] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  async function build(brief: string) {
    setBusy(true);
    setError(null);
    setLastBrief(brief);
    try {
      setQuote(await createRecommendation(brief));
    } catch (e) {
      setQuote(null);
      setError(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!quote) return;
    try {
      setQuote(await updateStatus(quote.order_id, "confirmed"));
      setToast(`Order #${quote.order_id} confirmed`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't confirm the order. Try again.");
    }
  }

  // Show nothing while checking auth state from localStorage
  if (isLoading) return null;

  // Show login wall if not authenticated
  if (!user) return <LoginPage />;

  return (
    <div>
      <h1 className="max-w-2xl text-3xl font-bold sm:text-4xl">Describe the gifting job and get a priced quote.</h1>
      <p className="mt-2 max-w-2xl text-slate2">
        GiftIQ matches your brief to the catalogue, checks budget, stock and lead times, and works out GST and the
        earliest delivery date.
      </p>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <section aria-label="Brief">
          <BriefForm busy={busy} onSubmit={build} />
        </section>

        <section aria-label="Quote" aria-live="polite" aria-busy={busy}>
          {error && <ErrorBanner message={error} onRetry={lastBrief ? () => build(lastBrief) : undefined} />}
          {busy ? (
            <div className="slip ruled mt-4 min-h-[22rem]">
              <p className="font-display text-xl font-bold">Matching your brief to the catalogue…</p>
              <p className="mt-1 text-sm text-slate2">This usually takes a few seconds.</p>
            </div>
          ) : quote ? (
            <div className="mt-4">
              <QuoteSlip
                quote={quote}
                actions={
                  quote.status === "recommended" ? (
                    <button type="button" className="btn-accent" onClick={confirm}>
                      Confirm order
                    </button>
                  ) : null
                }
              />
            </div>
          ) : (
            !error && (
              <div className="slip ruled mt-4 min-h-[22rem]">
                <p className="font-display text-xl font-bold">Your quote will appear here</p>
                <p className="mt-1 max-w-sm text-sm text-slate2">
                  Write a brief on the left, or pick an example to see how it works.
                </p>
              </div>
            )
          )}
        </section>
      </div>

      {toast && (
        <div role="status" className="no-print fixed bottom-6 left-1/2 -translate-x-1/2 rounded-md bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
