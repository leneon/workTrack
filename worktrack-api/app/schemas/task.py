# ============================================================
# WorkTrack API - Schémas Task (Pydantic v2)
# ============================================================

from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import date, datetime
from app.models.task import TaskStatus, TaskPriority


# ─── Requêtes ─────────────────────────────────────────────
class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: TaskPriority = TaskPriority.medium
    due_date: Optional[date] = None
    assignee_id: UUID

    class Config:
        json_schema_extra = {
            "example": {
                "title": "Révision véhicule client #1042",
                "description": "Effectuer la révision des 60 000 km",
                "priority": "high",
                "due_date": "2026-04-15",
                "assignee_id": "uuid-de-l-employe"
            }
        }


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[TaskPriority] = None
    due_date: Optional[date] = None
    assignee_id: Optional[UUID] = None


class TaskStatusUpdate(BaseModel):
    status: TaskStatus


# ─── Réponses ─────────────────────────────────────────────
class AssigneeOut(BaseModel):
    id: UUID
    name: str
    email: str

    model_config = {"from_attributes": True}


class TaskOut(BaseModel):
    id: UUID
    title: str
    description: Optional[str]
    status: TaskStatus
    priority: TaskPriority
    due_date: Optional[date]
    assignee_id: Optional[UUID]
    creator_id: Optional[UUID]
    assigned_by: Optional[str] = None   # nom du manager (dénormalisé)
    has_report: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TaskListResponse(BaseModel):
    tasks: List[TaskOut]
    total: int
    page: int
    limit: int
