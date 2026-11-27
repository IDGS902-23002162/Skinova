"""Read public cosmetic product data from Open Beauty Facts."""

import re
import threading
import time
import unicodedata
from urllib.parse import urlsplit

import httpx

CATALOG_BASE = 'https://world.openbeautyfacts.org'
CATALOG_SOURCE = 'Open Beauty Facts'
CATALOG_SEARCH_FIELDS = 'code,product_name,product_name_es,brands,quantity,image_front_url,image_front_small_url'
CATALOG_DETAIL_FIELDS = (
    'code,product_name,product_name_es,brands,categories,quantity,'
    'ingredients_text,ingredients_text_es,image_front_url,image_front_small_url,product_type'
)
CATALOG_HEADERS = {'User-Agent': 'Skinova/1.0 (https://skinovaapp.uk)'}
CATALOG_PAGE_SIZE = 20
SEARCH_MODES = {'product', 'brand', 'ingredient', 'purpose'}
_BEARD_SEARCH_TERMS = {
    'barba': 'beard', 'cuidado de barba': 'beard', 'cuidado de la barba': 'beard',
    'aceite de barba': 'beard oil', 'aceite para barba': 'beard oil',
    'balsamo de barba': 'beard balm', 'balsamo para barba': 'beard balm',
    'champu de barba': 'beard shampoo', 'champu para barba': 'beard shampoo',
    'limpiador de barba': 'beard wash', 'limpiador para barba': 'beard wash',
    'acondicionador de barba': 'beard conditioner',
    'tonico de barba': 'beard tonic',
}
_SPANISH_SEARCH_ALIASES = {
    'ingredient': {
        'niacinamida': 'niacinamide', 'glicerina': 'glycerin',
        'acido hialuronico': 'hyaluronic-acid', 'acido salicilico': 'salicylic-acid',
        'retinol': 'retinol', 'ceramidas': 'ceramides',
    },
    'purpose': {
        'protector solar': 'sunscreens', 'proteccion solar': 'sunscreens',
        'bloqueador solar': 'sunscreens', 'fotoproteccion': 'sunscreens',
        'hidratante': 'moisturizers', 'hidratacion': 'moisturizers',
        'limpiador': 'cleansers', 'limpieza': 'cleansers',
        'limpiador facial': 'cleansers', 'limpieza facial': 'cleansers',
        'serum': 'serums', 'suero': 'serums',
        'exfoliante': 'exfoliants', 'exfoliacion': 'exfoliants',
    },
}
_CACHE_SECONDS = 600
_cache = {}
_cache_lock = threading.Lock()


class CatalogUnavailable(Exception):
    pass


def _text(value, maximum):
    return value.strip()[:maximum] if isinstance(value, str) and value.strip() else None


def _image_url(value):
    if not isinstance(value, str) or len(value) > 500:
        return None
    try:
        parsed = urlsplit(value)
    except ValueError:
        return None
    if parsed.scheme != 'https' or parsed.hostname not in ('images.openbeautyfacts.org', 'images.openfoodfacts.org'):
        return None
    return value


def normalize_product(raw):
    if not isinstance(raw, dict):
        return None
    code = str(raw.get('code') or '')
    if not re.fullmatch(r'\d{8,14}', code):
        return None
    name = _text(raw.get('product_name_es'), 255) or _text(raw.get('product_name'), 255)
    if not name:
        return None
    return {
        'code': code,
        'name': name,
        'brand': _text(raw.get('brands'), 150),
        'category': _text(raw.get('categories'), 100),
        'quantity': _text(raw.get('quantity'), 100),
        'ingredients_es': _text(raw.get('ingredients_text_es'), 10000),
        'inci': _text(raw.get('ingredients_text'), 10000) or _text(raw.get('ingredients_text_es'), 10000),
        'image_url': _image_url(raw.get('image_front_url') or raw.get('image_front_small_url')),
        'product_url': f'{CATALOG_BASE}/product/{code}',
        'source': CATALOG_SOURCE,
    }


def _get_json(path, params):
    try:
        response = httpx.get(f'{CATALOG_BASE}{path}', params=params, headers=CATALOG_HEADERS, timeout=8)
        response.raise_for_status()
        data = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise CatalogUnavailable from exc
    if not isinstance(data, dict):
        raise CatalogUnavailable
    return data


def _plain_search_term(query):
    folded = unicodedata.normalize('NFKD', query.casefold())
    return ''.join(char for char in folded if not unicodedata.combining(char))


def _search_term(query, mode):
    return _SPANISH_SEARCH_ALIASES.get(mode, {}).get(_plain_search_term(query), query)


def search_products(query, page=1, mode='product'):
    if mode not in SEARCH_MODES:
        raise ValueError('Invalid search mode')
    key = ('search', mode, query.casefold(), page)
    with _cache_lock:
        cached = _cache.get(key)
        if cached and cached[0] > time.monotonic():
            return cached[1]
    params = {
        'action': 'process',
        'json': 1,
        'page': page,
        'page_size': CATALOG_PAGE_SIZE,
        'fields': CATALOG_SEARCH_FIELDS,
    }
    beard_term = _BEARD_SEARCH_TERMS.get(_plain_search_term(query)) if mode in ('product', 'purpose') else None
    if mode == 'product' or beard_term:
        params.update(search_terms=beard_term or query, search_simple=1)
    else:
        params.update(tagtype_0={
            'brand': 'brands', 'ingredient': 'ingredients', 'purpose': 'categories',
        }[mode], tag_contains_0='contains', tag_0=_search_term(query, mode))
    data = _get_json('/cgi/search.pl', params)
    products = data.get('products') if isinstance(data.get('products'), list) else []
    items = [item for item in (normalize_product(raw) for raw in products)
             if item and item['image_url'] and item['brand']]
    count = data.get('count') if isinstance(data.get('count'), int) else 0
    result = {'items': items, 'page': page, 'has_more': count > page * CATALOG_PAGE_SIZE,
              'source': CATALOG_SOURCE}
    with _cache_lock:
        if len(_cache) >= 80:
            _cache.clear()
        _cache[key] = (time.monotonic() + _CACHE_SECONDS, result)
    return result


def get_product(code):
    key = ('product', code)
    with _cache_lock:
        cached = _cache.get(key)
        if cached and cached[0] > time.monotonic():
            return cached[1]
    data = _get_json(f'/api/v2/product/{code}.json', {'fields': CATALOG_DETAIL_FIELDS})
    product = normalize_product(data.get('product')) if data.get('status') == 1 else None
    if product:
        with _cache_lock:
            if len(_cache) >= 80:
                _cache.clear()
            _cache[key] = (time.monotonic() + _CACHE_SECONDS, product)
    return product
