"use client";

import { useEffect, useState } from "react";
import ErrorBanner from "@/components/ErrorBanner";
import { ApiError, listCategories, listProducts } from "@/lib/api";
import { money } from "@/lib/format";
import type { Product } from "@/lib/types";

const CUSTOM: Record<Product["customization"], string> = { logo: "Logo", text: "Text", none: "None" };

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listCategories().then(setCategories).catch(() => undefined);
  }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      setError(null);
      try {
        setProducts(await listProducts({ q: q.trim(), category }));
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Couldn't load the catalogue.");
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q, category]);

  return (
    <div>
      <h1 className="text-3xl font-bold">Catalogue</h1>
      <p className="mt-1 text-slate2">The products GiftIQ can quote from. Prices are per unit, before GST.</p>

      <div className="mt-5 flex flex-wrap gap-4">
        <div>
          <label htmlFor="q" className="mb-1.5 block text-sm font-semibold">
            Search
          </label>
          <input id="q" className="field w-64" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pen, hamper, copper…" />
        </div>
        <div>
          <label htmlFor="cat" className="mb-1.5 block text-sm font-semibold">
            Category
          </label>
          <select id="cat" className="field w-56" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="mt-4">
          <ErrorBanner message={error} />
        </div>
      )}

      <div className="mt-5 overflow-x-auto rounded-md border border-line bg-white">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="border-b border-line bg-paper text-slate2">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Product</th>
              <th className="px-4 py-2.5 font-semibold">Category</th>
              <th className="px-4 py-2.5 text-right font-semibold">Price</th>
              <th className="px-4 py-2.5 text-right font-semibold">Min order</th>
              <th className="px-4 py-2.5 font-semibold">Custom</th>
              <th className="px-4 py-2.5 text-right font-semibold">Lead time</th>
              <th className="px-4 py-2.5 text-right font-semibold">Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {products?.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-2.5">
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-xs text-slate2">{p.description}</p>
                </td>
                <td className="px-4 py-2.5">{p.category}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{money(p.price)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{p.min_qty}</td>
                <td className="px-4 py-2.5">{CUSTOM[p.customization]}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{p.lead_time_days} days</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{p.stock}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {products?.length === 0 && <p className="p-4 text-sm text-slate2">Nothing matches that search. Try a shorter word or clear the category.</p>}
        {products === null && !error && <p className="p-4 text-sm text-slate2">Loading catalogue…</p>}
      </div>
    </div>
  );
}
