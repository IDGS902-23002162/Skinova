"""Add moderator bulletins.

Revision ID: aa72c3d9e421
Revises: 8d73e4f1c9a2
"""

from alembic import op
import sqlalchemy as sa

revision = 'aa72c3d9e421'
down_revision = '8d73e4f1c9a2'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'forum_bulletins',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('title', sa.String(length=120), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_forum_bulletins_user_id', 'forum_bulletins', ['user_id'])
    op.create_index('ix_forum_bulletins_status_created', 'forum_bulletins', ['status', 'created_at'])


def downgrade():
    op.drop_index('ix_forum_bulletins_status_created', table_name='forum_bulletins')
    op.drop_index('ix_forum_bulletins_user_id', table_name='forum_bulletins')
    op.drop_table('forum_bulletins')
