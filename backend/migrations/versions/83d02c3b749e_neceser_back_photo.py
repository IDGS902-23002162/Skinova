"""Store photos of product labels."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.mysql import MEDIUMBLOB

revision = '83d02c3b749e'
down_revision = '94102ab7ce16'
branch_labels = None
depends_on = None


def upgrade():
    for table in ('neceser_catalog_products', 'user_products'):
        photo_type = sa.LargeBinary().with_variant(MEDIUMBLOB(), 'mysql', 'mariadb')
        op.add_column(table, sa.Column('back_photo', photo_type))


def downgrade():
    for table in ('user_products', 'neceser_catalog_products'):
        op.drop_column(table, 'back_photo')
