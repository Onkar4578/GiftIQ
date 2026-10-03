"use client";

import { useEffect, useState, FormEvent } from "react";
import {
  listProducts, listCategories, createProduct, updateProduct, deleteProduct,
  ApiError, type ProductIn,
} from "@/lib/api";
import type { Product } from "@/lib/types";
import { money } from "@/lib/format";
import ErrorBanner from "@/components/ErrorBanner";

const BLANK: ProductIn = {
  sku: "", name: "", category: "", price: 0,
  min_qty: 1, customization: "none", lead_time_days: 5,
  stock: 0, description: "", tags: "",
};

const CUSTOM_OPTS = ["none", "logo", "text"];

function badge(stock: number) {
  if (stock === 0) return <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-semibold">Out of stock</span>;
  if (stock < 50) return <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-semibold">Low: {stock}</span>;
  return <span className="rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-xs font-semibold">{stock}</span>;
}

export default function AdminCataloguePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & filter
  const [q, setQ] = useState("");
  const [filterCat, setFilterCat] = useState("");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductIn>(BLANK);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [prods, cats] = await Promise.all([listProducts({}), listCategories()]);
      setProducts(prods);
      setCategories(cats);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load catalogue.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // Filtered view
  const visible = products.filter((p) => {
    const matchQ = !q || [p.name, p.sku, p.tags, p.description].some((s) =>
      s.toLowerCase().includes(q.toLowerCase())
    );
    const matchCat = !filterCat || p.category === filterCat;
    return matchQ && matchCat;
  });

  function openAdd() {
    setEditing(null);
    setForm(BLANK);
    setSaveError(null);
    setModalOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      sku: p.sku, name: p.name, category: p.category, price: p.price,
      min_qty: p.min_qty, customization: p.customization,
      lead_time_days: p.lead_time_days, stock: p.stock,
      description: p.description, tags: p.tags,
    });
    setSaveError(null);
    setModalOpen(true);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      if (editing) {
        await updateProduct(editing.id, form);
      } else {
        await createProduct(form);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteProduct(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Delete failed.");
    } finally {
      setDeleting(false);
    }
  }

  function field(key: keyof ProductIn, label: string, type = "text", extra?: object) {
    return (
      <div key={key}>
        <label className="block text-xs font-semibold text-slate2 mb-1">{label}</label>
        <input
          className="field w-full"
          type={type}
          value={String(form[key])}
          onChange={(e) => setForm((f) => ({ ...f, [key]: type === "number" ? Number(e.target.value) : e.target.value }))}
          {...extra}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="border-b border-line pb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Admin · Catalogue Manager</h1>
          <p className="text-sm text-slate2 mt-0.5">
            Add, edit or remove products. Changes are live immediately — the AI uses this catalogue for all future quotes.
          </p>
        </div>
        <button id="admin-add-product" onClick={openAdd} className="btn-primary flex items-center gap-2">
          <span className="text-lg leading-none">+</span> Add Product
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Products", value: products.length },
          { label: "Categories", value: categories.length },
          { label: "In Stock", value: products.filter((p) => p.stock > 0).length },
          { label: "Out of Stock", value: products.filter((p) => p.stock === 0).length },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-line bg-white px-4 py-3">
            <p className="text-xs text-slate2 font-semibold">{s.label}</p>
            <p className="text-2xl font-bold text-ink">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input
          className="field !py-1.5 !text-sm w-60"
          placeholder="🔍 Search name, SKU, tags…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="field !py-1.5 !text-sm"
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        {(q || filterCat) && (
          <button className="btn-quiet !py-1.5 !text-sm" onClick={() => { setQ(""); setFilterCat(""); }}>
            Clear ✕
          </button>
        )}
        <span className="ml-auto text-xs text-slate2 self-center">{visible.length} of {products.length} products</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="rounded-xl border border-line bg-paper p-12 text-center text-sm text-slate2">
          Loading catalogue…
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-paper border-b border-line">
              <tr>
                {["SKU", "Name", "Category", "Price", "MOQ", "Customization", "Lead (days)", "Stock", "Actions"].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-slate2 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate2">No products match your search.</td>
                </tr>
              ) : visible.map((p) => (
                <tr key={p.id} className="hover:bg-paper transition-colors">
                  <td className="px-3 py-2.5 font-mono text-xs text-slate2 whitespace-nowrap">{p.sku}</td>
                  <td className="px-3 py-2.5 font-semibold text-ink max-w-[180px] truncate" title={p.name}>{p.name}</td>
                  <td className="px-3 py-2.5 text-slate2 whitespace-nowrap">
                    <span className="rounded-full bg-paper border border-line px-2 py-0.5 text-xs">{p.category}</span>
                  </td>
                  <td className="px-3 py-2.5 font-semibold text-ink tabular-nums whitespace-nowrap">{money(p.price)}</td>
                  <td className="px-3 py-2.5 text-slate2 tabular-nums">{p.min_qty}</td>
                  <td className="px-3 py-2.5 text-slate2 capitalize">{p.customization}</td>
                  <td className="px-3 py-2.5 text-slate2 tabular-nums">{p.lead_time_days}</td>
                  <td className="px-3 py-2.5">{badge(p.stock)}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <div className="flex gap-1.5">
                      <button
                        className="rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 px-2.5 py-1 text-xs font-semibold transition"
                        onClick={() => openEdit(p)}
                      >
                        Edit
                      </button>
                      <button
                        className="rounded-md bg-red-50 text-red-600 hover:bg-red-100 px-2.5 py-1 text-xs font-semibold transition"
                        onClick={() => setDeleteTarget(p)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <h2 className="text-lg font-bold text-ink">
                {editing ? `Edit: ${editing.name}` : "Add New Product"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-slate2 hover:text-ink text-xl leading-none">✕</button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {field("sku", "SKU *", "text", { required: true, disabled: !!editing, placeholder: "GA-NEW-01" })}
                {field("name", "Product Name *", "text", { required: true, placeholder: "e.g. Premium Eco Pen" })}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate2 mb-1">Category *</label>
                <input
                  className="field w-full"
                  list="cat-list"
                  required
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="Select or type new category"
                />
                <datalist id="cat-list">
                  {categories.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {field("price", "Price (₹ excl. GST) *", "number", { required: true, min: 1 })}
                {field("min_qty", "Min Qty (MOQ) *", "number", { required: true, min: 1 })}
                {field("stock", "Stock *", "number", { required: true, min: 0 })}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate2 mb-1">Customization</label>
                  <select
                    className="field w-full"
                    value={form.customization}
                    onChange={(e) => setForm((f) => ({ ...f, customization: e.target.value }))}
                  >
                    {CUSTOM_OPTS.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
                {field("lead_time_days", "Lead Time (days)", "number", { min: 1 })}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate2 mb-1">Description</label>
                <textarea
                  className="field w-full resize-y"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Short product description for the AI to understand the item…"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate2 mb-1">Tags (space-separated)</label>
                <input
                  className="field w-full"
                  value={form.tags}
                  onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                  placeholder="e.g. festive diwali premium client executive"
                />
                <p className="text-xs text-slate2 mt-1">Tags help the AI pick this product for the right occasion.</p>
              </div>

              {saveError && <ErrorBanner message={saveError} />}

              <div className="flex justify-end gap-3 pt-2 border-t border-line">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-quiet">Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? "Saving…" : editing ? "Save Changes" : "Add Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-ink">Delete Product?</h2>
            <p className="text-sm text-slate2">
              Are you sure you want to delete <strong className="text-ink">{deleteTarget.name}</strong> ({deleteTarget.sku})?
              Existing quotes won&apos;t be affected, but this product will no longer appear in future AI recommendations.
            </p>
            <div className="flex gap-3 justify-end">
              <button className="btn-quiet" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button
                className="rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 text-sm transition disabled:opacity-50"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
