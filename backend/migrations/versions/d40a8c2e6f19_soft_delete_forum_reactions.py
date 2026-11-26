"""Keep removed forum reactions and bulletin image history.

Revision ID: d40a8c2e6f19
Revises: c91e6f3a207b
"""

from alembic import op
import sqlalchemy as sa

revision = 'd40a8c2e6f19'
down_revision = 'c91e6f3a207b'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('forum_post_likes', sa.Column('deleted_at', sa.DateTime(), nullable=True))
    op.add_column('forum_post_favorites', sa.Column('deleted_at', sa.DateTime(), nullable=True))
    op.add_column('forum_bulletins', sa.Column('image_history', sa.JSON(), nullable=True))


def downgrade():
    op.drop_column('forum_bulletins', 'image_history')
    op.drop_column('forum_post_favorites', 'deleted_at')
    op.drop_column('forum_post_likes', 'deleted_at')
