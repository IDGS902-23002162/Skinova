import os
import sys
import time
import logging
import unittest
from dotenv import load_dotenv

# Asegurar que siempre trabaje dentro de la carpeta backend/
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(BASE_DIR)
sys.path.insert(0, BASE_DIR)
load_dotenv(os.path.join(BASE_DIR, ".env"))

from app import create_app

# 1. Configuración del archivo de Log con ruta absoluta
LOG_DIR = os.path.join(BASE_DIR, "logs")
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, "skinova_sla.log")

logger = logging.getLogger("SkinovaSLA")
logger.setLevel(logging.INFO)
logger.handlers.clear()

file_handler = logging.FileHandler(LOG_FILE, mode="a", encoding="utf-8")
formatter = logging.Formatter(
    "%(asctime)s | %(levelname)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
file_handler.setFormatter(formatter)
logger.addHandler(file_handler)


class TestModulosPrincipalesSkinova(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app("default")
        cls.client = cls.app.test_client()
        logger.info("=== INICIO DE EJECUCIÓN DE PRUEBAS AUTOMÁTICAS DE SERVICIO ===")

    @classmethod
    def tearDownClass(cls):
        logger.info("=== FIN DE EJECUCIÓN DE PRUEBAS AUTOMÁTICAS ===\n")

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

        nivel(
            f"MODULO={modulo} | TIPO={tipo_prueba} | ENDPOINT={endpoint} | "
            f"HTTP={resp.status_code} | LATENCIA={latencia_ms}ms | RESULTADO={estado}"
        )
        self.assertIn(
            resp.status_code,
            expected_codes,
            f"Fallo en {modulo} ({endpoint}): se esperaba {expected_codes}, llegó {resp.status_code}"
        )
        return resp

    # 1. Disponibilidad general del servidor y MySQL
    def test_01_disponibilidad_health(self):
        self._medir_peticion("Nucleo_API", "DISPONIBILIDAD", "GET", "/health", (200,))

    # 2. Seguridad y control de acceso en Usuarios / Perfil Salud
    def test_02_seguridad_auth_usuarios(self):
        self._medir_peticion("Usuarios_Auth", "FUNCIONALIDAD", "GET", "/api/auth/me", (401,))

    def test_03_seguridad_perfil_salud(self):
        self._medir_peticion("Perfil_Salud", "FUNCIONALIDAD", "GET", "/api/perfil-salud/profile", (401,))

    # 3. Protección de Creador de Rutinas
    def test_04_disponibilidad_creador_rutinas(self):
        self._medir_peticion("Creador_Rutinas", "DISPONIBILIDAD", "GET", "/api/rutinas", (401,))

    # 4. Disponibilidad y funcionalidad del buscador predictivo de Ambiente (API Open-Meteo)
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

    # 5. Disponibilidad y funcionalidad del Directorio de Dermatólogos (API INEGI DENUE)
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


if __name__ == "__main__":
    unittest.main(verbosity=2)