import os
import sys
import time
import socket
import logging
import unittest
from dotenv import load_dotenv

# Asegurar que siempre trabaje dentro de la carpeta backend/
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(BASE_DIR)
sys.path.insert(0, BASE_DIR)
load_dotenv(os.path.join(BASE_DIR, ".env"))

from app import create_app

# Identificar si corre en GitHub Actions (CI) o en el Servidor Ubuntu / Local
ORIGEN_EJECUCION = "GitHub_Actions_CI" if os.environ.get("GITHUB_ACTIONS") == "true" else f"Host_{socket.gethostname()}"

# 1. Configuración del archivo de Log con ruta absoluta
LOG_DIR = os.path.join(BASE_DIR, "logs")
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, "skinova_sla.log")

logger = logging.getLogger("SkinovaSLA")
logger.setLevel(logging.INFO)
logger.handlers.clear()

file_handler = logging.FileHandler(LOG_FILE, mode="a", encoding="utf-8")
# Formato con TimeStamp explícito al inicio de cada registro
formatter = logging.Formatter(
    "TIMESTAMP=%(asctime)s | %(levelname)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
file_handler.setFormatter(formatter)
logger.addHandler(file_handler)


def registrar_traza(nivel, quien, que, modulo, http_code, latencia_ms, resultado, detalle=""):
    """
    Escribe un registro estandarizado de trazabilidad con los 5 pilares requeridos:
    TimeStamp (via formatter) | Quien | Que | En que modulo | Resultado (+ métricas SLA)
    """
    extra = f" | DETALLE={detalle}" if detalle else ""
    nivel(
        f"QUIEN={quien} | QUE={que} | MODULO={modulo} | "
        f"HTTP={http_code} | LATENCIA={latencia_ms}ms | RESULTADO={resultado}{extra}"
    )


# ==============================================================================
# SUITE 1: PRUEBAS BASE DE DISPONIBILIDAD Y SEGURIDAD (USADA POR MONITOR_CONTINUO)
# ==============================================================================
class TestModulosPrincipalesSkinova(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app("default")
        cls.client = cls.app.test_client()
        cls.actor = f"Monitor_Anonimo@{ORIGEN_EJECUCION}"
        logger.info(f"=== INICIO SUITE 1: PRUEBAS DE SERVICIO | QUIEN={cls.actor} ===")

    @classmethod
    def tearDownClass(cls):
        logger.info("=== FIN SUITE 1: PRUEBAS DE SERVICIO ===\n")

    def _medir_peticion(self, modulo, tipo_prueba, metodo, endpoint, expected_codes=(200,)):
        inicio = time.perf_counter()
        if metodo == "GET":
            resp = self.client.get(endpoint)
        else:
            resp = self.client.post(endpoint)
        latencia_ms = round((time.perf_counter() - inicio) * 1000, 2)

        exito = resp.status_code in expected_codes
        estado = "PASS" if exito else "FAIL"
        nivel = logger.info if exito else logger.error
        detalle = "" if exito else f"Esperado {expected_codes}, recibido {resp.status_code}"

        registrar_traza(
            nivel=nivel,
            quien=self.actor,
            que=f"[{tipo_prueba}] {metodo} {endpoint}",
            modulo=modulo,
            http_code=resp.status_code,
            latencia_ms=latencia_ms,
            resultado=estado,
            detalle=detalle,
        )

        self.assertIn(
            resp.status_code,
            expected_codes,
            f"Fallo en {modulo} ({endpoint}): se esperaba {expected_codes}, llegó {resp.status_code}"
        )
        return resp

    def test_01_disponibilidad_health(self):
        self._medir_peticion("Nucleo_API", "DISPONIBILIDAD", "GET", "/health", (200,))

    def test_02_seguridad_auth_usuarios(self):
        self._medir_peticion("Usuarios_Auth", "SEGURIDAD_ACCESO", "GET", "/api/auth/me", (401,))

    def test_03_seguridad_perfil_salud(self):
        self._medir_peticion("Perfil_Salud", "SEGURIDAD_ACCESO", "GET", "/api/perfil-salud/profile", (401,))

    def test_04_disponibilidad_creador_rutinas(self):
        self._medir_peticion("Creador_Rutinas", "DISPONIBILIDAD", "GET", "/api/rutinas", (401,))

    def test_05_funcionalidad_monitoreo_ambiental(self):
        resp = self._medir_peticion(
            "Monitoreo_Ambiental",
            "FUNCIONALIDAD",
            "GET",
            "/api/ambiente/cities?q=Leon",
            (200,)
        )
        data = resp.get_json()
        self.assertIn("cities", data)

    def test_06_funcionalidad_directorio_dermatologos(self):
        resp = self._medir_peticion(
            "Directorio_Derma",
            "FUNCIONALIDAD",
            "GET",
            "/api/directorio/specialists?lat=21.1253&lon=-101.6713&max_distance=10",
            (200,)
        )
        data = resp.get_json()
        self.assertIn("specialists", data)


# ==============================================================================
# SUITE 2: WORKFLOW E2E RAPIDO (LOGIN -> VISITA A MÓDULOS -> LOGOUT, SIN GEMINI)
# ==============================================================================
@unittest.skipUnless(
    os.environ.get("RUN_E2E_SIN_GEMINI") == "true" or os.environ.get("FLASK_ENV") == "testing",
    "Workflow E2E sin Gemini desactivado"
)
class TestWorkflowUsuarioSinGemini(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app("default")
        cls.client = cls.app.test_client()
        cls.clerk_test_id = "user_e2e_workflow_fast_01"
        cls.auth_headers = {
            "X-Test-User-Id": cls.clerk_test_id,
            "Content-Type": "application/json"
        }

        with cls.app.app_context():
            from app.extensions import db
            from app.modules.users.models import User
            user = User.query.filter_by(clerk_user_id=cls.clerk_test_id).first()
            if not user:
                user = User(clerk_user_id=cls.clerk_test_id)
                db.session.add(user)
                db.session.commit()

        logger.info(f"=== INICIO SUITE 2: WORKFLOW E2E RÁPIDO | QUIEN={cls.clerk_test_id}@{ORIGEN_EJECUCION} ===")

    @classmethod
    def tearDownClass(cls):
        logger.info("=== FIN SUITE 2: WORKFLOW E2E RÁPIDO ===\n")

    def _medir_paso(self, paso, modulo, metodo, endpoint, expected_codes=(200,), headers=None, actor_override=None):
        inicio = time.perf_counter()
        hdrs = headers if headers is not None else self.auth_headers
        quien_actual = actor_override or f"{self.clerk_test_id}@{ORIGEN_EJECUCION}"

        if metodo == "GET":
            resp = self.client.get(endpoint, headers=hdrs)
        else:
            resp = self.client.post(endpoint, headers=hdrs)

        latencia_ms = round((time.perf_counter() - inicio) * 1000, 2)
        exito = resp.status_code in expected_codes
        estado = "PASS" if exito else "FAIL"
        nivel = logger.info if exito else logger.error
        detalle = "" if exito else f"Esperado {expected_codes}, recibido {resp.status_code}"

        registrar_traza(
            nivel=nivel,
            quien=quien_actual,
            que=f"[{paso}] {metodo} {endpoint}",
            modulo=modulo,
            http_code=resp.status_code,
            latencia_ms=latencia_ms,
            resultado=estado,
            detalle=detalle,
        )

        self.assertIn(
            resp.status_code,
            expected_codes,
            f"Fallo en {paso} ({endpoint}): esperaba {expected_codes}, llegó {resp.status_code}"
        )
        return resp

    def test_01_recorrido_completo_y_logout(self):
        # 1. Inicio de sesión y validación de identidad
        resp_login = self._medir_paso("01_Login_Validar_Sesion", "Usuarios_Auth", "GET", "/api/auth/me", (200,))
        self.assertEqual(resp_login.get_json().get("clerk_user_id"), self.clerk_test_id)

        # 2. Visitas a los módulos principales autenticado (cada paso indica su módulo exacto)
        self._medir_paso("02_Consultar_Perfil_Salud", "Perfil_Salud", "GET", "/api/perfil-salud/profile", (200, 404))
        self._medir_paso("03_Consultar_Rutinas", "Creador_Rutinas", "GET", "/api/rutinas", (200,))
        self._medir_paso("04_Consultar_Mi_Neceser", "Mi_Neceser", "GET", "/api/mi-neceser", (200, 404))
        self._medir_paso("05_Consultar_Habitos_Desafios", "Habitos_Desafios", "GET", "/api/habitos-desafios", (200, 404))
        self._medir_paso("06_Consultar_Bitacora", "Bitacora", "GET", "/api/bitacora", (200, 404))
        self._medir_paso("07_Consultar_Comunidad", "Comunidad", "GET", "/api/comunidad", (200, 404))
        self._medir_paso("08_Consultar_Notificaciones", "Notificaciones", "GET", "/api/notificaciones", (200, 404))
        self._medir_paso("09_Consultar_Historial_IA", "Busqueda_IA", "GET", "/api/products/history", (200,))

        # 3. Logout: revocar credenciales y verificar bloqueo de sesión
        headers_sin_sesion = {"Content-Type": "application/json"}
        actor_deslogueado = f"Sesion_Cerrada({self.clerk_test_id})@{ORIGEN_EJECUCION}"

        self._medir_paso(
            "10_Logout_Verificar_Auth_Bloqueado",
            "Usuarios_Auth",
            "GET",
            "/api/auth/me",
            (401,),
            headers=headers_sin_sesion,
            actor_override=actor_deslogueado,
        )
        self._medir_paso(
            "11_Logout_Verificar_Rutinas_Bloqueado",
            "Creador_Rutinas",
            "GET",
            "/api/rutinas",
            (401,),
            headers=headers_sin_sesion,
            actor_override=actor_deslogueado,
        )


# ==============================================================================
# SUITE 3: WORKFLOW E2E CON GEMINI REAL (SOLO PARA PUSH/DEPLOY EN CI, NO MONITOR)
# ==============================================================================
@unittest.skipUnless(
    os.environ.get("RUN_E2E_GEMINI") == "true",
    "Workflow con Gemini omitido (solo corre cuando RUN_E2E_GEMINI=true)"
)
class TestWorkflowUsuarioConGemini(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app("default")
        cls.client = cls.app.test_client()
        cls.clerk_test_id = "user_e2e_gemini_ci_01"
        cls.headers = {
            "X-Test-User-Id": cls.clerk_test_id,
            "Content-Type": "application/json"
        }

        with cls.app.app_context():
            from app.extensions import db
            from app.modules.users.models import User
            user = User.query.filter_by(clerk_user_id=cls.clerk_test_id).first()
            if not user:
                user = User(clerk_user_id=cls.clerk_test_id)
                db.session.add(user)
                db.session.commit()

        logger.info(f"=== INICIO SUITE 3: WORKFLOW E2E CON GEMINI | QUIEN={cls.clerk_test_id}@{ORIGEN_EJECUCION} ===")

    @classmethod
    def tearDownClass(cls):
        logger.info("=== FIN SUITE 3: WORKFLOW E2E CON GEMINI ===\n")

    def _medir_paso(self, paso, modulo, metodo, endpoint, expected_codes=(200,), payload=None):
        inicio = time.perf_counter()
        if metodo == "GET":
            resp = self.client.get(endpoint, headers=self.headers)
        elif metodo == "POST":
            resp = self.client.post(endpoint, headers=self.headers, json=payload)
        elif metodo == "DELETE":
            resp = self.client.delete(endpoint, headers=self.headers)

        latencia_ms = round((time.perf_counter() - inicio) * 1000, 2)
        exito = resp.status_code in expected_codes
        estado = "PASS" if exito else "FAIL"
        nivel = logger.info if exito else logger.error
        detalle = "" if exito else f"Esperado {expected_codes}, recibido {resp.status_code}"

        registrar_traza(
            nivel=nivel,
            quien=f"{self.clerk_test_id}@{ORIGEN_EJECUCION}",
            que=f"[{paso}] {metodo} {endpoint}",
            modulo=modulo,
            http_code=resp.status_code,
            latencia_ms=latencia_ms,
            resultado=estado,
            detalle=detalle,
        )

        self.assertIn(
            resp.status_code,
            expected_codes,
            f"Fallo en {paso} ({endpoint}): esperaba {expected_codes}, llegó {resp.status_code} -> {resp.get_data(as_text=True)}"
        )
        return resp

    def test_01_consulta_gemini_y_limpieza(self):
        # 1. Análisis de producto real con Gemini
        resp_analyze = self._medir_paso(
            "01_Gemini_Analizar_Producto",
            "Busqueda_IA",
            "POST",
            "/api/products/analyze",
            (200,),
            payload={"search_query": "CeraVe Foaming Cleanser"}
        )
        self.assertTrue(resp_analyze.get_json().get("success"))

        # 2. Chat de seguimiento
        self._medir_paso(
            "02_Gemini_Chat_Seguimiento",
            "Busqueda_IA",
            "POST",
            "/api/products/chat",
            (200,),
            payload={"message": "¿Sirve para piel grasa? Responde en una oración."}
        )

        # 3. Verificar guardado en historial y borrar registro de prueba
        resp_hist = self._medir_paso("03_Verificar_Historial_IA", "Historial_IA", "GET", "/api/products/history", (200,))
        items = resp_hist.get_json().get("data", [])
        self.assertGreater(len(items), 0)

        history_id = items[0]["id"]
        self._medir_paso("04_Limpiar_Registro_Prueba", "Historial_IA", "DELETE", f"/api/products/history/{history_id}", (200,))


if __name__ == "__main__":
    unittest.main(verbosity=2)