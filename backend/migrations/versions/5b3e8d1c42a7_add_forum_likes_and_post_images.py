"""Add forum likes and image references.

Revision ID: 5b3e8d1c42a7
Revises: 2c47a6f19b8d
Create Date: 2026-11-13
"""

from alembic import op
import sqlalchemy as sa


revision = '5b3e8d1c42a7'
down_revision = '2c47a6f19b8d'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'forum_posts',
        sa.Column('image_storage_key', sa.String(length=100), nullable=True),
    )
    op.create_table(
        'forum_post_likes',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('post_id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['post_id'], ['forum_posts.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint(
            'user_id',
            'post_id',
            name='uix_forum_user_post_like',
        ),
    )
    op.create_index(
        'ix_forum_post_likes_user_id',
        'forum_post_likes',
        ['user_id'],
    )
    op.create_index(
        'ix_forum_post_likes_post_id',
        'forum_post_likes',
        ['post_id'],
    )


def downgrade():
    op.drop_index('ix_forum_post_likes_post_id', table_name='forum_post_likes')
    op.drop_index('ix_forum_post_likes_user_id', table_name='forum_post_likes')
    op.drop_table('forum_post_likes')
    op.drop_column('forum_posts', 'image_storage_key')
