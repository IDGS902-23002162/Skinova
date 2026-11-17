import os
import base64
import json
from typing import Dict, Any, Optional
from google import genai
from google.genai import types

from app.gemini.gemini_response import GeminiProductAnalysisSchema, GeminiSkinAnalysisSchema

SYSTEM_INSTRUCTION = """
Eres el motor de IA de la aplicación "Skinova", experto en dermatología y cosmetología.
Tu objetivo es analizar productos de skincare y evaluar su compatibilidad con el perfil del usuario y los productos de su neceser.

Instrucciones:
1. Si se proporciona una imagen, analiza visualmente el producto para obtener su nombre, busca el producto.
2. Evalúa los ingredientes según el tipo de piel, metas y restricciones (alergias/sensibilidades) del usuario.
3. Determina posibles incompatibilidades con el neceser actual.
4. Adapta el tono al parámetro 'assistant_tone'.
5. Si detectas contraindicaciones graves o reacciones adversas latentes, emite advertencias y marca 'requires_professional_attention' como true.
"""

SKIN_ANALYSIS_SYSTEM_INSTRUCTION = """
Eres el motor de IA dermatológico avanzado de "Skinova", experto en análisis de piel facial, cosmetología y dermatología estética.
Tu objetivo es analizar la condición cutánea del usuario a través de una imagen (selfie o foto de su rostro) y/o la descripción de sensaciones, molestias, textura y hábitos que el usuario expone.

Instrucciones clínicas y de análisis:
1. Evalúa las 6 métricas fundamentales con puntuaciones del 0 al 100, asignando el nivel ('low', 'moderate' o 'high') y una explicación concisa y empática (1 a 2 oraciones):
   - oiliness: Presencia de sebo, brillo visible en zona T o rostro completo.
   - dryness: Deshidratación, tirantez, falta de lípidos/humectación o descamación.
   - sensitivity: Reactividad cutánea, ardor o susceptibilidad a irritaciones ante productos/clima.
   - redness: Enrojecimiento difuso, cuperosis, rojeces en mejillas o nariz.
   - texture: Relieve irregular, poros dilatados, microquistes o aspereza al tacto.
   - imperfections: Comedones, puntos negros, brotes activos o manchas posinflamatorias.
2. Elabora un 'summary' con una pequeña observación integral y constructiva del estado de la piel (2 a 3 oraciones).
3. Agrega advertencias ('warnings') si detectas factores de riesgo (ej. evitar exfoliantes físicos agresivos, no usar jabón con sulfatos fuertes, proteger barrera cutánea).
4. Si hay signos de una afección seria (rosácea severa activa, dermatitis aguda, acné quístico severo o lesiones sospechosas atípicas), pon 'requires_professional_attention' en true.
5. Infiere para el perfil del usuario:
   - 'suggested_skin_type': uno de ['normal', 'dry', 'oily', 'combination']
   - 'suggested_sensitivity_level': uno de ['low', 'medium', 'high']
   - 'suggested_goals': lista de objetivos recomendados elegidos de entre: ['hydration', 'oil_control', 'acne', 'spots', 'texture', 'pores', 'redness', 'sensitivity', 'maintenance']
"""

def analyze_product_with_gemini(
    payload: Dict[str, Any],
    image_base64: Optional[str] = None,
    image_mime_type: str = "image/jpeg"
) -> str:
    """Envía la consulta y la imagen opcional al modelo de Gemini."""
    api_key = os.environ.get("GEMINI_API_KEY")
    client = genai.Client(api_key=api_key) if api_key else genai.Client()
    contents = []

    if image_base64:
        if "," in image_base64:
            image_base64 = image_base64.split(",")[1]
            
        image_bytes = base64.b64decode(image_base64)
        contents.append(types.Part.from_bytes(data=image_bytes, mime_type=image_mime_type))

    prompt_text = (
        f"Analiza el siguiente producto para el usuario:\n"
        f"```json\n{json.dumps(payload, ensure_ascii=False, indent=2)}\n```"
    )
    contents.append(prompt_text)

    model_name = os.environ.get("GEMINI_MODEL", "gemini-3.8-flash")

    response = client.models.generate_content(
        model=model_name,
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            response_mime_type="application/json",
            response_schema=GeminiProductAnalysisSchema,
            temperature=0.2
        )
    )

    return response.text


def analyze_skin_with_gemini(
    user_context: Dict[str, Any],
    user_description: Optional[str] = None,
    image_base64: Optional[str] = None,
    image_mime_type: str = "image/jpeg"
) -> str:
    """Envía la imagen o descripción dermatológica a Gemini para generar el análisis de piel."""
    api_key = os.environ.get("GEMINI_API_KEY")
    client = genai.Client(api_key=api_key) if api_key else genai.Client()
    contents = []

    if image_base64:
        if "," in image_base64:
            image_base64 = image_base64.split(",")[1]
        image_bytes = base64.b64decode(image_base64)
        contents.append(types.Part.from_bytes(data=image_bytes, mime_type=image_mime_type))

    prompt_sections = ["Por favor, realiza un análisis integral del estado de la piel del usuario."]
    if user_description and user_description.strip():
        prompt_sections.append(f"Sensaciones, síntomas y descripción proporcionada por el usuario:\n{user_description.strip()}")
    if user_context:
        prompt_sections.append(f"Contexto y perfil previo del usuario:\n```json\n{json.dumps(user_context, ensure_ascii=False, indent=2)}\n```")

    contents.append("\n\n".join(prompt_sections))

    env_model = os.environ.get("GEMINI_MODEL", "gemini-3.5-flash")
    # Probar candidatos en caso de alta demanda o 503 temporal
    model_candidates = [env_model, "gemini-3.5-flash", "gemini-3.8-flash", "gemini-3.1-flash-lite"]
    unique_candidates = []
    for m in model_candidates:
        if m and m not in unique_candidates:
            unique_candidates.append(m)

    last_error = None
    for model_name in unique_candidates:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=SKIN_ANALYSIS_SYSTEM_INSTRUCTION,
                    response_mime_type="application/json",
                    response_schema=GeminiSkinAnalysisSchema,
                    temperature=0.2
                )
            )
            return response.text
        except Exception as e:
            last_error = e
            continue

    if last_error:
        raise last_error
    raise RuntimeError("No fue posible generar el análisis con ningún modelo disponible.")

