# ============================================================
# WorkTrack API - Modèle Report (fichiers joints aux tâches)
# ============================================================

import uuid
from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base, TimestampMixin


class Report(Base, TimestampMixin):
    __tablename__ = "reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    filename = Column(String(255), nullable=False)            # nom original du fichier
    s3_key = Column(String(512), nullable=False, unique=True) # clé S3/MinIO
    file_size = Column(Integer, nullable=True)                 # en octets
    content_type = Column(String(100), nullable=True)         # MIME type

    # FK
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relations
    task = relationship("Task", back_populates="reports")
    uploaded_by_user = relationship("User", back_populates="reports")

    def __repr__(self):
        return f"<Report '{self.filename}' task={self.task_id}>"
