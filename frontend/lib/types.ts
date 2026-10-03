export type Status = "recommended" | "confirmed" | "in_production" | "dispatched" | "delivered" | "cancelled";

export interface Requirements {
  quantity: number | null;
  budget_per_unit: number | null;
  deadline: string | null;
  occasion: string | null;
  needs_customization: boolean | null;
}

export interface QuoteItem {
  product_id: number;
  name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  reason: string;
}

export interface Quote {
  order_id: number;
  status: Status;
  mode: "ai" | "fallback";
  brief: string;
  summary: string;
  requirements: Requirements;
  items: QuoteItem[];
  warnings: string[];
  subtotal: number;
  gst: number;
  gst_rate: number;
  total: number;
  delivery_days: number;
  earliest_delivery: string;
  created_at: string;
}

export interface OrderSummary {
  id: number;
  brief: string;
  status: Status;
  mode: "ai" | "fallback";
  total: number;
  item_count: number;
  created_at: string;
}

export interface Stats {
  total_orders: number;
  by_status: Record<Status, number>;
  open_value: number;
  delivered_value: number;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  category: string;
  price: number;
  min_qty: number;
  customization: "logo" | "text" | "none";
  lead_time_days: number;
  stock: number;
  description: string;
  tags: string;
}
