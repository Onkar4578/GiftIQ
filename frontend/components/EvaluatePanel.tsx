"use client";

import { FormEvent, useState } from "react";
import { evaluate, type EvalPlan, type EvalResult } from "@/lib/api";
import { ApiError } from "@/lib/api";
import { money } from "@/lib/format";

function PlanCard({ plan, label }: { plan: EvalPlan; label: string }) {
  const isAi = plan.mode === "ai";
  return (
    <div
      className={`flex-1 rounded-lg border p-4 ${
        isAi ? "border-emerald-200 bg-emerald-50/50" : "border-amber-200 bg-amber-50/50"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-sm font-bold uppercase tracking-wide">
          {label}
        </h3>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            isAi ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
          }`}
        >
          {isAi ? "Gemini AI" : "Keyword BM25"}
        </span>
      </div>

      <p className="mb-3 text-sm text-slate-600 italic">&ldquo;{plan.summary}&rdquo;</p>

      <ul className="space-y-2">
        {plan.items.map((item) => (
          <li key={item.product_id} className="rounded-md bg-white p-2.5 text-sm shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <span className="font-semibold">{item.name}</span>
              <span className="tabular-nums text-slate-500">{money(item.line_total)}</span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {item.quantity} × {money(item.unit_price)}
            </p>
            {item.reason && (
              <p className="mt-1 text-xs text-slate-600">{item.reason}</p>
            )}
          </li>
        ))}
      </ul>

      {plan.warnings.length > 0 && (
        <ul className="mt-3 rounded-md bg-amber-100 p-2 text-xs text-amber-800 space-y-1">
          {plan.warnings.map((w) => (
            <li key={w}>⚠ {w}</li>
          ))}
        </ul>
      )}

      <div className="mt-3 border-t border-dashed border-slate-300 pt-3 text-right">
        <span className="text-xs text-slate-500">Total (incl. GST) </span>
        <span className="font-display text-xl font-bold">{money(plan.total)}</span>
      </div>
    </div>
  );
}

function DiffBadge({ aiTotal, kwTotal }: { aiTotal: number; kwTotal: number }) {
  const diff = aiTotal - kwTotal;
  if (Math.abs(diff) < 1) return null;
  const cheaper = diff < 0 ? "AI" : "Keyword";
  const pct = Math.abs(Math.round((diff / kwTotal) * 100));
  return (
    <div className="my-4 rounded-md bg-blue-50 border border-blue-200 px-4 py-2 text-center text-sm text-blue-700">
      <strong>{cheaper}</strong> is {pct}% {diff < 0 ? "cheaper" : "more expensive"} ({money(Math.abs(diff))}) —
      the difference comes from the number of recipients and product mix chosen.
    </div>
  );
}

export default function EvaluatePanel() {
  const [brief, setBrief] = useState("");
  const [result, setResult] = useState<EvalResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(e: FormEvent) {
    e.preventDefault();
    if (brief.trim().length < 15 || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await evaluate(brief.trim()));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Evaluation failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="AI vs Keyword evaluation">
      <div className="mb-4">
        <h2 className="text-xl font-bold">AI vs Keyword Evaluation</h2>
        <p className="mt-1 text-sm text-slate2">
          Runs the same brief through both Gemini AI and keyword matching so you can compare the picks side-by-side.
          No order is created.
        </p>
      </div>

      <form onSubmit={run} className="space-y-3">
        <textarea
          id="eval-brief"
          className="field w-full resize-y"
          rows={3}
          maxLength={2000}
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="Enter a brief to evaluate both methods, e.g. 50 Diwali hampers for clients, ₹1500 each, logo on box…"
          aria-label="Brief for evaluation"
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate2">Quick test:</span>
            <button
              type="button"
              className="btn-quiet !py-1 !px-2.5 !text-xs"
              onClick={() => setBrief("50 Diwali hampers for key clients, budget ₹1,500 each, logo on box, needed by 3 November.")}
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
              onClick={() => setBrief("12 trophies and mementos for top performers, names engraved, ₹1,500 each.")}
            >
              Award Trophies
            </button>
          </div>

          <button
            id="eval-run"
            type="submit"
            className="btn-primary whitespace-nowrap"
            disabled={busy || brief.trim().length < 15}
            aria-busy={busy}
          >
            {busy ? "Evaluating…" : "Compare AI vs Keyword"}
          </button>
        </div>
      </form>

      {error && (
        <p role="alert" className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {busy && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate2">
          <p className="font-semibold">Running both planners…</p>
          <p className="mt-1">AI call usually takes 2–5 seconds.</p>
        </div>
      )}

      {result && (
        <div className="mt-6">
          {!result.ai_available && (
            <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
              Gemini API is not configured — only keyword results shown.
            </div>
          )}

          {result.ai && result.keyword && (
            <DiffBadge aiTotal={result.ai.total} kwTotal={result.keyword.total} />
          )}

          <div className="flex flex-col gap-4 sm:flex-row">
            {result.ai ? (
              <PlanCard plan={result.ai} label="Option A — AI" />
            ) : (
              <div className="flex-1 rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate2">
                AI unavailable for this brief
              </div>
            )}
            <PlanCard plan={result.keyword} label="Option B — Keyword" />
          </div>

          <p className="mt-4 text-xs text-slate2">
            <strong>How to read this:</strong> AI picks consider the occasion, customisation, and lead times holistically.
            Keyword matching ranks by term overlap with the catalogue — faster but less context-aware.
          </p>
        </div>
      )}
    </section>
  );
}
