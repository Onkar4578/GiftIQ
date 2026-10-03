"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { generateMultiTier, type MultiTierResult, ApiError } from "@/lib/api";
import { money, fmtDate } from "@/lib/format";
import type { Quote } from "@/lib/types";
import ErrorBanner from "@/components/ErrorBanner";

function TierCard({
  title,
  badge,
  badgeBg,
  borderStyle,
  quote,
}: {
  title: string;
  badge: string;
  badgeBg: string;
  borderStyle: string;
  quote: Quote;
}) {
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/quote/${quote.order_id}` : `/quote/${quote.order_id}`;

  return (
    <div className={`flex-1 rounded-xl border-2 bg-white p-5 shadow-sm flex flex-col justify-between ${borderStyle}`}>
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${badgeBg}`}>
            {badge}
          </span>
          <span className="text-xs text-slate2 font-mono">Quote #{quote.order_id}</span>
        </div>

        <h3 className="text-xl font-bold text-ink">{title}</h3>
        <p className="mt-1 text-xs text-slate2 line-clamp-2">{quote.summary}</p>

        <div className="my-4 rounded-lg bg-paper p-3 text-center">
          <span className="text-xs text-slate2 uppercase tracking-wide font-semibold block">Total Proposal Value</span>
          <span className="font-display text-2xl font-bold text-ink">{money(quote.total)}</span>
          <span className="text-xs text-slate2 block mt-0.5">
            Incl. {Math.round(quote.gst_rate * 100)}% GST • {quote.delivery_days} days delivery
          </span>
        </div>

        <h4 className="text-xs font-bold text-slate2 uppercase tracking-wide mb-2">Package Items</h4>
        <ul className="space-y-2 mb-4">
          {quote.items.map((item) => (
            <li key={item.product_id} className="rounded-md border border-line bg-white p-2.5 text-xs">
              <div className="flex justify-between font-semibold text-ink">
                <span>{item.name}</span>
                <span className="tabular-nums">{money(item.line_total)}</span>
              </div>
              <p className="text-slate2 mt-0.5">
                {item.quantity} × {money(item.unit_price)}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2 pt-3 border-t border-dashed border-line">
        <Link
          href={`/quote/${quote.order_id}`}
          target="_blank"
          className="btn-primary w-full text-center text-xs py-2 block"
        >
          🔗 Share Client Proposal Link
        </Link>
        <button
          type="button"
          className="btn-quiet w-full text-xs py-2 !bg-emerald-50 !text-emerald-700 !border-emerald-200 hover:!bg-emerald-100"
          onClick={() => {
            const txt = encodeURIComponent(`Hi! Here is our official corporate proposal for your review: ${shareUrl}\nTotal: ${money(quote.total)}`);
            window.open(`https://wa.me/?text=${txt}`, "_blank");
          }}
        >
          📱 Send Proposal via WhatsApp
        </button>
      </div>
    </div>
  );
}

export default function MultiTierPage() {
  const [brief, setBrief] = useState("");
  const [result, setResult] = useState<MultiTierResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (brief.trim().length < 15 || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await generateMultiTier(brief.trim());
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to generate multi-tier proposals.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-line pb-4">
        <h1 className="text-2xl font-bold text-ink">Multi-Tier Package Generator ("Good / Better / Best")</h1>
        <p className="mt-1 text-sm text-slate2">
          Generates 3 distinct self-service options (Value Economy, Standard Choice, Executive Luxury) for the same brief so corporate clients can self-select their target budget.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <label htmlFor="multi-brief" className="block text-sm font-semibold">
          Customer Brief
        </label>
        <textarea
          id="multi-brief"
          className="field w-full resize-y"
          rows={3}
          maxLength={2000}
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="e.g. 50 Diwali gift packages for key clients, budget around ₹1,500 each with company logo..."
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate2">Quick test:</span>
            <button
              type="button"
              className="btn-quiet !py-1 !px-2.5 !text-xs"
              onClick={() => setBrief("50 Diwali hampers for key clients, budget around ₹1,500 each with company logo on box.")}
            >
              Diwali Hampers
            </button>
            <button
              type="button"
              className="btn-quiet !py-1 !px-2.5 !text-xs"
              onClick={() => setBrief("Welcome kits for 30 new joiners, budget ₹1,500 each, carrying company logo.")}
            >
              Welcome Kits
            </button>
            <button
              type="button"
              className="btn-quiet !py-1 !px-2.5 !text-xs"
              onClick={() => setBrief("50 tech gift packages for client conference attendees with logo.")}
            >
              Tech Conference
            </button>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={busy || brief.trim().length < 15}
          >
            {busy ? "Generating 3 Tiers…" : "⚡ Generate 3 Package Options"}
          </button>
        </div>
      </form>

      {error && <ErrorBanner message={error} />}

      {busy && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate2">
          <p className="font-semibold text-ink text-base">Generating 3 Tier Proposals…</p>
          <p className="mt-1">Building Value Economy, Standard Choice, and Executive Luxury packages in parallel.</p>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800 flex justify-between items-center">
            <span>🎉 Generated 3 distinct packages for: <strong>&ldquo;{result.brief}&rdquo;</strong></span>
            <span className="text-xs font-bold bg-emerald-200 text-emerald-900 px-2.5 py-1 rounded-full">3 Options Ready</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            <TierCard
              title="Value Economy Kit"
              badge="Tier 1 • Budget Entry"
              badgeBg="bg-slate-100 text-slate-700"
              borderStyle="border-slate-200"
              quote={result.value_tier}
            />

            <TierCard
              title="Standard Choice Kit"
              badge="Tier 2 • Most Popular"
              badgeBg="bg-blue-100 text-blue-800"
              borderStyle="border-blue-400 ring-2 ring-blue-100"
              quote={result.standard_tier}
            />

            <TierCard
              title="Executive Luxury Kit"
              badge="Tier 3 • Premium VIP"
              badgeBg="bg-purple-100 text-purple-800"
              borderStyle="border-purple-300"
              quote={result.executive_tier}
            />
          </div>

          {/* Share All 3 Tiers CTA */}
          <div className="rounded-xl bg-gradient-to-r from-ink to-slate-700 p-5 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-lg">Share All 3 Options with Your Client</h3>
              <p className="text-slate-300 text-sm mt-0.5">
                Send a single link — the client sees all 3 tiers, picks their favourite, and clicks Approve. No back-and-forth email.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <button
                type="button"
                className="rounded-lg bg-amber-400 hover:bg-amber-300 text-ink font-bold px-5 py-2.5 text-sm transition"
                onClick={() => {
                  const url = `${window.location.origin}/compare/${result!.value_tier.order_id}-${result!.standard_tier.order_id}-${result!.executive_tier.order_id}`;
                  navigator.clipboard.writeText(url).catch(() => {});
                  window.open(url, "_blank");
                }}
              >
                🔗 Open Client Comparison Page
              </button>
              <button
                type="button"
                className="rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-5 py-2.5 text-sm transition"
                onClick={() => {
                  const url = `${window.location.origin}/compare/${result!.value_tier.order_id}-${result!.standard_tier.order_id}-${result!.executive_tier.order_id}`;
                  const msg = encodeURIComponent(
                    `Hi! We've prepared 3 corporate gift package options for you. Please review and approve your preferred option:\n\n${url}\n\nOptions available:\n🔹 Tier 1 (Value Economy): ${money(result!.value_tier.total)}\n🔹 Tier 2 (Standard): ${money(result!.standard_tier.total)}\n🔹 Tier 3 (Executive Luxury): ${money(result!.executive_tier.total)}\n\nValid for 7 days.`
                  );
                  window.open(`https://wa.me/?text=${msg}`, "_blank");
                }}
              >
                📱 Send via WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
