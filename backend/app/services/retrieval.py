"""Catalogue retrieval: BM25 keyword ranking plus cheap budget/quantity hints.

The LLM only ever sees the top-k candidates returned here, which keeps prompts small
and lets the catalogue grow far beyond what fits in a single prompt.
"""
from __future__ import annotations

import math
import re
from collections import Counter
from dataclasses import dataclass

from ..models import Product

STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "have", "in", "is", "it", "its",
    "of", "on", "or", "our", "that", "the", "to", "we", "with", "need", "want", "each", "per",
    "should", "must", "will", "your", "us", "all", "any", "some", "also", "can", "about",
}


def _stem(token: str) -> str:
    if len(token) > 3 and token.endswith("s") and not token.endswith("ss"):
        return token[:-1]
    return token


def tokenize(text: str) -> list[str]:
    return [_stem(t) for t in re.findall(r"[a-z0-9]+", text.lower()) if t not in STOPWORDS]


# Brief vocabulary -> catalogue vocabulary (keys are stemmed forms).
_SYNONYM_SOURCE = {
    "diwali": ["festive", "hamper", "traditional"],
    "festival": ["festive", "diwali"],
    "onboarding": ["welcome", "kit", "employee"],
    "joiner": ["welcome", "kit", "employee", "onboarding"],
    "joining": ["welcome", "kit", "employee"],
    "hire": ["welcome", "kit", "onboarding"],
    "executive": ["premium", "client"],
    "vip": ["premium", "client", "executive"],
    "software": ["tech", "gadget"],
    "engineer": ["tech", "gadget"],
    "developer": ["tech", "gadget"],
    "it": ["tech"],
    "sustainable": ["eco", "green"],
    "trophy": ["award", "recognition"],
    "award": ["recognition", "memento", "trophy"],
    "performer": ["award", "recognition"],
    "calendar": ["new", "year"],
    "wellness": ["copper", "festive"],
    "sweet": ["mithai", "hamper"],
}
SYNONYMS = {_stem(k): [_stem(v) for v in vs] for k, vs in _SYNONYM_SOURCE.items()}


def _doc_tokens(p: Product) -> list[str]:
    return tokenize(f"{p.name} {p.name} {p.category} {p.tags} {p.description}")


def _expand(tokens: list[str]) -> list[str]:
    out = list(tokens)
    for t in tokens:
        out.extend(SYNONYMS.get(t, []))
    return out


class Bm25Index:
    def __init__(self, docs: list[list[str]], k1: float = 1.5, b: float = 0.75):
        self.docs = docs
        self.k1, self.b = k1, b
        self.n = len(docs)
        self.avgdl = (sum(len(d) for d in docs) / self.n) if self.n else 0.0
        self.df: Counter[str] = Counter()
        for d in docs:
            self.df.update(set(d))
        self.tfs = [Counter(d) for d in docs]

    def scores(self, query: list[str]) -> list[float]:
        out: list[float] = []
        for tf, doc in zip(self.tfs, self.docs):
            score = 0.0
            for term in set(query):
                f = tf.get(term, 0)
                if not f:
                    continue
                idf = math.log(1 + (self.n - self.df[term] + 0.5) / (self.df[term] + 0.5))
                denom = f + self.k1 * (1 - self.b + self.b * len(doc) / (self.avgdl or 1))
                score += idf * f * (self.k1 + 1) / denom
            out.append(score)
        return out


# ---- hints parsed straight from the brief (used to pre-filter and by the no-AI fallback) ----

_PRICE = r"(?:₹|rs\.?|inr)\s*"
_NUM = r"(\d[\d,]*(?:\.\d+)?)"
BUDGET_RE = re.compile(rf"{_PRICE}{_NUM}(?:\s*(?:-|–|to)\s*(?:{_PRICE})?{_NUM})?", re.I)
BUDGET_WORD_RE = re.compile(rf"{_NUM}\s*(?:rs\.?|rupees|inr)\b", re.I)
QTY_RE = re.compile(
    r"(\d[\d,]*)\s+(?:[a-z-]+\s+){0,2}?"
    r"(?:gifts?|hampers?|employees?|staff|people|persons?|clients?|pcs|pieces|kits?|sets?|"
    r"members|guests|recipients|boxes|trophies|joiners|customers|partners)\b",
    re.I,
)


@dataclass(frozen=True)
class Hints:
    quantity: int | None
    budget_max: int | None


def _to_int(raw: str) -> int:
    return int(float(raw.replace(",", "")))


def parse_hints(brief: str) -> Hints:
    amounts: list[int] = []
    for m in BUDGET_RE.finditer(brief):
        amounts += [_to_int(g) for g in m.groups() if g]
    for m in BUDGET_WORD_RE.finditer(brief):
        amounts.append(_to_int(m.group(1)))
    stripped = BUDGET_WORD_RE.sub(" ", BUDGET_RE.sub(" ", brief))
    qty_match = QTY_RE.search(stripped)
    qty = _to_int(qty_match.group(1)) if qty_match else None
    return Hints(quantity=qty if qty and qty > 0 else None, budget_max=max(amounts) if amounts else None)


def search(products: list[Product], brief: str, k: int = 14, budget_max: int | None = None) -> list[Product]:
    """Return up to k products, best keyword match first. Items pricier than the budget are dropped
    (a combo can never cost less than one of its items) unless that would leave too few options."""
    pool = products
    if budget_max:
        affordable = [p for p in products if p.price <= budget_max]
        if len(affordable) >= 4:
            pool = affordable
    if not pool:
        return []
    index = Bm25Index([_doc_tokens(p) for p in pool])
    query = _expand(tokenize(brief))
    scored = sorted(zip(index.scores(query), range(len(pool))), key=lambda t: (-t[0], t[1]))
    ranked = [pool[i] for s, i in scored if s > 0]
    if len(ranked) < min(k, 6):  # sparse brief: pad so the model still has options to choose from
        ranked += [p for p in pool if p not in ranked]
    return ranked[:k]
