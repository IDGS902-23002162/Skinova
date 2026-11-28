import os
from pathlib import Path
from app import create_app
from flask_migrate import upgrade
from app.extensions import db
app = create_app(os.getenv('FLASK_ENV', 'default'))

if __name__ == '__main__':
    # Apply pending schema changes, including columns on existing tables.
    with app.app_context():
        db.create_all()
    
    app.run(debug=True, port=8002)
