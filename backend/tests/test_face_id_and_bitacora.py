import os
import sys
import base64
import unittest
from unittest.mock import patch, MagicMock
import numpy as np
import cv2

# Ensure backend root is on sys.path
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# Force testing environment
os.environ["FLASK_ENV"] = "testing"
os.environ["CLERK_SECRET_KEY"] = "sk_test_mock_secret_key_12345"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from app import create_app
from app.extensions import db
from app.modules.bitacora import (
    ProgressEntry,
    ProgressPhoto,
    HabitLog,
    Notification,
    BitacoraService,
    NotificationService,
    bitacora_bp
)
from app.modules.face_id import (
    FaceIdService,
    VerificationResult,
    face_id_bp,
    FACE_SIMILARITY_THRESHOLD,
    get_similarity_threshold,
)
from app.modules.users.models import User
from app.modules.perfil_salud.models import UserProfile


def create_dummy_image_base64(color=(128, 128, 128), width=100, height=100) -> str:
    """Generates a valid Base64 data URL for an image."""
    img = np.full((height, width, 3), color, dtype=np.uint8)
    _, buffer = cv2.imencode('.jpg', img)
    b64_str = base64.b64encode(buffer).decode('utf-8')
    return f"data:image/jpeg;base64,{b64_str}"


class MockFace:
    """Simulates an InsightFace face object with an embedding vector."""
    def __init__(self, embedding: np.ndarray):
        self.embedding = embedding


