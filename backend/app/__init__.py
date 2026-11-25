import time
from datetime import datetime, timezone
from flask import Flask, g, request
from flask_cors import CORS

from config import config
from app.extensions import db, migrate
from app.auth import require_auth


AI_ENDPOINT_PATHS = {
    '/api/products/analyze',
    '/api/perfil-salud/evaluations/analyze',
    '/api/perfil-salud/analyze',
    '/api/face-id/verify',
}


def create_app(config_name='default'):
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    app.config['START_TIME'] = datetime.now(timezone.utc)

    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": [
                    "http://localhost:5173",
                    "http://127.0.0.1:5173",
                    "http://localhost:4173",
                    "http://127.0.0.1:4173",
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
    from app.modules.habitos_desafios import models as habitos_desafios_models
    from app.modules.creador_rutinas import models as creador_rutinas_models
    from app.modules.bitacora import models as bitacora_models
    from app.modules.comunidad import models as comunidad_models
    from app.modules.directorio import models as directorio_models
    from app.modules.ai_history import models as ai_history_models
    from app.modules.notificaciones import models as notificaciones_models
    from app.modules.mobil import models as mobil_models

    from app.modules.users.routes import users_bp
    from app.modules.mi_neceser.routes import mi_neceser_bp
    from app.modules.habitos_desafios.routes import habitos_desafios_bp
    from app.modules.comunidad.routes import comunidad_bp
    from app.modules.mobil.routes import mobil_bp
    from app.modules.notificaciones.routes import notifications_bp
    from app.modules.bitacora.routes import bitacora_bp
    from app.modules.face_id.routes import face_id_bp
    from app.modules.busqueda_ia.routes import ai_analysis_bp
    app.register_blueprint(ai_analysis_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(mi_neceser_bp)
    app.register_blueprint(habitos_desafios_bp)
    app.register_blueprint(comunidad_bp)
    app.register_blueprint(mobil_bp)
   
    app.register_blueprint(notifications_bp)
    app.register_blueprint(bitacora_bp)
    app.register_blueprint(face_id_bp)

    # Rutas de perfil_salud:
    from app.modules.perfil_salud.routes import perfil_salud_bp
    app.register_blueprint(
        perfil_salud_bp,
        url_prefix='/api/perfil-salud'
    )

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

    @app.before_request
    def _track_request_start():
        g._req_start = time.perf_counter()

    @app.after_request
    def _track_request_end(response):
        if (
            request.method == 'OPTIONS'
            or not request.path.startswith('/api/')
            or request.path == '/api/mobil/performance'
        ):
            return response

        start = getattr(g, '_req_start', None)
        duration_ms = round((time.perf_counter() - start) * 1000, 1) if start else 0.0
        path = request.url_rule.rule if request.url_rule else request.path
        is_ai = path in AI_ENDPOINT_PATHS or 'analyze' in path or 'face-id' in path

        try:
            log = mobil_models.ApiRequestLog(
                method=request.method,
                path=path,
                status_code=response.status_code,
                duration_ms=duration_ms,
                is_ai=is_ai,
            )
            db.session.add(log)
            db.session.commit()
        except Exception:
            db.session.rollback()

        return response

    return app