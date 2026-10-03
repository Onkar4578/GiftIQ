"""Turns a brief into a stored, priced quote.

Order of operations: retrieve candidates -> ask the model (or fall back to keyword matching)
-> validate against the catalogue -> price and date everything server-side -> persist.
"""
from __future__ import annotations

import json
import logging
import time
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..models import Order, OrderItem, Product
from . import ai, retrieval
from .ai import ModelItem, ModelPlan, ModelRequirements

log = logging.getLogger("giftiq.recommend")
MAX_ITEMS = 5
CANDIDATES = 14


class NoRecommendation(Exception):
    pass


def _parse_date(value: str | None) -> date | None:
    try:
        return date.fromisoformat(value) if value else None
    except ValueError:
        return None


def fallback_plan(candidates: list[Product], hints: retrieval.Hints) -> ModelPlan:
    """No-AI path: best keyword matches, one per category, kept inside the budget."""
    chosen: list[Product] = []
    categories: set[str] = set()
    running = 0
    for p in candidates:
        if p.category in categories:
            continue
        if hints.budget_max and running + p.price > hints.budget_max:
            continue
        chosen.append(p)
        categories.add(p.category)
        running += p.price
        if len(chosen) == 3:
            break
    if not chosen and candidates:
        chosen = [candidates[0]]
    return ModelPlan(
        summary="Closest catalogue matches to your brief, picked by keyword.",
        requirements=ModelRequirements(quantity=hints.quantity, budget_per_unit=hints.budget_max),
        items=[
            ModelItem(product_id=p.id, quantity=hints.quantity or p.min_qty,
                      reason=f"Matches your brief ({p.category.lower()}).")
            for p in chosen
        ],
    )


def _lines(plan: ModelPlan, by_id: dict[int, Product], warnings: list[str]) -> list[tuple[Product, int, str]]:
    """Keep only real candidate products, once each, at or above their minimum order."""
    lines: list[tuple[Product, int, str]] = []
    seen: set[int] = set()
    for item in plan.items:
        product = by_id.get(item.product_id)
        if product is None:
            log.warning("model returned unknown product id %s; dropped", item.product_id)
            continue
        if product.id in seen:
            continue
        seen.add(product.id)
        qty = item.quantity
        if qty < product.min_qty:
            warnings.append(f"{product.name} has a minimum order of {product.min_qty}; quantity raised from {qty}.")
            qty = product.min_qty
        lines.append((product, qty, item.reason.strip()))
        if len(lines) == MAX_ITEMS:
            break
    return lines


def create_recommendation(db: Session, brief: str) -> Order:
    settings = get_settings()
    brief = brief.strip()
    today = date.today()
    products = list(db.scalars(select(Product).order_by(Product.id)))
    hints = retrieval.parse_hints(brief)
    candidates = retrieval.search(products, brief, k=CANDIDATES, budget_max=hints.budget_max)
    by_id = {p.id: p for p in candidates}

    warnings: list[str] = []
    mode = "fallback"
    plan: ModelPlan | None = None

    if ai.is_configured():
        started = time.perf_counter()
        try:
            plan = ai.generate_plan(brief, candidates, today)
            mode = "ai"
            log.info("AI plan ok in %.1fs (%d items)", time.perf_counter() - started, len(plan.items))
        except Exception as exc:
            log.warning("AI unavailable, using fallback: %s", exc)
            warnings.append("The AI assistant could not be reached, so these are keyword-matched "
                            "suggestions. Try again in a minute for a tailored pick.")
    else:
        warnings.append("The AI assistant is not configured, so these are keyword-matched suggestions.")

    lines = _lines(plan, by_id, warnings) if plan else []
    if not lines:
        if mode == "ai":
            warnings.append("The AI returned no usable products, so these are keyword-matched suggestions.")
        mode = "fallback"
        plan = fallback_plan(candidates, hints)
        lines = _lines(plan, by_id, warnings)
    if not lines:
        raise NoRecommendation("The catalogue has no products to recommend.")

    req = plan.requirements
    budget = req.budget_per_unit or hints.budget_max
    deadline = _parse_date(req.deadline)

    unit_sum = sum(p.price for p, _, _ in lines)
    if budget and unit_sum > budget:
        warnings.append(f"This combination costs ₹{unit_sum:,} per recipient, above the ₹{int(budget):,} budget.")
    for product, qty, _ in lines:
        if qty > product.stock:
            warnings.append(f"Only {product.stock} of {product.name} in stock; confirm availability for {qty}.")
        if req.needs_customization and product.customization == "none":
            warnings.append(f"{product.name} cannot be customised with a logo or text.")

    delivery_days = max(p.lead_time_days for p, _, _ in lines) + settings.dispatch_buffer_days
    earliest = today + timedelta(days=delivery_days)
    if deadline and deadline < today:
        warnings.append(f"The deadline ({deadline:%d %b %Y}) is in the past; check the date.")
    elif deadline and earliest > deadline:
        warnings.append(f"Earliest delivery is {earliest:%d %b %Y}, after your {deadline:%d %b %Y} deadline.")

    subtotal = sum(p.price * qty for p, qty, _ in lines)
    gst = round(subtotal * settings.gst_rate)

    order = Order(
        brief=brief,
        summary=plan.summary.strip() or "Suggested gift combination.",
        status="recommended",
        mode=mode,
        requirements=json.dumps({
            "quantity": req.quantity or hints.quantity,
            "budget_per_unit": int(budget) if budget else None,
            "deadline": deadline.isoformat() if deadline else None,
            "occasion": req.occasion,
            "needs_customization": req.needs_customization,
        }),
        warnings=json.dumps(warnings),
        subtotal=subtotal,
        gst=gst,
        total=subtotal + gst,
        delivery_days=delivery_days,
        earliest_delivery=earliest,
        items=[OrderItem(product_id=p.id, name=p.name, unit_price=p.price, quantity=qty, reason=reason)
               for p, qty, reason in lines],
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order
