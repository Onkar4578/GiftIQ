from __future__ import annotations

from datetime import date, datetime, timezone

from sqlalchemy import Date, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    sku: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    category: Mapped[str] = mapped_column(String(60), index=True)
    price: Mapped[int]  # INR per unit, excluding GST
    min_qty: Mapped[int] = mapped_column(default=1)
    customization: Mapped[str] = mapped_column(String(10), default="none")  # logo | text | none
    lead_time_days: Mapped[int] = mapped_column(default=5)
    stock: Mapped[int] = mapped_column(default=0)
    description: Mapped[str] = mapped_column(Text, default="")
    tags: Mapped[str] = mapped_column(Text, default="")


class Order(Base):
    """A quote. It starts as 'recommended' and moves through the production pipeline."""

    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    brief: Mapped[str] = mapped_column(Text)
    summary: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default="recommended", index=True)
    mode: Mapped[str] = mapped_column(String(10), default="ai")  # ai | fallback
    requirements: Mapped[str] = mapped_column(Text, default="{}")  # JSON
    warnings: Mapped[str] = mapped_column(Text, default="[]")  # JSON list
    subtotal: Mapped[int] = mapped_column(default=0)
    gst: Mapped[int] = mapped_column(default=0)
    total: Mapped[int] = mapped_column(default=0)
    delivery_days: Mapped[int] = mapped_column(default=0)
    earliest_delivery: Mapped[date] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    items: Mapped[list["OrderItem"]] = relationship(
        back_populates="order", cascade="all, delete-orphan", order_by="OrderItem.id"
    )


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    name: Mapped[str] = mapped_column(String(120))  # snapshot, so old quotes survive catalogue edits
    unit_price: Mapped[int]
    quantity: Mapped[int]
    reason: Mapped[str] = mapped_column(Text, default="")

    order: Mapped[Order] = relationship(back_populates="items")
