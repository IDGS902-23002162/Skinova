"""Store catalog details for products in a user's neceser.

Revision ID: e31b8c7a204f
Revises: d40a8c2e6f19
"""

from alembic import op
import sqlalchemy as sa

revision = 'e31b8c7a204f'
down_revision = 'd40a8c2e6f19'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('user_products', sa.Column('routine', sa.String(length=20), nullable=False, server_default='both'))
    op.add_column('user_products', sa.Column('catalog_source', sa.String(length=50), nullable=True))
    op.add_column('user_products', sa.Column('catalog_code', sa.String(length=32), nullable=True))
    op.add_column('user_products', sa.Column('image_url', sa.String(length=500), nullable=True))
    op.add_column('user_products', sa.Column('product_url', sa.String(length=500), nullable=True))
    op.add_column('user_products', sa.Column('quantity', sa.String(length=100), nullable=True))
    op.create_index('ix_user_products_catalog', 'user_products', ['user_id', 'catalog_source', 'catalog_code'])


def downgrade():
    op.drop_index('ix_user_products_catalog', table_name='user_products')
    op.drop_column('user_products', 'quantity')
    op.drop_column('user_products', 'product_url')
    op.drop_column('user_products', 'image_url')
    op.drop_column('user_products', 'catalog_code')
    op.drop_column('user_products', 'catalog_source')
    op.drop_column('user_products', 'routine')
