# ============================================================
# WorkTrack API - Modèle Notification
# ============================================================

import uuid
from sqlalchemy import Column, String, Boolean, Text, Enum as SAEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base, TimestampMixin
import enum


class NotificationType(str, enum.Enum):
    task_assigned = "task_assigned"
    task_validated = "task_validated"
    task_reminder = "task_reminder"
    evaluation = "evaluation"
    system = "system"


class Notification(Base, TimestampMixin):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(SAEnum(NotificationType), default=NotificationType.system, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False, index=True)

    # FK
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True)

    # Relations
    user = relationship("User", back_populates="notifications")
    task = relationship("Task", back_populates="notifications")

    def __repr__(self):
        return f"<Notification '{self.title}' user={self.user_id} read={self.is_read}>"
