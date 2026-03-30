# ============================================================
# WorkTrack API - Router Auth
# POST /auth/login | /auth/register | /auth/refresh | /auth/me
# ============================================================

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.database import get_db
from app.models.user import User
from app.schemas.auth import (
    LoginRequest, RegisterRequest, RefreshTokenRequest,
    TokenResponse, AccessTokenResponse, UserOut, ChangePasswordRequest,
)
from app.services.auth import (
    authenticate_user, hash_password,
    create_access_token, create_refresh_token,
    decode_token, get_user_by_id, verify_password,
)
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentification"])


# ─── POST /auth/login ─────────────────────────────────────
@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(db, payload.email, payload.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
        )
    access_token = create_access_token(user.id, user.role.value)
    refresh_token = create_refresh_token(user.id)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserOut.model_validate(user),
    )


# ─── POST /auth/register ──────────────────────────────────
@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # Vérifier doublon email
    existing = await db.execute(select(User).where(User.email == payload.email.lower()))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Un compte existe déjà avec cet email",
        )

    user = User(
        name=payload.name.strip(),
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    await db.flush()

    access_token = create_access_token(user.id, user.role.value)
    refresh_token = create_refresh_token(user.id)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserOut.model_validate(user),
    )


# ─── POST /auth/refresh ───────────────────────────────────
@router.post("/refresh", response_model=AccessTokenResponse)
async def refresh_token(payload: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    token_data = decode_token(payload.refresh_token, expected_type="refresh")
    user_id = UUID(token_data["sub"])
    user = await get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Utilisateur introuvable")
    access_token = create_access_token(user.id, user.role.value)
    return AccessTokenResponse(access_token=access_token)


# ─── GET /auth/me ─────────────────────────────────────────
@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)


# ─── POST /auth/logout ────────────────────────────────────
@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(current_user: User = Depends(get_current_user)):
    # JWT stateless : la révocation se fait côté client (suppression du token)
    # Pour une révocation serveur, implémenter une blacklist Redis
    return None


# ─── POST /auth/change-password ───────────────────────────
@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mot de passe actuel incorrect",
        )
    current_user.hashed_password = hash_password(payload.new_password)
    db.add(current_user)
    return None
