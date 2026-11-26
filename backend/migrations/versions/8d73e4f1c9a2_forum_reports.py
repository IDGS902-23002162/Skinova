"""Add forum reports and moderation queue.

Revision ID: 8d73e4f1c9a2
Revises: 5b3e8d1c42a7
"""

from alembic import op
import sqlalchemy as sa

revision = '8d73e4f1c9a2'
down_revision = '5b3e8d1c42a7'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'forum_reports',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('reporter_user_id', sa.String(length=36), nullable=False),
        sa.Column('target_type', sa.String(length=20), nullable=False),
        sa.Column('target_id', sa.String(length=36), nullable=False),
        sa.Column('reason', sa.String(length=50), nullable=False),
        sa.Column('details', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['reporter_user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('reporter_user_id', 'target_type', 'target_id', name='uix_forum_report_once'),
    )
    op.create_index('ix_forum_reports_reporter_user_id', 'forum_reports', ['reporter_user_id'])
    op.create_index('ix_forum_reports_status_created', 'forum_reports', ['status', 'created_at'])


def downgrade():
    op.drop_index('ix_forum_reports_status_created', table_name='forum_reports')
    op.drop_index('ix_forum_reports_reporter_user_id', table_name='forum_reports')
    op.drop_table('forum_reports')
