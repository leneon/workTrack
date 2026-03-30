# ============================================================
# WorkTrack API - Modèle Device (tokens FCM push)
# ============================================================

import uuid
from sqlalchemy import Column, String, Enum as SAEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base, TimestampMixin
import enum


class DevicePlatform(str, enum.Enum):
    android = "android"
    ios = "ios"


class Device(Base, TimestampMixin):
    __tablename__ = "devices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    token = Column(String(512), nullable=False, unique=True, index=True)  # FCM token
    platform = Column(SAEnum(DevicePlatform), nullable=False)

    # FK
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Relation
    user = relationship("User", back_populates="devices")

    def __repr__(self):
        return f"<Device {self.platform} user={self.user_id}>"
