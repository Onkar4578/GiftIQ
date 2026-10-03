"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getOrder, updateStatus, ApiError } from "@/lib/api";
import type { Quote } from "@/lib/types";
import { money, fmtDate } from "@/lib/format";

const TIERS = [
  {
    key: "value",
    title: "Value Economy Kit",
    badge: "Tier 1 · Budget",
    badgeBg: "bg-slate-100 text-slate-600",
    border: "border-slate-200 hover:border-slate-400",
    activeBorder: "border-slate-500 ring-2 ring-slate-200",
    checkBg: "bg-slate-800",
    btnBg: "bg-slate-800 hover:bg-slate-900 text-white",
  },
  {
    key: "standard",
    title: "Standard Choice Kit",
    badge: "Tier 2 · Most Popular ⭐",
    badgeBg: "bg-blue-100 text-blue-800",
    border: "border-blue-300 hover:border-blue-500",
    activeBorder: "border-blue-500 ring-2 ring-blue-100",
    checkBg: "bg-blue-600",
    btnBg: "bg-blue-600 hover:bg-blue-700 text-white",
  },
  {
    key: "executive",
    title: "Executive Luxury Kit",
    badge: "Tier 3 · Premium VIP 👑",
    badgeBg: "bg-purple-100 text-purple-800",
    border: "border-purple-200 hover:border-purple-400",
    activeBorder: "border-purple-500 ring-2 ring-purple-100",
    checkBg: "bg-purple-700",
    btnBg: "bg-purple-700 hover:bg-purple-800 text-white",
  },
];

function TierCard({
  tier,
  quote,
  selected,
  approved,
  onSelect,
}: {
  tier: (typeof TIERS)[0];
  quote: Quote;
  selected: boolean;
  approved: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={`relative flex flex-col rounded-xl border-2 bg-white p-5 transition-all cursor-pointer ${
        approved
          ? "border-emerald-500 ring-2 ring-emerald-100"
          : selected
          ? tier.activeBorder
          : tier.border
      }`}
      onClick={onSelect}
    >
      {approved && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-3 py-0.5 text-xs font-bold text-white shadow">
          ✓ Approved
        </div>
      )}

      <div className="flex items-start justify-between mb-3 gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${tier.badgeBg}`}>
          {tier.badge}
        </span>
        {selected && !approved && (
          <span className={`rounded-full w-5 h-5 flex items-center justify-center ${tier.checkBg}`}>
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </span>
        )}
      </div>

      <h3 className="text-lg font-bold text-ink mb-1">{tier.title}</h3>
      <p className="text-xs text-slate2 mb-4 leading-relaxed line-clamp-2">{quote.summary}</p>

      <div className="rounded-lg bg-paper p-3 text-center mb-4">
        <span className="text-xs text-slate2 uppercase tracking-wide font-semibold block">Total Value</span>
        <span className="font-display text-2xl font-bold text-ink">{money(quote.total)}</span>
        <span className="text-xs text-slate2 block mt-0.5">
          incl. {Math.round(quote.gst_rate * 100)}% GST · {quote.delivery_days} days delivery
        </span>
        {quote.requirements.quantity && (
          <span className="text-xs text-slate2 block">
            {money(Math.round(quote.total / quote.requirements.quantity))} per recipient
          </span>
        )}
      </div>

      <ul className="space-y-2 mb-4 flex-1">
        {quote.items.map((item) => (
          <li key={item.product_id} className="flex items-start justify-between gap-2 text-sm border-b border-line pb-1.5 last:border-0">
            <div>
              <p className="font-semibold text-ink">{item.name}</p>
              <p className="text-xs text-slate2">{item.quantity} × {money(item.unit_price)}</p>
            </div>
            <span className="tabular-nums text-ink font-semibold text-xs shrink-0">{money(item.line_total)}</span>
          </li>
        ))}
      </ul>

      <p className="text-xs text-slate2 text-center">
        Earliest delivery: <strong>{fmtDate(quote.earliest_delivery)}</strong>
      </p>
    </div>
  );
}

