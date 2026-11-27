"""Add forum tables and favorites.

Revision ID: 2c47a6f19b8d
Revises: 16e5f16ce898
Create Date: 2026-11-13
"""

from alembic import op
import sqlalchemy as sa


revision = '2c47a6f19b8d'
down_revision = '16e5f16ce898'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'forum_posts',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=True),
        sa.Column('tags', sa.JSON(), nullable=True),
        sa.Column('status', sa.String(length=30), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_forum_posts_user_id', 'forum_posts', ['user_id'])

    op.create_table(
        'forum_comments',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('post_id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('parent_comment_id', sa.String(length=36), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['parent_comment_id'], ['forum_comments.id']),
        sa.ForeignKeyConstraint(['post_id'], ['forum_posts.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_forum_comments_post_id', 'forum_comments', ['post_id'])

    op.create_table(
        'forum_post_favorites',
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
            name='uix_forum_user_post_favorite',
        ),
    )
    op.create_index(
        'ix_forum_post_favorites_user_id',
        'forum_post_favorites',
        ['user_id'],
    )
    op.create_index(
        'ix_forum_post_favorites_post_id',
        'forum_post_favorites',
        ['post_id'],
    )


def downgrade():
    op.drop_index('ix_forum_post_favorites_post_id', table_name='forum_post_favorites')
    op.drop_index('ix_forum_post_favorites_user_id', table_name='forum_post_favorites')
    op.drop_table('forum_post_favorites')
    op.drop_index('ix_forum_comments_post_id', table_name='forum_comments')
    op.drop_table('forum_comments')
    op.drop_index('ix_forum_posts_user_id', table_name='forum_posts')
    op.drop_table('forum_posts')
