"""Keep the schedule and goal changes for recurring habits and challenges."""

from alembic import op
import sqlalchemy as sa

revision = 'c0735af61d84'
down_revision = 'ab98d1f63e20'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('user_habits', sa.Column('cycle_plan', sa.JSON(), nullable=True))
    op.add_column('user_challenges', sa.Column('cycle_plan', sa.JSON(), nullable=True))


def downgrade():
    op.drop_column('user_challenges', 'cycle_plan')
    op.drop_column('user_habits', 'cycle_plan')
