"""Identify whether a community report concerns text or an image."""
from alembic import op
import sqlalchemy as sa


revision = 'b308c4e61a92'
down_revision = 'f42e7b61ad08'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('forum_reports') as table:
        table.add_column(sa.Column('medium', sa.String(10), nullable=False, server_default='content'))
        table.drop_constraint('uix_forum_report_once', type_='unique')
        table.create_unique_constraint(
            'uix_forum_report_per_medium', ['reporter_user_id', 'target_type', 'target_id', 'medium'],
        )


def downgrade():
    connection = op.get_bind()
    duplicates = connection.execute(sa.text(
        'SELECT 1 FROM forum_reports GROUP BY reporter_user_id, target_type, target_id '
        'HAVING COUNT(*) > 1 LIMIT 1'
    )).first()
    if duplicates:
        raise RuntimeError('Cannot downgrade while reports for the same target have different media.')
    with op.batch_alter_table('forum_reports') as table:
        table.drop_constraint('uix_forum_report_per_medium', type_='unique')
        table.create_unique_constraint('uix_forum_report_once', ['reporter_user_id', 'target_type', 'target_id'])
        table.drop_column('medium')
