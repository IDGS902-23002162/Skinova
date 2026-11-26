"""Store community follows."""

from alembic import op
import sqlalchemy as sa

revision = 'c7b86d503ea2'
down_revision = '541fecbe3192'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'forum_follows',
        sa.Column('follower_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('followed_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
    )
    op.create_index('ix_forum_follows_followed_id', 'forum_follows', ['followed_id'])


def downgrade():
    op.drop_index('ix_forum_follows_followed_id', table_name='forum_follows')
    op.drop_table('forum_follows')
