from __future__ import annotations

import json
from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from .auth import User, authenticate, get_current_user
from .config import get_settings
from .database import get_db
from .models import Order, Product
from .ratelimit import rate_limit
from .schemas import (BriefIn, ItemOut, OrderSummary, ProductOut, QuoteOut, RequirementsOut,
                      StatsOut, StatusIn)
from .services import ai, retrieval
from .services.recommend import NoRecommendation, create_recommendation, fallback_plan

router = APIRouter(prefix="/api")

STATUSES = ["recommended", "confirmed", "in_production", "dispatched", "delivered", "cancelled"]
TRANSITIONS = {
    "recommended": {"confirmed", "cancelled"},
    "confirmed": {"in_production", "cancelled"},
    "in_production": {"dispatched", "cancelled"},
    "dispatched": {"delivered"},
    "delivered": set(),
    "cancelled": set(),
}


def to_quote(o: Order) -> QuoteOut:
    return QuoteOut(
        order_id=o.id,
        status=o.status,
        mode=o.mode,
        brief=o.brief,
        summary=o.summary,
        requirements=RequirementsOut(**json.loads(o.requirements or "{}")),
        items=[ItemOut(product_id=i.product_id, name=i.name, quantity=i.quantity,
                       unit_price=i.unit_price, line_total=i.unit_price * i.quantity, reason=i.reason)
               for i in o.items],
        warnings=json.loads(o.warnings or "[]"),
        subtotal=o.subtotal,
        gst=o.gst,
        gst_rate=get_settings().gst_rate,
        total=o.total,
        delivery_days=o.delivery_days,
        earliest_delivery=o.earliest_delivery,
        created_at=o.created_at,
    )


# ── Auth ─────────────────────────────────────────────────────────────────────

class LoginIn(BaseModel):
    username: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    role: str


@router.post("/auth/login", response_model=TokenOut)
def login(body: LoginIn):
    token = authenticate(body.username, body.password)
    from .auth import verify_token
    user = verify_token(token)
    return TokenOut(access_token=token, username=user.username, role=user.role)


@router.get("/auth/me")
def me(user: User = Depends(get_current_user)):
    return {"username": user.username, "role": user.role}


# ── Health ────────────────────────────────────────────────────────────────────

@router.get("/health")
def health(db: Session = Depends(get_db)):
    db.execute(select(1))
    s = get_settings()
    return {"status": "ok", "ai_configured": ai.is_configured(), "model": s.gemini_model if ai.is_configured() else None}


@router.get("/products", response_model=list[ProductOut])
def list_products(category: str | None = None, q: str | None = Query(None, max_length=100),
                  db: Session = Depends(get_db)):
    stmt = select(Product).order_by(Product.category, Product.price)
    if category:
        stmt = stmt.where(Product.category == category)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(Product.name.ilike(like), Product.description.ilike(like), Product.tags.ilike(like)))
    return list(db.scalars(stmt))


