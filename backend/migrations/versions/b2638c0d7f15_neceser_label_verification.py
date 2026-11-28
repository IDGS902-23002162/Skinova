"""Store source verification for private product labels."""

from alembic import op
import sqlalchemy as sa

revision = 'b2638c0d7f15'
down_revision = '83d02c3b749e'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('user_products', sa.Column('label_verification', sa.JSON()))


def downgrade():
    op.drop_column('user_products', 'label_verification')
