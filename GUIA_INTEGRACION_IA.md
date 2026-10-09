# Guía de Integración IA y Despliegue a Producción (Skinova)

Esta guía detalla los pasos pendientes para reemplazar el "Mock" de Perfil y Salud con un análisis de Inteligencia Artificial real, además de los comandos exactos para reflejar los cambios de base de datos en tu servidor de producción.

---

## 1. Integración Futura del Backend (IA Real)

Actualmente, el endpoint `POST /api/perfil-salud/evaluations` espera un objeto JSON ya estructurado. En el futuro, este flujo debe cambiar para ser impulsado por una fotografía real.

### Paso A: Modificar el Endpoint POST
El endpoint deberá dejar de recibir el JSON final y, en su lugar, recibir un archivo de imagen (FormData) subido desde el frontend.

### Paso B: Recopilar Contexto del Usuario
Antes de enviar la imagen a la IA, debes leer la información relevante de `UserProfile` y `UserRestriction`.
```python
# Ejemplo de recopilación de contexto
profile = UserProfile.query.filter_by(user_id=user.id).first()
restrictions = UserRestriction.query.filter_by(user_id=user.id).all()

contexto_usuario = {
    "skin_type": profile.skin_type,
    "sensitivity_level": profile.sensitivity_level,
    "goals": profile.goals,
    "allergies": [r.name for r in restrictions if r.type == 'allergy']
}
```

### Paso C: Llamar al Servicio de IA (Infraestructura Reutilizable)
Aquí integrarás la capa que hará el otro integrante del equipo. No acoples Perfil y Salud al módulo de "Consulta IA".
```python
# Lógica conceptual en app/modules/perfil_salud/services/evaluation_service.py
from app.shared.ai.service import analyze_skin_image

resultado_ia = analyze_skin_image(
    image=request.files['photo'],
    context=contexto_usuario,
    instructions="Evalúa las 6 métricas estrictamente (oiliness, dryness, sensitivity, redness, texture, imperfections) en escala de 0 a 100...",
    schema=EXPECTED_JSON_SCHEMA
)
```

### Paso D: Guardar el Resultado y Descartar Imagen
Guarda la respuesta estricta en el modelo `SkinEvaluation` que ya creamos y asegúrate de **no guardar la imagen**.
```python
nueva_evaluacion = SkinEvaluation(
    user_id=user.id,
    metrics_json=resultado_ia['metrics'],
    summary=resultado_ia['summary'],
    warnings_json=resultado_ia['warnings'],
    requires_professional_attention=resultado_ia['requires_professional_attention'],
    ai_provider="gemini", # O el que se utilice
    ai_model="gemini-1.5-flash"
)
db.session.add(nueva_evaluacion)
db.session.commit()
```

---

## 2. Migraciones en Producción

Dado que ya generaste el archivo de migración (`42e8901e625d_add_skinevaluation_model.py`) localmente, este archivo debe subirse a tu repositorio (Git) junto con el resto del código.

Cuando hagas `git push` de tu entorno local y entres a la terminal de tu servidor de producción, sigue estos pasos:

### 1. Actualiza el Código en el Servidor
```bash
cd /ruta/a/tu/backend/skinova
git pull origin main
```

### 2. Activa el Entorno Virtual
Asegúrate de que estás dentro del entorno virtual del servidor.
```bash
source venv/bin/activate
# (Si tu servidor es Windows, usa: venv\Scripts\activate)
```

### 3. Instala/Actualiza Dependencias (Opcional pero recomendado)
Si agregaste algo al `requirements.txt`.
```bash
pip install -r requirements.txt
```

### 4. Exporta la Variable de la App (Si es necesario en tu servidor)
```bash
export FLASK_APP=app.py
```

### 5. Aplica la Migración a la Base de Datos de Producción
**IMPORTANTE:** Nunca corras `flask db migrate` en producción. En producción **SOLO** se corre `upgrade`.
```bash
flask db upgrade
```
*Este comando leerá el archivo de migración que hiciste localmente y ejecutará el código SQL (`CREATE TABLE skin_evaluations...`) directamente en la base de datos de producción.*

### 6. Reinicia tu Servidor WSGI
Para que Flask tome los nuevos cambios de `routes.py` y `models.py`, debes reiniciar el proceso (Gunicorn, uWSGI, PM2, systemctl, etc.).
```bash
# Ejemplo si usas systemctl (Ubuntu/Linux)
sudo systemctl restart skinova_backend
```

¡Listo! Con esto tu servidor estará actualizado con la nueva base de datos y los nuevos endpoints, todo sin perder datos existentes.
