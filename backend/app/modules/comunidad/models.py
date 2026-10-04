import uuid
from datetime import datetime, timezone
from sqlalchemy import JSON
from app.extensions import db

class Post(db.Model):
    __tablename__ = 'posts'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(255))
    content = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(30), default='discussion') # discussion | question | experience | review
    tags = db.Column(JSON)
    image_storage_key = db.Column(db.Text)
    status = db.Column(db.String(30), default='active')
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        db.Index('ix_posts_user_created', 'user_id', 'created_at'),
    )

class Comment(db.Model):
    __tablename__ = 'comments'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    post_id = db.Column(db.String(36), db.ForeignKey('posts.id'), nullable=False, index=True)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    parent_comment_id = db.Column(db.String(36), db.ForeignKey('comments.id'))
    content = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(30), default='active')
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

class CommunityAction(db.Model):
    __tablename__ = 'community_actions'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    post_id = db.Column(db.String(36), db.ForeignKey('posts.id'), nullable=False)
    action_type = db.Column(db.String(30), nullable=False) # reaction | follow
    value = db.Column(db.String(30)) # like, useful, etc.
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        db.UniqueConstraint('user_id', 'post_id', 'action_type', name='uix_user_post_action'),
    )

class UserBlock(db.Model):
    __tablename__ = 'user_blocks'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    blocked_user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        db.UniqueConstraint('user_id', 'blocked_user_id', name='uix_user_blocked'),
    )

class Report(db.Model):
    __tablename__ = 'reports'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    reporter_user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    post_id = db.Column(db.String(36), db.ForeignKey('posts.id'))
    reported_user_id = db.Column(db.String(36), db.ForeignKey('users.id'))
    reason = db.Column(db.String(150))
    description = db.Column(db.Text)
    status = db.Column(db.String(30), default='pending')
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
