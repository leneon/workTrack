# ============================================================
# WorkTrack API - Schémas Notification & Device (Pydantic v2)
# ============================================================

from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from app.models.notification import NotificationType
from app.models.device import DevicePlatform


# ──────────────────────────────────────────────────────────
# NOTIFICATION
# ──────────────────────────────────────────────────────────
class NotificationOut(BaseModel):
    id: UUID
    title: str
    message: str
    type: NotificationType
    is_read: bool
    user_id: UUID
    task_id: Optional[UUID]
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationListResponse(BaseModel):
    notifications: List[NotificationOut]
    total: int
    unread_count: int


class UnreadCountResponse(BaseModel):
    count: int


# ──────────────────────────────────────────────────────────
# DEVICE
# ──────────────────────────────────────────────────────────
class DeviceRegister(BaseModel):
    token: str
    platform: DevicePlatform

    class Config:
        json_schema_extra = {
            "example": {"token": "fcm-token-ici", "platform": "android"}
        }


class DeviceOut(BaseModel):
    id: UUID
    token: str
    platform: DevicePlatform
    user_id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}
