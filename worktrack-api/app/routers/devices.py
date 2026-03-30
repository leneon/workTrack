# ============================================================
# WorkTrack API - Router Devices (tokens FCM)
# ============================================================

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.device import Device
from app.models.user import User
from app.schemas.notification import DeviceRegister, DeviceOut
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/devices", tags=["Appareils FCM"])


@router.post("/register", response_model=DeviceOut, status_code=status.HTTP_201_CREATED)
async def register_device(
    payload: DeviceRegister,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Vérifier si le token existe déjà (peut être d'un autre utilisateur)
    existing = await db.execute(select(Device).where(Device.token == payload.token))
    device = existing.scalar_one_or_none()

    if device:
        # Réaffecter à l'utilisateur courant si nécessaire
        device.user_id = current_user.id
        device.platform = payload.platform
    else:
        device = Device(
            token=payload.token,
            platform=payload.platform,
            user_id=current_user.id,
        )
        db.add(device)

    await db.flush()
    return DeviceOut.model_validate(device)


@router.delete("/unregister", status_code=status.HTTP_204_NO_CONTENT)
async def unregister_device(
    payload: DeviceRegister,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Device).where(
            Device.token == payload.token,
            Device.user_id == current_user.id,
        )
    )
    device = result.scalar_one_or_none()
    if device:
        await db.delete(device)
    return None
