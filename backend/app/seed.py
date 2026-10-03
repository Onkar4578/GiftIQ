"""Sample catalogue. Replace with the real product list (or load it from a CSV/ERP) in production."""
from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .models import Product

# sku, name, category, price (INR), min qty, customisation, lead time (days), stock, description, tags
CATALOGUE = [
    ("GA-PEN-01", "Executive Metal Pen", "Stationery & pens", 180, 25, "logo", 5, 2000,
     "Weighted metal ballpoint with laser-engraved logo, in a slim gift box.", "executive premium client corporate pen"),
    ("GA-PEN-02", "Pen & Card Holder Set", "Stationery & pens", 420, 25, "logo", 6, 600,
     "Metal pen with a matching business-card holder in a presentation box.", "executive client premium desk"),
    ("GA-PEN-03", "Seed Paper Pen (pack of 5)", "Stationery & pens", 90, 100, "text", 4, 3000,
     "Recycled-paper pens with a plantable seed tip.", "eco-friendly sustainable budget green"),
    ("GA-NTB-01", "Hardbound Notebook A5", "Stationery & pens", 220, 50, "logo", 5, 1500,
     "A5 notebook with a PU cover, debossed logo and ribbon bookmark.", "employee onboarding office everyday"),
    ("GA-NTB-02", "Diary & Pen Combo 2027", "Stationery & pens", 480, 25, "logo", 7, 700,
     "Dated 2027 diary with a metal pen, boxed.", "new year diary calendar executive client"),
    ("GA-DRK-01", "Insulated Steel Bottle 500ml", "Drinkware", 390, 25, "logo", 5, 1800,
     "Vacuum bottle, hot for 12 hours and cold for 24, with a laser-engraved logo.", "employee onboarding tech everyday sports"),
    ("GA-DRK-02", "Ceramic Coffee Mug", "Drinkware", 160, 48, "text", 4, 2500,
     "11oz ceramic mug with a full-wrap print.", "budget office everyday"),
    ("GA-DRK-03", "Copper Water Bottle 750ml", "Drinkware", 520, 25, "logo", 6, 800,
     "Pure copper bottle with an engraved logo, wellness theme.", "festive diwali wellness premium traditional"),
    ("GA-DRK-04", "Travel Tumbler with Lid", "Drinkware", 340, 25, "logo", 5, 1200,
     "Stainless steel tumbler with a leak-proof lid.", "employee tech everyday"),
    ("GA-APP-01", "Polo T-Shirt, embroidered", "Apparel", 450, 20, "logo", 8, 900,
     "Cotton-blend polo with the logo embroidered on the chest.", "uniform onboarding employee team"),
    ("GA-APP-02", "Round-neck T-Shirt, printed", "Apparel", 260, 30, "logo", 6, 1500,
     "180 GSM cotton tee with a screen-printed logo.", "budget event trade show team"),
    ("GA-APP-03", "Fleece Hoodie, embroidered", "Apparel", 1150, 15, "logo", 10, 300,
     "Fleece hoodie with front logo embroidery.", "tech employee premium winter team"),
    ("GA-APP-04", "Embroidered Cap", "Apparel", 220, 30, "logo", 6, 1100,
     "Cotton twill cap with an embroidered logo.", "event budget team"),
    ("GA-TEC-01", "Power Bank 10,000mAh", "Tech accessories", 780, 25, "logo", 7, 600,
     "Slim fast-charging power bank with a printed logo.", "tech gadget employee client"),
    ("GA-TEC-02", "Wireless Charging Pad", "Tech accessories", 640, 25, "logo", 7, 500,
     "15W Qi charging pad with a printed logo.", "tech gadget desk"),
    ("GA-TEC-03", "Bluetooth Speaker", "Tech accessories", 1350, 15, "logo", 9, 250,
     "Portable IPX5 speaker with a printed logo.", "tech gadget premium client"),
    ("GA-TEC-04", "USB-C Hub 4-in-1", "Tech accessories", 950, 15, "none", 8, 220,
     "Compact hub with HDMI and USB ports.", "tech gadget developer"),
    ("GA-TEC-05", "Metal Pen Drive 32GB", "Tech accessories", 380, 25, "logo", 5, 900,
     "USB 3.0 metal pen drive with an engraved logo.", "tech gadget budget"),
    ("GA-DSK-01", "Wooden Desk Organiser", "Desk accessories", 560, 20, "logo", 7, 400,
     "Teak-finish organiser with a phone stand.", "office desk executive"),
    ("GA-DSK-02", "Desk Calendar 2027", "Desk accessories", 240, 50, "logo", 6, 1200,
     "Tent calendar with company branding.", "new year calendar office budget"),
    ("GA-DSK-03", "Mobile Stand & Pen Holder", "Desk accessories", 210, 30, "logo", 5, 1000,
     "Adjustable stand with a pen cup.", "desk office budget"),
    ("GA-DSK-04", "Succulent Planter", "Desk accessories", 280, 25, "text", 5, 500,
     "Ceramic planter with a live succulent.", "eco-friendly desk festive green"),
    ("GA-HMP-01", "Diwali Sweets Box (500g)", "Gift sets & hampers", 650, 25, "logo", 5, 400,
     "Assorted mithai in a branded gift box.", "diwali festive hamper sweets traditional"),
    ("GA-HMP-02", "Diwali Dry Fruit Hamper", "Gift sets & hampers", 1250, 15, "logo", 6, 300,
     "Almonds, cashews, raisins and pistachios in a wooden crate.", "diwali festive hamper dry fruits premium client"),
    ("GA-HMP-03", "Diya & Scented Candle Set", "Gift sets & hampers", 520, 20, "logo", 5, 350,
     "Hand-painted diyas with scented candles.", "diwali festive hamper decor"),
    ("GA-HMP-04", "Executive Gourmet Hamper", "Gift sets & hampers", 2450, 10, "logo", 10, 120,
     "Coffee, chocolates, nuts and premium tea in a leather-look box.", "client executive premium festive vip"),
    ("GA-HMP-05", "Tea & Cookies Gift Box", "Gift sets & hampers", 480, 25, "logo", 5, 500,
     "Assorted teas with cookies in a printed box.", "festive client budget"),
    ("GA-KIT-01", "Employee Welcome Kit (5 items)", "Welcome kits", 1650, 20, "logo", 10, 200,
     "Bottle, notebook, pen, tote bag and lanyard in a box.", "employee onboarding joining welcome kit new hire"),
    ("GA-KIT-02", "Welcome Kit Lite (3 items)", "Welcome kits", 950, 25, "logo", 8, 260,
     "Notebook, pen and mug in a box.", "employee onboarding joining welcome kit budget"),
    ("GA-AWD-01", "Crystal Trophy", "Awards & mementos", 1450, 5, "text", 9, 80,
     "Optical crystal award with laser-engraved text.", "award recognition achievement trophy"),
    ("GA-AWD-02", "Wooden Memento Plaque", "Awards & mementos", 780, 10, "text", 7, 160,
     "Teak plaque with an engraved brass plate.", "recognition memento farewell award"),
    ("GA-AWD-03", "Brass Ganesha Idol", "Awards & mementos", 890, 15, "text", 7, 180,
     "Hand-finished brass idol in a gift box.", "festive diwali traditional client"),

    # ── New items added for multi-tier variety ─────────────────────────────────

    # Budget tier (under ₹300)
    ("GA-ECO-01", "Jute Tote Bag", "Eco & sustainable", 150, 50, "logo", 4, 2000,
     "Natural jute bag with a screen-printed logo, reusable.", "eco budget green onboarding event"),
    ("GA-ECO-02", "Bamboo Straw Set (6 pcs)", "Eco & sustainable", 120, 100, "text", 3, 3000,
     "Reusable bamboo straws with a cleaning brush in a cotton pouch.", "eco budget green sustainable"),
    ("GA-FD-01", "Artisan Chocolates Box (200g)", "Food & beverages", 250, 30, "logo", 3, 600,
     "Assorted Belgian-style chocolates in a gift box.", "festive budget sweets client"),
    ("GA-FD-02", "Trail Mix Snack Bag", "Food & beverages", 180, 50, "logo", 3, 1000,
     "Mixed seeds, nuts and berries in a branded stand-up pouch.", "budget wellness office everyday"),
    ("GA-STA-01", "Sticky Note & Bookmark Set", "Stationery & pens", 110, 100, "logo", 3, 3000,
     "Pastel sticky notes with a magnetic bookmark set.", "budget office everyday onboarding"),
    ("GA-DSK-05", "Fridge Magnet Set (6 pcs)", "Desk accessories", 160, 50, "logo", 3, 1500,
     "Printed magnets with company branding.", "budget event trade show"),

    # Mid tier (₹500 – ₹1500)
    ("GA-WEL-01", "Yoga Mat with Carry Strap", "Wellness & fitness", 850, 20, "logo", 8, 200,
     "6mm anti-slip yoga mat with a printed logo and carrying strap.", "wellness fitness employee premium"),
    ("GA-WEL-02", "Aromatherapy Diffuser Set", "Wellness & fitness", 1100, 15, "logo", 8, 150,
     "Mini ultrasonic diffuser with 3 essential oil bottles in a gift box.", "wellness festive premium client"),
    ("GA-WEL-03", "Fitness Resistance Band Kit", "Wellness & fitness", 480, 25, "logo", 5, 400,
     "Set of 3 resistance bands in a branded zipper pouch.", "wellness fitness employee budget"),
    ("GA-TEC-06", "Wireless Earbuds (TWS)", "Tech accessories", 1200, 10, "logo", 9, 180,
     "True wireless earbuds with charging case and printed logo.", "tech gadget premium client executive"),
    ("GA-TEC-07", "Smart LED Desk Lamp", "Tech accessories", 980, 15, "logo", 9, 120,
     "Touch-dimmer LED lamp with USB charging port.", "tech gadget desk premium employee"),
    ("GA-TEC-08", "Portable Mini Fan (USB)", "Tech accessories", 320, 30, "logo", 5, 500,
     "3-speed USB desk fan with a printed logo.", "tech budget office everyday"),
    ("GA-APP-05", "Canvas Backpack", "Apparel", 890, 15, "logo", 9, 200,
     "15L canvas backpack with laptop sleeve and embroidered logo.", "employee onboarding premium tech"),
    ("GA-APP-06", "Windcheater Jacket", "Apparel", 1350, 10, "logo", 12, 150,
     "Lightweight packable windcheater with chest logo embroidery.", "premium employee winter tech"),
    ("GA-HMP-06", "Premium Coffee & Mug Set", "Gift sets & hampers", 1100, 15, "logo", 7, 180,
     "Single-origin filter coffee with a ceramic mug in a kraft box.", "client festive premium coffee"),
    ("GA-HMP-07", "Spa & Relaxation Hamper", "Gift sets & hampers", 1850, 10, "logo", 8, 100,
     "Scented candle, bath salts, face mask and herbal tea in a wicker basket.", "wellness client festive premium vip"),

    # Luxury / Executive tier (₹2000+)
    ("GA-LUX-01", "Leather Passport Wallet", "Luxury accessories", 2200, 5, "text", 10, 80,
     "Full-grain leather passport holder with gold embossed initials.", "executive premium vip client luxury"),
    ("GA-LUX-02", "Luxury Pen Set in Wooden Box", "Luxury accessories", 2800, 5, "logo", 10, 60,
     "Rollerball and fountain pen with gold trim in a mahogany display box.", "executive premium vip luxury award"),
    ("GA-LUX-03", "Smart Watch (fitness tracker)", "Luxury accessories", 3200, 5, "none", 12, 50,
     "Fitness smartwatch with heart-rate monitor, OLED display, 5-day battery.", "tech premium vip executive luxury"),
    ("GA-LUX-04", "Premium Whisky Glass Set (2 pcs)", "Luxury accessories", 1900, 10, "text", 9, 90,
     "Crystal-cut whisky glasses in a branded gift box.", "executive premium vip client luxury"),
    ("GA-HMP-08", "Ultimate Corporate Gift Hamper", "Gift sets & hampers", 4200, 5, "logo", 12, 50,
     "Bluetooth speaker, premium pen, gourmet hamper, crystal glass and leather wallet in a wooden crate.", "client executive premium vip luxury festive"),
]


def seed_if_empty(db: Session) -> int:
    if db.scalar(select(func.count(Product.id))):
        return 0
    for sku, name, category, price, min_qty, custom, lead, stock, desc, tags in CATALOGUE:
        db.add(Product(sku=sku, name=name, category=category, price=price, min_qty=min_qty,
                       customization=custom, lead_time_days=lead, stock=stock,
                       description=desc, tags=tags))
    db.commit()
    return len(CATALOGUE)
