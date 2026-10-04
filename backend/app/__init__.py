from flask import Flask
from config import config
from app.extensions import db, migrate

def create_app(config_name='default'):
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)

    # Import models here so Flask-Migrate can find them
    from app.modules.users import models as users_models
    from app.modules.perfil_salud import models as perfil_salud_models
    from app.modules.mi_neceser import models as mi_neceser_models
    from app.modules.creador_rutinas import models as creador_rutinas_models
    from app.modules.bitacora import models as bitacora_models
    from app.modules.comunidad import models as comunidad_models
    from app.modules.directorio import models as directorio_models
    from app.modules.ai_history import models as ai_history_models
    from app.modules.notificaciones import models as notificaciones_models

    # Register blueprints (to be done later)
    # from app.modules.perfil_salud.routes import perfil_salud_bp
    # app.register_blueprint(perfil_salud_bp, url_prefix='/api/perfil-salud')

    @app.route('/health')
    def health_check():
        return {'status': 'ok'}

    return app
