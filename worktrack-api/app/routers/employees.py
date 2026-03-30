# ============================================================
# WorkTrack API - Router Employees + Ratings
# Réservé aux managers et admins
# ============================================================

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID

from app.database import get_db
from app.models.user import User
from app.models.rating import Rating
from app.models.task import Task, TaskStatus
from app.schemas.report import (
    EmployeeCreate, EmployeeUpdate, EmployeeOut, EmployeeListResponse,
    RatingCreate, RatingOut, RatingListResponse, RatingAverageResponse,
)
from app.schemas.auth import UserOut
from app.middleware.auth import get_current_user, require_manager_or_admin, require_admin
from app.services.auth import hash_password

router = APIRouter(prefix="/employees", tags=["Employés & Évaluations"])


# ─── GET /employees ───────────────────────────────────────
@router.get("/", response_model=EmployeeListResponse)
async def list_employees(
    search: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_manager_or_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(User)
    if search:
        query = query.where(
            User.name.ilike(f"%{search}%") | User.email.ilike(f"%{search}%")
        )
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
    result = await db.execute(
        query.order_by(User.name).offset((page - 1) * limit).limit(limit)
    )
    employees = result.scalars().all()
    return EmployeeListResponse(
        employees=[EmployeeOut.model_validate(e) for e in employees],
        total=total,
    )


# ─── POST /employees ──────────────────────────────────────
@router.post("/", response_model=EmployeeOut, status_code=status.HTTP_201_CREATED)
async def create_employee(
    payload: EmployeeCreate,
    current_user: User = Depends(require_manager_or_admin),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(User).where(User.email == payload.email.lower()))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email déjà utilisé")

    employee = User(
        name=payload.name.strip(),
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
        role=payload.role,
        level=payload.level,
        department=payload.department,
    )
    db.add(employee)
    await db.flush()
    return EmployeeOut.model_validate(employee)


# ─── GET /employees/:id ───────────────────────────────────
@router.get("/{employee_id}", response_model=EmployeeOut)
async def get_employee(
    employee_id: UUID,
    current_user: User = Depends(require_manager_or_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == employee_id))
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employé introuvable")
    return EmployeeOut.model_validate(employee)


# ─── PATCH /employees/:id ─────────────────────────────────
@router.patch("/{employee_id}", response_model=EmployeeOut)
async def update_employee(
    employee_id: UUID,
    payload: EmployeeUpdate,
    current_user: User = Depends(require_manager_or_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == employee_id))
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employé introuvable")

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(employee, field, value)
    db.add(employee)
    return EmployeeOut.model_validate(employee)


# ─── DELETE /employees/:id ────────────────────────────────
@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_employee(
    employee_id: UUID,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == employee_id))
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employé introuvable")
    await db.delete(employee)
    return None


# ─── GET /employees/:id/ratings ───────────────────────────
@router.get("/{employee_id}/ratings", response_model=RatingListResponse)
async def get_employee_ratings(
    employee_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # L'employé peut voir ses propres évaluations
    from app.models.user import UserRole
    if current_user.role == UserRole.employee and current_user.id != employee_id:
        raise HTTPException(status_code=403, detail="Accès refusé")

    result = await db.execute(
        select(Rating, User.name.label("manager_name"))
        .outerjoin(User, Rating.manager_id == User.id)
        .where(Rating.employee_id == employee_id)
        .order_by(Rating.created_at.desc())
    )
    rows = result.all()
    ratings = [
        RatingOut(
            id=r.Rating.id,
            score=r.Rating.score,
            comment=r.Rating.comment,
            employee_id=r.Rating.employee_id,
            manager_id=r.Rating.manager_id,
            manager_name=r.manager_name,
            created_at=r.Rating.created_at,
        )
        for r in rows
    ]
    return RatingListResponse(ratings=ratings, total=len(ratings))


# ─── GET /employees/:id/ratings/average ───────────────────
@router.get("/{employee_id}/ratings/average", response_model=RatingAverageResponse)
async def get_employee_average(
    employee_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(func.avg(Rating.score), func.count(Rating.id))
        .where(Rating.employee_id == employee_id)
    )
    avg, count = result.one()
    return RatingAverageResponse(
        employee_id=employee_id,
        average=round(float(avg or 0), 2),
        total=count or 0,
    )


# ─── POST /employees/:id/ratings ──────────────────────────
@router.post("/{employee_id}/ratings", response_model=RatingOut, status_code=status.HTTP_201_CREATED)
async def add_rating(
    employee_id: UUID,
    payload: RatingCreate,
    current_user: User = Depends(require_manager_or_admin),
    db: AsyncSession = Depends(get_db),
):
    # Vérifier que l'employé existe
    emp_result = await db.execute(select(User).where(User.id == employee_id))
    employee = emp_result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employé introuvable")

    rating = Rating(
        score=payload.score,
        comment=payload.comment,
        employee_id=employee_id,
        manager_id=current_user.id,
    )
    db.add(rating)
    await db.flush()

    # Notifier l'employé
    from app.services.push_notifications import notify_user
    from app.models.notification import NotificationType
    await notify_user(
        db=db,
        user_id=employee_id,
        title="Nouvelle évaluation",
        message=f"Vous avez reçu une note de {payload.score}/5 de votre manager.",
        notif_type=NotificationType.evaluation,
    )

    return RatingOut(
        id=rating.id,
        score=rating.score,
        comment=rating.comment,
        employee_id=rating.employee_id,
        manager_id=rating.manager_id,
        manager_name=current_user.name,
        created_at=rating.created_at,
    )


# ─── GET /employees/:id/stats  → stats pour le dashboard ─
@router.get("/{employee_id}/stats")
async def get_employee_stats(
    employee_id: UUID,
    current_user: User = Depends(require_manager_or_admin),
    db: AsyncSession = Depends(get_db),
):
    from app.models.task import TaskStatus
    task_result = await db.execute(
        select(Task.status, func.count(Task.id))
        .where(Task.assignee_id == employee_id)
        .group_by(Task.status)
    )
    stats = {row[0].value: row[1] for row in task_result.all()}

    avg_result = await db.execute(
        select(func.avg(Rating.score)).where(Rating.employee_id == employee_id)
    )
    avg = avg_result.scalar_one()

    total = sum(stats.values())
    done = stats.get("done", 0)

    return {
        "employee_id": str(employee_id),
        "tasks": {
            "total": total,
            "pending": stats.get("pending", 0),
            "in_progress": stats.get("in_progress", 0),
            "done": done,
            "completion_rate": round((done / total * 100) if total > 0 else 0, 1),
        },
        "rating_average": round(float(avg or 0), 2),
    }
