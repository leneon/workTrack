# ============================================================
# WorkTrack API - Schémas Report & Employee (Pydantic v2)
# ============================================================

from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from app.models.user import UserRole, UserLevel


# ──────────────────────────────────────────────────────────
# REPORT
# ──────────────────────────────────────────────────────────
class ReportOut(BaseModel):
    id: UUID
    filename: str
    s3_key: str
    file_size: Optional[int]
    content_type: Optional[str]
    task_id: UUID
    task_title: Optional[str] = None   # dénormalisé depuis task.title
    uploaded_by: Optional[UUID]
    created_at: datetime

    model_config = {"from_attributes": True}


class ReportDownloadResponse(BaseModel):
    url: str           # URL pré-signée S3
    expires_in: int    # secondes


class ReportListResponse(BaseModel):
    reports: List[ReportOut]
    total: int


# ──────────────────────────────────────────────────────────
# EMPLOYEE (utilisé par l'admin web)
# ──────────────────────────────────────────────────────────
class EmployeeCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.employee
    level: Optional[UserLevel] = UserLevel.junior
    department: Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_min(cls, v):
        if len(v) < 6:
            raise ValueError("6 caractères minimum")
        return v


class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[UserRole] = None
    level: Optional[UserLevel] = None
    department: Optional[str] = None
    is_active: Optional[bool] = None


class EmployeeOut(BaseModel):
    id: UUID
    name: str
    email: str
    role: UserRole
    level: Optional[UserLevel]
    department: Optional[str]
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class EmployeeListResponse(BaseModel):
    employees: List[EmployeeOut]
    total: int


# ──────────────────────────────────────────────────────────
# RATING
# ──────────────────────────────────────────────────────────
class RatingCreate(BaseModel):
    score: float
    comment: Optional[str] = None
    employee_id: UUID

    @field_validator("score")
    @classmethod
    def score_range(cls, v):
        if not 0 <= v <= 5:
            raise ValueError("La note doit être entre 0 et 5")
        return v


class RatingOut(BaseModel):
    id: UUID
    score: float
    comment: Optional[str]
    employee_id: UUID
    manager_id: Optional[UUID]
    manager_name: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class RatingAverageResponse(BaseModel):
    employee_id: UUID
    average: float
    total: int


class RatingListResponse(BaseModel):
    ratings: List[RatingOut]
    total: int
