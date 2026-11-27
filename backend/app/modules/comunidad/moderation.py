import io
import json
import math
import os
from functools import lru_cache
from pathlib import Path
import re
import subprocess
import sys
import unicodedata

from PIL import Image, ImageOps
import boto3
import numpy as np
import onnxruntime as ort
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError


TEXT_RULES = {
    'gore': r'gore|desmembramiento (?:explicito|grafico)|decapitacion grafica|cadaveres mutilados|graphic dismemberment',
    'hentai': r'hentai',
    'hate': (
        r'(?:odio a|muerte a|hay que (?:matar|exterminar|expulsar) a) (?:todos? |todas? )?(?:los |las )?'
        r'(?:gays|homosexuales|judios|musulmanes|negros|inmigrantes|trans|indigenas)'
        r'|kill all (?:jews|muslims|immigrants|gays)'
    ),
    'violence': (
        r'te (?:voy a |vamos a )?(?:matar|violar|disparar|golpear|apu[ñn]alar)'
        r'|(?:voy|vamos) a (?:matarte|dispararte|golpearte|apu[ñn]alarte)'
        r'|te (?:matare|disparare|golpeare|apu[ñn]alare)|i (?:will|ll) (?:kill|hurt|shoot|stab) you'
    ),
    'explicit': (
        r'porn(?:o|ografia|ografico|ografica)?|sexo (?:explicito|en vivo)'
        r'|videos? sexuales|fotos? explicitas|sexual intercourse|explicit sex'
    ),
    'disrespect': (
        r'imbecil(?:es)?|pendej[oa]s?|put[oa]s?|mierda|cabr(?:on|ona|ones)|idiotas?'
        r'|ching(?:a|ar|ada)|fuck(?:ing)?|bitch(?:es)?|assholes?|hij[oa]s? de puta'
    ),
}
TEXT_PATTERNS = {
    reason: re.compile(rf'\b(?:{pattern})\b') for reason, pattern in TEXT_RULES.items()
}
CLASSIFIER = Path(__file__).resolve().parents[3] / 'moderation' / 'classify.cjs'
LOCAL_IMAGE_MODELS = (
    ('gore', 'gore', 0.25),
    ('weapons', 'weapons', 0.50),
    ('violence', 'violence', 0.65),
    ('hate_symbols', 'hate', 0.70),
)
IMAGE_SAFETY_MODEL = 'image-safety-classifier-xs'
GORE_REVIEW_THRESHOLD = 0.20
OBFUSCATED_LETTERS = str.maketrans('013457@$', 'oieastas')
MIXED_WORD = re.compile(r'(?<!\w)\w*[a-z][\w@$]*[013457@$][\w@$]*|(?<!\w)[013457@$][\w@$]*[a-z][\w@$]*')
IMAGE_THRESHOLDS = {'Porn': 0.60, 'Hentai': 0.65, 'Sexy': 0.85}
IMAGE_REASONS = {
    'Weapons': 'weapons',
    'Blood & Gore': 'gore',
    'Graphic Violence Or Gore': 'gore',
    'Graphic Violence': 'violence',
    'Corpses': 'gore',
    'Violence': 'violence',
    'Explicit': 'explicit',
    'Explicit Nudity': 'explicit',
    'Explicit Sexual Activity': 'explicit',
    'Non-Explicit Nudity of Intimate parts and Kissing': 'explicit',
    'Suggestive': 'explicit',
    'Hate Symbols': 'hate',
    'Rude Gestures': 'disrespect',
}


class ImageModerationUnavailable(RuntimeError):
    pass


def flagged_text(*values):
    for value in values:
        normalized = unicodedata.normalize('NFKD', value.casefold())
        normalized = ''.join(c for c in normalized if not unicodedata.combining(c)
                             and unicodedata.category(c) != 'Cf')
        normalized = MIXED_WORD.sub(lambda match: match[0].translate(OBFUSCATED_LETTERS), normalized)
        normalized = re.sub(r'[\W_]+', ' ', normalized)
        for reason, pattern in TEXT_PATTERNS.items():
            if pattern.search(normalized):
                return reason
    return None


def image_inputs(data):
    with Image.open(io.BytesIO(data), formats=('JPEG', 'PNG', 'WEBP')) as image:
        if image.width * image.height > 16_000_000 or getattr(image, 'is_animated', False):
            raise ValueError('Unsupported image dimensions or frame count')
        image = ImageOps.exif_transpose(image).convert('RGBA')
        background = Image.new('RGBA', image.size, 'white')
        background.alpha_composite(image)
        rgb = background.convert('RGB')
        pixels = rgb.resize((224, 224), Image.Resampling.LANCZOS).tobytes()
        rgb.thumbnail((2048, 2048), Image.Resampling.LANCZOS)
        jpeg = io.BytesIO()
        rgb.save(jpeg, 'JPEG', quality=90)
        return pixels, jpeg.getvalue()


