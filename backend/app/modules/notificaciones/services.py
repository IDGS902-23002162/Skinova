import logging
import zoneinfo
from datetime import datetime, timezone, time, timedelta
from typing import Dict, Any, List, Optional

from app.extensions import db
from app.modules.notificaciones.models import Notification
from app.modules.perfil_salud.models import UserProfile
from app.modules.mi_neceser.models import UserProduct
from app.modules.creador_rutinas.models import Routine, RoutineStep

logger = logging.getLogger(__name__)

# Configuración por defecto alineada con el frontend y los requerimientos RF-NOT-01 a RF-NOT-13
DEFAULT_SETTINGS = {
    "categories": {
        "routine_morning": {"enabled": True, "time": "08:00", "days": [1, 2, 3, 4, 5, 6, 7]},
        "routine_night": {"enabled": True, "time": "21:30", "days": [1, 2, 3, 4, 5, 6, 7]},
        "product_reminder": {"enabled": True, "time": "10:00", "days": [1, 2, 3, 4, 5, 6, 7]},
        "sun_protection": {"enabled": True, "time": "10:00", "days": [1, 2, 3, 4, 5, 6, 7]},
        "weekly_reminder": {"enabled": True, "time": "18:00", "days": [7]},
        "weekly_summary": {"enabled": True, "time": "18:00", "days": [7]},
        "product_expiry": {"enabled": True, "time": None, "days": None},
        "product_replenishment": {"enabled": True, "time": None, "days": None},
        "progress_photo": {"enabled": True, "time": "19:00", "days": [7]},
        "environmental_alert": {"enabled": True, "time": None, "days": None},
        "subscription": {"enabled": True, "time": None, "days": None},
        "community": {"enabled": True, "time": None, "days": None},
        "sensitivity_alert": {"enabled": True, "time": None, "days": None},
        "water": {"enabled": True, "time": "16:00", "days": [1, 2, 3, 4, 5, 6, 7]},
        "sleep": {"enabled": True, "time": "09:00", "days": [1, 2, 3, 4, 5, 6, 7]},
        "tips": {"enabled": True, "time": None, "days": None}
    },
    "quietHours": {
        "enabled": False,
        "start": "22:00",
        "end": "07:00"
    },
    "timezone": "America/Mexico_City"
}

CATEGORY_GROUP_MAP = {
    "routine_morning": "routine",
    "routine_night": "routine",
    "product_reminder": "routine",
    "sun_protection": "routine",
    "weekly_reminder": "progress",
    "weekly_summary": "progress",
    "progress_photo": "progress",
    "product_expiry": "notices",
    "product_replenishment": "notices",
    "environmental_alert": "notices",
    "subscription": "notices",
    "community": "notices",
    "sensitivity_alert": "notices",
    "water": "habits",
    "sleep": "habits",
    "tips": "notices"
}


COMMON_TZ_OFFSETS = {
    "America/Mexico_City": -6,
    "America/Cancun": -5,
    "America/Monterrey": -6,
    "America/Tijuana": -8,
    "America/Bogota": -5,
    "America/Lima": -5,
    "America/Santiago": -3,
    "America/Buenos_Aires": -3,
    "America/Caracas": -4,
    "America/New_York": -5,
    "America/Chicago": -6,
    "America/Denver": -7,
    "America/Los_Angeles": -8,
    "Europe/Madrid": 1,
    "UTC": 0
}

