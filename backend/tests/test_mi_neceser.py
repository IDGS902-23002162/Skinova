"""Shared catalog and saved product checks with an isolated database."""

import tempfile
import unittest
import json
from io import BytesIO
from unittest.mock import MagicMock, patch

import httpx
from PIL import Image

from app import create_app
from app.extensions import db
from app.modules.mi_neceser.catalog import normalize_product, search_products
from app.modules.mi_neceser.packshot import get_packshot, signed_packshot_url
from app.modules.mi_neceser.models import CatalogProduct, UserProduct
from app.modules.users.models import User
from config import DevelopmentConfig


CATALOG_ITEM = {
    'code': '3337875598996', 'name': 'CeraVe Crema Hidratante', 'brand': 'CeraVe',
    'category': 'Crema hidratante', 'quantity': '177 ml',
    'inci': 'Aqua, Glycerin',
    'image_url': 'https://images.openbeautyfacts.org/images/products/333/787/559/8996/front_en.28.400.jpg',
    'product_url': 'https://world.openbeautyfacts.org/product/3337875598996',
    'source': 'Open Beauty Facts',
}


class MiNeceserTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        with patch.object(DevelopmentConfig, 'SQLALCHEMY_DATABASE_URI', 'sqlite:///:memory:'):
            self.app = create_app()
        self.app.config['TESTING'] = True
        with self.app.app_context():
            db.create_all()
            db.session.add_all([User(clerk_user_id='member-1'), User(clerk_user_id='member-2')])
            db.session.commit()
        self.auth = MagicMock(is_signed_in=True, payload={'sub': 'member-1'})
        self.clerk = patch('app.auth.Clerk')
        self.clerk.start().return_value.authenticate_request.return_value = self.auth
        self.env = patch.dict('os.environ', {'CLERK_SECRET_KEY': 'test-only'})
        self.env.start()
        self.client = self.app.test_client()

    def tearDown(self):
        with self.app.app_context():
            db.drop_all()
        self.clerk.stop()
        self.env.stop()
        self.temp.cleanup()

    def test_normalize_catalog_product_keeps_real_source_fields(self):
        item = normalize_product({
            'code': '3337875598996', 'product_name': 'Moisturizing cream',
            'product_name_es': 'Crema hidratante', 'brands': 'CeraVe',
            'ingredients_text': 'Water', 'ingredients_text_es': 'Agua', 'quantity': '177 ml',
            'image_front_url': CATALOG_ITEM['image_url'],
        })
        self.assertEqual(item['name'], 'Crema hidratante')
        self.assertEqual(item['image_url'], CATALOG_ITEM['image_url'])
        self.assertEqual(item['inci'], 'Water')
        self.assertEqual(item['ingredients_es'], 'Agua')
        self.assertIsNone(normalize_product({'code': 'invalid', 'product_name': 'Fake'}))
        unsafe = normalize_product({'code': '3337875598996', 'product_name': 'Safe',
                                    'image_front_url': 'https://example.com/photo.jpg'})
        self.assertIsNone(unsafe['image_url'])

    def test_packshot_is_processed_once_then_read_from_cache(self):
        image_url = CATALOG_ITEM['image_url']
        with tempfile.TemporaryDirectory() as directory, \
             patch('app.modules.mi_neceser.packshot._download_front', return_value=b'jpeg') as download, \
             patch('app.modules.mi_neceser.packshot._render_packshot', return_value=b'webp') as render:
            self.assertEqual(get_packshot(image_url, directory), b'webp')
            self.assertEqual(get_packshot(image_url, directory), b'webp')
            download.assert_called_once_with(image_url)
            render.assert_called_once_with(b'jpeg')

    def test_search_results_require_a_photo_of_the_product(self):
        with patch('app.modules.mi_neceser.catalog._get_json', return_value={
            'count': 2,
            'products': [
                {'code': '3337875598996', 'product_name': 'With photo', 'brands': 'CeraVe',
                 'image_front_url': CATALOG_ITEM['image_url']},
                {'code': '3337875597395', 'product_name': 'Without photo'},
            ],
        }):
            result = search_products('photo-filter-test')
        self.assertEqual([item['name'] for item in result['items']], ['With photo'])

    def test_search_modes_use_catalog_fields_and_spanish_aliases(self):
        cases = [
            ('product', 'crema facial', 'search_terms', 'crema facial'),
            ('product', 'barba', 'search_terms', 'beard'),
            ('brand', 'CeraVe', 'tagtype_0', 'brands'),
            ('ingredient', 'niacinamida', 'tag_0', 'niacinamide'),
            ('purpose', 'protector solar', 'tag_0', 'sunscreens'),
            ('purpose', 'cuidado de la barba', 'search_terms', 'beard'),
            ('purpose', 'aceite para barba', 'search_terms', 'beard oil'),
            ('purpose', 'bálsamo para barba', 'search_terms', 'beard balm'),
        ]
        for mode, query, field, expected in cases:
            with self.subTest(mode=mode), patch('app.modules.mi_neceser.catalog._get_json',
                                               return_value={'count': 0, 'products': []}) as get_json:
                search_products(query, mode=mode)
                params = get_json.call_args.args[1]
                self.assertEqual(params[field], expected)
                if 'tagtype_0' in params:
                    self.assertEqual(params['tag_contains_0'], 'contains')
                if mode == 'purpose' and query in ('cuidado de la barba', 'aceite para barba', 'bálsamo para barba'):
                    self.assertNotIn('tagtype_0', params)
        with self.assertRaises(ValueError):
            search_products('crema', mode='unknown')

    def test_photo_upload_saves_cited_store_and_rejects_duplicates(self):
        store = 'https://www.fahorro.com/cerave-crema-hidratante.html'
        outside_store = 'https://example.com/crema.html'
        details = {
            'name': 'Crema Hidratante', 'brand': 'CeraVe', 'barcode': CATALOG_ITEM['code'], 'scope': 'skin',
            'name_es': 'Crema hidratante', 'ingredients_es': 'Agua, glicerina', 'routine': 'evening',
            'inci': 'Aqua, Glycerin', 'side_effects': 'Información de la etiqueta.',
            'warnings': 'Evita el contacto con los ojos.', 'label_matches': True, 'has_face': False,
            'purchase_urls': [store, outside_store, 'https://www.farmaciasguadalajara.com/no-citado.html'],
        }
        result = httpx.Response(200, request=httpx.Request('POST', 'https://example.com'), json={
            'steps': [{'type': 'model_output', 'content': [{
                'type': 'text', 'text': json.dumps(details),
                'annotations': [{'type': 'url_citation', 'url': url} for url in [store, outside_store]],
            }]}],
        })
        photo = BytesIO()
        Image.new('RGB', (20, 20)).save(photo, 'PNG')
        photo_bytes = photo.getvalue()

        def upload():
            return self.client.post('/api/mi-neceser/productos/foto', data={
                'front': (BytesIO(photo_bytes), 'front.png'), 'routine': 'auto', 'own_photo': 'yes',
            })

        with (
            patch.dict('os.environ', {'GEMINI_API_KEY': 'test-only'}),
            patch('app.modules.mi_neceser.photo_product.httpx.post', return_value=result),
        ):
            saved = upload()
            self.assertEqual(saved.status_code, 201, saved.json)
            self.assertIs(saved.json['catalog_created'], True)
            self.assertTrue(saved.json['image_url'].startswith('data:image/webp;base64,'))
            options = self.client.get('/api/mi-neceser/productos/opciones').json['items']
            self.assertEqual([(item['id'], item['image_url']) for item in options],
                             [(saved.json['id'], saved.json['image_url'])])
            self.assertEqual(saved.json['name'], details['name_es'])
            self.assertEqual(saved.json['ingredients_es'], details['ingredients_es'])
            self.assertEqual(saved.json['routine'], 'evening')
            product_url = '/api/mi-neceser/productos/' + saved.json['id']
            updated = self.client.put(product_url, json={'routine': 'morning'})
            self.assertEqual(updated.status_code, 200)
            self.assertEqual(updated.json['routine'], 'morning')
            self.assertEqual(saved.json['side_effects'], details['side_effects'])
            self.assertEqual(saved.json['warnings'], details['warnings'])
            self.assertIsNone(saved.json['back_image_url'])
            rear = BytesIO()
            Image.new('RGB', (25, 30), 'green').save(rear, 'PNG')
            label_url = product_url + '/etiqueta'
            def label_upload():
                return self.client.post(label_url, data={
                    'back': (BytesIO(rear.getvalue()), 'label.png'), 'own_photo': 'yes',
                })
            manufacturer = 'https://cerave.example/mx/crema-hidratante'
            label_data = {**details, 'inci': 'Aqua, Glycerin, Ceramide NP',
                          'ingredients_es': 'Agua, glicerina, ceramida NP', 'side_effects': ''}
            verification = {
                'inci': {'status': 'conflict', 'url': manufacturer, 'value': 'Aqua, Glycerin'},
                'side_effects': {'status': 'missing_on_label', 'url': manufacturer, 'value': 'Texto del fabricante.'},
                'warnings': {'status': 'conflict', 'url': 'https://uncited.example', 'value': 'Sin advertencias.'},
            }
            def web_response(payload, annotations=None):
                return httpx.Response(200, request=httpx.Request('POST', 'https://example.com'), json={
                    'steps': [{'type': 'model_output', 'content': [{
                        'type': 'text', 'text': json.dumps(payload), 'annotations': annotations or [],
                    }]}],
                })

            with patch('app.modules.mi_neceser.photo_product.httpx.post', side_effect=[
                web_response(label_data), web_response(verification, [{'type': 'url_citation', 'url': manufacturer}]),
            ]):
                label = label_upload()
            self.assertEqual(label.status_code, 201, label.json)
            self.assertTrue(label.json['back_image_url'].startswith('data:image/webp;base64,'))
            self.assertEqual(label.json['inci'], label_data['inci'])
            self.assertEqual(label.json['side_effects'], 'Texto del fabricante.')
            self.assertEqual(label.json['warnings'], details['warnings'])
            self.assertEqual(label.json['label_verification'], {
                'status': 'conflict', 'sources': [{'name': 'cerave.example', 'href': manufacturer}],
            })
            self.assertEqual(label_upload().status_code, 409)
            rechecked = self.client.post(label_url, data={'recheck': 'yes'})
            self.assertEqual(rechecked.status_code, 201, rechecked.json)
            self.assertEqual(rechecked.json['back_image_url'], label.json['back_image_url'])
            self.assertEqual(saved.json['purchase_links'], [{'name': 'Farmacias del Ahorro', 'href': store}])
            self.assertEqual(upload().status_code, 409)
            catalog = '/api/mi-neceser/productos/catalogo'
            catalog_id = saved.json['catalog_id']
            self.assertEqual(self.client.post(catalog, json={'catalog_id': catalog_id}).status_code, 409)
            self.assertEqual(self.client.get('/api/mi-neceser/imagen?src=https://example.com').status_code, 404)
            self.auth.payload = {'sub': 'member-2'}
            self.assertEqual(label_upload().status_code, 404)
            self.assertEqual(self.client.get('/api/mi-neceser/productos').json['items'], [])
            self.assertEqual(self.client.delete(product_url).status_code, 404)
            for query in ('q=ceravé+crema', 'q=glicerina&mode=ingredient', 'q=piel&mode=purpose',
                          'q=cerave+glicerina+piel&mode=all'):
                items = self.client.get('/api/mi-neceser/catalogo?' + query).json['items']
                self.assertEqual([item['catalog_id'] for item in items], [catalog_id])
                self.assertNotIn('user_id', items[0])
                self.assertNotIn('notes', items[0])
            found = self.client.post('/api/mi-neceser/catalogo/foto', data={
                'front': (BytesIO(photo_bytes), 'front.png'),
            })
            self.assertEqual(found.json['items'][0]['catalog_id'], catalog_id)
            def face_result(payload):
                return httpx.Response(200, request=httpx.Request('POST', 'https://example.com'), json={
                    'steps': [{'type': 'model_output', 'content': [{
                        'type': 'text', 'text': json.dumps(payload),
                    }]}],
                })

            with patch('app.modules.mi_neceser.photo_product.httpx.post', side_effect=[
                face_result({**details, 'has_face': True}), face_result({'has_face': False}),
            ]):
                corrected = self.client.post('/api/mi-neceser/catalogo/foto', data={
                    'front': (BytesIO(photo_bytes), 'front.png'),
                })
            self.assertEqual(corrected.status_code, 200, corrected.json)
            self.assertEqual(corrected.json['items'][0]['catalog_id'], catalog_id)
            different = BytesIO()
            Image.new('RGB', (30, 20), 'red').save(different, 'PNG')
            found = self.client.post('/api/mi-neceser/catalogo/foto', data={
                'front': (BytesIO(different.getvalue()), 'another.png'),
            })
            self.assertEqual(found.json['items'][0]['catalog_id'], catalog_id)
            linked = upload()
            self.assertEqual(linked.status_code, 201, linked.json)
            self.assertIs(linked.json['catalog_created'], False)
            self.assertEqual(linked.json['catalog_id'], catalog_id)
            self.assertEqual(upload().status_code, 409)
            with self.app.app_context():
                self.assertEqual(UserProduct.query.count(), 2)
                self.assertEqual(CatalogProduct.query.count(), 1)
            self.auth.payload = {'sub': 'member-1'}
            replace_url = product_url + '/foto'
            for same, better, barcode, status in (
                (False, True, None, 422),
                (True, False, None, 422),
                (True, True, '3337875598997', 422),
                (True, True, details['barcode'], 200),
            ):
                comparison = httpx.Response(200, request=httpx.Request('POST', 'https://example.com'), json={
                    'steps': [{'type': 'model_output', 'content': [{
                        'type': 'text', 'text': json.dumps({'same_product': same, 'better_quality': better, 'has_face': False}),
                    }]}],
                })
                responses = [comparison]
                if barcode:
                    responses.extend([
                        web_response({**label_data, 'barcode': barcode, 'warnings': 'Advertencia actualizada.'}),
                        web_response({
                            'warnings': {'status': 'confirmed', 'url': manufacturer, 'value': 'Advertencia actualizada.'},
                        }, [{'type': 'url_citation', 'url': manufacturer}]),
                    ])
                with patch('app.modules.mi_neceser.photo_product.httpx.post', side_effect=responses):
                    replaced = self.client.post(replace_url, data={
                        'front': (BytesIO(different.getvalue()), 'candidate.png'), 'own_photo': 'yes',
                    })
                self.assertEqual(replaced.status_code, status, replaced.json)
                current = self.client.get('/api/mi-neceser/productos').json['items'][0]
                self.assertEqual(current['image_url'] == saved.json['image_url'], status != 200)
                self.assertEqual(current['back_image_url'], label.json['back_image_url'])
                if status == 200:
                    self.assertEqual(current['warnings'], 'Advertencia actualizada.')
                    self.assertEqual(current['label_verification']['status'], 'checked')

            for matches, better, status in ((False, True, 422), (True, False, 422), (True, True, 201)):
                responses = [web_response({
                    **label_data, 'label_matches': matches, 'better_quality': better,
                    'warnings': 'Advertencia de la etiqueta más legible.',
                })]
                if status == 201:
                    responses.append(web_response({}))
                with patch('app.modules.mi_neceser.photo_product.httpx.post', side_effect=responses):
                    changed_label = self.client.post(label_url, data={
                        'back': (BytesIO(different.getvalue()), 'clearer.png'),
                        'own_photo': 'yes', 'replace': 'yes',
                    })
                self.assertEqual(changed_label.status_code, status, changed_label.json)
                current = self.client.get('/api/mi-neceser/productos').json['items'][0]
                self.assertEqual(current['back_image_url'] == label.json['back_image_url'], status != 201)
                if status == 201:
                    self.assertEqual(current['warnings'], 'Advertencia de la etiqueta más legible.')

    def test_rejects_unrelated_upload_and_requires_photo_confirmation(self):
        photo = BytesIO()
        Image.new('RGB', (20, 20)).save(photo, 'PNG')
        endpoint = '/api/mi-neceser/productos/foto'

        def files(confirmed):
            return {'front': (BytesIO(photo.getvalue()), 'photo.png'), 'own_photo': confirmed}

        response = httpx.Response(200, request=httpx.Request('POST', 'https://example.com'), json={
            'steps': [{'type': 'model_output', 'content': [{
                'type': 'text', 'text': json.dumps({'scope': 'rejected', 'brand': 'Example', 'name': 'Perfume', 'has_face': False}),
            }]}],
        })
        with patch.dict('os.environ', {'GEMINI_API_KEY': 'test-only'}), patch(
            'app.modules.mi_neceser.photo_product.httpx.post', return_value=response,
        ) as analyze:
            self.assertEqual(self.client.post(endpoint, data=files('no')).status_code, 400)
            analyze.assert_not_called()
            rejected = self.client.post(endpoint, data=files('yes'))
            self.assertEqual(rejected.status_code, 422)
            self.assertIn('No se subió un producto de cuidado', rejected.json['error'])
            face = httpx.Response(200, request=httpx.Request('POST', 'https://example.com'), json={
                'steps': [{'type': 'model_output', 'content': [{
                    'type': 'text', 'text': json.dumps({'has_face': True}),
                }]}],
            })
            analyze.return_value = face
            for url in (endpoint, '/api/mi-neceser/catalogo/foto'):
                blocked = self.client.post(url, data=files('yes'))
                self.assertEqual(blocked.status_code, 422)
                self.assertIn('Solo debe aparecer el producto', blocked.json['error'])
            with self.app.app_context():
                self.assertEqual(CatalogProduct.query.count(), 0)
                self.assertEqual(UserProduct.query.count(), 0)



if __name__ == '__main__':
    unittest.main()
