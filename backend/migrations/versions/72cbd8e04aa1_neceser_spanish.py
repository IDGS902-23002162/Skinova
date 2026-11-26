"""Store Spanish names and ingredient lists for photo products."""

from alembic import op
import sqlalchemy as sa

revision = '72cbd8e04aa1'
down_revision = '6f4a82c1eb39'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('user_products', sa.Column('name_es', sa.String(length=255)))
    op.add_column('user_products', sa.Column('ingredients_es', sa.Text()))


def downgrade():
    op.drop_column('user_products', 'ingredients_es')
    op.drop_column('user_products', 'name_es')
