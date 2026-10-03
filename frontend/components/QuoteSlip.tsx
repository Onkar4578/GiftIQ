"use client";

import { ReactNode, useState } from "react";
import { fmtDate, money, quoteText } from "@/lib/format";
import type { Quote } from "@/lib/types";
import AiModeBadge from "./AiModeBadge";
import StatusBadge from "./StatusBadge";

function Requirement({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs text-slate2">{label}</dt>
      <dd className="text-sm font-semibold">{value}</dd>
    </div>
  );
}

export default function QuoteSlip({ quote, actions }: { quote: Quote; actions?: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const r = quote.requirements;

  async function copy() {
    try {
      await navigator.clipboard.writeText(quoteText(quote));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy the quote text:", quoteText(quote));
    }
  }

  function openWhatsApp() {
    const text = encodeURIComponent(quoteText(quote));
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  return (
    <article className="slip" aria-label={`Quote ${quote.order_id}`}>
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Quote #{quote.order_id}</h2>
          <p className="mt-1 max-w-prose text-sm text-slate2">{quote.summary}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <StatusBadge status={quote.status} />
          <AiModeBadge mode={quote.mode} />
        </div>
      </header>

      {(r.quantity || r.budget_per_unit || r.deadline || r.occasion) && (
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 rounded-md bg-paper p-3 sm:grid-cols-4">
          <Requirement label="Recipients" value={r.quantity ? String(r.quantity) : null} />
          <Requirement label="Budget each" value={r.budget_per_unit ? money(r.budget_per_unit) : null} />
          <Requirement label="Needed by" value={r.deadline ? fmtDate(r.deadline) : null} />
          <Requirement label="Occasion" value={r.occasion} />
        </dl>
      )}

      {quote.warnings.length > 0 && (
        <ul className="mt-4 space-y-1.5 rounded-md border border-marigold bg-marigold-soft p-3 text-sm" aria-label="Things to check">
          {quote.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}

      <ul className="mt-5 divide-y divide-line">
        {quote.items.map((item) => (
          <li key={item.product_id} className="grid grid-cols-[1fr_auto] gap-x-4 py-3">
            <div>
              <p className="font-semibold">{item.name}</p>
              {item.reason && <p className="text-sm text-slate2">{item.reason}</p>}
              <p className="mt-0.5 text-sm text-slate2">
                {item.quantity} × {money(item.unit_price)}
              </p>
            </div>
            <p className="self-start font-semibold tabular-nums">{money(item.line_total)}</p>
          </li>
        ))}
      </ul>

      <div className="tear mt-2 pt-4">
        <dl className="ml-auto max-w-xs space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate2">Subtotal</dt>
            <dd className="tabular-nums">{money(quote.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate2">GST ({Math.round(quote.gst_rate * 100)}%)</dt>
            <dd className="tabular-nums">{money(quote.gst)}</dd>
          </div>
          <div className="flex items-baseline justify-between border-t border-line pt-2">
            <dt className="font-semibold">Total</dt>
            <dd className="font-display text-3xl font-bold tabular-nums">{money(quote.total)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-right text-sm text-slate2">
          Earliest delivery {fmtDate(quote.earliest_delivery)} ({quote.delivery_days} days)
        </p>
      </div>

      <div className="no-print mt-5 flex flex-wrap gap-2">
        {actions}

        {/* ── Customer approval link ── */}
        <button
          type="button"
          className="btn-primary flex items-center gap-1.5"
          onClick={() => {
            const url = `${window.location.origin}/quote/${quote.order_id}`;
            navigator.clipboard.writeText(url).catch(() => {});
            window.open(url, "_blank");
          }}
        >
          🔗 Share Approval Link
        </button>

        <button type="button" className="btn-primary !bg-emerald-600 hover:!bg-emerald-700" onClick={openWhatsApp}>
          📱 Send via WhatsApp
        </button>
        <button type="button" className="btn-quiet" onClick={copy}>
          {copied ? "Copied!" : "Copy Text"}
        </button>
        <button type="button" className="btn-quiet" onClick={() => window.print()}>
          Print quote
        </button>
      </div>
    </article>
  );
}
