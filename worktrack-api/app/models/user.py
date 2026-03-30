# ============================================================
# WorkTrack API - Modèle User (Employé / Manager / Admin)
# ============================================================

import uuid
from sqlalchemy import Column, String, Boolean, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base, TimestampMixin
import enum


class UserRole(str, enum.Enum):
    employee = "employee"
    manager = "manager"
    admin = "admin"


class UserLevel(str, enum.Enum):
    junior = "junior"
    senior = "senior"
    manager = "manager"


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(150), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole), default=UserRole.employee, nullable=False)
    level = Column(SAEnum(UserLevel), default=UserLevel.junior, nullable=True)
    department = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)

    # Relations
    assigned_tasks = relationship(
        "Task", back_populates="assignee", foreign_keys="Task.assignee_id"
    )
    created_tasks = relationship(
        "Task", back_populates="creator", foreign_keys="Task.creator_id"
    )
    reports = relationship("Report", back_populates="uploaded_by_user")
    notifications = relationship("Notification", back_populates="user")
    ratings_received = relationship(
        "Rating", back_populates="employee", foreign_keys="Rating.employee_id"
    )
    ratings_given = relationship(
        "Rating", back_populates="manager", foreign_keys="Rating.manager_id"
    )
    devices = relationship("Device", back_populates="user")

    def __repr__(self):
        return f"<User {self.email} [{self.role}]>"
