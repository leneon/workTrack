# ============================================================
# WorkTrack API - Point d'entrée FastAPI
# Hyundai Motor Company · v1.0
# ============================================================

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
import time

from app.config import settings
from app.database import init_db
from app.routers import auth, tasks, reports, notifications, employees, devices

# ─── Logging ──────────────────────────────────────────────
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("worktrack")


# ─── Lifespan (démarrage / arrêt) ────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 WorkTrack API démarrage...")
    await init_db()
    logger.info("✅ Base de données initialisée")
    yield
    logger.info("🛑 WorkTrack API arrêt propre")


# ─── Application FastAPI ──────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    description=settings.APP_DESCRIPTION,
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)


# ─── Middleware CORS ──────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Middleware Compression ───────────────────────────────
app.add_middleware(GZipMiddleware, minimum_size=1000)


# ─── Middleware : temps de réponse ────────────────────────
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.perf_counter()
    response = await call_next(request)
    process_time = time.perf_counter() - start_time
    response.headers["X-Process-Time"] = f"{process_time:.4f}s"
    return response


# ─── Gestionnaire d'erreurs global ────────────────────────
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Erreur non gérée : {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Erreur interne du serveur. Contactez l'administrateur."},
    )


# ─── Routes enregistrées ──────────────────────────────────
app.include_router(auth.router)
app.include_router(tasks.router)
app.include_router(reports.router)
app.include_router(notifications.router)
app.include_router(employees.router)
app.include_router(devices.router)


# ─── Health check ─────────────────────────────────────────
@app.get("/health", tags=["Système"])
async def health_check():
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
    }


@app.get("/", tags=["Système"])
async def root():
    return {
        "message": "WorkTrack API - Hyundai Motor Company",
        "docs": "/docs",
        "version": settings.APP_VERSION,
    }