class TestFaceIdAndBitacora(unittest.TestCase):

    def setUp(self):
        self.app = create_app('testing')
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()

        self.client = self.app.test_client()
        self.test_clerk_id = "user_clerk_test_123"

        # Create a test user in DB
        self.user = User(clerk_user_id=self.test_clerk_id)
        db.session.add(self.user)
        db.session.flush()
        self.profile = UserProfile(user_id=self.user.id, onboarding_completed=True)
        db.session.add(self.profile)
        db.session.commit()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    # =========================================================================
    # 1. Bitácora Module Structure & Imports
    # =========================================================================
    def test_bitacora_module_structure_and_exports(self):
        """Verifies that all Bitácora components are exported cleanly from app.modules.bitacora."""
        self.assertIsNotNone(ProgressEntry)
        self.assertIsNotNone(ProgressPhoto)
        self.assertIsNotNone(HabitLog)
        self.assertIsNotNone(Notification)
        self.assertIsNotNone(BitacoraService)
        self.assertIsNotNone(NotificationService)
        self.assertIsNotNone(bitacora_bp)
        self.assertEqual(BitacoraService, NotificationService)

    # =========================================================================
    # 2. Face ID Configuration & Threshold
    # =========================================================================
    def test_threshold_configuration(self):
        """Tests that similarity threshold defaults to 50.0 and normalizes decimal scales."""
        with patch.dict(os.environ, {"FACE_SIMILARITY_THRESHOLD": "50.0"}):
            self.assertEqual(get_similarity_threshold(), 50.0)

        # Decimal format (0.50 -> 50.0)
        with patch.dict(os.environ, {"FACE_SIMILARITY_THRESHOLD": "0.50"}):
            self.assertEqual(get_similarity_threshold(), 50.0)

        # Custom threshold
        with patch.dict(os.environ, {"FACE_SIMILARITY_THRESHOLD": "65.0"}):
            self.assertEqual(get_similarity_threshold(), 65.0)

    # =========================================================================
    # 3. Base64 Image Decoding & Validation
    # =========================================================================
    def test_decode_base64_image_success(self):
        """Tests successful decoding of data-uri and raw base64 images."""
        data_uri = create_dummy_image_base64(color=(255, 0, 0), width=64, height=64)
        bgr = FaceIdService.decode_base64_image(data_uri)
        self.assertIsInstance(bgr, np.ndarray)
        self.assertEqual(bgr.shape, (64, 64, 3))

        # Raw base64 without prefix
        raw_b64 = data_uri.split("base64,")[-1]
        bgr_raw = FaceIdService.decode_base64_image(raw_b64)
        self.assertEqual(bgr_raw.shape, (64, 64, 3))

    def test_decode_base64_image_invalid_payloads(self):
        """Rejects malformed, empty, or non-image payloads."""
        with self.assertRaises(ValueError):
            FaceIdService.decode_base64_image("")

        with self.assertRaises(ValueError):
            FaceIdService.decode_base64_image("not_a_base64_string!!!!")

        # Base64 string that is not an image
        non_image_b64 = base64.b64encode(b"This is just text, not an image").decode('utf-8')
        with self.assertRaises(ValueError):
            FaceIdService.decode_base64_image(non_image_b64)

    # =========================================================================
    # 4. Facial Recognition Logic & Similarity Evaluation
    # =========================================================================
    def test_verify_images_match(self):
        """Tests that two face embeddings with similarity >= threshold verify successfully."""
        mock_model = MagicMock()

        # Create two 512-d normalized embeddings with high cosine similarity (~0.85)
        np.random.seed(42)
        base_vector = np.random.randn(512).astype(np.float32)
        base_vector /= np.linalg.norm(base_vector)

        noise = np.random.randn(512).astype(np.float32)
        noise /= np.linalg.norm(noise)
        similar_vector = base_vector * 0.85 + noise * 0.15
        similar_vector /= np.linalg.norm(similar_vector)

        ref_face = MockFace(embedding=base_vector)
        sub_face = MockFace(embedding=similar_vector)

        mock_model.get.side_effect = [[ref_face], [sub_face]]

        dummy_ref = np.zeros((100, 100, 3), dtype=np.uint8)
        dummy_sub = np.zeros((100, 100, 3), dtype=np.uint8)

        with patch.object(FaceIdService, 'get_model', return_value=mock_model):
            result = FaceIdService.verify_images(dummy_ref, dummy_sub, threshold=50.0)

            self.assertTrue(result.success)
            self.assertTrue(result.verified)
            self.assertGreaterEqual(result.similarity_score, 50.0)
            self.assertIsNone(result.error_code)
            self.assertEqual(result.message, "Face verified successfully.")

    def test_verify_images_mismatch(self):
        """Tests that different face embeddings result in mismatch with the expected message."""
        mock_model = MagicMock()

        # Two orthogonal / different vectors (similarity ~ 0.0)
        vec1 = np.zeros(512, dtype=np.float32)
        vec1[0] = 1.0

        vec2 = np.zeros(512, dtype=np.float32)
        vec2[1] = 1.0

        ref_face = MockFace(embedding=vec1)
        sub_face = MockFace(embedding=vec2)

        mock_model.get.side_effect = [[ref_face], [sub_face]]

        dummy_ref = np.zeros((100, 100, 3), dtype=np.uint8)
        dummy_sub = np.zeros((100, 100, 3), dtype=np.uint8)

        with patch.object(FaceIdService, 'get_model', return_value=mock_model):
            result = FaceIdService.verify_images(dummy_ref, dummy_sub, threshold=50.0)

            self.assertTrue(result.success)
            self.assertFalse(result.verified)
            self.assertLess(result.similarity_score, 50.0)
            self.assertEqual(result.error_code, "MISMATCH")
            self.assertEqual(result.message, "We haven't detected a photo of yours.")

    def test_verify_images_no_face_in_reference(self):
        """Tests detection failure when Clerk profile photo has no face."""
        mock_model = MagicMock()
        mock_model.get.return_value = [] # 0 faces

        dummy_ref = np.zeros((100, 100, 3), dtype=np.uint8)
        dummy_sub = np.zeros((100, 100, 3), dtype=np.uint8)

        with patch.object(FaceIdService, 'get_model', return_value=mock_model):
            result = FaceIdService.verify_images(dummy_ref, dummy_sub, threshold=50.0)

            self.assertFalse(result.verified)
            self.assertEqual(result.error_code, "NO_FACE_IN_REFERENCE")

    def test_verify_images_no_face_in_submitted(self):
        """Tests detection failure when submitted photo has no face."""
        mock_model = MagicMock()
        ref_face = MockFace(embedding=np.ones(512, dtype=np.float32))

        # First call (ref) finds 1 face; second call (sub) finds 0 faces
        mock_model.get.side_effect = [[ref_face], []]

        dummy_ref = np.zeros((100, 100, 3), dtype=np.uint8)
        dummy_sub = np.zeros((100, 100, 3), dtype=np.uint8)

        with patch.object(FaceIdService, 'get_model', return_value=mock_model):
            result = FaceIdService.verify_images(dummy_ref, dummy_sub, threshold=50.0)

            self.assertFalse(result.verified)
            self.assertEqual(result.error_code, "NO_FACE_IN_SUBMITTED")

    def test_verify_images_multiple_faces_detected(self):
        """Tests failure when multiple faces are detected."""
        mock_model = MagicMock()
        ref_face = MockFace(embedding=np.ones(512, dtype=np.float32))
        f1 = MockFace(embedding=np.ones(512, dtype=np.float32))
        f2 = MockFace(embedding=np.ones(512, dtype=np.float32))

        # First call has 1 face, second has 2 faces
        mock_model.get.side_effect = [[ref_face], [f1, f2]]

        dummy_ref = np.zeros((100, 100, 3), dtype=np.uint8)
        dummy_sub = np.zeros((100, 100, 3), dtype=np.uint8)

        with patch.object(FaceIdService, 'get_model', return_value=mock_model):
            result = FaceIdService.verify_images(dummy_ref, dummy_sub, threshold=50.0)

            self.assertFalse(result.verified)
            self.assertEqual(result.error_code, "MULTIPLE_FACES_DETECTED")

    # =========================================================================
    # 5. Clerk Profile Picture Retrieval
    # =========================================================================
    @patch('requests.get')
    def test_get_clerk_profile_picture_url_success(self, mock_get):
        """Tests retrieving user image URL from Clerk API."""
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "id": self.test_clerk_id,
            "has_image": True,
            "image_url": "https://img.clerk.com/test_avatar.jpg"
        }
        mock_get.return_value = mock_resp

        url, err = FaceIdService.get_clerk_profile_picture_url(self.test_clerk_id)
        self.assertEqual(url, "https://img.clerk.com/test_avatar.jpg")
        self.assertIsNone(err)

    @patch('requests.get')
    def test_get_clerk_profile_picture_no_image(self, mock_get):
        """Tests handling when user has no image in Clerk."""
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "id": self.test_clerk_id,
            "has_image": False,
            "image_url": None
        }
        mock_get.return_value = mock_resp

        url, err = FaceIdService.get_clerk_profile_picture_url(self.test_clerk_id)
        self.assertIsNone(url)
        self.assertIn("No profile picture", err)

    # =========================================================================
    # 6. Face ID API Contract Endpoint (/api/face-id/verify)
    # =========================================================================
    def test_api_face_id_verify_endpoint_impersonation_blocked(self):
        """Tests that providing a different user_id than authenticated user is forbidden (403)."""
        payload = {
            "user_id": "different_attacker_clerk_id",
            "image": create_dummy_image_base64()
        }
        response = self.client.post(
            '/api/face-id/verify',
            json=payload,
            headers={
                "Content-Type": "application/json",
                "X-Test-User-Id": self.test_clerk_id
            }
        )
        self.assertEqual(response.status_code, 403)
        data = response.get_json()
        self.assertFalse(data.get("verified"))
        self.assertEqual(data.get("error_code"), "FORBIDDEN")

    def test_api_face_id_verify_endpoint_mismatch_returns_400(self):
        """Tests that a mismatch returns 400 with 'We haven\'t detected a photo of yours.'"""
        mismatch_result = VerificationResult(
            success=True,
            verified=False,
            similarity=0.22,
            similarity_score=22.0,
            threshold=50.0,
            error_code="MISMATCH",
            message="We haven't detected a photo of yours."
        )

        with patch.object(FaceIdService, 'verify_user_photo', return_value=mismatch_result):
            payload = {
                "user_id": self.test_clerk_id,
                "image": create_dummy_image_base64()
            }
            response = self.client.post(
                '/api/face-id/verify',
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "X-Test-User-Id": self.test_clerk_id
                }
            )
            self.assertEqual(response.status_code, 400)
            data = response.get_json()
            self.assertFalse(data.get("verified"))
            self.assertEqual(data.get("error_code"), "MISMATCH")
            self.assertEqual(data.get("message"), "We haven't detected a photo of yours.")

    def test_api_face_id_verify_endpoint_success_returns_200(self):
        """Tests that a successful face match returns 200 with verified=true."""
        success_result = VerificationResult(
            success=True,
            verified=True,
            similarity=0.81,
            similarity_score=81.0,
            threshold=50.0,
            error_code=None,
            message="Face verified successfully."
        )

        with patch.object(FaceIdService, 'verify_user_photo', return_value=success_result):
            payload = {
                "user_id": self.test_clerk_id,
                "image": create_dummy_image_base64()
            }
            response = self.client.post(
                '/api/face-id/verify',
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "X-Test-User-Id": self.test_clerk_id
                }
            )
            self.assertEqual(response.status_code, 200)
            data = response.get_json()
            self.assertTrue(data.get("verified"))
            self.assertEqual(data.get("similarity_score"), 81.0)

    # =========================================================================
    # 7. Bitácora Photo Submission Integration & DB Insertion Prevention
    # =========================================================================
    def test_bitacora_submission_with_photo_mismatch_prevents_db_insertion(self):
        """
        CRITICAL TEST:
        When a photo fails face verification during Bitácora submission:
        - Request MUST be rejected with HTTP 400
        - Error message MUST be 'We haven\'t detected a photo of yours.'
        - NO ProgressEntry or ProgressPhoto must be inserted in the database!
        """
        initial_entry_count = ProgressEntry.query.count()
        initial_photo_count = ProgressPhoto.query.count()

        mismatch_result = VerificationResult(
            success=True,
            verified=False,
            similarity=0.25,
            similarity_score=25.0,
            threshold=50.0,
            error_code="MISMATCH",
            message="We haven't detected a photo of yours."
        )

        dummy_photo_data_url = create_dummy_image_base64()

        with patch.object(FaceIdService, 'verify_user_photo', return_value=mismatch_result):
            payload = {
                "perception": "better",
                "notes": "Testing face verification rejection",
                "photos": [dummy_photo_data_url]
            }

            response = self.client.post(
                '/api/bitacora/entries',
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "X-Test-User-Id": self.test_clerk_id
                }
            )

            # 1. Verification must reject with HTTP 400
            self.assertEqual(response.status_code, 400)
            data = response.get_json()
            self.assertFalse(data.get("success"))
            self.assertEqual(data.get("error"), "We haven't detected a photo of yours.")
            self.assertEqual(data.get("message"), "We haven't detected a photo of yours.")

            # 2. Database MUST NOT contain any new records!
            self.assertEqual(ProgressEntry.query.count(), initial_entry_count)
            self.assertEqual(ProgressPhoto.query.count(), initial_photo_count)

    def test_bitacora_submission_with_photo_match_succeeds_and_inserts_db(self):
        """When photo verification succeeds, the entry is inserted into the DB."""
        initial_entry_count = ProgressEntry.query.count()

        success_result = VerificationResult(
            success=True,
            verified=True,
            similarity=0.78,
            similarity_score=78.0,
            threshold=50.0,
            error_code=None,
            message="Face verified successfully."
        )

        dummy_photo_data_url = create_dummy_image_base64()

        with patch.object(FaceIdService, 'verify_user_photo', return_value=success_result):
            payload = {
                "perception": "same",
                "notes": "Valid face photo",
                "photos": [dummy_photo_data_url]
            }

            response = self.client.post(
                '/api/bitacora/entries',
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "X-Test-User-Id": self.test_clerk_id
                }
            )

            self.assertEqual(response.status_code, 201)
            data = response.get_json()
            self.assertTrue(data.get("success"))
            self.assertIsNotNone(data.get("data", {}).get("id"))

            # Database MUST contain exactly 1 new record
            self.assertEqual(ProgressEntry.query.count(), initial_entry_count + 1)

    def test_bitacora_submission_without_photo_succeeds_normally(self):
        """When an entry is submitted with no photo, verification is not required and DB insertion succeeds."""
        initial_entry_count = ProgressEntry.query.count()

        payload = {
            "perception": "dry",
            "notes": "Text only observation without photos",
            "photos": []
        }

        response = self.client.post(
            '/api/bitacora/entries',
            json=payload,
            headers={
                "Content-Type": "application/json",
                "X-Test-User-Id": self.test_clerk_id
            }
        )

        self.assertEqual(response.status_code, 201)
        data = response.get_json()
        self.assertTrue(data.get("success"))
        self.assertEqual(ProgressEntry.query.count(), initial_entry_count + 1)


if __name__ == '__main__':
    unittest.main()
