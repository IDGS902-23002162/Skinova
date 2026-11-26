"""Repair a create_all-created MySQL schema before Alembic was initialized.

Run from backend: .venv/Scripts/python.exe scripts/repair_forum_schema.py
Only the known missing forum image column is added. The schema is backed up
locally and Alembic is stamped only after all model tables, columns, and
indexes are present.
"""

from pathlib import Path
import sys
from datetime import datetime, timezone

from flask_migrate import stamp
from sqlalchemy import inspect, text

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import create_app  # noqa: E402
from app.extensions import db  # noqa: E402


def missing_schema(inspector):
    tables = set(inspector.get_table_names())
    missing = []
    for name, table in db.metadata.tables.items():
        if name not in tables:
            missing.append(f"table {name}")
            continue
        columns = {column['name'] for column in inspector.get_columns(name)}
        missing.extend(f"column {name}.{column.name}" for column in table.columns if column.name not in columns)
        indexes = {index['name'] for index in inspector.get_indexes(name)}
        missing.extend(f"index {name}.{index.name}" for index in table.indexes if index.name not in indexes)
    return missing


def main():
    app = create_app()
    with app.app_context():
        engine = db.engine
        if engine.url.get_backend_name() != 'mysql':
            raise SystemExit('This repair is only for the existing MySQL database.')

        inspector = inspect(engine)
        has_version = 'alembic_version' in inspector.get_table_names()
        revisions = []
        if has_version:
            with engine.connect() as connection:
                revisions = connection.execute(text('SELECT version_num FROM alembic_version')).scalars().all()
        missing = missing_schema(inspector)
        expected_missing = ['column forum_posts.image_storage_key']
        if revisions:
            if missing:
                raise SystemExit(f'Alembic has a revision; use flask db upgrade. Missing: {missing}')
            print('Schema already complete; no repair needed.')
            return
        if missing not in (expected_missing, []):
            raise SystemExit(f'Unexpected schema; refusing to stamp: {missing}')

        with engine.connect() as connection:
            post_count = connection.execute(text('SELECT COUNT(*) FROM forum_posts')).scalar_one()
            ddl = connection.execute(text('SHOW CREATE TABLE forum_posts')).first()[1]
        if post_count:
            raise SystemExit('forum_posts has data; back up the database and migrate manually.')

        backup_dir = Path(__file__).resolve().parents[1] / 'instance'
        backup_dir.mkdir(exist_ok=True)
        backup_path = backup_dir / f"forum_posts_{datetime.now(timezone.utc):%Y%m%d_%H%M%S}_schema_backup.sql"
        backup_path.write_text(ddl + ';\n', encoding='utf-8')
        print(f'Schema backup: {backup_path}')

        if missing:
            with engine.begin() as connection:
                connection.execute(text('ALTER TABLE forum_posts ADD COLUMN image_storage_key VARCHAR(100) NULL'))
            print('Added forum_posts.image_storage_key')

        inspector = inspect(engine)
        remaining = missing_schema(inspector)
        if remaining:
            raise SystemExit(f'Schema still differs; not stamping: {remaining}')

        migrations = str(Path(__file__).resolve().parents[1] / 'migrations')
        stamp(directory=migrations, revision='e31b8c7a204f')
        print('Alembic stamped at the verified schema revision. Run flask db upgrade for newer revisions.')


if __name__ == '__main__':
    main()
