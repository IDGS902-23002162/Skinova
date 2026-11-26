from datetime import datetime, date
from app.extensions import db


class RoutineVersion(db.Model):
    __tablename__ = "routine_versions"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    version_label = db.Column(db.String(100), nullable=False)  # Ej: "v1.0 (Actual)"
    budget = db.Column(db.String(30), default="medio", nullable=False)  # economico | medio | premium
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    smart_adjusted = db.Column(db.Boolean, default=False, nullable=False)
    environmental_summary = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    steps = db.relationship(
        "RoutineStep",
        backref="routine_version",
        lazy=True,
        cascade="all, delete-orphan",
        order_by="RoutineStep.step_order"
    )

    def to_dict(self):
        matutina = [s.to_dict() for s in self.steps if s.period == "matutina"]
        nocturna = [s.to_dict() for s in self.steps if s.period == "nocturna"]
        return {
            "id": self.id,
            "version_label": self.version_label,
            "budget": self.budget,
            "is_active": self.is_active,
            "smart_adjusted": self.smart_adjusted,
            "environmental_summary": self.environmental_summary,
            "created_at": self.created_at.isoformat(),
            "matutina": matutina,
            "nocturna": nocturna,
        }


class RoutineStep(db.Model):
    __tablename__ = "routine_steps"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    routine_version_id = db.Column(
        db.Integer,
        db.ForeignKey("routine_versions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    period = db.Column(db.String(20), nullable=False)  # 'matutina' | 'nocturna'
    step_order = db.Column(db.Integer, nullable=False)
    category = db.Column(db.String(80), nullable=False)
    product_name = db.Column(db.String(150), nullable=False)
    amount = db.Column(db.String(80), nullable=False)
    method = db.Column(db.String(255), nullable=False)
    frequency = db.Column(db.String(100), nullable=False)
    source_badge = db.Column(db.String(20), default="ai", nullable=False)  # 'inventory' | 'ai'
    has_warning = db.Column(db.Boolean, default=False, nullable=False)
    incompatibility_note = db.Column(db.String(255), nullable=True)
    justification_note = db.Column(db.Text, nullable=False)
    is_paused = db.Column(db.Boolean, default=False, nullable=False)
    web_search_url = db.Column(db.String(255), nullable=True)

    completions = db.relationship(
        "RoutineCompletionLog",
        backref="step",
        lazy=True,
        cascade="all, delete-orphan"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "period": self.period,
            "step": self.step_order,
            "category": self.category,
            "name": self.product_name,
            "amount": self.amount,
            "method": self.method,
            "frequency": self.frequency,
            "badge": self.source_badge,
            "warning": self.has_warning,
            "incompatibilityNote": self.incompatibility_note,
            "note": self.justification_note,
            "paused": self.is_paused,
            "webUrl": self.web_search_url,
        }


class RoutineCompletionLog(db.Model):
    __tablename__ = "routine_completion_logs"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    step_id = db.Column(db.Integer, db.ForeignKey("routine_steps.id", ondelete="CASCADE"), nullable=False, index=True)
    completed_date = db.Column(db.Date, default=date.today, nullable=False)

    __table_args__ = (
        db.UniqueConstraint("user_id", "step_id", "completed_date", name="uq_user_step_date"),
    )