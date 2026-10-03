# GiftIQ — Intelligent AI Quoting & Order Engine

Turn plain-English corporate gifting briefs into accurate, priced, delivery-dated quotes and proposals in seconds.

**Example Brief:** *"50 Diwali hampers for our key clients, budget around ₹1,500 each, our logo on the box, needed by 3 November."*

GiftIQ retrieves relevant catalogue candidates, uses Google Gemini to recommend optimized gift combinations, validates constraints on the server (budget, stock, minimum order quantities, lead times, 18% GST), and produces ready-to-share digital quotes & multi-tier proposals.

---

## 🏗️ Architecture & How It Works

```
Next.js 14 UI ──► FastAPI Backend ──► Lexical Candidate Retrieval (BM25 Engine)
                    │                       │
                    │                       ▼ Top Candidates
                    │                  Google Gemini LLM (Structured JSON Output)
                    │                       │
                    ▼                       ▼
               SQLite / DB ◄──── Constraint & Pricing Validation Engine
                                (GST, MOQ, Lead Times, Stock, Total Pricing)
```

### Key Architectural Decisions
- **Retrieval-Augmented Generation (RAG)**: Uses BM25 candidate pre-filtering to scope items before calling the LLM, enabling the catalogue to scale seamlessly.
- **Server-Enforced Constraints & Pricing**: The LLM only suggests item IDs and target quantities. Prices, line totals, minimum order quantity (MOQ) adjustments, stock checks, GST, and delivery dates are strictly calculated on the server.
- **Grounded & Fail-Safe Output**: Unknown product IDs are discarded. If the AI service is unavailable or rate-limited, GiftIQ gracefully falls back to deterministic keyword-matching.
- **Security & Access Control**: JWT authentication with Role-Based Access Control (RBAC). Admin catalogue management is restricted, while public access is securely scoped to customer approval portals (`/quote/[id]`).

---

## ⚡ Quick Start (Local Setup)

### Prerequisites
- **Python 3.10+**
- **Node.js 18+**

---

### 1. Backend Setup

```bash
cd backend
python -m venv venv

# Windows PowerShell:
venv\Scripts\Activate.ps1
# macOS / Linux:
source venv/bin/activate

pip install -r requirements.txt
copy .env.example .env      # Add your GEMINI_API_KEY in .env
uvicorn app.main:app --reload --port 8000
```
- API Liveness / Health Check: `http://localhost:8000/api/health`
- Interactive API Documentation (Swagger): `http://localhost:8000/docs`

---

### 2. Frontend Setup

```bash
cd frontend
npm install
copy .env.example .env.local
npm run dev
```
- Web Application: `http://localhost:3000`

---

### 3. Docker Compose (Full Stack)

To spin up the entire application (Frontend + Backend + DB) with a single command:

```bash
copy .env.example .env     # Add GEMINI_API_KEY
docker compose up --build
```
- **Frontend App**: `http://localhost:3001`
- **Backend API**: `http://localhost:8001`

---

## ⚙️ Environment Configuration

| Variable | Default | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | *(Optional)* | Google AI Studio API key. If omitted, engine operates in deterministic fallback mode. |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Gemini model identifier. |
| `DATABASE_URL` | `sqlite:///./giftiq.db` | SQLAlchemy database URL (SQLite by default, easily swapped for PostgreSQL). |
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:3001` | Allowed cross-origin sources. |
| `RATE_LIMIT_PER_MINUTE` | `10` | IP-based request rate limiter. |
| `GST_RATE` | `0.18` | Standard GST multiplier (18%). |
| `DISPATCH_BUFFER_DAYS` | `2` | Buffer days added to maximum lead time. |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend API URL for frontend client. |
| `NEXT_PUBLIC_COMPANY_NAME` | `GiftIQ Corporate Gifting` | Display company branding on quotes and WhatsApp exports. |

---

## 📑 Core Features

- 🤖 **AI-Powered Brief Parsing**: Extracts budget, deadline, item requirements, and customization preferences from raw text.
- 🎯 **Multi-Tier Quotes**: Generate Silver, Gold, and Platinum tier proposal bundles for corporate clients.
- 🛡️ **Role-Based Admin Catalogue Manager**: Create, update, tag, and manage product inventory & pricing dynamically (`/admin/catalogue`).
- 🔒 **Secure Route Guards**: Private administrative routes protected via JWT cookies; customer approval portals (`/quote/[id]`) publicly accessible.
- 🔗 **One-Click Shareable Proposal Links**: Instant share link generation for client approval workflows.
- 📱 **WhatsApp & Print Export**: Instant WhatsApp payload generation and print-ready CSS quote slips.
- 📊 **Order Pipeline Management**: Enforced state-machine order progression (`recommended → confirmed → in_production → dispatched → delivered`).

---

## 🧪 Testing

Run backend test suite covering API endpoints, BM25 retrieval, rule validations, rate limits, and fallback logic:

```bash
cd backend
pip install -r requirements-dev.txt
pytest -q
```

---

## 📄 License
MIT License.
