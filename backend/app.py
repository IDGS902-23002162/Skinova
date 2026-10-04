import os
from app import create_app
from app.extensions import db

app = create_app(os.getenv('FLASK_ENV', 'default'))

if __name__ == '__main__':
    # Crea todas las tablas en la BD si no existen
    with app.app_context():
        db.create_all()
    
    app.run(debug=True)
