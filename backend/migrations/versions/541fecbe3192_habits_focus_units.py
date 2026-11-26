"""Add care focus and challenge units."""

from alembic import op
import sqlalchemy as sa

revision = '541fecbe3192'
down_revision = 'e9d267f2ae41'
branch_labels = None
depends_on = None


def upgrade():
    for table in ('user_habits', 'user_challenges'):
        op.add_column(table, sa.Column('focus', sa.String(20), nullable=False, server_default='general'))
    op.add_column('user_challenges', sa.Column('unit', sa.String(50), nullable=False, server_default='días'))


def downgrade():
    op.drop_column('user_challenges', 'unit')
    for table in ('user_challenges', 'user_habits'):
        op.drop_column(table, 'focus')
