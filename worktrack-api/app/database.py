# ============================================================
# WorkTrack API - Session Base de Données Async (SQLAlchemy)
# ============================================================

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import Column, DateTime, func
from app.config import settings


# ─── Moteur async ─────────────────────────────────────────
engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    echo=settings.DB_ECHO,
    future=True,
)

# ─── Session factory ──────────────────────────────────────
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


# ─── Base déclarative avec timestamps auto ────────────────
class Base(DeclarativeBase):
    pass


class TimestampMixin:
    """Mixin pour ajouter created_at / updated_at automatiquement."""
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


# ─── Dépendance FastAPI ───────────────────────────────────
async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# ─── Initialisation des tables ────────────────────────────
async def init_db():
    """Crée toutes les tables (utiliser Alembic en production)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def drop_db():
    """Supprime toutes les tables (dev/test uniquement)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
