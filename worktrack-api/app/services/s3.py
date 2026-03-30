# ============================================================
# WorkTrack API - Service S3 / MinIO
# Compatible AWS S3 et MinIO (self-hosted)
# ============================================================

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from fastapi import UploadFile, HTTPException, status
import uuid
import os

from app.config import settings


# ─── Client S3 singleton ──────────────────────────────────
def get_s3_client():
    kwargs = dict(
        aws_access_key_id=settings.S3_ACCESS_KEY,
        aws_secret_access_key=settings.S3_SECRET_KEY,
        region_name=settings.S3_REGION,
        config=Config(signature_version="s3v4"),
    )
    if settings.S3_ENDPOINT_URL:
        kwargs["endpoint_url"] = settings.S3_ENDPOINT_URL

    return boto3.client("s3", **kwargs)


s3_client = get_s3_client()


def ensure_bucket_exists():
    """Crée le bucket S3/MinIO s'il n'existe pas (dev/staging)."""
    try:
        s3_client.head_bucket(Bucket=settings.S3_BUCKET_NAME)
    except ClientError as e:
        if e.response["Error"]["Code"] == "404":
            s3_client.create_bucket(Bucket=settings.S3_BUCKET_NAME)
        else:
            raise


# ─── Upload ───────────────────────────────────────────────
async def upload_file(file: UploadFile, task_id: str, user_id: str) -> dict:
    """
    Uploade un fichier vers S3/MinIO et retourne les métadonnées.
    Returns: { s3_key, filename, file_size, content_type }
    """
    # Validation de l'extension
    ext = os.path.splitext(file.filename or "")[1].lower().lstrip(".")
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Extension non autorisée : .{ext}. Formats acceptés : {settings.ALLOWED_EXTENSIONS}",
        )

    # Lecture du contenu
    content = await file.read()
    file_size = len(content)

    # Vérification de la taille
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if file_size > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Fichier trop volumineux. Maximum : {settings.MAX_UPLOAD_SIZE_MB} Mo",
        )

    # Clé S3 unique
    s3_key = f"reports/{task_id}/{uuid.uuid4()}.{ext}"

    try:
        s3_client.put_object(
            Bucket=settings.S3_BUCKET_NAME,
            Key=s3_key,
            Body=content,
            ContentType=file.content_type or "application/octet-stream",
            Metadata={"uploaded_by": str(user_id), "task_id": str(task_id)},
        )
    except ClientError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'upload S3 : {str(e)}",
        )

    return {
        "s3_key": s3_key,
        "filename": file.filename,
        "file_size": file_size,
        "content_type": file.content_type,
    }


# ─── URL pré-signée ───────────────────────────────────────
def generate_presigned_url(s3_key: str, expiry: int = None) -> str:
    """
    Génère une URL de téléchargement temporaire (pré-signée S3).
    """
    expiry = expiry or settings.S3_PRESIGNED_URL_EXPIRY
    try:
        url = s3_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.S3_BUCKET_NAME, "Key": s3_key},
            ExpiresIn=expiry,
        )
        return url
    except ClientError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Impossible de générer l'URL : {str(e)}",
        )


# ─── Suppression ──────────────────────────────────────────
def delete_file(s3_key: str) -> bool:
    """Supprime un fichier de S3/MinIO."""
    try:
        s3_client.delete_object(Bucket=settings.S3_BUCKET_NAME, Key=s3_key)
        return True
    except ClientError:
        return False
