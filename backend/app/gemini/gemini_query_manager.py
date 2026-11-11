import os
import base64
import json
from typing import Dict, Any, Optional
from google import genai
from google.genai import types

from app.gemini.gemini_response import GeminiProductAnalysisSchema

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
