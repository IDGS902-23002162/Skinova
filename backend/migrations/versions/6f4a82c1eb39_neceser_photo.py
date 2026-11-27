"""Add personal product photos and enriched details."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.mysql import MEDIUMBLOB

revision = '6f4a82c1eb39'
down_revision = 'd7c52a0e8b16'
branch_labels = None
depends_on = None


def upgrade():
    photo_type = sa.LargeBinary().with_variant(MEDIUMBLOB(), 'mysql', 'mariadb')
    op.add_column('user_products', sa.Column('photo', photo_type))
    op.add_column('user_products', sa.Column('side_effects', sa.Text()))
    op.add_column('user_products', sa.Column('purchase_links', sa.JSON()))


def downgrade():
    op.drop_column('user_products', 'purchase_links')
    op.drop_column('user_products', 'side_effects')
    op.drop_column('user_products', 'photo')
