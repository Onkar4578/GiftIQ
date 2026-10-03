import type { OrderSummary, Product, Quote, Stats, Status } from "./types";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

// ── Token storage ────────────────────────────────────────────────────────────

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("giftiq_token");
}

export function setToken(token: string) {
  localStorage.setItem("giftiq_token", token);
}

export function clearToken() {
  localStorage.removeItem("giftiq_token");
  localStorage.removeItem("giftiq_user");
}

// ── HTTP helper ──────────────────────────────────────────────────────────────

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
  } catch {
    throw new ApiError(`Can't reach the GiftIQ server at ${API_URL}. Check that the backend is running.`, 0);
  }
  if (!res.ok) {
    let message = `Request failed (${res.status}).`;
    try {
      const body = await res.json();
      if (typeof body.detail === "string") message = body.detail;
      else if (Array.isArray(body.detail) && body.detail[0]?.msg) message = String(body.detail[0].msg);
    } catch {
      /* keep the generic message */
    }
    throw new ApiError(message, res.status);
  }
  return res.json() as Promise<T>;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  username: string;
  role: string;
  access_token: string;
}

export async function login(username: string, password: string): Promise<AuthUser> {
  const data = await request<{ access_token: string; username: string; role: string }>(
    "/api/auth/login",
    { method: "POST", body: JSON.stringify({ username, password }) }
  );
  setToken(data.access_token);
  localStorage.setItem("giftiq_user", JSON.stringify({ username: data.username, role: data.role }));
  return data;
}

export async function logout() {
  clearToken();
}

export function getSavedUser(): { username: string; role: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("giftiq_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ── Quotes & Orders ──────────────────────────────────────────────────────────

export const createRecommendation = (brief: string) =>
  request<Quote>("/api/recommendations", { method: "POST", body: JSON.stringify({ brief }) });

export const getOrder = (id: number) => request<Quote>(`/api/orders/${id}`);

export const updateStatus = (id: number, status: Status) =>
  request<Quote>(`/api/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });

export const listOrders = (status?: string) =>
  request<OrderSummary[]>(`/api/orders${status ? `?status=${encodeURIComponent(status)}` : ""}`);

export const getStats = () => request<Stats>("/api/stats");

export const listCategories = () => request<string[]>("/api/categories");

export const listProducts = (params: { q?: string; category?: string }) => {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.category) qs.set("category", params.category);
  const s = qs.toString();
  return request<Product[]>(`/api/products${s ? `?${s}` : ""}`);
};

// ── Evaluate ─────────────────────────────────────────────────────────────────

export interface EvalItem {
  product_id: number;
  name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  reason: string;
}

export interface EvalPlan {
  mode: string;
  summary: string;
  items: EvalItem[];
  subtotal: number;
  total: number;
  warnings: string[];
}

export interface EvalResult {
  brief: string;
  ai: EvalPlan | null;
  keyword: EvalPlan;
  ai_available: boolean;
}

export const evaluate = (brief: string) =>
  request<EvalResult>("/api/evaluate", { method: "POST", body: JSON.stringify({ brief }) });

// ── Multi-Tier ───────────────────────────────────────────────────────────────

export interface MultiTierResult {
  brief: string;
  value_tier: Quote;
  standard_tier: Quote;
  executive_tier: Quote;
}

export const generateMultiTier = (brief: string) =>
  request<MultiTierResult>("/api/multi-tier", { method: "POST", body: JSON.stringify({ brief }) });


// ── Admin Catalogue CRUD ──────────────────────────────────────────────────────

export interface ProductIn {
  sku: string;
  name: string;
  category: string;
  price: number;
  min_qty: number;
  customization: string;
  lead_time_days: number;
  stock: number;
  description: string;
  tags: string;
}

export const createProduct = (body: ProductIn) =>
  request<Product>("/api/admin/products", { method: "POST", body: JSON.stringify(body) });

export const updateProduct = (id: number, body: Partial<ProductIn>) =>
  request<Product>(`/api/admin/products/${id}`, { method: "PATCH", body: JSON.stringify(body) });

export const deleteProduct = (id: number) =>
  request<void>(`/api/admin/products/${id}`, { method: "DELETE" });
