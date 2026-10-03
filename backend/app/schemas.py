from __future__ import annotations

from datetime import date, datetime, timezone

from pydantic import BaseModel, ConfigDict, Field, field_validator


class BriefIn(BaseModel):
    brief: str = Field(min_length=15, max_length=2000)

    @field_validator("brief")
    @classmethod
    def _strip(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 15:
            raise ValueError("Describe the job in at least 15 characters.")
        return v


class StatusIn(BaseModel):
    status: str


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    sku: str
    name: str
    category: str
    price: int
    min_qty: int
    customization: str
    lead_time_days: int
    stock: int
    description: str


class RequirementsOut(BaseModel):
    quantity: int | None = None
    budget_per_unit: int | None = None
    deadline: date | None = None
    occasion: str | None = None
    needs_customization: bool | None = None


class ItemOut(BaseModel):
    product_id: int
    name: str
    quantity: int
    unit_price: int
    line_total: int
    reason: str


class QuoteOut(BaseModel):
    order_id: int
    status: str
    mode: str  # "ai" or "fallback"
    brief: str
    summary: str
    requirements: RequirementsOut
    items: list[ItemOut]
    warnings: list[str]
    subtotal: int
    gst: int
    gst_rate: float
    total: int
    delivery_days: int
    earliest_delivery: date
    created_at: datetime

    @field_validator("created_at")
    @classmethod
    def _utc(cls, v: datetime) -> datetime:
        return v if v.tzinfo else v.replace(tzinfo=timezone.utc)


class OrderSummary(BaseModel):
    id: int
    brief: str
    status: str
    mode: str
    total: int
    item_count: int
    created_at: datetime

    @field_validator("created_at")
    @classmethod
    def _utc(cls, v: datetime) -> datetime:
        return v if v.tzinfo else v.replace(tzinfo=timezone.utc)


class StatsOut(BaseModel):
    total_orders: int
    by_status: dict[str, int]
    open_value: int  # confirmed, in production or dispatched
    delivered_value: int
