# ============================================================
# WorkTrack API - Router Reports
# POST /tasks/:id/reports | GET /reports/my | GET /reports/:id/download
# ============================================================

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.database import get_db
from app.models.report import Report
from app.models.task import Task, TaskStatus
from app.models.user import User, UserRole
from app.schemas.report import ReportOut, ReportListResponse, ReportDownloadResponse
from app.middleware.auth import get_current_user
from app.services.s3 import upload_file, generate_presigned_url, delete_file
from app.config import settings

router = APIRouter(tags=["Rapports"])


# ─── POST /tasks/:task_id/reports  → joindre un rapport ──
@router.post(
    "/tasks/{task_id}/reports",
    response_model=ReportOut,
    status_code=status.HTTP_201_CREATED,
)
async def attach_report(
    task_id: UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Vérifier que la tâche existe
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Tâche introuvable")

    # Accès : employé assigné ou manager/admin
    if current_user.role == UserRole.employee and task.assignee_id != current_user.id:
        raise HTTPException(status_code=403, detail="Vous n'êtes pas assigné à cette tâche")

    # La tâche doit être en cours ou terminée
    if task.status == TaskStatus.pending:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Démarrez la tâche avant de joindre un rapport",
        )

    # Upload S3
    s3_meta = await upload_file(file, str(task_id), str(current_user.id))

    # Enregistrement en base
    report = Report(
        filename=s3_meta["filename"],
        s3_key=s3_meta["s3_key"],
        file_size=s3_meta["file_size"],
        content_type=s3_meta["content_type"],
        task_id=task_id,
        uploaded_by=current_user.id,
    )
    db.add(report)
    await db.flush()

    return ReportOut(
        id=report.id,
        filename=report.filename,
        s3_key=report.s3_key,
        file_size=report.file_size,
        content_type=report.content_type,
        task_id=report.task_id,
        task_title=task.title,
        uploaded_by=report.uploaded_by,
        created_at=report.created_at,
    )


# ─── GET /reports/my  → rapports de l'employé ────────────
@router.get("/reports/my", response_model=ReportListResponse)
async def get_my_reports(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Report, Task.title.label("task_title"))
        .join(Task, Report.task_id == Task.id)
        .where(Report.uploaded_by == current_user.id)
        .order_by(Report.created_at.desc())
    )
    rows = result.all()

    reports = [
        ReportOut(
            id=r.Report.id,
            filename=r.Report.filename,
            s3_key=r.Report.s3_key,
            file_size=r.Report.file_size,
            content_type=r.Report.content_type,
            task_id=r.Report.task_id,
            task_title=r.task_title,
            uploaded_by=r.Report.uploaded_by,
            created_at=r.Report.created_at,
        )
        for r in rows
    ]

    return ReportListResponse(reports=reports, total=len(reports))


# ─── GET /reports/:id/download  → URL pré-signée ─────────
@router.get("/reports/{report_id}/download", response_model=ReportDownloadResponse)
async def download_report(
    report_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Rapport introuvable")

    # Accès : uploader ou manager/admin
    if current_user.role == UserRole.employee and report.uploaded_by != current_user.id:
        raise HTTPException(status_code=403, detail="Accès refusé")

    url = generate_presigned_url(report.s3_key)
    return ReportDownloadResponse(url=url, expires_in=settings.S3_PRESIGNED_URL_EXPIRY)


# ─── DELETE /reports/:id  → supprimer (admin/manager) ────
@router.delete("/reports/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_report(
    report_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.middleware.auth import require_manager_or_admin
    if current_user.role == UserRole.employee:
        raise HTTPException(status_code=403, detail="Accès refusé")

    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Rapport introuvable")

    delete_file(report.s3_key)
    await db.delete(report)
    return None
