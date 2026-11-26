"""Integration checks using an isolated database and mocked Clerk verification.

Run from backend: .venv/Scripts/python.exe -m unittest discover -s tests -v
"""
import io
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch
from app import create_app
from app.extensions import db
from app.modules.comunidad.models import ForumBulletin, ForumComment, ForumPost, ForumPostFavorite, ForumPostLike
from app.modules.users.models import User
from config import DevelopmentConfig


class ForumTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        with patch.object(DevelopmentConfig, 'SQLALCHEMY_DATABASE_URI', 'sqlite:///:memory:'):
            self.app = create_app()
        self.app.config['TESTING'] = True
        self.app.instance_path = self.temp.name
        self.context = self.app.app_context()
        self.context.push()
        db.create_all()
        db.session.add_all([User(clerk_user_id='member-1'), User(clerk_user_id='member-2')])
        db.session.commit()
        self.auth = MagicMock(is_signed_in=True, payload={'sub': 'member-1'})
        self.clerk = patch('app.auth.Clerk')
        self.clerk.start().return_value.authenticate_request.return_value = self.auth
        self.env = patch.dict('os.environ', {'CLERK_SECRET_KEY': 'test-only'})
        self.env.start()
        self.context_classifier = self.enterContext(
            patch('app.modules.comunidad.routes.flagged_image_context', return_value=None)
        )
        self.client = self.app.test_client()
        self.base = '/api/comunidad/foro/posts'

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.context.pop()
        self.clerk.stop()
        self.env.stop()
        self.temp.cleanup()

    def post(self, **changes):
        data = dict(title='My routine', content='My experience', category='Rutinas')
        data.update(changes)
        response = self.client.post(self.base, json=data)
        self.assertEqual(response.status_code, 201, response.json)
        return response.json

    def test_create_and_filter_posts_and_favorites(self):
        post = self.post()
        self.assertTrue(post['is_mine'])
        self.assertEqual(self.client.get(self.base+'?view=mine').json['items'][0]['id'], post['id'])
        self.auth.payload = {'sub': 'member-2'}
        self.assertEqual(self.client.get(self.base+'?view=mine').json['items'], [])
        self.assertFalse(self.client.get(self.base).json['items'][0]['is_mine'])
        endpoint = self.base+'/'+post['id']+'/favorite'
        for _ in range(2):
            self.assertTrue(self.client.put(endpoint).json['is_favorite'])
        self.assertEqual(len(self.client.get(self.base+'?view=favorites').json['items']), 1)
        for _ in range(2):
            self.assertFalse(self.client.delete(endpoint).json['is_favorite'])
        self.assertEqual(self.client.get(self.base+'?view=favorites').json['items'], [])
        favorite = ForumPostFavorite.query.filter_by(post_id=post['id']).one()
        self.assertIsNotNone(favorite.deleted_at)
        self.assertTrue(self.client.put(endpoint).json['is_favorite'])
        self.assertEqual(ForumPostFavorite.query.filter_by(post_id=post['id']).count(), 1)
        self.assertIsNone(favorite.deleted_at)

    def test_following_feed_and_unfollow_are_per_account(self):
        first = self.post(title='First routine')
        second = self.post(title='Another routine')
        endpoint = '/api/comunidad/foro/usuarios/' + first['user_id'] + '/seguir'
        feed = self.base + '?view=following'
        self.assertEqual(self.client.put(endpoint).status_code, 400)
        self.assertEqual(self.client.get(feed).json['items'], [])

        self.auth.payload = {'sub': 'member-2'}
        own = self.post(title='My routine')
        self.assertEqual(self.client.get(feed).json['items'], [])
        for _ in range(2):
            self.assertTrue(self.client.put(endpoint).json['is_following'])
        response = self.client.get(feed + '&limit=1').json
        self.assertEqual(response['pagination']['total'], 2)
        self.assertTrue(response['pagination']['has_more'])
        self.assertTrue(response['items'][0]['is_following_author'])
        matches = self.client.get(feed + '&search=Another').json['items']
        self.assertEqual([item['id'] for item in matches], [second['id']])
        self.assertEqual([item['id'] for item in self.client.get(self.base + '?view=mine').json['items']], [own['id']])
        self.assertTrue(self.client.get(self.base + '/' + first['id']).json['is_following_author'])
        for _ in range(2):
            self.assertFalse(self.client.delete(endpoint).json['is_following'])
        self.assertEqual(self.client.get(feed).json['items'], [])
        self.assertFalse(self.client.get(self.base + '/' + first['id']).json['is_following_author'])

    def test_likes_are_per_user_and_idempotent(self):
        post = self.post()
        endpoint = self.base+'/'+post['id']+'/like'
        for _ in range(2):
            self.assertEqual(self.client.put(endpoint).json, {'is_liked': True, 'likes_count': 1})
        self.auth.payload = {'sub': 'member-2'}
        self.assertEqual(self.client.put(endpoint).json['likes_count'], 2)
        self.auth.payload = {'sub': 'member-1'}
        for _ in range(2):
            self.assertEqual(self.client.delete(endpoint).json, {'is_liked': False, 'likes_count': 1})
        self.assertEqual(self.client.get(self.base).json['items'][0]['likes_count'], 1)
        like = ForumPostLike.query.filter_by(post_id=post['id'], user_id=User.query.filter_by(clerk_user_id='member-1').one().id).one()
        self.assertIsNotNone(like.deleted_at)
        self.assertEqual(self.client.put(endpoint).json, {'is_liked': True, 'likes_count': 2})
        self.assertEqual(ForumPostLike.query.filter_by(post_id=post['id']).count(), 2)
        self.assertIsNone(like.deleted_at)

    def test_comments_pagination_counts_and_validation(self):
        endpoint = self.base+'/'+self.post()['id']+'/comments'
        for i in range(7):
            self.assertEqual(self.client.post(endpoint, json={'content': str(i)}).status_code, 201)
        first = self.client.get(endpoint).json
        second = self.client.get(endpoint+'?offset=5').json
        self.assertEqual(len(first['items']), 5)
        self.assertTrue(first['pagination']['has_more'])
        self.assertEqual(len(second['items']), 2)
        self.assertFalse(second['pagination']['has_more'])
        self.assertEqual(len({item['id'] for item in first['items']+second['items']}), 7)
        self.assertEqual(self.client.get(self.base).json['items'][0]['comments_count'], 7)
        for query in ['?limit=0', '?limit=51', '?offset=-1', '?offset=x']:
            self.assertEqual(self.client.get(endpoint+query).status_code, 400)
        for data in [{'content': ' '}, {'content': 'x'*3001}, {'content': 1}, ['bad'], {'content': 'x', 'parent_comment_id': 'missing'}]:
            self.assertEqual(self.client.post(endpoint, json=data).status_code, 400)

    def test_nested_replies_stay_under_their_parent_and_post(self):
        first_post = self.post()
        second_post = self.post(title='Other post')
        first_url = self.base+'/'+first_post['id']+'/comments'
        second_url = self.base+'/'+second_post['id']+'/comments'
        parent = self.client.post(first_url, json={'content': 'Root'}).json
        other_parent = self.client.post(second_url, json={'content': 'Other root'}).json
        child = self.client.post(first_url, json={
            'content': 'Child', 'parent_comment_id': parent['id'],
        }).json
        grandchild = self.client.post(first_url, json={
            'content': 'Grandchild', 'parent_comment_id': child['id'],
        }).json
        roots = self.client.get(first_url).json
        self.assertEqual([item['id'] for item in roots['items']], [parent['id']])
        self.assertEqual(roots['items'][0]['replies_count'], 1)
        self.assertEqual(roots['pagination']['total'], 1)
        children = self.client.get(first_url+'?parent_id='+parent['id']).json
        self.assertEqual([item['id'] for item in children['items']], [child['id']])
        self.assertEqual(children['items'][0]['replies_count'], 1)
        deeper = self.client.get(first_url+'?parent_id='+child['id']).json
        self.assertEqual(deeper['items'][0]['id'], grandchild['id'])
        self.assertEqual(deeper['items'][0]['replies_count'], 0)
        post_counts = {item['id']: item['comments_count'] for item in self.client.get(self.base).json['items']}
        self.assertEqual(post_counts[first_post['id']], 3)
        self.assertEqual(self.client.get(first_url+'?parent_id='+other_parent['id']).status_code, 400)
        self.assertEqual(self.client.post(first_url, json={
            'content': 'Wrong post', 'parent_comment_id': other_parent['id'],
        }).status_code, 400)

    def test_server_filters_and_post_author_permissions(self):
        for i in range(14):
            self.post(title=f'Routine {i}', category='Rutinas' if i % 2 else 'General')
        first_page = self.client.get(self.base+'?limit=5').json
        self.assertEqual(first_page['pagination']['total'], 14)
        self.assertTrue(first_page['pagination']['has_more'])
        self.assertEqual(len(first_page['items']), 5)
        self.assertEqual(len(self.client.get(self.base+'?limit=5&offset=5').json['items']), 5)
        result = self.client.get(self.base+'?category=Rutinas&search=Routine%201').json
        self.assertEqual(result['pagination']['total'], 3)
        post_id = result['items'][0]['id']
        endpoint = self.base+'/'+post_id
        self.auth.payload = {'sub': 'member-2'}
        self.assertEqual(self.client.patch(endpoint, json={'title': 'Changed'}).status_code, 403)
        self.assertEqual(self.client.delete(endpoint).status_code, 403)
        self.auth.payload = {'sub': 'member-1'}
        self.assertEqual(self.client.patch(endpoint, json={'title': 'Changed'}).json['title'], 'Changed')
        self.assertEqual(self.client.delete(endpoint).status_code, 204)
        self.assertEqual(self.client.get(endpoint).status_code, 404)
        self.assertEqual(ForumPost.query.filter_by(id=post_id).one().status, 'deleted')
        self.assertEqual(self.client.get(self.base).json['pagination']['total'], 13)
        self.assertEqual(self.client.get(self.base+'?limit=0').status_code, 400)

    def test_comment_author_permissions_and_reply_notifications(self):
        post = self.post()
        endpoint = self.base+'/'+post['id']+'/comments'
        self.auth.payload = {'sub': 'member-2'}
        parent = self.client.post(endpoint, json={'content': 'Question'}).json
        self.assertEqual(parent['is_mine'], True)
        notifications = '/api/comunidad/foro/notifications'
        self.assertEqual(self.client.get(notifications).json['unread'], 0)
        self.auth.payload = {'sub': 'member-1'}
        owner_notice = self.client.get(notifications).json
        self.assertEqual(owner_notice['unread'], 1)
        self.auth.payload = {'sub': 'member-2'}
        self.assertEqual(self.client.put(notifications+'/'+owner_notice['items'][0]['id']+'/read').status_code, 404)
        self.auth.payload = {'sub': 'member-1'}
        self.assertEqual(self.client.put(notifications+'/'+owner_notice['items'][0]['id']+'/read').status_code, 200)
        self.assertEqual(self.client.get(notifications).json['unread'], 0)
        self.assertEqual(self.client.patch(endpoint+'/'+parent['id'], json={'content': 'No'}).status_code, 403)
        child = self.client.post(endpoint, json={'content': 'Answer', 'parent_comment_id': parent['id']}).json
        self.assertEqual(child['parent_comment_id'], parent['id'])
        self.auth.payload = {'sub': 'member-2'}
        self.assertEqual(self.client.get(notifications).json['unread'], 1)
        self.assertEqual(self.client.patch(endpoint+'/'+parent['id'], json={'content': 'Edited'}).json['content'], 'Edited')
        self.assertEqual(self.client.delete(endpoint+'/'+parent['id']).status_code, 204)
        self.assertEqual(self.client.get(endpoint).json['items'][0]['content'], 'Comentario eliminado.')
        self.assertEqual(ForumComment.query.filter_by(id=parent['id']).one().status, 'deleted')
        self.assertEqual(self.client.get(endpoint+'?parent_id='+parent['id']).json['items'][0]['id'], child['id'])

    def test_report_queue_moderation_and_permissions(self):
        post = self.post()
        endpoint = '/api/comunidad/foro/reports'
        report = {'target_type': 'post', 'target_id': post['id'], 'reason': 'unsafe_advice'}
        self.assertEqual(self.client.post(endpoint, json=report).status_code, 400)
        self.auth.payload = {'sub': 'member-2'}
        self.assertEqual(self.client.post(endpoint, json=report).status_code, 201)
        self.assertEqual(self.client.post(endpoint, json=report).status_code, 200)
        self.assertEqual(self.client.get(endpoint).status_code, 403)
        self.assertEqual(self.client.patch(endpoint+'/bad', json={'decision': 'hide'}).status_code, 403)
        self.auth.payload = {'sub': 'member-1'}
        User.query.filter_by(clerk_user_id='member-1').first().role = 'moderator'
        db.session.commit()
        queue = self.client.get(endpoint).json['items']
        self.assertEqual(len(queue), 1)
        self.assertEqual(queue[0]['preview'], 'My experience')
        self.assertEqual(self.client.patch(endpoint+'/'+queue[0]['id'], json={'decision': 'hide'}).json['status'], 'resolved')
        self.assertEqual(self.client.get(self.base).json['items'], [])
        self.assertEqual(self.client.get(endpoint).json['items'], [])

    def test_report_read_state_is_per_moderator_and_filterable(self):
        post = self.post()
        endpoint = '/api/comunidad/foro/reports'
        self.auth.payload = {'sub': 'member-2'}
        self.assertEqual(self.client.post(endpoint, json={
            'target_type': 'post', 'target_id': post['id'], 'reason': 'hate',
        }).status_code, 201)
        self.assertEqual(self.client.get(endpoint + '?summary=1').status_code, 403)
        for user in User.query.all():
            user.role = 'moderator'
        db.session.commit()
        self.assertEqual(self.client.get(endpoint + '?reason=violence').json['items'], [])
        queue = self.client.get(endpoint + '?reason=hate').json
        self.assertEqual(queue['unread'], 1)
        report = queue['items'][0]
        self.assertFalse(report['is_read'])
        for _ in range(2):
            self.assertEqual(self.client.put(f"{endpoint}/{report['id']}/read").status_code, 200)
        self.assertEqual(self.client.get(endpoint + '?summary=1').json['unread'], 0)
        self.assertTrue(self.client.get(endpoint).json['items'][0]['is_read'])
        self.auth.payload = {'sub': 'member-1'}
        self.assertEqual(self.client.get(endpoint + '?summary=1').json['unread'], 1)

    def test_text_is_moderated_on_create_and_edit(self):
        pending_post = self.client.post(self.base, json={
            'title': 'Péndéjo', 'content': 'Te voy a matar',
        })
        self.assertEqual(pending_post.status_code, 202)
        self.assertIn('título', pending_post.json['message'])
        self.assertEqual(self.client.get(self.base + '/' + pending_post.json['id']).status_code, 404)
        post = self.post()
        endpoint = self.base + '/' + post['id']
        self.assertEqual(self.client.patch(endpoint, json={'content': 'Te voy a matar'}).status_code, 422)
        replies = endpoint + '/comments'
        self.auth.payload = {'sub': 'member-2'}
        pending_comment = self.client.post(replies, json={'content': 'Odio a los gays'})
        self.assertEqual(pending_comment.status_code, 202)
        self.assertEqual(self.client.get(replies).json['items'], [])
        self.assertEqual(self.client.get(endpoint).json['comments_count'], 0)
        notices = '/api/comunidad/foro/notifications'
        self.assertIn('discurso de odio', self.client.get(notices).json['items'][0]['message'])
        self.auth.payload = {'sub': 'member-1'}
        self.assertEqual(self.client.get(notices).json['unread'], 1)
        comment = self.client.post(replies, json={'content': 'Gracias por compartir'}).json
        comment_url = replies + '/' + comment['id']
        self.assertEqual(self.client.patch(comment_url, json={'content': 'Sexo explícito'}).status_code, 422)
        self.assertEqual(self.client.get(replies).json['items'][0]['content'], 'Gracias por compartir')
        User.query.filter_by(clerk_user_id='member-1').one().role = 'moderator'
        db.session.commit()
        reports = '/api/comunidad/foro/reports'
        queued = {report['target_type']: report for report in self.client.get(reports).json['items']}
        self.assertEqual(queued['post']['detections'], [
            {'field': 'title', 'reason': 'disrespect'}, {'field': 'text', 'reason': 'violence'},
        ])
        review_comment = reports + '/' + queued['comment']['id']
        self.assertEqual(self.client.patch(review_comment, json={'decision': 'approve'}).status_code, 200)
        self.assertEqual(self.client.patch(review_comment, json={'decision': 'approve'}).status_code, 404)
        self.assertEqual(self.client.get(endpoint).json['comments_count'], 2)
        self.assertEqual(self.client.get(notices).json['unread'], 2)
        self.assertEqual(self.client.patch(reports + '/' + queued['post']['id'],
                                           json={'decision': 'reject'}).status_code, 200)
        self.assertEqual(self.client.get(self.base + '/' + pending_post.json['id']).status_code, 404)

    def test_reply_image_is_screened_before_upload(self):
        from PIL import Image
        from app.modules.comunidad.moderation import ImageModerationUnavailable

        post = self.post()
        replies = self.base + '/' + post['id'] + '/comments'

        def payload():
            image = io.BytesIO()
            Image.new('RGB', (8, 8), 'green').save(image, 'PNG')
            image.seek(0)
            return {'content': 'Una foto', 'image': (image, 'reply.png', 'image/png')}

        with patch('app.modules.comunidad.routes.flagged_image', return_value='hentai'):
            response = self.client.post(replies, data=payload())
            self.assertEqual(response.status_code, 202)
            self.assertIn('hentai', response.json['message'])
        self.context_classifier.assert_not_called()
        self.assertEqual(self.client.get(replies).json['items'], [])
        with patch('app.modules.comunidad.routes.flagged_image', return_value=None):
            self.context_classifier.return_value = 'gore'
            response = self.client.post(replies, data=payload())
            self.assertEqual(response.status_code, 202)
            self.assertIn('sangre o violencia gráfica', response.json['message'])
            self.context_classifier.return_value = None
            self.context_classifier.side_effect = ImageModerationUnavailable('service unavailable')
            manual_reply = self.client.post(replies, data=payload())
            self.assertEqual(manual_reply.status_code, 202)
            self.assertIn('se revisará manualmente', manual_reply.json['message'])
            self.assertNotIn('Se detectó', manual_reply.json['message'])
            manual_post = self.client.post(self.base, data={**payload(), 'title': 'Foto de mi rutina'})
            self.assertEqual(manual_post.status_code, 202)
            self.assertEqual(self.client.get(self.base + '/' + manual_post.json['id']).status_code, 404)
            self.assertEqual(self.client.get(replies).json['items'], [])
            self.context_classifier.side_effect = None
            created = self.client.post(replies, data=payload())
        self.assertEqual(created.status_code, 201, created.json)
        image_url = created.json['image_url']
        endpoint = '/api/comunidad/foro/reports'
        self.auth.payload = {'sub': 'member-2'}
        report = {'target_type': 'comment', 'target_id': created.json['id']}
        self.assertEqual(self.client.post(endpoint, json={**report, 'medium': 'image', 'reason': 'gore'}).status_code, 201)
        self.assertEqual(self.client.post(endpoint, json={**report, 'medium': 'text', 'reason': 'violence'}).status_code, 201)
        User.query.filter_by(clerk_user_id='member-2').one().role = 'moderator'
        db.session.commit()
        queue = self.client.get(endpoint + '?target_type=comment&medium=image').json
        held = next(item for item in queue['items'] if item['target_id'] == response.json['id'])
        self.assertEqual(held['detections'], [{'field': 'image', 'reason': 'gore'}])
        private_image = held['image_url']
        public_image = private_image.replace('/reports/uploads/', '/uploads/')
        self.assertEqual(self.client.get(public_image).status_code, 404)
        with self.client.get(private_image) as image_response:
            self.assertEqual(image_response.status_code, 200)
        manual_queue = self.client.get(endpoint + '?reason=image_review_unavailable').json['items']
        self.assertEqual({item['target_id'] for item in manual_queue},
                         {manual_reply.json['id'], manual_post.json['id']})
        post_review = next(item for item in manual_queue if item['target_type'] == 'post')
        approved = self.client.patch(endpoint + '/' + post_review['id'], json={'decision': 'approve'})
        self.assertEqual(approved.status_code, 200)
        self.assertEqual(self.client.get(self.base + '/' + manual_post.json['id']).status_code, 200)
        self.auth.payload = {'sub': 'member-1'}
        self.assertEqual(self.client.get(private_image).status_code, 403)
        with self.client.get(image_url) as response:
            self.assertEqual(response.status_code, 200)
        self.assertEqual(self.client.delete(replies + '/' + created.json['id']).status_code, 204)
        self.assertEqual(self.client.get(image_url).status_code, 404)

    def test_rekognition_policy_uses_specific_label_before_parent(self):
        from app.modules.comunidad.moderation import flagged_image_context

        with patch.dict('os.environ', {'FORUM_REKOGNITION_REGION': 'us-east-1'}):
            with patch('app.modules.comunidad.moderation.boto3.client') as client:
                detect = client.return_value.detect_moderation_labels
                detect.return_value = {'ModerationLabels': [
                    {'Name': 'Violence', 'ParentName': ''},
                    {'Name': 'Blood & Gore', 'ParentName': 'Graphic Violence'},
                ]}
                self.assertEqual(flagged_image_context(b'jpeg'), 'gore')
                detect.assert_called_once_with(Image={'Bytes': b'jpeg'}, MinConfidence=65)

    def test_text_rules_detect_common_variants_and_allow_skin_care_terms(self):
        from app.modules.comunidad.moderation import flagged_text

        for text, reason in (
            ('Eres un p3nd3j0.', 'disrespect'),
            ('Te vamos a golpear', 'violence'),
            ('Hay que expulsar a los inmigrantes', 'hate'),
            ('Fotografía de una decapitación gráfica', 'gore'),
            ('Película pornográfica', 'explicit'),
            ('Uso protector SPF50 y una crema con 2% de ácido salicílico.', None),
        ):
            with self.subTest(text=text):
                self.assertEqual(flagged_text(text), reason)

    def test_gore_detected_in_photo_region_is_held_for_review(self):
        from PIL import Image
        from app.modules.comunidad.moderation import _flagged_local_image
        import numpy as np

        image = io.BytesIO()
        Image.new('RGB', (640, 640), 'green').save(image, 'PNG')
        image.seek(0)
        self.context_classifier.side_effect = _flagged_local_image
        with (
            patch('app.modules.comunidad.routes.flagged_image', return_value=None),
            patch('app.modules.comunidad.moderation._image_model') as model_loader,
            patch('app.modules.comunidad.moderation._image_scores', side_effect=[
                np.array([0.02, 0.02, 0.96]),  # Full image
                np.array([0.23, 0.02, 0.75]),  # A cropped region
            ]),
        ):
            result = self.client.post(self.base, data={
                'title': 'Foto del foro', 'content': 'Imagen de prueba',
                'image': (image, 'region.png', 'image/png'),
            })
        model_loader.assert_called_once_with('image-safety-classifier-xs')
        self.assertEqual(result.status_code, 202)
        self.assertIn('sangre o violencia gráfica', result.json['message'])
        self.assertEqual(self.client.get(self.base).json['items'], [])
        self.assertEqual(self.client.get(self.base + '/' + result.json['id']).status_code, 404)

    def test_weapon_without_violence_is_held_with_its_own_reason(self):
        from PIL import Image
        from app.modules.comunidad.moderation import _flagged_local_image
        import numpy as np

        image = io.BytesIO()
        Image.new('RGB', (64, 64), 'white').save(image, 'PNG')
        image.seek(0)
        self.context_classifier.side_effect = _flagged_local_image
        with (
            patch('app.modules.comunidad.routes.flagged_image', return_value=None),
            patch('app.modules.comunidad.moderation._image_model', side_effect=lambda name: name),
            patch('app.modules.comunidad.moderation._image_scores', side_effect=lambda model, *_: {
                'image-safety-classifier-xs': np.array([0.01, 0.01, 0.98]),
                'gore': np.array([0.01]),
                'weapons': np.array([0.70]),
            }[model]),
        ):
            result = self.client.post(self.base, data={
                'title': 'Foto del foro', 'content': 'Imagen de prueba',
                'image': (image, 'fixture.png', 'image/png'),
            })
        self.assertEqual(result.status_code, 202)
        self.assertIn('presencia de armas en la imagen', result.json['message'])
        self.assertEqual(self.client.get(self.base).json['items'], [])

    def test_moderator_can_review_reported_post_image_while_report_is_pending(self):
        import base64
        image = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1kAAAAASUVORK5CYII=')
        created = self.client.post(self.base, data={
            'title': 'Reported photo', 'content': 'Review the image',
            'image': (io.BytesIO(image), 'photo.png', 'image/png'),
        })
        self.assertEqual(created.status_code, 201, created.json)
        original_image_url = created.json['image_url']
        report_url = '/api/comunidad/foro/reports'
        report = {'target_type': 'post', 'target_id': created.json['id'], 'reason': 'unsafe_advice'}
        db.session.add(User(clerk_user_id='member-3'))
        db.session.commit()
        self.auth.payload = {'sub': 'member-2'}
        self.assertEqual(self.client.post(report_url, json=report).status_code, 201)
        self.auth.payload = {'sub': 'member-3'}
        self.assertEqual(self.client.post(report_url, json=report).status_code, 201)
        User.query.filter_by(clerk_user_id='member-3').first().role = 'moderator'
        db.session.commit()
        queue = self.client.get(report_url).json['items']
        self.assertEqual(len(queue), 2)
        self.assertEqual(queue[0]['title'], 'Reported photo')
        image_url = queue[0]['image_url']
        self.assertIn('/reports/uploads/', image_url)
        reviewed_image = self.client.get(image_url)
        self.assertEqual(reviewed_image.status_code, 200)
        self.assertEqual(reviewed_image.data, image)
        reviewed_image.close()
        self.auth.payload = {'sub': 'member-2'}
        self.assertEqual(self.client.get(image_url).status_code, 403)
        self.auth.payload = {'sub': 'member-3'}
        self.assertEqual(self.client.patch(report_url+'/'+queue[0]['id'], json={'decision': 'hide'}).status_code, 200)
        self.assertEqual(self.client.get(original_image_url).status_code, 404)
        still_pending_image = self.client.get(image_url)
        self.assertEqual(still_pending_image.status_code, 200)
        still_pending_image.close()
        self.assertEqual(self.client.patch(report_url+'/'+queue[1]['id'], json={'decision': 'hide'}).status_code, 200)
        self.assertEqual(self.client.get(image_url).status_code, 404)

    def test_moderator_hides_reported_comment_but_preserves_thread(self):
        post = self.post()
        comments_url = self.base+'/'+post['id']+'/comments'
        self.auth.payload = {'sub': 'member-2'}
        parent = self.client.post(comments_url, json={'content': 'Unsafe claim'}).json
        child = self.client.post(comments_url, json={
            'content': 'Follow up', 'parent_comment_id': parent['id'],
        }).json
        self.auth.payload = {'sub': 'member-1'}
        report_url = '/api/comunidad/foro/reports'
        response = self.client.post(report_url, json={
            'target_type': 'comment', 'target_id': parent['id'], 'reason': 'unsafe_advice',
        })
        self.assertEqual(response.status_code, 201)
        User.query.filter_by(clerk_user_id='member-1').first().role = 'moderator'
        db.session.commit()
        report_id = self.client.get(report_url).json['items'][0]['id']
        self.assertEqual(self.client.patch(report_url+'/'+report_id, json={'decision': 'hide'}).status_code, 200)
        roots = self.client.get(comments_url).json['items']
        self.assertEqual(roots[0]['content'], 'Comentario oculto por moderación.')
        self.assertEqual(self.client.get(comments_url+'?parent_id='+parent['id']).json['items'][0]['id'], child['id'])
        self.auth.payload = {'sub': 'member-2'}
        notice = self.client.get('/api/comunidad/foro/notifications').json
        self.assertEqual(notice['unread'], 1)
        self.assertEqual(notice['items'][0]['title'], 'Tu comentario fue ocultado')
        self.assertEqual(notice['items'][0]['action_path'], f'/comunidad?post={post["id"]}')

    def test_hidden_post_notifies_author_once_and_dismissal_does_not(self):
        post = self.post()
        report_url = '/api/comunidad/foro/reports'
        notification_url = '/api/comunidad/foro/notifications'
        report = {'target_type': 'post', 'target_id': post['id'], 'reason': 'spam'}
        db.session.add(User(clerk_user_id='member-3'))
        db.session.commit()
        self.auth.payload = {'sub': 'member-2'}
        self.assertEqual(self.client.post(report_url, json=report).status_code, 201)
        self.auth.payload = {'sub': 'member-3'}
        self.assertEqual(self.client.post(report_url, json=report).status_code, 201)
        User.query.filter_by(clerk_user_id='member-3').first().role = 'moderator'
        db.session.commit()
        reports = self.client.get(report_url).json['items']
        self.assertEqual(len(reports), 2)
        for item in reports:
            self.assertEqual(self.client.patch(report_url+'/'+item['id'], json={'decision': 'hide'}).status_code, 200)
        self.assertEqual(self.client.get(notification_url).json['items'], [])
        self.auth.payload = {'sub': 'member-1'}
        notices = self.client.get(notification_url).json
        self.assertEqual(notices['unread'], 1)
        self.assertEqual(len(notices['items']), 1)
        notice = notices['items'][0]
        self.assertEqual(notice['title'], 'Tu publicación fue ocultada')
        self.assertIn('publicidad o spam', notice['message'])
        self.assertIsNone(notice['action_path'])
        self.auth.payload = {'sub': 'member-2'}
        self.assertEqual(self.client.put(notification_url+'/'+notice['id']+'/read').status_code, 404)
        self.auth.payload = {'sub': 'member-1'}
        self.assertEqual(self.client.put(notification_url+'/'+notice['id']+'/read').status_code, 200)
        self.assertEqual(self.client.get(notification_url).json['unread'], 0)
        second_post = self.post(title='Another post')
        self.auth.payload = {'sub': 'member-2'}
        self.assertEqual(self.client.post(report_url, json={
            'target_type': 'post', 'target_id': second_post['id'], 'reason': 'other',
        }).status_code, 201)
        self.auth.payload = {'sub': 'member-3'}
        report_id = self.client.get(report_url).json['items'][0]['id']
        self.assertEqual(self.client.patch(report_url+'/'+report_id, json={'decision': 'dismiss'}).status_code, 200)
        self.auth.payload = {'sub': 'member-1'}
        self.assertEqual(len(self.client.get(notification_url).json['items']), 1)

    def test_moderator_bulletins_are_public_to_members_and_author_managed(self):
        endpoint = '/api/comunidad/foro/bulletins'
        self.assertEqual(self.client.get(endpoint).json['items'], [])
        self.assertEqual(self.client.post(endpoint, json={'title': 'Update', 'content': 'Hello'}).status_code, 403)
        User.query.filter_by(clerk_user_id='member-1').first().role = 'moderator'
        db.session.commit()
        for invalid in ({'title': ' ', 'content': 'Hello'},
                        {'title': 'x' * 121, 'content': 'Hello'},
                        {'title': 'Update', 'content': 'x' * 1001}):
            self.assertEqual(self.client.post(endpoint, json=invalid).status_code, 400)
        created = self.client.post(endpoint, json={'title': 'Update', 'content': 'Community notice'})
        self.assertEqual(created.status_code, 201)
        bulletin_id = created.json['id']
        self.auth.payload = {'sub': 'member-2'}
        bulletin = self.client.get(endpoint).json['items'][0]
        self.assertEqual(bulletin['title'], 'Update')
        self.assertFalse(bulletin['can_manage'])
        self.assertEqual(self.client.patch(endpoint+'/'+bulletin_id, json={'title': 'Changed'}).status_code, 403)
        self.assertEqual(self.client.delete(endpoint+'/'+bulletin_id).status_code, 403)
        self.auth.payload = {'sub': 'member-1'}
        self.assertEqual(self.client.patch(endpoint+'/'+bulletin_id, json={'title': 'Changed'}).json['title'], 'Changed')
        self.assertEqual(self.client.delete(endpoint+'/'+bulletin_id).status_code, 204)
        self.assertEqual(self.client.get(endpoint).json['items'], [])
        self.assertEqual(ForumBulletin.query.filter_by(id=bulletin_id).one().status, 'deleted')

    def test_moderator_bulletin_image_upload_replace_remove_and_access(self):
        import base64
        image = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1kAAAAASUVORK5CYII=')
        endpoint = '/api/comunidad/foro/bulletins'
        payload = lambda: {
            'title': 'Photo notice', 'content': 'Look here',
            'image': (io.BytesIO(image), 'photo.png', 'image/png'),
        }
        self.assertEqual(self.client.post(endpoint, data=payload()).status_code, 403)
        User.query.filter_by(clerk_user_id='member-1').first().role = 'moderator'
        db.session.commit()
        self.assertEqual(self.client.post(endpoint, data={
            'title': 'Invalid', 'content': 'Wrong file',
            'image': (io.BytesIO(b'fake'), 'photo.png', 'image/png'),
        }).status_code, 400)
        created = self.client.post(endpoint, data=payload())
        self.assertEqual(created.status_code, 201, created.json)
        bulletin_id = created.json['id']
        first_url = created.json['image_url']
        self.assertIn('/bulletins/uploads/', first_url)
        self.auth.payload = {'sub': 'member-2'}
        self.assertEqual(self.client.get(endpoint).json['items'][0]['image_url'], first_url)
        first_download = self.client.get(first_url)
        self.assertEqual(first_download.status_code, 200)
        self.assertEqual(first_download.data, image)
        first_download.close()
        self.assertEqual(self.client.patch(endpoint+'/'+bulletin_id, data=payload()).status_code, 403)
        self.auth.payload = {'sub': 'member-1'}
        replaced = self.client.patch(endpoint+'/'+bulletin_id, data=payload())
        self.assertEqual(replaced.status_code, 200, replaced.json)
        second_url = replaced.json['image_url']
        self.assertNotEqual(first_url, second_url)
        self.assertEqual(self.client.get(first_url).status_code, 404)
        first_key = first_url.rsplit('/', 1)[1]
        self.assertTrue((Path(self.temp.name) / 'community_uploads' / first_key).is_file())
        second_download = self.client.get(second_url)
        self.assertEqual(second_download.status_code, 200)
        second_download.close()
        removed = self.client.patch(endpoint+'/'+bulletin_id, data={'remove_image': 'true'})
        self.assertEqual(removed.status_code, 200, removed.json)
        self.assertIsNone(removed.json['image_url'])
        self.assertEqual(self.client.get(second_url).status_code, 404)
        second_key = second_url.rsplit('/', 1)[1]
        bulletin = ForumBulletin.query.filter_by(id=bulletin_id).one()
        self.assertEqual(bulletin.image_history, [first_key, second_key])
        self.assertTrue((Path(self.temp.name) / 'community_uploads' / second_key).is_file())
        latest = self.client.patch(endpoint+'/'+bulletin_id, data=payload()).json['image_url']
        latest_key = latest.rsplit('/', 1)[1]
        self.assertEqual(self.client.delete(endpoint+'/'+bulletin_id).status_code, 204)
        self.assertEqual(bulletin.status, 'deleted')
        self.assertEqual(bulletin.image_storage_key, latest_key)
        self.assertTrue((Path(self.temp.name) / 'community_uploads' / latest_key).is_file())
        self.assertEqual(self.client.get(latest).status_code, 404)
        self.auth.is_signed_in = False
        self.auth.reason = None
        self.assertEqual(self.client.get(endpoint).status_code, 401)

    def test_upload_and_authenticated_download(self):
        import base64
        image = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1kAAAAASUVORK5CYII=')
        response = self.client.post(self.base, data={
            'title': 'Photo', 'content': 'My experience',
            'image': (io.BytesIO(image), 'photo.png', 'image/png'),
        })
        self.assertEqual(response.status_code, 201, response.json)
        url = response.json['image_url']
        download = self.client.get(url)
        self.assertEqual(download.status_code, 200)
        self.assertEqual(download.data, image)
        download.close()
        self.auth.is_signed_in = False
        self.auth.reason = None
        self.assertEqual(self.client.get(url).status_code, 401)

    def test_invalid_uploads_and_post_payloads(self):
        for image, mime in [(b'fake', 'image/png'), (b'x'*(5*1024*1024+1), 'image/jpeg')]:
            response = self.client.post(self.base, data={
                'title': 'Photo', 'content': 'Experience',
                'image': (io.BytesIO(image), 'photo.png', mime),
            })
            self.assertIn(response.status_code, [400, 413])
        for data in [[], ['bad'], {'title': ' ', 'content': 'x'}, {'title': 'x'*201, 'content': 'x'}, {'title': 'x', 'content': 'x'*3001}]:
            self.assertEqual(self.client.post(self.base, json=data).status_code, 400)
        self.assertEqual(self.client.get(self.base+'?view=unknown').status_code, 400)
        self.assertEqual(self.client.put(self.base+'/missing/like').status_code, 404)


if __name__ == '__main__':
    unittest.main()
