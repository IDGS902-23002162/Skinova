import uuid
from datetime import datetime, timezone
from sqlalchemy import JSON
from app.extensions import db

class AiHistory(db.Model):
    __tablename__ = 'ai_history'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    interaction_type = db.Column(db.String(50), nullable=False) # skin_analysis, product_query, ingredient_query
    query_text = db.Column(db.Text)
    subject = db.Column(db.String(255))
    summary = db.Column(db.Text)
    result = db.Column(JSON)
    requires_professional_attention = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        db.Index('ix_ai_history_user_created', 'user_id', 'created_at'),
    )
