"""Store daily habit and challenge progress."""

from alembic import op
import sqlalchemy as sa

revision = 'e9d267f2ae41'
down_revision = 'b2638c0d7f15'
branch_labels = None
depends_on = None


def upgrade():
    # Earlier installations created these parent tables from the models.
    offline = op.get_context().as_sql
    inspector = None if offline else sa.inspect(op.get_bind())
    if offline or not inspector.has_table('user_habits'):
        op.create_table(
            'user_habits',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
            sa.Column('title', sa.String(150), nullable=False),
            sa.Column('description', sa.Text()),
            sa.Column('frequency', sa.String(30)),
            sa.Column('target_value', sa.Integer()),
            sa.Column('unit', sa.String(50)),
            sa.Column('color', sa.String(30)),
            sa.Column('active', sa.Boolean()),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime()),
        )
        op.create_index('ix_user_habits_user_id', 'user_habits', ['user_id'])
    if offline or not inspector.has_table('user_challenges'):
        op.create_table(
            'user_challenges',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
            sa.Column('title', sa.String(150), nullable=False),
            sa.Column('description', sa.Text()),
            sa.Column('difficulty', sa.String(30)),
            sa.Column('reward', sa.String(150)),
            sa.Column('status', sa.String(30)),
            sa.Column('duration_days', sa.Integer()),
            sa.Column('started_at', sa.DateTime()),
            sa.Column('completed_at', sa.DateTime()),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime()),
        )
        op.create_index('ix_user_challenges_user_id', 'user_challenges', ['user_id'])

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
    # Keep parent tables, which may predate Alembic and contain user data.
