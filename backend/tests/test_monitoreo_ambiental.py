import unittest
from unittest.mock import patch, MagicMock
from app import create_app, db
from app.modules.users.models import User
from app.modules.monitoreo_ambiental.models import (
    EnvironmentalSnapshot,
    UserEnvironmentalPreference,
)
from app.modules.monitoreo_ambiental.services import (
    classify_humidity,
    classify_uv,
    classify_aqi,
    resolve_coordinates_for_city,
    get_environmental_data,
    get_environmental_routine_context,
)


class TestMonitoreoAmbiental(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.app.config["TESTING"] = True
        cls.client = cls.app.test_client()

    def setUp(self):
        self.app_context = self.app.app_context()
        self.app_context.push()

    def tearDown(self):
        db.session.rollback()
        self.app_context.pop()

    def test_classifications(self):
        """Prueba las reglas de clasificación médica y ambiental (RF-AMB-04, 05, 06, 09)."""
        # Humedad
        self.assertIn("seco", classify_humidity(20).lower())
        self.assertIn("óptima", classify_humidity(45).lower())
        self.assertIn("húmedo", classify_humidity(75).lower())

        # Índice UV
        level, is_high = classify_uv(2.5)
        self.assertEqual(level, "Bajo")
        self.assertFalse(is_high)

        level, is_high = classify_uv(7.2)
        self.assertEqual(level, "Alto")
        self.assertTrue(is_high)

        level, is_high = classify_uv(11.5)
        self.assertEqual(level, "Extremo")
        self.assertTrue(is_high)

        # Calidad del aire
        self.assertEqual(classify_aqi(30), "Buena")
        self.assertEqual(classify_aqi(85), "Moderada")

    def test_resolve_coordinates(self):
        """Prueba la resolución de coordenadas para ciudades estándar (RF-AMB-02)."""
        lat, lon, label = resolve_coordinates_for_city("León, Gto")
        self.assertAlmostEqual(lat, 21.1219, places=2)
        self.assertAlmostEqual(lon, -101.6826, places=2)

    def test_get_environmental_data_live_or_fallback(self):
        """Prueba la obtención de datos ambientales con caché y resiliencia (RF-AMB-03 al 07, 11, 12)."""
        data = get_environmental_data("León, Gto", force_refresh=False)
        self.assertIn("temp", data)
        self.assertIn("humidity", data)
        self.assertIn("uv", data)
        self.assertIn("aqi", data)
        self.assertIn("aiSummary", data)
        self.assertIn("aiTips", data)
        self.assertIsInstance(data["aiTips"], list)
        self.assertGreaterEqual(len(data["aiTips"]), 2)

    def test_api_cities_endpoint(self):
        """Prueba el endpoint público de catálogo de ciudades (RF-AMB-02)."""
        response = self.client.get("/api/ambiente/cities")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("cities", data)
        self.assertTrue(any("León" in c["name"] for c in data["cities"]))

    @patch("app.modules.monitoreo_ambiental.routes._get_or_create_user_id")
    def test_authenticated_endpoints(self, mock_user_id):
        """Prueba los endpoints protegidos simulando la sesión del usuario."""
        # Crear un usuario de prueba en la BD
        test_clerk_id = "test_clerk_user_env"
        user = User.query.filter_by(clerk_user_id=test_clerk_id).first()
        if not user:
            user = User(clerk_user_id=test_clerk_id, role="user")
            db.session.add(user)
            db.session.commit()

        mock_user_id.return_value = user.id

        # Simular require_auth inyectando g.user_id
        with self.client.application.test_request_context():
            from flask import g
            g.user_id = test_clerk_id

        # 1. Probar actualización de preferencias (RF-AMB-01, 02, 10)
        with patch("app.auth.Clerk") as mock_clerk_cls:
            mock_clerk = MagicMock()
            mock_req_state = MagicMock()
            mock_req_state.is_signed_in = True
            mock_req_state.payload = {"sub": test_clerk_id}
            mock_clerk.authenticate_request.return_value = mock_req_state
            mock_clerk_cls.return_value = mock_clerk

            headers = {"Authorization": "Bearer mock_token", "Content-Type": "application/json"}

            # PUT Preference
            res = self.client.put(
                "/api/ambiente/preference",
                headers=headers,
                json={
                    "city_name": "Monterrey, N.L.",
                    "use_location": True,
                    "sync_with_routine": True
                }
            )
            self.assertEqual(res.status_code, 200)
            pref_data = res.get_json()["preference"]
            self.assertEqual(pref_data["city_name"], "Monterrey, N.L.")
            self.assertTrue(pref_data["use_location"])
            self.assertTrue(pref_data["sync_with_routine"])

            # GET Current
            res_curr = self.client.get("/api/ambiente/current", headers=headers)
            self.assertEqual(res_curr.status_code, 200)
            curr_data = res_curr.get_json()
            self.assertEqual(curr_data["city"], "Monterrey, N.L.")
            self.assertIn("temp", curr_data)
            self.assertIn("aiSummary", curr_data)

            # GET Routine Context (RF-AMB-10)
            res_ctx = self.client.get("/api/ambiente/routine-context", headers=headers)
            self.assertEqual(res_ctx.status_code, 200)
            ctx_data = res_ctx.get_json()
            self.assertTrue(ctx_data["sync_enabled"])
            self.assertEqual(ctx_data["city"], "Monterrey, N.L.")
            self.assertIn("adjustments", ctx_data)


if __name__ == "__main__":
    unittest.main()