@router.get("/products/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    p = db.get(Product, product_id)
    if not p:
        raise HTTPException(status_code=404, detail="Product not found.")
    return p


@router.get("/categories", response_model=list[str])
def list_categories(db: Session = Depends(get_db)):
    return list(db.scalars(select(Product.category).distinct().order_by(Product.category)))


# ── Admin Catalogue CRUD ──────────────────────────────────────────────────────

class ProductIn(BaseModel):
    sku: str
    name: str
    category: str
    price: int
    min_qty: int = 1
    customization: str = "none"
    lead_time_days: int = 5
    stock: int = 0
    description: str = ""
    tags: str = ""


class ProductPatch(BaseModel):
    name: str | None = None
    category: str | None = None
    price: int | None = None
    min_qty: int | None = None
    customization: str | None = None
    lead_time_days: int | None = None
    stock: int | None = None
    description: str | None = None
    tags: str | None = None


@router.post("/admin/products", response_model=ProductOut, status_code=201)
def create_product(body: ProductIn, db: Session = Depends(get_db),
                   user: User = Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")
    existing = db.scalar(select(Product).where(Product.sku == body.sku))
    if existing:
        raise HTTPException(status_code=409, detail=f"SKU '{body.sku}' already exists.")
    p = Product(**body.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.patch("/admin/products/{product_id}", response_model=ProductOut)
def update_product(product_id: int, body: ProductPatch, db: Session = Depends(get_db),
                   user: User = Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")
    p = db.get(Product, product_id)
    if not p:
        raise HTTPException(status_code=404, detail="Product not found.")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(p, field, value)
    db.commit()
    db.refresh(p)
    return p


@router.delete("/admin/products/{product_id}", status_code=204)
def delete_product(product_id: int, db: Session = Depends(get_db),
                   user: User = Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")
    p = db.get(Product, product_id)
    if not p:
        raise HTTPException(status_code=404, detail="Product not found.")
    db.delete(p)
    db.commit()


@router.post("/recommendations", response_model=QuoteOut, status_code=201, dependencies=[Depends(rate_limit)])
def recommend(body: BriefIn, db: Session = Depends(get_db)):
    try:
        return to_quote(create_recommendation(db, body.brief))
    except NoRecommendation as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@router.get("/orders", response_model=list[OrderSummary])
def list_orders(status: str | None = None, limit: int = Query(50, ge=1, le=200), db: Session = Depends(get_db)):
    if status and status not in STATUSES:
        raise HTTPException(status_code=422, detail=f"Unknown status '{status}'.")
    stmt = select(Order).order_by(Order.created_at.desc(), Order.id.desc()).limit(limit)
    if status:
        stmt = stmt.where(Order.status == status)
    return [OrderSummary(id=o.id, brief=o.brief, status=o.status, mode=o.mode, total=o.total,
                         item_count=len(o.items), created_at=o.created_at) for o in db.scalars(stmt)]


@router.get("/orders/{order_id}", response_model=QuoteOut)
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")
    return to_quote(order)


@router.patch("/orders/{order_id}/status", response_model=QuoteOut)
def update_status(order_id: int, body: StatusIn, db: Session = Depends(get_db)):
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")
    if body.status not in STATUSES:
        raise HTTPException(status_code=422, detail=f"Unknown status '{body.status}'.")
    if body.status not in TRANSITIONS[order.status]:
        allowed = ", ".join(sorted(TRANSITIONS[order.status])) or "none"
        raise HTTPException(status_code=409,
                            detail=f"Can't move an order from {order.status} to {body.status}. Allowed: {allowed}.")
    order.status = body.status
    db.commit()
    db.refresh(order)
    return to_quote(order)


@router.get("/stats", response_model=StatsOut)
def stats(db: Session = Depends(get_db)):
    rows = db.execute(select(Order.status, func.count(Order.id), func.coalesce(func.sum(Order.total), 0))
                      .group_by(Order.status)).all()
    by_status = {s: 0 for s in STATUSES}
    value = {s: 0 for s in STATUSES}
    for status, count, total in rows:
        by_status[status] = count
        value[status] = int(total)
    return StatsOut(
        total_orders=sum(by_status.values()),
        by_status=by_status,
        open_value=value["confirmed"] + value["in_production"] + value["dispatched"],
        delivered_value=value["delivered"],
    )


# ── Evaluate (AI vs keyword side-by-side, no order persisted) ────────────────

class EvalItem(BaseModel):
    product_id: int
    name: str
    quantity: int
    unit_price: int
    line_total: int
    reason: str


class EvalPlan(BaseModel):
    mode: str
    summary: str
    items: list[EvalItem]
    subtotal: int
    total: int
    warnings: list[str]


class EvalOut(BaseModel):
    brief: str
    ai: EvalPlan | None
    keyword: EvalPlan
    ai_available: bool


def _price_plan(plan, candidates: list[Product], db: Session) -> tuple[list[EvalItem], int, int, list[str]]:
    """Price a ModelPlan without persisting anything."""
    from .services.recommend import _lines
    s = get_settings()
    by_id = {p.id: p for p in candidates}
    warnings: list[str] = []
    lines = _lines(plan, by_id, warnings)
    subtotal = sum(p.price * qty for p, qty, _ in lines)
    gst = round(subtotal * s.gst_rate)
    items = [
        EvalItem(
            product_id=p.id,
            name=p.name,
            quantity=qty,
            unit_price=p.price,
            line_total=p.price * qty,
            reason=reason,
        )
        for p, qty, reason in lines
    ]
    return items, subtotal, subtotal + gst, warnings


@router.post("/evaluate", response_model=EvalOut, dependencies=[Depends(rate_limit)])
def evaluate(body: BriefIn, db: Session = Depends(get_db)):
    """Run both AI and keyword planners on the same brief and return both plans
    without creating an order. Used by the evaluation mode UI."""
    brief = body.brief.strip()
    today = date.today()
    products = list(db.scalars(select(Product).order_by(Product.id)))
    hints = retrieval.parse_hints(brief)
    candidates = retrieval.search(products, brief, k=14, budget_max=hints.budget_max)

    # Always compute keyword plan
    kw_plan = fallback_plan(candidates, hints)
    kw_items, kw_sub, kw_total, kw_warns = _price_plan(kw_plan, candidates, db)
    keyword = EvalPlan(
        mode="keyword",
        summary=kw_plan.summary,
        items=kw_items,
        subtotal=kw_sub,
        total=kw_total,
        warnings=kw_warns,
    )

    ai_plan_out: EvalPlan | None = None
    ai_available = ai.is_configured()
    if ai_available:
        try:
            ai_plan = ai.generate_plan(brief, candidates, today)
            ai_items, ai_sub, ai_total, ai_warns = _price_plan(ai_plan, candidates, db)
            ai_plan_out = EvalPlan(
                mode="ai",
                summary=ai_plan.summary,
                items=ai_items,
                subtotal=ai_sub,
                total=ai_total,
                warnings=ai_warns,
            )
        except Exception as exc:
            ai_plan_out = None

    return EvalOut(brief=brief, ai=ai_plan_out, keyword=keyword, ai_available=ai_available)


# ── Multi-Tier Package Generator (Good / Better / Best) ───────────────────────

class MultiTierOut(BaseModel):
    brief: str
    value_tier: QuoteOut
    standard_tier: QuoteOut
    executive_tier: QuoteOut


@router.post("/multi-tier", response_model=MultiTierOut, dependencies=[Depends(rate_limit)])
def generate_multi_tier(body: BriefIn, db: Session = Depends(get_db)):
    """Generates 3 distinct quote tiers (Value Economy, Standard Choice, Executive Luxury)
    for the same customer brief to give corporate buyers self-service options."""
    brief = body.brief.strip()

    # Tier 1: Value Economy
    val_brief = f"{brief} (Note: Pick budget-friendly, high-value practical items for an entry-level package)."
    val_order = create_recommendation(db, val_brief)

    # Tier 2: Standard Choice
    std_order = create_recommendation(db, brief)

    # Tier 3: Executive Luxury
    exec_brief = f"{brief} (Note: Pick premium executive items, hampers, and high-end gifts for a luxury VIP package)."
    exec_order = create_recommendation(db, exec_brief)

    return MultiTierOut(
        brief=brief,
        value_tier=to_quote(val_order),
        standard_tier=to_quote(std_order),
        executive_tier=to_quote(exec_order),
    )

