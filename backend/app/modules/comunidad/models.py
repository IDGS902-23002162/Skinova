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


class ForumFollow(db.Model):
    __tablename__ = 'forum_follows'

    follower_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    followed_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True, index=True)


class ForumPost(db.Model):
    __tablename__ = 'forum_posts'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(50), default='discussion')
    tags = db.Column(JSON)
    image_storage_key = db.Column(db.String(100))
    status = db.Column(db.String(30), default='active')
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'content': self.content,
            'category': self.category,
            'tags': self.tags,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class ForumComment(db.Model):
    __tablename__ = 'forum_comments'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    post_id = db.Column(db.String(36), db.ForeignKey('forum_posts.id'), nullable=False, index=True)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    parent_comment_id = db.Column(db.String(36), db.ForeignKey('forum_comments.id'))
    content = db.Column(db.Text, nullable=False)
    image_storage_key = db.Column(db.String(100))
    status = db.Column(db.String(30), default='active')
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'post_id': self.post_id,
            'user_id': self.user_id,
            'parent_comment_id': self.parent_comment_id,
            'content': self.content,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class ForumPostFavorite(db.Model):
    __tablename__ = 'forum_post_favorites'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, index=True)
    post_id = db.Column(db.String(36), db.ForeignKey('forum_posts.id'), nullable=False, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    deleted_at = db.Column(db.DateTime)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'post_id', name='uix_forum_user_post_favorite'),
    )


class ForumPostLike(db.Model):
    __tablename__ = 'forum_post_likes'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, index=True)
    post_id = db.Column(db.String(36), db.ForeignKey('forum_posts.id'), nullable=False, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    deleted_at = db.Column(db.DateTime)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'post_id', name='uix_forum_user_post_like'),
    )


class ForumReport(db.Model):
    __tablename__ = 'forum_reports'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    reporter_user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, index=True)
    target_type = db.Column(db.String(20), nullable=False)
    target_id = db.Column(db.String(36), nullable=False)
    medium = db.Column(db.String(10), nullable=False, default='content', server_default='content')
    detections = db.Column(JSON)
    reason = db.Column(db.String(50), nullable=False)
    details = db.Column(db.Text)
    status = db.Column(db.String(20), nullable=False, default='pending')
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        db.UniqueConstraint('reporter_user_id', 'target_type', 'target_id', 'medium',
                            name='uix_forum_report_per_medium'),
        db.Index('ix_forum_reports_status_created', 'status', 'created_at'),
    )


class ForumReportRead(db.Model):
    __tablename__ = 'forum_report_reads'

    report_id = db.Column(db.String(36), db.ForeignKey('forum_reports.id'), primary_key=True)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), primary_key=True)


class ForumBulletin(db.Model):
    __tablename__ = 'forum_bulletins'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, index=True)
    title = db.Column(db.String(120), nullable=False)
    content = db.Column(db.Text, nullable=False)
    image_storage_key = db.Column(db.String(100))
    image_history = db.Column(JSON)
    status = db.Column(db.String(20), nullable=False, default='published')
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        db.Index('ix_forum_bulletins_status_created', 'status', 'created_at'),
    )
