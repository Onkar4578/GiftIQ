import os

# Must be set before the app is imported: in-memory DB, no AI key, generous rate limit.
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["GEMINI_API_KEY"] = ""
os.environ["RATE_LIMIT_PER_MINUTE"] = "1000"

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.ratelimit import limiter
from app.services import ai


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(autouse=True)
def _reset(monkeypatch):
    limiter.reset()
    monkeypatch.setattr(ai, "_sleep", lambda s: None)


@pytest.fixture
def fake_ai(monkeypatch):
    """Pretend the AI is configured and return whatever `reply` holds (string or exception)."""
    holder = {"reply": "{}"}
    monkeypatch.setattr(ai, "is_configured", lambda: True)

    def _call(prompt: str) -> str:
        reply = holder["reply"]
        if isinstance(reply, Exception):
            raise reply
        return reply

    monkeypatch.setattr(ai, "call_model", _call)
    return holder