class NotificationService:
    """
    Servicio central de notificaciones y alarmas para Skinova.
    Cumple los requerimientos RF-NOT-01 a RF-NOT-15.
    """

    # -------------------------------------------------------------------------
    # RF-NOT-13: Adaptación a la zona horaria del usuario
    # -------------------------------------------------------------------------
    @staticmethod
    def get_user_timezone_str(user_id: str) -> str:
        """Obtiene la zona horaria registrada del usuario o el fallback estándar."""
        profile = UserProfile.query.filter_by(user_id=user_id).first()
        if profile and profile.timezone:
            return profile.timezone
        
        # También buscar en notification_preferences si está guardada allí
        if profile and profile.notification_preferences:
            tz = profile.notification_preferences.get("timezone")
            if tz:
                return tz

        return "America/Mexico_City"

    @classmethod
    def get_user_timezone(cls, user_id: str):
        """Retorna el objeto tzinfo del usuario."""
        tz_name = cls.get_user_timezone_str(user_id)
        try:
            return zoneinfo.ZoneInfo(tz_name)
        except Exception:
            offset_hours = COMMON_TZ_OFFSETS.get(tz_name, 0)
            return timezone(timedelta(hours=offset_hours), name=tz_name)

    @classmethod
    def get_user_local_time(cls, user_id: str, dt_utc: Optional[datetime] = None) -> datetime:
        """Convierte una fecha UTC a la hora local del usuario."""
        if dt_utc is None:
            dt_utc = datetime.now(timezone.utc)
        elif dt_utc.tzinfo is None:
            dt_utc = dt_utc.replace(tzinfo=timezone.utc)
            
        user_tz = cls.get_user_timezone(user_id)
        return dt_utc.astimezone(user_tz)

    # -------------------------------------------------------------------------
    # RF-NOT-11: Configuración individual de cada categoría de notificación
    # RF-NOT-12: Horario silencioso
    # -------------------------------------------------------------------------
    @classmethod
    def get_user_settings(cls, user_id: str) -> Dict[str, Any]:
        """Obtiene la configuración consolidada de notificaciones del usuario."""
        profile = UserProfile.query.filter_by(user_id=user_id).first()
        saved = (profile.notification_preferences if profile and profile.notification_preferences else {})

        # Fusionar con los valores por defecto
        settings = {
            "categories": {},
            "quietHours": dict(DEFAULT_SETTINGS["quietHours"]),
            "timezone": cls.get_user_timezone_str(user_id)
        }

        # Sincronizar categorías
        saved_cats = saved.get("categories", {})
        for cat_id, cat_defaults in DEFAULT_SETTINGS["categories"].items():
            user_cat = saved_cats.get(cat_id, {})
            settings["categories"][cat_id] = {
                "enabled": user_cat.get("enabled", cat_defaults["enabled"]),
                "time": user_cat.get("time", cat_defaults["time"]),
                "days": user_cat.get("days", cat_defaults["days"]),
            }

        # Sincronizar horario silencioso (soporta quietHours o quiet_hours)
        saved_qh = saved.get("quietHours") or saved.get("quiet_hours") or {}
        if isinstance(saved_qh, dict):
            settings["quietHours"]["enabled"] = saved_qh.get("enabled", DEFAULT_SETTINGS["quietHours"]["enabled"])
            settings["quietHours"]["start"] = saved_qh.get("start", DEFAULT_SETTINGS["quietHours"]["start"])
            settings["quietHours"]["end"] = saved_qh.get("end", DEFAULT_SETTINGS["quietHours"]["end"])

        return settings

    @classmethod
    def update_user_settings(cls, user_id: str, new_settings: Dict[str, Any]) -> Dict[str, Any]:
        """Actualiza la configuración de notificaciones y zona horaria del usuario."""
        profile = UserProfile.query.filter_by(user_id=user_id).first()
        if not profile:
            profile = UserProfile(user_id=user_id, onboarding_completed=False)
            db.session.add(profile)
            db.session.flush()

        current_settings = cls.get_user_settings(user_id)

        # Actualizar categorías si se proporcionan
        if "categories" in new_settings and isinstance(new_settings["categories"], dict):
            for cat_id, cat_patch in new_settings["categories"].items():
                if cat_id in current_settings["categories"]:
                    current_settings["categories"][cat_id].update(cat_patch)
                else:
                    current_settings["categories"][cat_id] = cat_patch

        # Actualizar horario silencioso
        qh_input = new_settings.get("quietHours") or new_settings.get("quiet_hours")
        if qh_input and isinstance(qh_input, dict):
            current_settings["quietHours"].update(qh_input)

        # Actualizar zona horaria si se pasa
        if "timezone" in new_settings and new_settings["timezone"]:
            current_settings["timezone"] = new_settings["timezone"]
            profile.timezone = new_settings["timezone"]

        profile.notification_preferences = current_settings
        db.session.commit()

        return current_settings

    @classmethod
    def set_category_setting(cls, user_id: str, category_id: str, patch: Dict[str, Any]) -> Dict[str, Any]:
        """Actualiza la configuración de una sola categoría."""
        settings = cls.get_user_settings(user_id)
        if category_id not in settings["categories"]:
            settings["categories"][category_id] = {"enabled": True, "time": "09:00", "days": [1, 2, 3, 4, 5, 6, 7]}
        
        settings["categories"][category_id].update(patch)
        return cls.update_user_settings(user_id, settings)

    @classmethod
    def is_category_enabled(cls, user_id: str, category_id: str) -> bool:
        """Verifica si una categoría específica de notificación está activada (RF-NOT-11)."""
        settings = cls.get_user_settings(user_id)
        cat = settings.get("categories", {}).get(category_id)
        if cat is None:
            return True
        return bool(cat.get("enabled", True))

    @classmethod
    def is_in_quiet_hours(cls, user_id: str, check_time: Optional[datetime] = None) -> bool:
        """
        Determina si el momento actual (o check_time) cae en el horario silencioso del usuario (RF-NOT-12).
        Maneja intervalos normales e intervalos que cruzan la medianoche (ej. 22:00 a 07:00).
        """
        settings = cls.get_user_settings(user_id)
        qh = settings.get("quietHours", {})
        if not qh.get("enabled", False):
            return False

        start_str = qh.get("start", "22:00")
        end_str = qh.get("end", "07:00")

        try:
            start_parts = [int(p) for p in start_str.split(":")]
            end_parts = [int(p) for p in end_str.split(":")]
            t_start = time(start_parts[0], start_parts[1])
            t_end = time(end_parts[0], end_parts[1])
        except Exception:
            return False

        user_local = cls.get_user_local_time(user_id, check_time)
        t_current = user_local.time()

        if t_start <= t_end:
            # Rango en el mismo día (ej. 13:00 a 15:00)
            return t_start <= t_current < t_end
        else:
            # Rango que cruza medianoche (ej. 22:00 a 07:00)
            return t_current >= t_start or t_current < t_end

    # -------------------------------------------------------------------------
    # Creación y registro de notificaciones en BD (RF-NOT-14, RF-NOT-15)
    # -------------------------------------------------------------------------
    @classmethod
    def create_notification(
        cls,
        user_id: str,
        notif_type: str,
        title: str,
        message: str,
        action_path: Optional[str] = None,
        force: bool = False
    ) -> Optional[Notification]:
        """
        Crea y persiste una notificación respetando:
        - RF-NOT-11: Categoría habilitada.
        - RF-NOT-12: Horario silencioso (si está en horario silencioso y no es forzado, no interrumpe).
        - RF-NOT-15: Ruta de navegación contextual.
        """
        if not force:
            # 1. Verificar categoría activa
            if not cls.is_category_enabled(user_id, notif_type):
                logger.info(f"Notificación descartada para {user_id}: categoría {notif_type} deshabilitada.")
                return None

            # 2. Verificar horario silencioso
            if cls.is_in_quiet_hours(user_id):
                logger.info(f"Notificación diferida para {user_id}: horario silencioso activo.")
                return None

        notification = Notification(
            user_id=user_id,
            type=notif_type,
            title=title,
            message=message,
            action_path=action_path or "/dashboard",
            read_at=None,
            created_at=datetime.now(timezone.utc)
        )

        db.session.add(notification)
        db.session.commit()
        db.session.refresh(notification)

        return notification

    # -------------------------------------------------------------------------
    # RF-NOT-01: Recordatorio de rutina matutina
    # -------------------------------------------------------------------------
    @classmethod
    def create_morning_routine_reminder(cls, user_id: str) -> Optional[Notification]:
        """
        Genera recordatorio para la rutina matutina.
        RF-NOT-15: Navegación directa a /rutina?period=morning
        """
        # Evitar duplicados si ya se envió hoy
        today_start_utc = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        existing = Notification.query.filter(
            Notification.user_id == user_id,
            Notification.type == "routine_morning",
            Notification.created_at >= today_start_utc
        ).first()

        if existing:
            return existing

        routine = Routine.query.filter_by(user_id=user_id, period="morning", active=True).first()
        routine_name = routine.name if routine and routine.name else "Rutina de la mañana"

        title = "Es hora de tu rutina de la mañana ☀️"
        message = f"Comienza tu día con {routine_name}. Limpieza, hidratación y no olvides tu protector solar."
        action_path = "/rutina?period=morning"

        return cls.create_notification(
            user_id=user_id,
            notif_type="routine_morning",
            title=title,
            message=message,
            action_path=action_path
        )

    # -------------------------------------------------------------------------
    # RF-NOT-02: Recordatorio de rutina nocturna
    # -------------------------------------------------------------------------
    @classmethod
    def create_night_routine_reminder(cls, user_id: str) -> Optional[Notification]:
        """
        Genera recordatorio para la rutina nocturna.
        RF-NOT-15: Navegación directa a /rutina?period=night
        """
        today_start_utc = datetime.now(timezone.utc).replace(hour=12, minute=0, second=0, microsecond=0)
        existing = Notification.query.filter(
            Notification.user_id == user_id,
            Notification.type == "routine_night",
            Notification.created_at >= today_start_utc
        ).first()

        if existing:
            return existing

        routine = Routine.query.filter_by(user_id=user_id, period="night", active=True).first()
        routine_name = routine.name if routine and routine.name else "Rutina de la noche"

        title = "Hora de tu rutina nocturna 🌙"
        message = f"Cierra tu día cuidando tu piel con {routine_name}. Limpieza profunda y activos reparadores."
        action_path = "/rutina?period=night"

        return cls.create_notification(
            user_id=user_id,
            notif_type="routine_night",
            title=title,
            message=message,
            action_path=action_path
        )

    # -------------------------------------------------------------------------
    # RF-NOT-03: Recordatorios específicos por producto
    # -------------------------------------------------------------------------
    @classmethod
    def create_product_reminder(
        cls,
        user_id: str,
        product_name: str,
        instruction: Optional[str] = None,
        product_id: Optional[str] = None
    ) -> Optional[Notification]:
        """
        Recordatorio enfocado en un producto particular (ej. Retinol, Vitamina C, exfoliante químico).
        RF-NOT-15: Navega a /neceser o al detalle del producto.
        """
        title = f"Recordatorio de producto: {product_name}"
        msg = instruction or f"Recuerda incorporar {product_name} en tu aplicación de hoy según las indicaciones."
        action_path = f"/neceser?product_id={product_id}" if product_id else "/neceser"

        return cls.create_notification(
            user_id=user_id,
            notif_type="product_reminder",
            title=title,
            message=msg,
            action_path=action_path
        )

    # -------------------------------------------------------------------------
    # RF-NOT-04: Recordatorios semanales
    # -------------------------------------------------------------------------
    @classmethod
    def create_weekly_reminder(
        cls,
        user_id: str,
        title: Optional[str] = None,
        message: Optional[str] = None
    ) -> Optional[Notification]:
        """
        Recordatorio semanal de exfoliación, mascarilla especial o revisión de hábitos.
        RF-NOT-15: Navega a /rutina o /progreso.
        """
        # Limitar a uno cada 6 días
        six_days_ago = datetime.now(timezone.utc) - timedelta(days=6)
        existing = Notification.query.filter(
            Notification.user_id == user_id,
            Notification.type.in_(["weekly_reminder", "weekly_summary"]),
            Notification.created_at >= six_days_ago
        ).first()

        if existing:
            return existing

        t = title or "Cuidado semanal de tu piel 🌿"
        m = message or "Hoy es día de tu tratamiento semanal (exfoliación suave o mascarilla). Revisa tu rutina para más detalles."
        action_path = "/progreso"

        return cls.create_notification(
            user_id=user_id,
            notif_type="weekly_reminder",
            title=t,
            message=m,
            action_path=action_path
        )

    # -------------------------------------------------------------------------
    # RF-NOT-05: Alertas de productos próximos a caducar
    # -------------------------------------------------------------------------
    @classmethod
    def check_and_create_expiry_alerts(cls, user_id: str, days_threshold: int = 15) -> List[Notification]:
        """
        Revisa los productos del neceser y alerta sobre aquellos caducados o por caducar.
        RF-NOT-15: Navegación directa al neceser (/neceser).
        """
        if not cls.is_category_enabled(user_id, "product_expiry"):
            return []

        user_local = cls.get_user_local_time(user_id)
        today = user_local.date()
        threshold_date = today + timedelta(days=days_threshold)

        products = UserProduct.query.filter(
            UserProduct.user_id == user_id,
            UserProduct.active == True,
            UserProduct.expires_at != None,
            UserProduct.expires_at <= threshold_date
        ).all()

        created_alerts = []
        three_days_ago = datetime.now(timezone.utc) - timedelta(days=3)

        for p in products:
            days_left = (p.expires_at - today).days

            # Evitar alertar el mismo producto repetidamente en menos de 3 días
            already_notified = Notification.query.filter(
                Notification.user_id == user_id,
                Notification.type == "product_expiry",
                Notification.title.like(f"%{p.name}%"),
                Notification.created_at >= three_days_ago
            ).first()

            if already_notified:
                continue

            if days_left < 0:
                title = f"⚠️ Producto caducado: {p.name}"
                message = f"Tu producto {p.name} venció el {p.expires_at.strftime('%d/%m/%Y')}. Te sugerimos suspender su uso para proteger tu barrera cutánea."
            elif days_left == 0:
                title = f"⚠️ Producto vence hoy: {p.name}"
                message = f"Tu producto {p.name} caduca el día de hoy ({p.expires_at.strftime('%d/%m/%Y')})."
            else:
                title = f"Caducidad próxima: {p.name}"
                message = f"Tu {p.name} caducará en {days_left} días ({p.expires_at.strftime('%d/%m/%Y')}). Planifica su renovación."

            notif = cls.create_notification(
                user_id=user_id,
                notif_type="product_expiry",
                title=title,
                message=message,
                action_path="/neceser"
            )
            if notif:
                created_alerts.append(notif)

        return created_alerts

    # -------------------------------------------------------------------------
    # RF-NOT-06: Alertas de reposición de productos
    # -------------------------------------------------------------------------
    @classmethod
    def check_and_create_replenishment_alerts(cls, user_id: str) -> List[Notification]:
        """
        Detecta productos marcados con poco contenido ('almost_empty') para sugerir reposición.
        RF-NOT-15: Navegación directa al neceser (/neceser).
        """
        if not cls.is_category_enabled(user_id, "product_replenishment"):
            return []

        products = UserProduct.query.filter(
            UserProduct.user_id == user_id,
            UserProduct.active == True,
            UserProduct.quantity_state == "almost_empty"
        ).all()

        created_alerts = []
        five_days_ago = datetime.now(timezone.utc) - timedelta(days=5)

        for p in products:
            already_notified = Notification.query.filter(
                Notification.user_id == user_id,
                Notification.type == "product_replenishment",
                Notification.title.like(f"%{p.name}%"),
                Notification.created_at >= five_days_ago
            ).first()

            if already_notified:
                continue

            title = f"Reponer producto: {p.name} 🧴"
            brand_info = f" ({p.brand})" if p.brand else ""
            message = f"Tu {p.name}{brand_info} está casi vacío. Considera reponerlo para mantener la constancia en tu rutina."

            notif = cls.create_notification(
                user_id=user_id,
                notif_type="product_replenishment",
                title=title,
                message=message,
                action_path="/neceser"
            )
            if notif:
                created_alerts.append(notif)

        return created_alerts

    # -------------------------------------------------------------------------
    # RF-NOT-07: Recordatorio para tomar fotografía de progreso
    # -------------------------------------------------------------------------
    @classmethod
    def create_progress_photo_reminder(cls, user_id: str) -> Optional[Notification]:
        """
        Recuerda tomar la fotografía de seguimiento bajo luz natural.
        RF-NOT-15: Navegación directa a la bitácora de progreso (/progreso).
        """
        five_days_ago = datetime.now(timezone.utc) - timedelta(days=5)
        existing = Notification.query.filter(
            Notification.user_id == user_id,
            Notification.type == "progress_photo",
            Notification.created_at >= five_days_ago
        ).first()

        if existing:
            return existing

        title = "Momento de tu foto de progreso 📸"
        message = "Registra una fotografía con luz natural. Observar los cambios semana a semana te ayuda a entender qué le hace bien a tu piel."
        action_path = "/progreso"

        return cls.create_notification(
            user_id=user_id,
            notif_type="progress_photo",
            title=title,
            message=message,
            action_path=action_path
        )

    # -------------------------------------------------------------------------
    # RF-NOT-08: Alertas ambientales relevantes
    # -------------------------------------------------------------------------
    @classmethod
    def create_environmental_alert(
        cls,
        user_id: str,
        alert_type: str = "uv_high",
        uv_index: Optional[float] = None,
        humidity: Optional[float] = None,
        description: Optional[str] = None
    ) -> Optional[Notification]:
        """
        Emite alertas climáticas y ambientales (Radiación UV alta, clima muy seco, contaminación).
        RF-NOT-15: Navegación contextual a /consulta o /dashboard.
        """
        if alert_type == "uv_high":
            idx = uv_index if uv_index is not None else 8
            title = f"☀️ Alerta UV Alto ({idx}+)"
            message = description or f"El índice UV en tu zona alcanza {idx}. Es crucial reaplicar protector solar cada 2 horas y buscar sombra."
        elif alert_type == "low_humidity":
            h = humidity if humidity is not None else 20
            title = f"💧 Humedad baja ({h}%)"
            message = description or "El aire está especialmente seco hoy. Refuerza tu crema hidratante y bebe suficiente agua."
        else:
            title = "Aviso ambiental para tu piel"
            message = description or "Condiciones ambientales relevantes detectadas para el cuidado de tu piel hoy."

        return cls.create_notification(
            user_id=user_id,
            notif_type="environmental_alert",
            title=title,
            message=message,
            action_path="/consulta"
        )

    # -------------------------------------------------------------------------
    # RF-NOT-09: Notificaciones relacionadas con la suscripción
    # -------------------------------------------------------------------------
    @classmethod
    def create_subscription_alert(
        cls,
        user_id: str,
        event_type: str = "trial_ending",
        days_left: Optional[int] = 3,
        details: Optional[str] = None
    ) -> Optional[Notification]:
        """
        Notifica estados de suscripción (fin de prueba, cobro próximo, renovación, cambios de plan).
        RF-NOT-15: Navegación a /perfil o /suscripciones.
        """
        if event_type == "trial_ending":
            title = "Tu prueba gratuita está por finalizar"
            message = details or f"Te quedan {days_left} días de prueba en Skinova Premium. Explora todos los beneficios de tu rutina personalizada."
        elif event_type == "renewal_upcoming":
            title = "Próxima renovación de suscripción"
            message = details or f"Tu membresía se renovará en {days_left} días. Revisa tus datos de pago en tu perfil."
        else:
            title = "Actualización de tu suscripción"
            message = details or "Hay novedades sobre tu plan en Skinova."

        return cls.create_notification(
            user_id=user_id,
            notif_type="subscription",
            title=title,
            message=message,
            action_path="/perfil"
        )

    # -------------------------------------------------------------------------
    # RF-NOT-10: Notificaciones de interacciones de la comunidad
    # -------------------------------------------------------------------------
    @classmethod
    def create_community_notification(
        cls,
        user_id: str,
        interaction_type: str = "comment",
        actor_name: str = "Un miembro de la comunidad",
        post_id: Optional[str] = None,
        post_title: Optional[str] = None
    ) -> Optional[Notification]:
        """
        Notifica interacciones en el foro de la comunidad (comentarios, respuestas o reacciones).
        RF-NOT-15: Navegación directa al post de la comunidad (/comunidad?post_id=...).
        """
        if interaction_type == "comment":
            title = "Nuevo comentario en tu publicación 💬"
            quoted_title = f' "{post_title}"' if post_title else ""
            msg = f"{actor_name} comentó en tu publicación{quoted_title}."
        elif interaction_type == "like":
            title = "A alguien le gustó tu publicación ❤️"
            msg = f"A {actor_name} le pareció útil tu experiencia compartida."
        else:
            title = "Novedad en la comunidad Skinova"
            msg = f"{actor_name} interactuó con tu contenido."

        action_path = f"/comunidad?post_id={post_id}" if post_id else "/comunidad"

        return cls.create_notification(
            user_id=user_id,
            notif_type="community",
            title=title,
            message=msg,
            action_path=action_path
        )

    # -------------------------------------------------------------------------
    # Evaluador de alarmas y recordatorios automáticos (Motor de Evaluación)
    # -------------------------------------------------------------------------
    @classmethod
    def evaluate_all_reminders_for_user(cls, user_id: str) -> List[Notification]:
        """
        Evalúa y genera recordatorios pertinentes según la hora local del usuario y su configuración:
        - Rutina matutina (RF-NOT-01)
        - Rutina nocturna (RF-NOT-02)
        - Recordatorios semanales (RF-NOT-04)
        - Productos por caducar (RF-NOT-05)
        - Productos por agotar (RF-NOT-06)
        - Foto de progreso (RF-NOT-07)
        """
        generated = []
        user_local = cls.get_user_local_time(user_id)
        current_time = user_local.time()
        current_weekday = user_local.isoweekday() # 1 = Lunes, 7 = Domingo

        settings = cls.get_user_settings(user_id)
        categories = settings.get("categories", {})

        # Si está en horario silencioso, no generar recordatorios intrusivos
        if cls.is_in_quiet_hours(user_id, user_local):
            return generated

        # 1. Rutina de la mañana (RF-NOT-01)
        m_cfg = categories.get("routine_morning", {})
        if m_cfg.get("enabled", True):
            # Si estamos entre 06:00 y 12:00
            if time(6, 0) <= current_time < time(12, 0):
                notif = cls.create_morning_routine_reminder(user_id)
                if notif:
                    generated.append(notif)

        # 2. Rutina de la noche (RF-NOT-02)
        n_cfg = categories.get("routine_night", {})
        if n_cfg.get("enabled", True):
            # Si estamos entre 20:00 y 23:59
            if time(20, 0) <= current_time <= time(23, 59):
                notif = cls.create_night_routine_reminder(user_id)
                if notif:
                    generated.append(notif)

        # 3. Recordatorio semanal (RF-NOT-04)
        w_cfg = categories.get("weekly_reminder", {}) or categories.get("weekly_summary", {})
        if w_cfg.get("enabled", True):
            target_days = w_cfg.get("days", [7])
            if current_weekday in target_days and current_time >= time(17, 0):
                notif = cls.create_weekly_reminder(user_id)
                if notif:
                    generated.append(notif)

        # 4. Foto de progreso (RF-NOT-07)
        p_cfg = categories.get("progress_photo", {})
        if p_cfg.get("enabled", True):
            p_days = p_cfg.get("days", [7])
            if current_weekday in p_days and current_time >= time(11, 0):
                notif = cls.create_progress_photo_reminder(user_id)
                if notif:
                    generated.append(notif)

        # 5. Caducidad de productos (RF-NOT-05)
        expiry_alerts = cls.check_and_create_expiry_alerts(user_id, days_threshold=15)
        generated.extend(expiry_alerts)

        # 6. Reposición de productos (RF-NOT-06)
        rep_alerts = cls.check_and_create_replenishment_alerts(user_id)
        generated.extend(rep_alerts)

        return generated

    # -------------------------------------------------------------------------
    # RF-NOT-14: Historial de notificaciones dentro de la aplicación
    # -------------------------------------------------------------------------
    @classmethod
    def get_user_notifications(
        cls,
        user_id: str,
        category: Optional[str] = None,
        group: Optional[str] = None,
        unread_only: bool = False,
        limit: int = 50,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        Recupera el historial de notificaciones ordenado cronológicamente.
        Permite filtrar por categoría, grupo o estado de lectura.
        """
        query = Notification.query.filter_by(user_id=user_id)

        if unread_only:
            query = query.filter(Notification.read_at == None)

        if category and category != "all":
            query = query.filter(Notification.type == category)

        if group and group != "all":
            # Filtrar por tipos que pertenecen al grupo
            matching_types = [k for k, g in CATEGORY_GROUP_MAP.items() if g == group]
            if matching_types:
                query = query.filter(Notification.type.in_(matching_types))

        total = query.count()
        unread_count = Notification.query.filter_by(user_id=user_id, read_at=None).count()

        notifications = query.order_by(Notification.created_at.desc())\
            .offset(offset)\
            .limit(limit)\
            .all()

        return {
            "items": [n.to_dict() for n in notifications],
            "total": total,
            "unread_count": unread_count
        }

    @classmethod
    def mark_as_read(cls, notification_id: str, user_id: str) -> bool:
        """Marca una notificación como leída."""
        notif = Notification.query.filter_by(id=notification_id, user_id=user_id).first()
        if not notif:
            return False

        if not notif.read_at:
            notif.read_at = datetime.now(timezone.utc)
            db.session.commit()

        return True

    @classmethod
    def mark_all_as_read(cls, user_id: str) -> int:
        """Marca todas las notificaciones pendientes del usuario como leídas."""
        now_utc = datetime.now(timezone.utc)
        unread = Notification.query.filter_by(user_id=user_id, read_at=None).all()
        for n in unread:
            n.read_at = now_utc

        db.session.commit()
        return len(unread)

    @classmethod
    def delete_notification(cls, notification_id: str, user_id: str) -> bool:
        """Elimina una notificación del historial."""
        notif = Notification.query.filter_by(id=notification_id, user_id=user_id).first()
        if not notif:
            return False

        db.session.delete(notif)
        db.session.commit()
        return True

    @classmethod
    def clear_read_notifications(cls, user_id: str) -> int:
        """Elimina todas las notificaciones que ya han sido leídas."""
        read_items = Notification.query.filter(
            Notification.user_id == user_id,
            Notification.read_at != None
        ).all()

        count = len(read_items)
        for item in read_items:
            db.session.delete(item)

        db.session.commit()
        return count
