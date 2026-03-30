# ============================================================
# WorkTrack API - Modèle Rating (Évaluation employé)
# ============================================================

import uuid
from sqlalchemy import Column, Float, Text, CheckConstraint, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base, TimestampMixin


class Rating(Base, TimestampMixin):
    __tablename__ = "ratings"

    __table_args__ = (
        CheckConstraint("score >= 0 AND score <= 5", name="ck_rating_score_range"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    score = Column(Float, nullable=False)       # 0.0 à 5.0
    comment = Column(Text, nullable=True)       # commentaire du manager

    # FK
    employee_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    manager_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relations
    employee = relationship("User", back_populates="ratings_received", foreign_keys=[employee_id])
    manager = relationship("User", back_populates="ratings_given", foreign_keys=[manager_id])

    def __repr__(self):
        return f"<Rating score={self.score} employee={self.employee_id}>"