def flagged_image(pixels):
    node = os.environ.get('FORUM_NODE_BINARY')
    command = [node] if node else [sys.executable, '-m', 'nodejs_wheel']
    result = subprocess.run(
        [*command, str(CLASSIFIER)],
        input=pixels, capture_output=True, check=True, timeout=30,
    )
    scores = {item['className']: float(item['probability']) for item in json.loads(result.stdout)}
    if any(name not in scores or not math.isfinite(scores[name]) or not 0 <= scores[name] <= 1
           for name in IMAGE_THRESHOLDS):
        raise ValueError('Incomplete NSFWJS response')
    if scores['Hentai'] >= IMAGE_THRESHOLDS['Hentai']:
        return 'hentai'
    if any(scores[name] >= IMAGE_THRESHOLDS[name] for name in ('Porn', 'Sexy')):
        return 'explicit'
    return None


@lru_cache(maxsize=len(LOCAL_IMAGE_MODELS) + 1)
def _image_model(name):
    options = ort.SessionOptions()
    options.intra_op_num_threads = 2
    options.inter_op_num_threads = 1
    return ort.InferenceSession(
        str(CLASSIFIER.parent / 'models' / f'{name}.onnx'),
        sess_options=options, providers=['CPUExecutionProvider'],
    )


def _image_scores(model, image, pixel_scale):
    tensor = model.get_inputs()[0]
    height, width = tensor.shape[2:]
    size = (width if isinstance(width, int) else 224, height if isinstance(height, int) else 224)
    rgb = image.resize(size, Image.Resampling.BILINEAR)
    pixels = np.asarray(rgb, dtype=np.float32).transpose(2, 0, 1)[None, ...]
    scores = model.run(None, {tensor.name: pixels * pixel_scale})[0].ravel()
    if scores.size == 0 or not np.all(np.isfinite(scores) & (0 <= scores) & (scores <= 1)):
        raise ValueError('Invalid local classifier probabilities')
    return scores


def _image_regions(image):
    yield image
    if max(image.size) < 320:
        return
    width, height = image.size
    tile_width, tile_height = int(width * 0.7), int(height * 0.7)
    if min(tile_width, tile_height) < 64:
        return
    for x in (0, width - tile_width):
        for y in (0, height - tile_height):
            yield image.crop((x, y, x + tile_width, y + tile_height))


def _flagged_image_safety(image):
    model = _image_model(IMAGE_SAFETY_MODEL)
    explicit = False
    for region in _image_regions(image):
        scores = _image_scores(model, region, 1.0)
        if scores.size != 3:
            raise ValueError('Incomplete image safety classifier response')
        # The model defines its outputs in NSFL, NSFW, SFW order.
        if scores[0] >= GORE_REVIEW_THRESHOLD:
            return 'gore'
        explicit |= scores[1] >= 0.70
    return 'explicit' if explicit else None


def _flagged_local_image(jpeg):
    try:
        with Image.open(io.BytesIO(jpeg)) as decoded:
            image = decoded.convert('RGB')
            safety_reason = _flagged_image_safety(image)
            if safety_reason == 'gore':
                return safety_reason
            for name, reason, threshold in LOCAL_IMAGE_MODELS:
                model = _image_model(name)
                regions = _image_regions(image) if name == 'weapons' else (image,)
                for region in regions:
                    scores = _image_scores(model, region, 1 / 255)
                    probability = scores[1] if scores.size > 1 else scores[0]
                    if probability >= threshold:
                        return reason
    except Exception as error:
        raise ImageModerationUnavailable('Local image classifier unavailable') from error
    return safety_reason


def flagged_image_context(jpeg):
    region = os.environ.get('FORUM_REKOGNITION_REGION')
    if not region:
        return _flagged_local_image(jpeg)
    try:
        client = boto3.client('rekognition', region_name=region, config=Config(
            connect_timeout=3, read_timeout=8, retries={'total_max_attempts': 1},
        ))
        response = client.detect_moderation_labels(Image={'Bytes': jpeg}, MinConfidence=65)
    except (BotoCoreError, ClientError) as error:
        raise ImageModerationUnavailable('Rekognition moderation is unavailable') from error

    reasons = {
        IMAGE_REASONS.get(label.get(field))
        for label in response['ModerationLabels']
        for field in ('Name', 'ParentName')
    }
    return next((reason for reason in ('gore', 'weapons', 'violence', 'explicit', 'hate', 'disrespect')
                 if reason in reasons), None)
