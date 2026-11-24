import os
import re
import base64
import logging
import threading
from dataclasses import dataclass
from typing import Optional, Dict, Any, Tuple, List

import cv2
import numpy as np
import requests

from app.modules.face_id.config import (
    FACE_SIMILARITY_THRESHOLD,
    INSIGHTFACE_MODEL_NAME,
    INSIGHTFACE_ROOT,
    MAX_IMAGE_SIZE_BYTES,
    CLERK_API_BASE_URL,
    CLERK_SECRET_KEY,
    get_similarity_threshold,
)

logger = logging.getLogger(__name__)


# =============================================================================
# Verification Result Data Class
# =============================================================================
@dataclass
class VerificationResult:
    """
    Structured outcome of a facial verification request.
    Never exposes internal face embeddings or biometric vectors.
    """
    success: bool
    verified: bool
    similarity: float = 0.0          # Cosine similarity (-1.0 to 1.0)
    similarity_score: float = 0.0    # 0.0 to 100.0 scale
    threshold: float = 50.0          # Active threshold (0.0 to 100.0)
    error_code: Optional[str] = None # e.g. MISMATCH, NO_FACE_IN_SUBMITTED, etc.
    message: str = ""

    def to_dict(self) -> Dict[str, Any]:
        """Returns a safe, serializable dictionary without sensitive biometric data."""
        return {
            "success": self.success,
            "verified": self.verified,
            "similarity": round(self.similarity, 4),
            "similarity_score": round(self.similarity_score, 2),
            "threshold": round(self.threshold, 2),
            "error_code": self.error_code,
            "message": self.message
        }


