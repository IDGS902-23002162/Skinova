import time
from datetime import datetime, timezone
from flask import Flask, g, request
from flask_cors import CORS
from sqlalchemy.exc import SQLAlchemyError

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
    from app.modules.monitoreo_ambiental import models as monitoreo_ambiental_models

    from app.modules.users.routes import users_bp
    from app.modules.creador_rutinas.routes import rutinas_bp
    from app.modules.mi_neceser.routes import mi_neceser_bp
    from app.modules.habitos_desafios.routes import habitos_desafios_bp
    from app.modules.comunidad.routes import comunidad_bp
    from app.modules.mobil.routes import mobil_bp
    from app.modules.notificaciones.routes import notifications_bp
    from app.modules.bitacora.routes import bitacora_bp
    from app.modules.face_id.routes import face_id_bp
    from app.modules.monitoreo_ambiental.routes import ambiente_bp
    from app.modules.directorio.routes import directorio_bp
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
    app.register_blueprint(rutinas_bp)
    app.register_blueprint(ambiente_bp)
    app.register_blueprint(directorio_bp)
    


    # Rutas de perfil_salud:
    from app.modules.perfil_salud.routes import perfil_salud_bp
    app.register_blueprint(
        perfil_salud_bp,
        url_prefix='/api/perfil-salud'
    )

    @app.route('/health')
    def health_check():
        return {'status': 'ok'}

    module_health_models = {
        'mi-neceser': mi_neceser_models.UserProduct,
        'comunidad': comunidad_models.ForumPost,
        'habitos': habitos_desafios_models.Habit,
    }

    @app.get('/api/health/<module>')
    def module_health_check(module):
        model = module_health_models.get(module)
        headers = {'Cache-Control': 'no-store'}
        if model is None:
            return {'status': 'unknown'}, 404, headers
        try:
            db.session.execute(db.select(model).limit(1)).first()
        except SQLAlchemyError:
            app.logger.exception('Module health check failed for %s', module)
            return {'status': 'unavailable'}, 503, headers
        return {'status': 'ok', 'module': module}, 200, headers

    @app.route('/api/config', methods=['GET'])
    def public_app_config():
        return mobil_models.get_app_settings(), 200

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
        if (
            request.method == 'OPTIONS'
            or not request.path.startswith('/api/')
            or request.path in ('/api/config', '/api/auth/me', '/api/me')
            or request.path.startswith('/api/mobil/')
        ):
            return None

        features = mobil_models.get_app_settings().get('features', {})
        if features.get('maintenance_mode'):
            return {'error': 'Sistema en mantenimiento', 'maintenance': True}, 503
        if not features.get('consulta_ia', True) and (
            request.path.startswith('/api/products')
            or request.path.startswith('/api/perfil-salud/analyze')
            or request.path.startswith('/api/perfil-salud/evaluations/analyze')
        ):
            return {'error': 'Consulta IA en mantenimiento', 'feature': 'consulta_ia'}, 503
        if not features.get('comunidad', True) and (
            request.path.startswith('/api/comunidad') or request.path == '/api/health/comunidad'
        ):
            return {'error': 'Comunidad en mantenimiento', 'feature': 'comunidad'}, 503
        if not features.get('directorio', True) and request.path.startswith('/api/directorio'):
            return {'error': 'Directorio en mantenimiento', 'feature': 'directorio'}, 503

    @app.after_request
    def _track_request_end(response):
        if (
            request.method == 'OPTIONS'
            or request.endpoint == 'module_health_check'
            or not request.path.startswith('/api/')
            or request.path in ('/api/mobil/performance', '/api/mobil/bitacora')
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

            # ponytail: reutiliza after_request para poblar SystemLog sin middleware extra
            evt = None
            if response.status_code >= 500:
                evt = ('error', f"Error {response.status_code} en {request.method} {path}")
            elif response.status_code in (401, 403):
                evt = ('warning', f"Acceso denegado ({response.status_code}) en {request.method} {path}")
            elif is_ai and duration_ms > 5000:
                evt = ('warning', f"Respuesta lenta de IA ({round(duration_ms / 1000, 2)}s) en {path}")
            elif path in ('/api/verify-checkout-session', '/api/cancel-subscription') and response.status_code < 400:
                evt = ('success', f"Operación de suscripción completada ({path})")

            if evt:
                db.session.add(mobil_models.SystemLog(
                    event_type=evt[0],
                    message=evt[1],
                    origin=getattr(g, 'user_id', None) or 'sistema',
                    component=request.endpoint or path,
                ))

            db.session.commit()
        except Exception:
            db.session.rollback()

        return response

    return app
