from flask import Flask, g
from flask_cors import CORS

from config import config
from app.extensions import db, migrate
from app.auth import require_auth


def create_app(config_name='default'):
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": [
                    "http://localhost:5173",
                    "http://localhost:4173",
                    "https://app.skinovaapp.uk"
                ]
            }
        },
        allow_headers=[
            "Authorization",
            "Content-Type"
        ],
        methods=[
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
            "OPTIONS"
        ]
    )

    db.init_app(app)
    migrate.init_app(app, db)

    from app.modules.users import models as users_models
    from app.modules.perfil_salud import models as perfil_salud_models
    from app.modules.mi_neceser import models as mi_neceser_models
    from app.modules.creador_rutinas import models as creador_rutinas_models
    from app.modules.bitacora import models as bitacora_models
    from app.modules.comunidad import models as comunidad_models
    from app.modules.directorio import models as directorio_models
    from app.modules.ai_history import models as ai_history_models
    from app.modules.notificaciones import models as notificaciones_models

    from app.modules.users.routes import users_bp
    app.register_blueprint(users_bp)

    # Activar cuando ya uses las rutas de perfil_salud:
    # from app.modules.perfil_salud.routes import perfil_salud_bp
    # app.register_blueprint(
    #     perfil_salud_bp,
    #     url_prefix='/api/perfil-salud'
    # )

    @app.route('/health')
    def health_check():
        return {'status': 'ok'}

    @app.route('/api/auth/me')
    @require_auth
    def auth_me():
        return {
            'authenticated': True,
            'clerk_user_id': g.user_id
        }

    return app