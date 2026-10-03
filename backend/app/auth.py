"""Minimal JWT auth for the demo.

Two demo accounts are seeded at startup:
  admin / giftiq2024   (admin role)
  sales / giftiq2024   (sales role)

In production: store hashed passwords in the database, rotate the secret,
and add refresh tokens. This is deliberately simple for a demo.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import time
from base64 import urlsafe_b64decode, urlsafe_b64encode
from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

SECRET = os.getenv("JWT_SECRET", "giftiq-demo-secret-change-in-prod")
ALGO = "HS256"
TTL = 8 * 3600  # 8 hours

# Demo users: { username: (hashed_password, role) }
# Password hash = sha256(username + ":" + password)
_USERS: dict[str, tuple[str, str]] = {
    "admin": (hashlib.sha256(b"admin:giftiq2024").hexdigest(), "admin"),
    "sales": (hashlib.sha256(b"sales:giftiq2024").hexdigest(), "sales"),
}


@dataclass
class User:
    username: str
    role: str


# ── Tiny JWT (no external deps) ─────────────────────────────────────────────

def _b64(data: bytes) -> str:
    return urlsafe_b64encode(data).rstrip(b"=").decode()


def _unb64(s: str) -> bytes:
    pad = 4 - len(s) % 4
    return urlsafe_b64decode(s + "=" * (pad % 4))


def _sign(msg: str) -> str:
    return _b64(hmac.new(SECRET.encode(), msg.encode(), hashlib.sha256).digest())


def create_token(username: str, role: str) -> str:
    header = _b64(json.dumps({"alg": ALGO, "typ": "JWT"}).encode())
    payload = _b64(json.dumps({"sub": username, "role": role, "exp": int(time.time()) + TTL}).encode())
    sig = _sign(f"{header}.{payload}")
    return f"{header}.{payload}.{sig}"


def verify_token(token: str) -> User:
    try:
        header, payload, sig = token.split(".")
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid token format.")
    if not hmac.compare_digest(_sign(f"{header}.{payload}"), sig):
        raise HTTPException(status_code=401, detail="Token signature invalid.")
    data = json.loads(_unb64(payload))
    if data.get("exp", 0) < time.time():
        raise HTTPException(status_code=401, detail="Token expired. Please log in again.")
    return User(username=data["sub"], role=data.get("role", "sales"))


# ── FastAPI helpers ──────────────────────────────────────────────────────────

_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> User:
    if not creds:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return verify_token(creds.credentials)


# Optional — use for routes that work both logged-in and anonymous
def get_optional_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> User | None:
    if not creds:
        return None
    try:
        return verify_token(creds.credentials)
    except HTTPException:
        return None


# ── Login helper ─────────────────────────────────────────────────────────────

def authenticate(username: str, password: str) -> str:
    """Return a JWT on success, raise 401 on failure."""
    entry = _USERS.get(username.strip().lower())
    if not entry:
        raise HTTPException(status_code=401, detail="Invalid username or password.")
    expected_hash, role = entry
    got_hash = hashlib.sha256(f"{username.strip().lower()}:{password}".encode()).hexdigest()
    if not hmac.compare_digest(expected_hash, got_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password.")
    return create_token(username.strip().lower(), role)