export default function ComparePage() {
  const params = useParams();
  const idsRaw = Array.isArray(params.ids) ? params.ids[0] : params.ids ?? "";
  const [valId, stdId, execId] = idsRaw.split("-").map(Number);

  const [quotes, setQuotes] = useState<(Quote | null)[]>([null, null, null]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [approvedIdx, setApprovedIdx] = useState<number | null>(null);
  const [approving, setApproving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!valId || !stdId || !execId) {
      setError("Invalid proposal link. Please ask your sales representative to resend.");
      setLoading(false);
      return;
    }
    Promise.all([getOrder(valId), getOrder(stdId), getOrder(execId)])
      .then((results) => { setQuotes(results); setLoading(false); })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load proposals.");
        setLoading(false);
      });
  }, [valId, stdId, execId]);

  async function handleApprove() {
    if (selected === null || approving) return;
    const quote = quotes[selected];
    if (!quote) return;
    setApproving(true);
    try {
      await updateStatus(quote.order_id, "confirmed");
      setApprovedIdx(selected);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not confirm order. Please contact your sales representative.");
    } finally {
      setApproving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="text-center py-16">
          <div className="w-10 h-10 border-4 border-ink border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-semibold text-ink">Loading your proposals…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="max-w-md text-center p-8 rounded-xl border border-red-200 bg-red-50">
          <p className="text-red-700 font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  const approvedQuote = approvedIdx !== null ? quotes[approvedIdx] : null;

  return (
    <div className="min-h-screen bg-paper">
      {/* Header banner */}
      <div className="bg-gradient-to-r from-ink to-slate-700 text-white px-4 py-6">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-1">Official Corporate Proposal</p>
              <h1 className="text-2xl font-bold">Choose Your Package Option</h1>
              <p className="text-slate-300 text-sm mt-1">
                Review all 3 gift packages below and select the one that best fits your needs.
              </p>
            </div>
            {approvedQuote ? (
              <div className="rounded-lg bg-emerald-500 px-5 py-3 text-center">
                <p className="text-xs font-semibold text-emerald-100">Order Confirmed!</p>
                <p className="font-bold text-white">Quote #{approvedQuote.order_id}</p>
              </div>
            ) : (
              <div className="rounded-lg bg-white/10 border border-white/20 px-4 py-2 text-sm text-slate-200 text-center">
                <p className="font-semibold">3 Options Available</p>
                <p className="text-xs">Select a tier to approve</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">

        {/* Approved confirmation banner */}
        {approvedQuote && (
          <div className="rounded-xl bg-emerald-50 border-2 border-emerald-400 p-6 text-center space-y-2">
            <p className="text-3xl">🎉</p>
            <h2 className="text-xl font-bold text-emerald-800">Package Approved Successfully!</h2>
            <p className="text-sm text-emerald-700">
              You have approved <strong>{TIERS[approvedIdx!].title}</strong> (Quote #{approvedQuote.order_id}) for{" "}
              <strong>{money(approvedQuote.total)}</strong> including GST.
            </p>
            <p className="text-sm text-emerald-700">
              Our corporate gifting executive will contact you shortly to confirm logo artwork, delivery address, and payment.
            </p>
          </div>
        )}

        {/* Tier comparison grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TIERS.map((tier, idx) => {
            const quote = quotes[idx];
            if (!quote) return null;
            return (
              <TierCard
                key={tier.key}
                tier={tier}
                quote={quote}
                selected={selected === idx}
                approved={approvedIdx === idx}
                onSelect={() => { if (approvedIdx === null) setSelected(idx); }}
              />
            );
          })}
        </div>

        {/* Approve CTA */}
        {approvedIdx === null && (
          <div className="rounded-xl border-2 border-dashed border-line bg-white p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              {selected !== null ? (
                <>
                  <p className="font-semibold text-ink">
                    You selected: <span className="text-blue-700">{TIERS[selected].title}</span>
                  </p>
                  <p className="text-sm text-slate2">
                    Total: <strong>{money(quotes[selected]!.total)}</strong> · Delivery in {quotes[selected]!.delivery_days} days
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-ink">Click a package above to select it</p>
                  <p className="text-sm text-slate2">Then confirm your choice below</p>
                </>
              )}
            </div>
            <button
              type="button"
              className="btn-primary !bg-emerald-600 hover:!bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 px-6 py-2.5"
              disabled={selected === null || approving}
              onClick={handleApprove}
            >
              {approving ? "Confirming…" : selected !== null ? `✓ Approve ${TIERS[selected].title}` : "Select a Package First"}
            </button>
          </div>
        )}

        <p className="text-center text-xs text-slate2">
          Need help choosing? WhatsApp us at{" "}
          <a href="https://wa.me/917776952222" target="_blank" className="text-ink font-semibold underline">
            +91 77769 52222
          </a>{" "}
          · This proposal is valid for 7 days.
        </p>
      </div>
    </div>
  );
}
