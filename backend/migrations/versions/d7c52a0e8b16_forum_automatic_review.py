"""Store detections for submissions held for review."""
from alembic import op
import sqlalchemy as sa


revision = 'd7c52a0e8b16'
down_revision = 'b308c4e61a92'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('forum_reports', sa.Column('detections', sa.JSON()))


def downgrade():
    with op.batch_alter_table('forum_reports') as table:
        table.drop_column('detections')
