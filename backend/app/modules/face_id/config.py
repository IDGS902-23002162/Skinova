import os
from typing import Optional

# =============================================================================
# Face ID & InsightFace Configuration
# =============================================================================

# Similarity Threshold Scale Documentation:
# ----------------------------------------
# InsightFace (buffalo_l) models extract normalized 512-dimensional facial embeddings.
# Cosine similarity between two normalized embeddings u and v is:
#     similarity = np.dot(u, v) / (||u|| * ||v||)  in [-1.0, 1.0]
#
# In Skinova, we express the similarity score on a 0.0 - 100.0 percentage scale:
#     similarity_score = float(similarity) * 100.0
#
# A threshold of 50.0 corresponds to a cosine similarity of 0.50.
# - High confidence match: score >= 65.0 (cosine sim >= 0.65)
# - Balanced verification threshold: score >= 50.0 (cosine sim >= 0.50)
#   (Lowered from ~100 to ~50 to accommodate variations in lighting, pose, and camera)
# - Different persons: score is typically < 35.0 (cosine sim < 0.35)
#
# Note: If the environment variable FACE_SIMILARITY_THRESHOLD is set to a decimal <= 1.0
# (such as 0.50), it is automatically scaled to the 0-100 scale (50.0).

def get_similarity_threshold() -> float:
    """Obtains the face similarity threshold configured in environment or default 50.0."""
    raw = os.getenv("FACE_SIMILARITY_THRESHOLD", "50.0").strip()
    try:
        val = float(raw)
        if 0.0 < val <= 1.0:
            return val * 100.0
        return val
    except (ValueError, TypeError):
        return 50.0

FACE_SIMILARITY_THRESHOLD: float = get_similarity_threshold()

# InsightFace Model Configuration
INSIGHTFACE_MODEL_NAME: str = os.getenv("INSIGHTFACE_MODEL_NAME", "buffalo_l")

def get_insightface_root() -> str:
    """Returns the directory where InsightFace models are stored."""
    env_root = os.getenv("INSIGHTFACE_ROOT")
    if env_root and os.path.exists(env_root):
        return env_root

    # Default to workspace backend/.insightface directory if present
    workspace_insightface = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "..", ".insightface")
    )
    if os.path.exists(workspace_insightface):
        return workspace_insightface

    return env_root or os.path.expanduser("~/.insightface")

INSIGHTFACE_ROOT: str = get_insightface_root()

# Max allowed image size for uploads (default 10 MB)
MAX_IMAGE_SIZE_BYTES: int = int(os.getenv("MAX_IMAGE_SIZE_BYTES", str(10 * 1024 * 1024)))

# Clerk API Configuration
CLERK_API_BASE_URL: str = os.getenv("CLERK_API_BASE_URL", "https://api.clerk.com/v1").rstrip("/")
CLERK_SECRET_KEY: Optional[str] = os.getenv("CLERK_SECRET_KEY")
