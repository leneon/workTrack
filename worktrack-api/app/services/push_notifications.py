# ============================================================
# WorkTrack API - Service Push Notifications (FCM)
# Firebase Cloud Messaging via HTTP v1 API
# ============================================================

import httpx
import logging
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.models.device import Device
from app.models.notification import Notification, NotificationType

logger = logging.getLogger(__name__)

FCM_URL = "https://fcm.googleapis.com/fcm/send"


# ─── Envoi FCM brut ───────────────────────────────────────
async def send_fcm_notification(
    tokens: List[str],
    title: str,
    body: str,
    data: Optional[dict] = None,
) -> bool:
    """
    Envoie une notification push FCM à une liste de tokens.
    Retourne True si au moins un envoi a réussi.
    """
    if not settings.FCM_SERVER_KEY or not tokens:
        logger.warning("FCM non configuré ou aucun token fourni. Notification ignorée.")
        return False

    payload = {
        "registration_ids": tokens,
        "notification": {"title": title, "body": body, "sound": "default"},
        "data": data or {},
        "priority": "high",
    }

    headers = {
        "Authorization": f"key={settings.FCM_SERVER_KEY}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(FCM_URL, json=payload, headers=headers)
            response.raise_for_status()
            result = response.json()
            logger.info(f"FCM envoyé : {result.get('success', 0)} succès, {result.get('failure', 0)} échecs")
            return result.get("success", 0) > 0
    except Exception as e:
        logger.error(f"Erreur FCM : {str(e)}")
        return False


# ─── Notification en base + push ──────────────────────────
async def notify_user(
    db: AsyncSession,
    user_id,
    title: str,
    message: str,
    notif_type: NotificationType,
    task_id=None,
    send_push: bool = True,
) -> Notification:
    """
    1. Crée une notification en base de données
    2. Envoie un push FCM (si send_push=True et tokens disponibles)
    """
    # 1) Enregistrement en base
    notif = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=notif_type,
        task_id=task_id,
    )
    db.add(notif)
    await db.flush()  # obtenir l'ID sans commit

    # 2) Récupérer les tokens FCM de l'utilisateur
    if send_push:
        result = await db.execute(
            select(Device.token).where(Device.user_id == user_id)
        )
        tokens = [row[0] for row in result.fetchall()]
        if tokens:
            await send_fcm_notification(
                tokens=tokens,
                title=title,
                body=message,
                data={"type": notif_type.value, "task_id": str(task_id) if task_id else ""},
            )

    return notif


# ─── Helpers métier ───────────────────────────────────────
async def notify_task_assigned(db: AsyncSession, task, assignee_id):
    await notify_user(
        db=db,
        user_id=assignee_id,
        title="Nouvelle tâche assignée",
        message=f"Une nouvelle tâche vous a été assignée : {task.title}",
        notif_type=NotificationType.task_assigned,
        task_id=task.id,
    )


async def notify_task_validated(db: AsyncSession, task, manager_id):
    """Notifie le manager qu'une tâche est marquée comme terminée."""
    await notify_user(
        db=db,
        user_id=manager_id,
        title="Tâche terminée",
        message=f"L'employé a terminé la tâche : {task.title}",
        notif_type=NotificationType.task_validated,
        task_id=task.id,
    )
