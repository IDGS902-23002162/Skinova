"""Allow images in moderator bulletins.

Revision ID: c91e6f3a207b
Revises: aa72c3d9e421
"""

from alembic import op
import sqlalchemy as sa

revision = 'c91e6f3a207b'
down_revision = 'aa72c3d9e421'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('forum_bulletins', sa.Column('image_storage_key', sa.String(length=100), nullable=True))


def downgrade():
    op.drop_column('forum_bulletins', 'image_storage_key')
