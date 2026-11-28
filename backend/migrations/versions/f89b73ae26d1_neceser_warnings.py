"""Store specific product warnings from photo analysis."""

from alembic import op
import sqlalchemy as sa

revision = 'f89b73ae26d1'
down_revision = '72cbd8e04aa1'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('user_products', sa.Column('warnings', sa.Text()))


def downgrade():
    op.drop_column('user_products', 'warnings')
