from app.models import Product
from app.seed import CATALOGUE
from app.services import retrieval


def _products():
    return [Product(id=i + 1, sku=r[0], name=r[1], category=r[2], price=r[3], min_qty=r[4],
                    customization=r[5], lead_time_days=r[6], stock=r[7], description=r[8], tags=r[9])
            for i, r in enumerate(CATALOGUE)]


def test_diwali_brief_surfaces_hampers():
    top = retrieval.search(_products(), "Diwali gifts for our clients", k=6)
    assert any(p.category == "Gift sets & hampers" for p in top[:3])


def test_onboarding_brief_surfaces_welcome_kits():
    top = retrieval.search(_products(), "welcome gifts for new joiners", k=5)
    assert any(p.category == "Welcome kits" for p in top)


def test_budget_filters_expensive_items():
    top = retrieval.search(_products(), "premium client gifts", k=10, budget_max=500)
    assert top and all(p.price <= 500 for p in top)


def test_sparse_brief_still_returns_candidates():
    assert len(retrieval.search(_products(), "something nice please", k=10)) == 10


def test_parse_hints():
    h = retrieval.parse_hints("We need 50 gifts for our tech team, budget ₹500-1000 each, logo needed")
    assert h.quantity == 50 and h.budget_max == 1000
    h = retrieval.parse_hints("Gifts for 120 employees, Rs. 800 per unit")
    assert h.quantity == 120 and h.budget_max == 800
    h = retrieval.parse_hints("budget ₹500 for 50 employees")
    assert h.quantity == 50 and h.budget_max == 500
    h = retrieval.parse_hints("something nice for the team")
    assert h.quantity is None and h.budget_max is None
