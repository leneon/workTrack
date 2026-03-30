# ============================================================
# WorkTrack API - Middleware / Dépendances d'Authentification
# ============================================================

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.database import get_db
from app.services.auth import decode_token, get_user_by_id
from app.models.user import User, UserRole

# ─── Schéma Bearer ────────────────────────────────────────
bearer_scheme = HTTPBearer(auto_error=True)


# ─── Dépendance : utilisateur courant ────────────────────
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = credentials.credentials
    payload = decode_token(token, expected_type="access")
    user_id = UUID(payload["sub"])

    user = await get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur introuvable ou inactif",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


# ─── Dépendances de rôle ──────────────────────────────────
async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux administrateurs",
        )
    return current_user


async def require_manager_or_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in (UserRole.manager, UserRole.admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux managers et administrateurs",
        )
    return current_user


async def require_any_role(current_user: User = Depends(get_current_user)) -> User:
    """Tout utilisateur authentifié."""
    return current_user


# ─── Alias pratiques ──────────────────────────────────────
CurrentUser = Depends(get_current_user)
AdminOnly = Depends(require_admin)
ManagerOrAdmin = Depends(require_manager_or_admin)
AnyRole = Depends(require_any_role)
