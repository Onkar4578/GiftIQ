from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .api import router
from .config import get_settings
from .database import Base, SessionLocal, engine
from .seed import seed_if_empty

log = logging.getLogger("giftiq")


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        added = seed_if_empty(db)
    if added:
        log.info("Seeded %d sample products", added)
    log.info("AI mode: %s", "gemini" if get_settings().gemini_api_key else "keyword fallback (no GEMINI_API_KEY)")
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    logging.basicConfig(level=settings.log_level, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

    app = FastAPI(title="GiftIQ API", version="1.0.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST", "PATCH"],
        allow_headers=["Content-Type", "Authorization"],
    )
    app.include_router(router)

    @app.get("/")
    def root():
        return {
            "status": "online",
            "service": "GiftIQ Backend API",
            "docs": "/docs",
            "health": "/api/health"
        }

    @app.exception_handler(Exception)
    async def unhandled(_: Request, exc: Exception):
        log.exception("Unhandled error: %s", exc)
        return JSONResponse(status_code=500, content={"detail": "Something went wrong on our side. Please try again."})

    return app


app = create_app()
