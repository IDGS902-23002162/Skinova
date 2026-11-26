"""Store daily habit and challenge progress."""

from alembic import op
import sqlalchemy as sa

revision = 'e9d267f2ae41'
down_revision = 'b2638c0d7f15'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'habit_entries',
        sa.Column('habit_id', sa.String(36), sa.ForeignKey('user_habits.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('day', sa.Date(), primary_key=True),
        sa.Column('value', sa.Integer(), nullable=False),
    )
    op.create_table(
        'challenge_days',
        sa.Column('challenge_id', sa.String(36), sa.ForeignKey('user_challenges.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('day', sa.Date(), primary_key=True),
    )


def downgrade():
    op.drop_table('challenge_days')
    op.drop_table('habit_entries')
