"use client";

import { useCallback, useEffect, useState } from "react";
import ErrorBanner from "@/components/ErrorBanner";
import QuoteSlip from "@/components/QuoteSlip";
import StatusBadge from "@/components/StatusBadge";
import { ApiError, getOrder, getStats, listOrders, updateStatus } from "@/lib/api";
import { fmtDateTime, money, STATUS_LABEL } from "@/lib/format";
import type { OrderSummary, Quote, Stats, Status } from "@/lib/types";

const NEXT: Partial<Record<Status, { to: Status; label: string }>> = {
  recommended: { to: "confirmed", label: "Confirm order" },
  confirmed: { to: "in_production", label: "Start production" },
  in_production: { to: "dispatched", label: "Mark dispatched" },
  dispatched: { to: "delivered", label: "Mark delivered" },
};
const CANCELLABLE: Status[] = ["recommended", "confirmed", "in_production"];
const FILTERS: (Status | "")[] = ["", "recommended", "confirmed", "in_production", "dispatched", "delivered", "cancelled"];

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [filter, setFilter] = useState<Status | "">("");
  const [selected, setSelected] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [o, s] = await Promise.all([listOrders(filter || undefined), getStats()]);
      setOrders(o);
      setStats(s);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't load orders.");
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function open(id: number) {
    try {
      setSelected(await getOrder(id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't open that order.");
    }
  }

  async function move(to: Status) {
    if (!selected) return;
    try {
      setSelected(await updateStatus(selected.order_id, to));
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't update the order.");
    }
  }

  const next = selected ? NEXT[selected.status] : undefined;

  return (
    <div>
      <h1 className="text-3xl font-bold">Orders</h1>

      {stats && (
        <dl className="mt-5 grid grid-cols-2 gap-4 rounded-md border border-line bg-white p-4 sm:grid-cols-4">
          <div>
            <dt className="text-sm text-slate2">All quotes</dt>
            <dd className="font-display text-2xl font-bold tabular-nums">{stats.total_orders}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate2">Awaiting confirmation</dt>
            <dd className="font-display text-2xl font-bold tabular-nums">{stats.by_status.recommended}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate2">Open order value</dt>
            <dd className="font-display text-2xl font-bold tabular-nums">{money(stats.open_value)}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate2">Delivered value</dt>
            <dd className="font-display text-2xl font-bold tabular-nums">{money(stats.delivered_value)}</dd>
          </div>
        </dl>
      )}

      {error && (
        <div className="mt-4">
          <ErrorBanner message={error} onRetry={load} />
        </div>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,6fr)]">
        <section aria-label="Order list">
          <label htmlFor="status-filter" className="mb-1.5 block text-sm font-semibold">
            Show
          </label>
          <select id="status-filter" className="field max-w-[14rem]" value={filter} onChange={(e) => setFilter(e.target.value as Status | "")}>
            {FILTERS.map((f) => (
              <option key={f} value={f}>
                {f ? STATUS_LABEL[f] : "All orders"}
              </option>
            ))}
          </select>

          {orders === null && !error && <p className="mt-4 text-sm text-slate2">Loading orders…</p>}
          {orders?.length === 0 && (
            <p className="mt-4 text-sm text-slate2">No orders here yet. Build a quote and it will show up in this list.</p>
          )}
          <ul className="mt-4 divide-y divide-line rounded-md border border-line bg-white">
            {orders?.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => open(o.id)}
                  aria-current={selected?.order_id === o.id ? "true" : undefined}
                  className={`block w-full px-4 py-3 text-left hover:bg-paper ${selected?.order_id === o.id ? "bg-marigold-soft" : ""}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-semibold">Quote #{o.id}</span>
                    <StatusBadge status={o.status} />
                  </span>
                  <span className="mt-1 line-clamp-2 block text-sm text-slate2">{o.brief}</span>
                  <span className="mt-1 flex justify-between text-xs text-slate2">
                    <span>{fmtDateTime(o.created_at)}</span>
                    <span className="font-semibold text-ink">{money(o.total)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section aria-label="Order detail">
          {selected ? (
            <QuoteSlip
              quote={selected}
              actions={
                <>
                  {next && (
                    <button type="button" className="btn-accent" onClick={() => move(next.to)}>
                      {next.label}
                    </button>
                  )}
                  {CANCELLABLE.includes(selected.status) && (
                    <button type="button" className="btn-quiet" onClick={() => move("cancelled")}>
                      Cancel order
                    </button>
                  )}
                </>
              }
            />
          ) : (
            <div className="slip ruled min-h-[18rem]">
              <p className="font-display text-xl font-bold">Pick an order to see its quote</p>
              <p className="mt-1 text-sm text-slate2">You can move it along the pipeline from here.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
