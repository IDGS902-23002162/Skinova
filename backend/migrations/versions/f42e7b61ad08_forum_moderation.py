"""Add reply images and per-moderator report receipts."""
from alembic import op
import sqlalchemy as sa


revision = 'f42e7b61ad08'
down_revision = 'e31b8c7a204f'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('forum_comments', sa.Column('image_storage_key', sa.String(100)))
    op.create_table(
        'forum_report_reads',
        sa.Column('report_id', sa.String(36), sa.ForeignKey('forum_reports.id'), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), primary_key=True),
    )


def downgrade():
    op.drop_table('forum_report_reads')
    with op.batch_alter_table('forum_comments') as table:
        table.drop_column('image_storage_key')
