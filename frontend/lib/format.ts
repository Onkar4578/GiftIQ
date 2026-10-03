import type { Quote, Status } from "./types";

export const COMPANY = process.env.NEXT_PUBLIC_COMPANY_NAME ?? "VIP Gifts Article";

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const money = (n: number) => inr.format(n);

/** Parses "YYYY-MM-DD" as a local date so it never shifts by a day. */
export function fmtDate(value: string): string {
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export const STATUS_LABEL: Record<Status, string> = {
  recommended: "Quote",
  confirmed: "Confirmed",
  in_production: "In production",
  dispatched: "Dispatched",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export function quoteText(q: Quote): string {
  const lines = q.items.map(
    (i, n) => `${n + 1}. ${i.name}: ${i.quantity} x ${money(i.unit_price)} = ${money(i.line_total)}`,
  );
  return [
    `${COMPANY} quote #${q.order_id}`,
    "",
    ...lines,
    "",
    `Subtotal: ${money(q.subtotal)}`,
    `GST (${Math.round(q.gst_rate * 100)}%): ${money(q.gst)}`,
    `Total: ${money(q.total)}`,
    "",
    `Earliest delivery: ${fmtDate(q.earliest_delivery)}`,
  ].join("\n");
}
