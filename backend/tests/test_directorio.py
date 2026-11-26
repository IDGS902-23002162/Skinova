import unittest
from unittest.mock import patch, MagicMock
from app import create_app, db
from app.modules.users.models import User
from app.modules.directorio.models import Dermatologist, FavoriteDermatologist
from app.modules.directorio.services import (
    calculate_haversine_distance,
    search_dermatologists,
    toggle_dermatologist_favorite,
    get_ai_referral_status,
)


class TestDirectorioDermatologos(unittest.TestCase):
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

    def test_haversine_distance_calculation(self):
        """RF-DER-06: Verifica el cálculo de distancia geodésica entre dos puntos."""
        # Distancia entre dos puntos conocidos en León, Gto (aprox 2 a 3 km)
        dist = calculate_haversine_distance(21.1219, -101.6826, 21.1558, -101.6961)
        self.assertGreater(dist, 1.0)
        self.assertLess(dist, 6.0)

        # Distancia a cero si son las mismas coordenadas
        self.assertAlmostEqual(calculate_haversine_distance(21.0, -101.0, 21.0, -101.0), 0.0)

    def test_search_and_filter_specialists(self):
        """RF-DER-02, 06, 07: Búsqueda, filtros por distancia y modalidad."""
        # Todos los especialistas en radio amplio
        all_docs = search_dermatologists(user_lat=21.1219, user_lon=-101.6826, max_distance_km=100.0)
        self.assertGreaterEqual(len(all_docs), 4)

        # Filtrar por tipo de atención 'presencial'
        presencial_only = search_dermatologists(
            user_lat=21.1219, user_lon=-101.6826, care_type="presencial"
        )
        self.assertTrue(all(d["careType"] in ("presencial", "ambos") for d in presencial_only))

        # Filtrar por tipo de atención 'en_linea'
        online_only = search_dermatologists(
            user_lat=21.1219, user_lon=-101.6826, care_type="en_linea"
        )
        self.assertTrue(all(d["careType"] in ("en_linea", "ambos") for d in online_only))

        # Búsqueda por texto (nombre o síntoma)
        acne_docs = search_dermatologists(query="acné")
        self.assertGreaterEqual(len(acne_docs), 1)
        self.assertTrue(any("acné" in " ".join(d["focusAreas"]).lower() for d in acne_docs))

    def test_api_specialists_public_endpoint(self):
        """RF-DER-03, 04, 05: Endpoint de listado para vista de lista y mapa."""
        response = self.client.get("/api/directorio/specialists?lat=21.1219&lon=-101.6826")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("specialists", data)
        self.assertIn("total", data)
        self.assertGreaterEqual(data["total"], 4)

        first = data["specialists"][0]
        self.assertIn("name", first)
        self.assertIn("specialty", first)
        self.assertIn("distanceKm", first)
        self.assertIn("pinCoords", first)
        self.assertIn("contact", first)

    def test_api_specialist_detail_endpoint(self):
        """RF-DER-05: Detalle individual de especialista."""
        response = self.client.get("/api/directorio/specialists/der-1")
        self.assertEqual(response.status_code, 200)
        doc = response.get_json()
        self.assertEqual(doc["id"], "der-1")
        self.assertIn("Valeria Montes", doc["name"])
        self.assertEqual(doc["bookingPlatform"], "Doctoralia")

    @patch("app.modules.directorio.routes._get_current_user_id")
    def test_favorites_and_referral(self, mock_user_id):
        """RF-DER-11 y RF-DER-12: Guardado de favoritos y derivación de IA."""
        test_clerk_id = "test_clerk_user_derma"
        user = User.query.filter_by(clerk_user_id=test_clerk_id).first()
        if not user:
            user = User(clerk_user_id=test_clerk_id, role="user")
            db.session.add(user)
            db.session.commit()

        mock_user_id.return_value = user.id

        headers = {"Authorization": "Bearer mock_token", "Content-Type": "application/json"}
        with patch("app.auth.Clerk") as mock_clerk_cls:
            mock_clerk = MagicMock()
            mock_req_state = MagicMock()
            mock_req_state.is_signed_in = True
            mock_req_state.payload = {"sub": test_clerk_id}
            mock_clerk.authenticate_request.return_value = mock_req_state
            mock_clerk_cls.return_value = mock_clerk

            # 1. Agregar a favoritos (POST)
            res_add = self.client.post("/api/directorio/favorites/der-1", headers=headers)
            self.assertEqual(res_add.status_code, 200)
            self.assertTrue(res_add.get_json()["isFavorite"])

            # 2. Consultar favoritos (GET)
            res_list = self.client.get("/api/directorio/favorites", headers=headers)
            self.assertEqual(res_list.status_code, 200)
            fav_ids = res_list.get_json()["favoriteIds"]
            self.assertIn("der-1", fav_ids)

            # 3. Quitar de favoritos (DELETE)
            res_del = self.client.delete("/api/directorio/favorites/der-1", headers=headers)
            self.assertEqual(res_del.status_code, 200)
            self.assertFalse(res_del.get_json()["isFavorite"])

            # 4. Consultar derivación IA (GET)
            res_ref = self.client.get("/api/directorio/ai-referral", headers=headers)
            self.assertEqual(res_ref.status_code, 200)
            ref_data = res_ref.get_json()
            self.assertIn("has_active_referral", ref_data)
            self.assertIn("recommended_specialty", ref_data)


if __name__ == "__main__":
    unittest.main()
