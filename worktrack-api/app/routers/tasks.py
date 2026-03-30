# ============================================================
# WorkTrack API - Router Tasks
# GET /tasks/my | /tasks/history | POST | PATCH status
# ============================================================

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import Optional
from uuid import UUID

from app.database import get_db
from app.models.task import Task, TaskStatus
from app.models.user import User, UserRole
from app.models.report import Report
from app.schemas.task import TaskCreate, TaskUpdate, TaskStatusUpdate, TaskOut, TaskListResponse
from app.middleware.auth import get_current_user, require_manager_or_admin
from app.services.push_notifications import notify_task_assigned, notify_task_validated

router = APIRouter(prefix="/tasks", tags=["Tâches"])


def _task_to_out(task: Task, creator_name: Optional[str] = None) -> TaskOut:
    return TaskOut(
        id=task.id,
        title=task.title,
        description=task.description,
        status=task.status,
        priority=task.priority,
        due_date=task.due_date,
        assignee_id=task.assignee_id,
        creator_id=task.creator_id,
        assigned_by=creator_name,
        has_report=len(task.reports) > 0 if task.reports else False,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


# ─── GET /tasks/my  → tâches de l'employé connecté ───────
@router.get("/my", response_model=TaskListResponse)
async def get_my_tasks(
    status_filter: Optional[TaskStatus] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Task)
        .where(Task.assignee_id == current_user.id)
        .options(selectinload(Task.reports))
    )
    if status_filter:
        query = query.where(Task.status == status_filter)

    # Compter le total
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar_one()

    # Paginer
    tasks_result = await db.execute(
        query.order_by(Task.created_at.desc()).offset((page - 1) * limit).limit(limit)
    )
    tasks = tasks_result.scalars().all()

    return TaskListResponse(
        tasks=[_task_to_out(t) for t in tasks],
        total=total,
        page=page,
        limit=limit,
    )


# ─── GET /tasks/history  → tâches terminées ───────────────
@router.get("/history", response_model=TaskListResponse)
async def get_task_history(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Task)
        .where(Task.assignee_id == current_user.id, Task.status == TaskStatus.done)
        .options(selectinload(Task.reports))
    )
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar_one()

    tasks_result = await db.execute(
        query.order_by(Task.updated_at.desc()).offset((page - 1) * limit).limit(limit)
    )
    tasks = tasks_result.scalars().all()

    return TaskListResponse(tasks=[_task_to_out(t) for t in tasks], total=total, page=page, limit=limit)


# ─── GET /tasks/:id ───────────────────────────────────────
@router.get("/{task_id}", response_model=TaskOut)
async def get_task(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Task)
        .where(Task.id == task_id)
        .options(selectinload(Task.reports), selectinload(Task.creator))
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Tâche introuvable")

    # Vérification d'accès : employé ou manager/admin
    if current_user.role == UserRole.employee and task.assignee_id != current_user.id:
        raise HTTPException(status_code=403, detail="Accès refusé")

    creator_name = task.creator.name if task.creator else None
    return _task_to_out(task, creator_name)


# ─── POST /tasks  → créer une tâche (manager/admin) ───────
@router.post("/", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
async def create_task(
    payload: TaskCreate,
    current_user: User = Depends(require_manager_or_admin),
    db: AsyncSession = Depends(get_db),
):
    # Vérifier que l'assignee existe
    assignee_result = await db.execute(select(User).where(User.id == payload.assignee_id, User.is_active == True))
    assignee = assignee_result.scalar_one_or_none()
    if not assignee:
        raise HTTPException(status_code=404, detail="Employé introuvable")

    task = Task(
        title=payload.title,
        description=payload.description,
        priority=payload.priority,
        due_date=payload.due_date,
        assignee_id=payload.assignee_id,
        creator_id=current_user.id,
        status=TaskStatus.pending,
    )
    db.add(task)
    await db.flush()

    # Notification push à l'employé
    await notify_task_assigned(db, task, payload.assignee_id)

    return _task_to_out(task, current_user.name)


# ─── PUT /tasks/:id  → modifier (manager/admin) ───────────
@router.put("/{task_id}", response_model=TaskOut)
async def update_task(
    task_id: UUID,
    payload: TaskUpdate,
    current_user: User = Depends(require_manager_or_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Tâche introuvable")

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(task, field, value)
    db.add(task)

    return _task_to_out(task, current_user.name)


# ─── PATCH /tasks/:id/status  → changer le statut ────────
@router.patch("/{task_id}/status", response_model=TaskOut)
async def update_task_status(
    task_id: UUID,
    payload: TaskStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Task).where(Task.id == task_id).options(selectinload(Task.reports))
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Tâche introuvable")

    # L'employé ne peut modifier que ses propres tâches
    if current_user.role == UserRole.employee and task.assignee_id != current_user.id:
        raise HTTPException(status_code=403, detail="Accès refusé")

    task.status = payload.status
    db.add(task)

    # Notifier le manager si la tâche est marquée comme terminée
    if payload.status == TaskStatus.done and task.creator_id:
        await notify_task_validated(db, task, task.creator_id)

    return _task_to_out(task)


# ─── DELETE /tasks/:id  → supprimer (admin) ───────────────
@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: UUID,
    current_user: User = Depends(require_manager_or_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Tâche introuvable")

    await db.delete(task)
    return None


# ─── GET /tasks  → toutes les tâches (manager/admin) ──────
@router.get("/", response_model=TaskListResponse)
async def get_all_tasks(
    status_filter: Optional[TaskStatus] = Query(None, alias="status"),
    assignee_id: Optional[UUID] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_manager_or_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(Task).options(selectinload(Task.reports))
    if status_filter:
        query = query.where(Task.status == status_filter)
    if assignee_id:
        query = query.where(Task.assignee_id == assignee_id)

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar_one()

    tasks_result = await db.execute(
        query.order_by(Task.created_at.desc()).offset((page - 1) * limit).limit(limit)
    )
    tasks = tasks_result.scalars().all()

    return TaskListResponse(tasks=[_task_to_out(t) for t in tasks], total=total, page=page, limit=limit)
