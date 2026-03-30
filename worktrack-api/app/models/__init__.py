# Centralise tous les modèles pour que SQLAlchemy les découvre
from app.models.user import User, UserRole, UserLevel
from app.models.task import Task, TaskStatus, TaskPriority
from app.models.report import Report
from app.models.notification import Notification, NotificationType
from app.models.rating import Rating
from app.models.device import Device, DevicePlatform

__all__ = [
    "User", "UserRole", "UserLevel",
    "Task", "TaskStatus", "TaskPriority",
    "Report",
    "Notification", "NotificationType",
    "Rating",
    "Device", "DevicePlatform",
]
