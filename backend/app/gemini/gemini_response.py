import logging
from typing import List

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

class IngredientAnalysis(BaseModel):
    ingredient_name: str
    purpose: str
    is_key_active: bool

class CompatibilityDetails(BaseModel):
    is_compatible: bool
    score: int = Field(description="Puntuación de compatibilidad de 1 a 100")
    profile_match_reason: str
    neceser_conflict_reason: str = Field(
        default="", 
        description="Razón del conflicto con productos del neceser actual, o vacío si no hay conflicto"
    )

class GeminiProductAnalysisSchema(BaseModel):
    subject: str = Field(description="Nombre o marca del producto analizado")
    summary: str = Field(description="Resumen corto del análisis para mostrar en la interfaz")
    key_ingredients: List[IngredientAnalysis]
    compatibility: CompatibilityDetails
    warnings: List[str] = Field(description="Lista de advertencias sobre alérgenos, irritaciones o incompatibilidades")
    requires_professional_attention: bool = Field(description="True si se detecta un riesgo que requiera evaluación dermatológica")
