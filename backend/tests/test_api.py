import json
from datetime import date, timedelta

BRIEF = "We need 50 Diwali gifts for our tech clients, budget ₹1500 each, logo needed."


def post_brief(client, brief=BRIEF):
    return client.post("/api/recommendations", json={"brief": brief})


def test_health_and_catalogue(client):
    assert client.get("/api/health").json()["status"] == "ok"
    products = client.get("/api/products").json()
    assert len(products) >= 30
    cats = client.get("/api/categories").json()
    assert "Gift sets & hampers" in cats
    only = client.get("/api/products", params={"category": "Drinkware"}).json()
    assert only and all(p["category"] == "Drinkware" for p in only)
    found = client.get("/api/products", params={"q": "copper"}).json()
    assert any("Copper" in p["name"] for p in found)


def test_validation_rejects_short_brief(client):
    assert client.post("/api/recommendations", json={"brief": "gifts"}).status_code == 422


def test_fallback_when_ai_not_configured(client):
    r = post_brief(client)
    assert r.status_code == 201
    q = r.json()
    assert q["mode"] == "fallback" and q["items"]
    assert any("not configured" in w for w in q["warnings"])
    assert q["subtotal"] == sum(i["line_total"] for i in q["items"])
    assert q["gst"] == round(q["subtotal"] * q["gst_rate"])
    assert q["total"] == q["subtotal"] + q["gst"]
    assert sum(i["unit_price"] for i in q["items"]) <= 1500
    assert all(i["quantity"] == 50 for i in q["items"])


def test_ai_path_prices_come_from_the_database(client, fake_ai):
    products = {p["name"]: p for p in client.get("/api/products").json()}
    pen, bottle = products["Executive Metal Pen"], products["Insulated Steel Bottle 500ml"]
    fake_ai["reply"] = json.dumps({
        "summary": "Pen and bottle suit a tech team.",
        "requirements": {"quantity": 60, "budget_per_unit": 800, "deadline": None, "occasion": "Onboarding",
                         "needs_customization": True},
        "items": [{"product_id": pen["id"], "quantity": 60, "reason": "Logo-engraved and useful."},
                  {"product_id": bottle["id"], "quantity": 60, "reason": "Everyday item."},
                  {"product_id": 99999, "quantity": 60, "reason": "Invented product."}],
    })
    q = post_brief(client, "60 onboarding gifts for engineers, budget ₹800, with logo").json()
    assert q["mode"] == "ai"
    assert [i["name"] for i in q["items"]] == ["Executive Metal Pen", "Insulated Steel Bottle 500ml"]
    assert q["subtotal"] == 60 * pen["price"] + 60 * bottle["price"]
    assert q["requirements"]["quantity"] == 60


def test_ai_quantity_below_minimum_is_raised(client, fake_ai):
    pen = next(p for p in client.get("/api/products").json() if p["name"] == "Executive Metal Pen")
    fake_ai["reply"] = json.dumps({"items": [{"product_id": pen["id"], "quantity": 3, "reason": "x"}]})
    q = post_brief(client).json()
    assert q["items"][0]["quantity"] == pen["min_qty"]
    assert any("minimum order" in w for w in q["warnings"])


def test_ai_budget_and_deadline_warnings(client, fake_ai):
    hamper = next(p for p in client.get("/api/products").json() if p["name"] == "Executive Gourmet Hamper")
    soon = (date.today() + timedelta(days=2)).isoformat()
    fake_ai["reply"] = json.dumps({
        "requirements": {"quantity": 20, "budget_per_unit": 1000, "deadline": soon},
        "items": [{"product_id": hamper["id"], "quantity": 20, "reason": "Premium."}],
    })
    # no rupee amount in the text, so retrieval keeps the pricey hamper; only the model reports the budget
    q = post_brief(client, "20 premium hampers for our VIP clients, about a thousand each, needed in 2 days").json()
    text = " ".join(q["warnings"])
    assert "above the ₹1,000 budget" in text
    assert "after your" in text and "deadline" in text


def test_ai_failure_and_bad_json_fall_back(client, fake_ai):
    fake_ai["reply"] = RuntimeError("quota exceeded")
    q = post_brief(client).json()
    assert q["mode"] == "fallback" and any("could not be reached" in w for w in q["warnings"])
    fake_ai["reply"] = "sorry, I can't do that"
    q = post_brief(client).json()
    assert q["mode"] == "fallback" and q["items"]


def test_markdown_wrapped_json_is_accepted(client, fake_ai):
    pen = next(p for p in client.get("/api/products").json() if p["name"] == "Executive Metal Pen")
    fake_ai["reply"] = "```json\n" + json.dumps({"items": [{"product_id": pen["id"], "quantity": 50}]}) + "\n```"
    assert post_brief(client).json()["mode"] == "ai"


def test_order_lifecycle(client):
    oid = post_brief(client).json()["order_id"]
    assert client.get(f"/api/orders/{oid}").json()["status"] == "recommended"
    bad = client.patch(f"/api/orders/{oid}/status", json={"status": "delivered"})
    assert bad.status_code == 409
    for status in ["confirmed", "in_production", "dispatched", "delivered"]:
        r = client.patch(f"/api/orders/{oid}/status", json={"status": status})
        assert r.status_code == 200 and r.json()["status"] == status
    assert client.patch(f"/api/orders/{oid}/status", json={"status": "cancelled"}).status_code == 409
    assert client.patch(f"/api/orders/{oid}/status", json={"status": "bogus"}).status_code == 422
    assert client.get("/api/orders/999999").status_code == 404


def test_orders_list_and_stats(client):
    oid = post_brief(client).json()["order_id"]
    client.patch(f"/api/orders/{oid}/status", json={"status": "confirmed"})
    listing = client.get("/api/orders", params={"status": "confirmed"}).json()
    assert any(o["id"] == oid for o in listing)
    stats = client.get("/api/stats").json()
    assert stats["total_orders"] >= 1 and stats["by_status"]["confirmed"] >= 1 and stats["open_value"] > 0
    assert client.get("/api/orders", params={"status": "nope"}).status_code == 422


def test_rate_limit(client):
    from app.ratelimit import limiter
    old = limiter.limit
    limiter.limit = 2
    try:
        assert post_brief(client).status_code == 201
        assert post_brief(client).status_code == 201
        r = post_brief(client)
        assert r.status_code == 429 and "Retry-After" in r.headers
    finally:
        limiter.limit = old
