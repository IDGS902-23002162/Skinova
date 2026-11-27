# Moderación de imágenes del foro

Desde `backend`, instala las dependencias de Python con `python -m pip install -r requirements.txt` en el entorno virtual del proyecto. Instala NSFWJS con `python -c "from nodejs_wheel import npm; raise SystemExit(npm(['ci', '--prefix', 'moderation']))"`. Flask usa el Node incluido en ese entorno. Puedes elegir otro ejecutable con `FORUM_NODE_BINARY`.

Ejecuta `python moderation/download_models.py` para instalar los modelos locales de violencia, gore, armas y símbolos de odio. La descarga instala pesos públicos con una revisión fija y verifica sus hashes. Las imágenes se analizan en el backend sin usar servicios externos en la configuración predeterminada.

Para aplicar el esquema, ejecuta `python -m flask --app app.py db upgrade` desde `backend`, usando el entorno de Python del proyecto. El arranque local mediante `python app.py` también aplica las migraciones.

NSFWJS utiliza MobileNetV2 como primera capa para contenido sexual e ilustraciones explícitas. Si la imagen supera esa capa, se ejecutan los clasificadores locales de [Stealthbox](https://huggingface.co/Stealthbox/stealthbox-onnx-models) y [Image Safety Classifier XS](https://huggingface.co/OwenElliott/image-safety-classifier-xs). El segundo modelo busca indicios de violencia gráfica en la imagen completa y en regiones superpuestas de imágenes grandes. Una señal de gore en cualquiera de los dos modelos basta para retener el envío. Puedes usar Amazon Rekognition como segunda capa configurando `FORUM_REKOGNITION_REGION` y el permiso `rekognition:DetectModerationLabels`. En ese modo se envía a AWS una copia JPEG sin metadatos. Si el análisis falla, el envío queda en revisión manual. Se aceptan imágenes estáticas JPEG, PNG y WebP de hasta 5 MB y 16 megapíxeles.

Si el servidor detecta contenido al crear una publicación o respuesta, devuelve 202, guarda el envío en privado y crea una revisión en la cola de moderación. El autor recibe un aviso con el motivo y el campo detectado. Solo se publica después de que un moderador lo aprueba. Las ediciones de contenido ya publicado se validan antes de guardar los cambios y devuelven 422 si se detecta una infracción.

La detección de texto utiliza reglas en español e inglés que admiten acentos, caracteres invisibles y algunas sustituciones de letras por números. Tanto las reglas como los clasificadores pueden tener falsos positivos o pasar contenido por alto. Los reportes permiten indicar si el contenido denunciado aparece en el texto o en la imagen de una publicación o comentario.

El filtro de armas revisa la imagen completa y regiones superpuestas de imágenes grandes. Un arma detectada se envía a moderación con el motivo **Presencia de armas**, incluso si la imagen no muestra un acto violento.
