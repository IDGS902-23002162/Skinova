"""Store a shared catalog of products photographed by Skinova users."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.mysql import MEDIUMBLOB

revision = '94102ab7ce16'
down_revision = 'f89b73ae26d1'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'neceser_catalog_products',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('identity', sa.String(64), nullable=False, unique=True),
        sa.Column('barcode', sa.String(14), unique=True),
        sa.Column('photo_hash', sa.String(64), nullable=False, unique=True),
        sa.Column('photo', sa.LargeBinary().with_variant(MEDIUMBLOB(), 'mysql', 'mariadb'), nullable=False),
        sa.Column('details', sa.JSON(), nullable=False),
    )
    with op.batch_alter_table('user_products') as batch:
        batch.add_column(sa.Column('shared_product_id', sa.String(36)))
        batch.create_foreign_key('fk_user_products_shared_product', 'neceser_catalog_products',
                                 ['shared_product_id'], ['id'])
        batch.create_index('ix_user_products_shared_product_id', ['shared_product_id'])


def downgrade():
    with op.batch_alter_table('user_products') as batch:
        batch.drop_index('ix_user_products_shared_product_id')
        batch.drop_constraint('fk_user_products_shared_product', type_='foreignkey')
        batch.drop_column('shared_product_id')
    op.drop_table('neceser_catalog_products')
