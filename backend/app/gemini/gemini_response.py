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

class SkinMetricDetail(BaseModel):
    score: int = Field(description="Puntuación numérica de 0 a 100")
    level: str = Field(description="Nivel clasificado: 'low', 'moderate' o 'high'")
    explanation: str = Field(description="Explicación concisa y fundamentada del aspecto observado")

class SkinMetricsMap(BaseModel):
    oiliness: SkinMetricDetail = Field(description="Nivel de grasosidad o sebo")
    dryness: SkinMetricDetail = Field(description="Nivel de resequedad o deshidratación")
    sensitivity: SkinMetricDetail = Field(description="Nivel de sensibilidad o reactividad cutánea")
    redness: SkinMetricDetail = Field(description="Nivel de rojeces o eritema")
    texture: SkinMetricDetail = Field(description="Nivel de irregularidad de textura o poros dilatados")
    imperfections: SkinMetricDetail = Field(description="Nivel de imperfecciones visibles, comedones o brotes")

class GeminiSkinAnalysisSchema(BaseModel):
    metrics: SkinMetricsMap
    summary: str = Field(description="Observación general y resumen integral del estado actual de la piel (2 a 3 oraciones)")
    warnings: List[str] = Field(description="Lista de advertencias o precauciones sobre ingredientes, exfoliación o hábitos")
    requires_professional_attention: bool = Field(description="True si se detectan afecciones dermatológicas que ameritan consulta médica presencial")
    suggested_skin_type: str = Field(description="Tipo de piel inferido: 'normal', 'dry', 'oily' o 'combination'")
    suggested_sensitivity_level: str = Field(description="Nivel de sensibilidad inferido: 'low', 'medium' o 'high'")
    suggested_goals: List[str] = Field(description="Lista de objetivos recomendados de entre: 'hydration', 'oil_control', 'acne', 'spots', 'texture', 'pores', 'redness', 'sensitivity', 'maintenance'")