# =============================================================================
# Face ID Service (InsightFace buffalo_l)
# =============================================================================
class FaceIdService:
    """
    Dedicated facial recognition and verification service for Skinova.
    Reuses an initialized InsightFace buffalo_l model and validates that
    Bitácora submissions match the authenticated Clerk user's profile image.
    """
    _model_instance = None
    _model_lock = threading.Lock()

    @classmethod
    def get_model(cls):
        """
        Loads and initializes the buffalo_l InsightFace model once (thread-safe singleton).
        Reuses the initialized model across subsequent requests.
        """
        if cls._model_instance is None:
            with cls._model_lock:
                if cls._model_instance is None:
                    try:
                        from insightface.app import FaceAnalysis

                        logger.info(
                            f"Initializing InsightFace model '{INSIGHTFACE_MODEL_NAME}' "
                            f"from root '{INSIGHTFACE_ROOT}'..."
                        )
                        app = FaceAnalysis(
                            name=INSIGHTFACE_MODEL_NAME,
                            root=INSIGHTFACE_ROOT
                        )
                        # ctx_id=-1 uses CPU; det_size=(640, 640) is standard detection resolution
                        app.prepare(ctx_id=-1, det_size=(640, 640))
                        cls._model_instance = app
                        logger.info("InsightFace model initialized successfully.")
                    except Exception as e:
                        logger.error(f"Failed to initialize InsightFace model: {e}", exc_info=True)
                        raise RuntimeError(f"Error de inicialización de InsightFace: {e}") from e

        return cls._model_instance

    @classmethod
    def set_model(cls, model):
        """Allows injecting or resetting a model (primarily for testing)."""
        with cls._model_lock:
            cls._model_instance = model

    # -------------------------------------------------------------------------
    # Image decoding and format validation
    # -------------------------------------------------------------------------
    @staticmethod
    def decode_base64_image(image_input: str) -> np.ndarray:
        """
        Validates, decodes, and parses a Base64 encoded photograph into a BGR numpy array.
        Handles data URIs (e.g., data:image/jpeg;base64,...) and raw Base64 strings.
        Rejects corrupted or excessively large images.
        """
        if not image_input or not isinstance(image_input, str):
            raise ValueError("La imagen está vacía o el formato no es válido.")

        clean_str = image_input.strip()

        # Handle data URL prefix if present: data:image/...;base64,DATA
        if "," in clean_str and (clean_str.startswith("data:") or "base64," in clean_str):
            clean_str = clean_str.split("base64,", 1)[-1].strip()

        # Check payload length before decoding to prevent memory exhaustion
        # (3 base64 characters ~ 2 bytes)
        estimated_size = (len(clean_str) * 3) // 4
        if estimated_size > MAX_IMAGE_SIZE_BYTES:
            raise ValueError(f"La imagen supera el tamaño máximo permitido ({MAX_IMAGE_SIZE_BYTES} bytes).")

        try:
            raw_bytes = base64.b64decode(clean_str, validate=True)
        except Exception as e:
            raise ValueError("La imagen en Base64 está mal formada.") from e

        if len(raw_bytes) > MAX_IMAGE_SIZE_BYTES:
            raise ValueError(f"La imagen decodificada supera el límite de tamaño ({MAX_IMAGE_SIZE_BYTES} bytes).")

        # Decode into OpenCV BGR numpy array
        np_arr = np.frombuffer(raw_bytes, np.uint8)
        img_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if img_bgr is None or img_bgr.size == 0 or len(img_bgr.shape) != 3:
            raise ValueError("No se pudo decodificar la imagen. El formato no es compatible o el archivo está dañado.")

        return img_bgr

    # -------------------------------------------------------------------------
    # Clerk profile image retrieval
    # -------------------------------------------------------------------------
    @staticmethod
    def get_clerk_profile_picture_url(clerk_user_id: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Queries Clerk's authenticated Backend API using the user's Clerk ID
        to obtain their profile image URL.
        Returns: (image_url, error_reason)
        """
        secret_key = os.getenv("CLERK_SECRET_KEY") or CLERK_SECRET_KEY
        if not secret_key:
            logger.error("CLERK_SECRET_KEY is not configured on the backend.")
            return None, "CLERK_SECRET_KEY no está configurada en el backend"

        if not clerk_user_id or not isinstance(clerk_user_id, str):
            return None, "ID de usuario de Clerk no válido o ausente"

        url = f"{CLERK_API_BASE_URL}/users/{clerk_user_id.strip()}"
        headers = {
            "Authorization": f"Bearer {secret_key}",
            "Content-Type": "application/json"
        }

        try:
            response = requests.get(url, headers=headers, timeout=10)
            if response.status_code == 404:
                logger.warning(f"Clerk user {clerk_user_id} was not found via Clerk API.")
                return None, "Usuario no encontrado en Clerk"
            elif response.status_code != 200:
                logger.error(f"Clerk API returned status {response.status_code}: {response.text}")
                return None, f"Error de la API de Clerk ({response.status_code})"

            user_data = response.json() or {}

            # In Clerk, has_image indicates if a custom avatar was uploaded
            has_image = user_data.get("has_image")
            image_url = user_data.get("image_url") or user_data.get("profile_image_url")

            # If user explicitly has no image or URL is missing
            if has_image is False and not image_url:
                return None, "No hay foto de perfil disponible en Clerk"

            if not image_url or not str(image_url).strip():
                return None, "No hay foto de perfil disponible en Clerk"

            return str(image_url).strip(), None

        except requests.RequestException as e:
            logger.error(f"Network error querying Clerk API for user {clerk_user_id}: {e}")
            return None, f"Error de red al contactar la API de Clerk: {str(e)}"
        except Exception as e:
            logger.error(f"Unexpected error retrieving Clerk profile image for user {clerk_user_id}: {e}")
            return None, str(e)

    @staticmethod
    def download_reference_image(image_url: str, timeout: int = 10) -> np.ndarray:
        """
        Securely downloads the reference profile picture from Clerk's CDN/URL
        and converts it into an OpenCV BGR numpy array.
        """
        if not image_url or not (image_url.startswith("http://") or image_url.startswith("https://")):
            raise ValueError("La URL de la imagen de referencia no es válida.")

        try:
            response = requests.get(image_url, timeout=timeout, headers={"User-Agent": "Skinova-FaceVerification/1.0"})
            if response.status_code != 200:
                raise ValueError(f"No se pudo descargar la imagen de referencia (HTTP {response.status_code}).")

            content = response.content
            if len(content) > MAX_IMAGE_SIZE_BYTES:
                raise ValueError(f"La imagen de referencia supera el límite de tamaño ({MAX_IMAGE_SIZE_BYTES} bytes).")

            np_arr = np.frombuffer(content, np.uint8)
            img_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

            if img_bgr is None or img_bgr.size == 0:
                raise ValueError("No se pudo decodificar la imagen de referencia descargada.")

            return img_bgr
        except requests.RequestException as e:
            raise RuntimeError(f"Error de red al descargar la imagen de referencia: {e}") from e

    # -------------------------------------------------------------------------
    # Core Facial Recognition & Comparison Logic
    # -------------------------------------------------------------------------
    @classmethod
    def verify_images(
        cls,
        reference_bgr: np.ndarray,
        submitted_bgr: np.ndarray,
        threshold: Optional[float] = None
    ) -> VerificationResult:
        """
        Compares a reference image against a submitted photograph using InsightFace.
        Calculates cosine similarity of face embeddings and evaluates against the threshold.
        """
        active_threshold = threshold if threshold is not None else get_similarity_threshold()

        try:
            app = cls.get_model()
        except Exception as e:
            logger.error(f"Model initialization error: {e}", exc_info=True)
            return VerificationResult(
                success=False,
                verified=False,
                threshold=active_threshold,
                error_code="INITIALIZATION_ERROR",
                message="El servicio de reconocimiento facial no está disponible en este momento."
            )

        try:
            # 1. Detect faces in reference image
            ref_faces = app.get(reference_bgr)
            if not ref_faces or len(ref_faces) == 0:
                return VerificationResult(
                    success=False,
                    verified=False,
                    threshold=active_threshold,
                    error_code="NO_FACE_IN_REFERENCE",
                    message="No se detectó ningún rostro en tu foto de perfil de Clerk. Por favor, actualiza tu foto de perfil."
                )

            if len(ref_faces) > 1:
                return VerificationResult(
                    success=False,
                    verified=False,
                    threshold=active_threshold,
                    error_code="MULTIPLE_FACES_DETECTED",
                    message="Se detectaron varios rostros en tu foto de perfil de Clerk. Por favor, usa una foto en la que solo aparezca tu rostro."
                )

            # 2. Detect faces in submitted image
            sub_faces = app.get(submitted_bgr)
            if not sub_faces or len(sub_faces) == 0:
                return VerificationResult(
                    success=False,
                    verified=False,
                    threshold=active_threshold,
                    error_code="NO_FACE_IN_SUBMITTED",
                    message="No se detectó ningún rostro valido en la fotografía enviada. Asegúrate de que tu rostro sea claramente visible."
                )

            if len(sub_faces) > 1:
                return VerificationResult(
                    success=False,
                    verified=False,
                    threshold=active_threshold,
                    error_code="MULTIPLE_FACES_DETECTED",
                    message="Se detectaron varios rostros en la fotografía. Asegúrate de que solo aparezca tu rostro."
                )

            # 3. Extract 512-d facial embeddings
            emb_ref = ref_faces[0].embedding
            emb_sub = sub_faces[0].embedding

            if emb_ref is None or emb_sub is None:
                return VerificationResult(
                    success=False,
                    verified=False,
                    threshold=active_threshold,
                    error_code="INFERENCE_ERROR",
                    message="No se pudieron calcular los vectores faciales para la comparación."
                )

            # 4. Compute cosine similarity
            norm_ref = np.linalg.norm(emb_ref)
            norm_sub = np.linalg.norm(emb_sub)

            if norm_ref == 0.0 or norm_sub == 0.0:
                sim = 0.0
            else:
                sim = float(np.dot(emb_ref, emb_sub) / (norm_ref * norm_sub))

            # Scale to 0-100 percentage scale
            sim_score = max(0.0, sim * 100.0)

            # 5. Threshold comparison
            is_match = sim_score >= active_threshold

            if is_match:
                return VerificationResult(
                    success=True,
                    verified=True,
                    similarity=sim,
                    similarity_score=sim_score,
                    threshold=active_threshold,
                    error_code=None,
                    message="Rostro verificado correctamente."
                )
            else:
                logger.info(
                    f"Face mismatch: similarity_score={sim_score:.2f} < threshold={active_threshold:.2f}"
                )
                return VerificationResult(
                    success=True,
                    verified=False,
                    similarity=sim,
                    similarity_score=sim_score,
                    threshold=active_threshold,
                    error_code="MISMATCH",
                    message="No hemos detectado una foto tuya."
                )

        except Exception as e:
            logger.error(f"Inference error during face comparison: {e}", exc_info=True)
            return VerificationResult(
                success=False,
                verified=False,
                threshold=active_threshold,
                error_code="INFERENCE_ERROR",
                message="Error al procesar la verificación facial."
            )

    # -------------------------------------------------------------------------
    # Full High-Level Verification Flow for Bitácora / API
    # -------------------------------------------------------------------------
    @classmethod
    def verify_user_photo(
        cls,
        clerk_user_id: str,
        submitted_image: str,
        threshold: Optional[float] = None
    ) -> VerificationResult:
        """
        Orchestrates full verification:
        1. Retrieves user's reference profile picture from Clerk.
        2. Decodes both images into BGR numpy representations.
        3. Detects faces, extracts embeddings, and compares similarity.
        4. Returns a structured VerificationResult.
        """
        active_threshold = threshold if threshold is not None else get_similarity_threshold()

        if not clerk_user_id or not str(clerk_user_id).strip():
            return VerificationResult(
                success=False,
                verified=False,
                threshold=active_threshold,
                error_code="UNAUTHORIZED",
                message="Se requiere el ID de usuario autenticado de Clerk."
            )

        if not submitted_image:
            return VerificationResult(
                success=False,
                verified=False,
                threshold=active_threshold,
                error_code="INVALID_IMAGE",
                message="No se envió ninguna fotografía para la verificación."
            )

        # 1. Retrieve Clerk profile picture URL
        image_url, clerk_error = cls.get_clerk_profile_picture_url(clerk_user_id)
        if not image_url:
            logger.warning(f"Could not retrieve profile picture for Clerk user {clerk_user_id}: {clerk_error}")
            return VerificationResult(
                success=False,
                verified=False,
                threshold=active_threshold,
                error_code="NO_PROFILE_PICTURE",
                message="No hay foto de perfil disponible en tu cuenta de Clerk. Por favor, configura una foto de perfil primero."
            )

        # 2. Download reference image
        try:
            ref_bgr = cls.download_reference_image(image_url)
        except Exception as e:
            logger.error(f"Failed to download Clerk reference image for {clerk_user_id}: {e}")
            return VerificationResult(
                success=False,
                verified=False,
                threshold=active_threshold,
                error_code="REFERENCE_IMAGE_DOWNLOAD_FAILED",
                message="No se pudo descargar la imagen de perfil de referencia desde Clerk."
            )

        # 3. Decode submitted image
        try:
            sub_bgr = cls.decode_base64_image(submitted_image)
        except ValueError as e:
            logger.warning(f"Failed to decode submitted photograph: {e}")
            return VerificationResult(
                success=False,
                verified=False,
                threshold=active_threshold,
                error_code="INVALID_IMAGE",
                message=str(e)
            )

        # 4. Compare faces
        return cls.verify_images(
            reference_bgr=ref_bgr,
            submitted_bgr=sub_bgr,
            threshold=active_threshold
        )