# ============================================================
# WorkTrack API - Router Notifications
# ============================================================

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from uuid import UUID

from app.database import get_db
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationListResponse, NotificationOut, UnreadCountResponse
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])


# ─── GET /notifications ───────────────────────────────────
@router.get("/", response_model=NotificationListResponse)
async def get_notifications(
    unread_only: bool = Query(False),
    page: int = Query(1, ge=1),
    limit: int = Query(30, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Notification).where(Notification.user_id == current_user.id)
    if unread_only:
        query = query.where(Notification.is_read == False)

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
    unread_count = (
        await db.execute(
            select(func.count()).select_from(
                select(Notification).where(
                    Notification.user_id == current_user.id,
                    Notification.is_read == False,
                ).subquery()
            )
        )
    ).scalar_one()

    notifs_result = await db.execute(
        query.order_by(Notification.created_at.desc()).offset((page - 1) * limit).limit(limit)
    )
    notifs = notifs_result.scalars().all()

    return NotificationListResponse(
        notifications=[NotificationOut.model_validate(n) for n in notifs],
        total=total,
        unread_count=unread_count,
    )


# ─── GET /notifications/unread-count ─────────────────────
@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    count = (
        await db.execute(
            select(func.count()).select_from(
                select(Notification).where(
                    Notification.user_id == current_user.id,
                    Notification.is_read == False,
                ).subquery()
            )
        )
    ).scalar_one()
    return UnreadCountResponse(count=count)


# ─── PATCH /notifications/:id/read ───────────────────────
@router.patch("/{notif_id}/read", response_model=NotificationOut)
async def mark_as_read(
    notif_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from fastapi import HTTPException
    result = await db.execute(
        select(Notification).where(
            Notification.id == notif_id,
            Notification.user_id == current_user.id,
        )
    )
    notif = result.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification introuvable")

    notif.is_read = True
    db.add(notif)
    return NotificationOut.model_validate(notif)


# ─── PATCH /notifications/read-all ───────────────────────
@router.patch("/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_as_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        update(Notification)
        .where(Notification.user_id == current_user.id, Notification.is_read == False)
        .values(is_read=True)
    )
    return None
