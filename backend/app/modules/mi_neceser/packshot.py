"""Create white-background product references from selected catalog front photos."""

import hashlib
import hmac
import os
import re
import threading
from io import BytesIO
from pathlib import Path
from urllib.parse import urlencode, urlsplit

import httpx

from app.modules.mi_neceser.catalog import CATALOG_HEADERS

_MODEL_HOME = Path(__file__).resolve().parents[3] / 'assets'
_IMAGE_PATH = re.compile(
    r'/images/products/(?:\d{3}/){2,4}\d{1,5}/front(?:_[a-z]{2})?\.\d+\.(?:200|400)\.jpg'
)
_MAX_IMAGE_BYTES = 3 * 1024 * 1024
_session = None
_session_lock = threading.Lock()
_processing_slots = threading.Semaphore(2)


class PackshotUnavailable(Exception):
    pass


def _valid_source(url):
    if not isinstance(url, str) or len(url) > 500:
        return False
    try:
        parsed = urlsplit(url)
        return (
            parsed.scheme == 'https'
            and parsed.hostname in ('images.openbeautyfacts.org', 'images.openfoodfacts.org')
            and parsed.port is None
            and not parsed.username
            and not parsed.password
            and not parsed.query
            and not parsed.fragment
            and bool(_IMAGE_PATH.fullmatch(parsed.path))
        )
    except ValueError:
        return False


def _signature(url, secret):
    return hmac.new(secret.encode('utf-8'), url.encode('utf-8'), hashlib.sha256).hexdigest()


def signed_packshot_url(image_url, secret):
    if not _valid_source(image_url):
        return None
    return '/api/mi-neceser/imagen?' + urlencode({
        'src': image_url, 'sig': _signature(image_url, secret),
    })


def valid_packshot_request(image_url, signature, secret):
    return _valid_source(image_url) and isinstance(signature, str) and hmac.compare_digest(
        signature, _signature(image_url, secret)
    )


def _get_session():
    global _session
    if _session is None:
        with _session_lock:
            if _session is None:
                os.environ['U2NET_HOME'] = str(_MODEL_HOME)
                from rembg import new_session
                _session = new_session('u2netp')
    return _session


def _download_front(image_url):
    try:
        with httpx.stream('GET', image_url, headers=CATALOG_HEADERS, timeout=10) as response:
            response.raise_for_status()
            if not response.headers.get('content-type', '').lower().startswith('image/jpeg'):
                raise PackshotUnavailable('Invalid image type')
            chunks = []
            total = 0
            for chunk in response.iter_bytes():
                total += len(chunk)
                if total > _MAX_IMAGE_BYTES:
                    raise PackshotUnavailable('Image too large')
                chunks.append(chunk)
            return b''.join(chunks)
    except httpx.HTTPError as exc:
        raise PackshotUnavailable('Source image unavailable') from exc


def _render_packshot(original):
    from PIL import Image, UnidentifiedImageError
    from rembg import remove

    try:
        cutout = Image.open(BytesIO(remove(original, session=_get_session(), force_return_bytes=True))).convert('RGBA')
        mask = cutout.getchannel('A').point(lambda value: 255 if value > 30 else 0)
        bounds = mask.getbbox()
        if not bounds:
            raise PackshotUnavailable('Product could not be isolated')
        product = cutout.crop(bounds)
        product.thumbnail((356, 356), Image.Resampling.LANCZOS)
        canvas = Image.new('RGB', (400, 400), 'white')
        canvas.paste(product, ((400 - product.width) // 2, (400 - product.height) // 2), product)
        output = BytesIO()
        canvas.save(output, format='WEBP', quality=88, method=4)
        return output.getvalue()
    except (OSError, ValueError, UnidentifiedImageError) as exc:
        raise PackshotUnavailable('Image processing failed') from exc


def get_packshot(image_url, instance_path):
    if not _valid_source(image_url):
        raise PackshotUnavailable('Invalid source image')
    cache_dir = Path(instance_path) / 'catalog_packshots'
    filename = hashlib.sha256(image_url.encode('utf-8')).hexdigest() + '.webp'
    cache_file = cache_dir / filename
    if cache_file.is_file():
        return cache_file.read_bytes()
    with _processing_slots:
        if cache_file.is_file():
            return cache_file.read_bytes()
        data = _render_packshot(_download_front(image_url))
        cache_dir.mkdir(parents=True, exist_ok=True)
        temporary = cache_dir / f'{filename}.{threading.get_ident()}.tmp'
        try:
            temporary.write_bytes(data)
            os.replace(temporary, cache_file)
        finally:
            temporary.unlink(missing_ok=True)
        return data
