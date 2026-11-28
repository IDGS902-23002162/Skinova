"""Store optional Mi neceser products for habits and challenges."""

import sqlalchemy as sa
from alembic import op


revision = 'ab98d1f63e20'
down_revision = 'a61f9d0b28e4'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('user_habits', sa.Column('product_ids', sa.JSON(), nullable=True))
    op.add_column('user_challenges', sa.Column('product_ids', sa.JSON(), nullable=True))


def downgrade():
    op.drop_column('user_challenges', 'product_ids')
    op.drop_column('user_habits', 'product_ids')
