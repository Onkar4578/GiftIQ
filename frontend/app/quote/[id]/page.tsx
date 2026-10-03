"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getOrder, type ApiError } from "@/lib/api";
import type { Quote } from "@/lib/types";
import QuoteSlip from "@/components/QuoteSlip";
import ErrorBanner from "@/components/ErrorBanner";

export default function PublicQuotePage() {
  const params = useParams();
  const idStr = Array.isArray(params.id) ? params.id[0] : params.id;
  const orderId = parseInt(idStr || "0", 10);

  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setError("Invalid proposal link.");
      setLoading(false);
      return;
    }
    setLoading(true);
    getOrder(orderId)
      .then((q) => {
        setQuote(q);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Proposal not found.");
      })
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl py-12 text-center text-slate2">
        <p className="font-semibold">Loading official proposal #{orderId}…</p>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="mx-auto max-w-3xl py-12">
        <ErrorBanner message={error || "Proposal not found"} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl py-6 space-y-6">
      <div className="rounded-lg bg-gradient-to-r from-ink to-slate-800 p-6 text-white shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-block rounded bg-amber-400/20 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
              Official Client Proposal
            </span>
            <h1 className="mt-1 text-2xl font-bold">VIP Gifts Article — Quote #{quote.order_id}</h1>
            <p className="text-sm text-slate-300 mt-0.5">
              Prepared for your team • Valid for 7 days
            </p>
          </div>
          {accepted ? (
            <div className="rounded-md bg-emerald-500 px-4 py-2 font-semibold text-white">
              ✓ Proposal Accepted
            </div>
          ) : (
            <button
              type="button"
              className="rounded-md bg-marigold px-4 py-2 font-semibold text-ink hover:bg-amber-400 transition"
              onClick={() => setAccepted(true)}
            >
              Approve & Confirm Order
            </button>
          )}
        </div>
      </div>

      <QuoteSlip
        quote={quote}
        actions={
          accepted && (
            <div className="w-full rounded-md bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800 font-medium">
              🎉 Thank you! Your proposal has been accepted. Our corporate gifting executive will contact you shortly to confirm logo artwork & delivery.
            </div>
          )
        }
      />
    </div>
  );
}
