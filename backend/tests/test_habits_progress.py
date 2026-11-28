import unittest
from datetime import date, datetime, timezone
from unittest.mock import MagicMock, patch

from app import create_app
from app.extensions import db
from app.modules.habitos_desafios.models import ChallengeDay, Habit, HabitEntry
from app.modules.mi_neceser.models import UserProduct
from app.modules.users.models import User
from config import DevelopmentConfig


class HabitsProgressTests(unittest.TestCase):
    def setUp(self):
        with patch.object(DevelopmentConfig, 'SQLALCHEMY_DATABASE_URI', 'sqlite:///:memory:'):
            self.app = create_app()
        self.app.config['TESTING'] = True
        with self.app.app_context():
            db.create_all()
            db.session.add_all([User(clerk_user_id='member-1'), User(clerk_user_id='member-2')])
            db.session.commit()
        self.client = self.app.test_client()
        self.auth = MagicMock(is_signed_in=True, payload={'sub': 'member-1'})
        self.enterContext(patch.dict('os.environ', {'CLERK_SECRET_KEY': 'test-only'}))
        clerk = self.enterContext(patch('app.auth.Clerk'))
        clerk.return_value.authenticate_request.return_value = self.auth
        self.day = self.enterContext(patch('app.modules.habitos_desafios.routes._today', return_value=date(2026, 11, 23)))

    def test_habits_and_challenges_accept_only_products_from_their_own_neceser(self):
        with self.app.app_context():
            owner = User.query.filter_by(clerk_user_id='member-1').one()
            other = User.query.filter_by(clerk_user_id='member-2').one()
            first = UserProduct(user_id=owner.id, name='Crema')
            second = UserProduct(user_id=owner.id, name='Limpiador')
            removed = UserProduct(user_id=owner.id, name='Retirado', active=False)
            foreign = UserProduct(user_id=other.id, name='Ajeno')
            db.session.add_all([first, second, removed, foreign])
            db.session.commit()
            own_ids = [first.id, second.id]
            unavailable_ids = [removed.id, foreign.id]
        options = self.client.get('/api/mi-neceser/productos/opciones').json['items']
        self.assertEqual([item['id'] for item in options], own_ids)

        for kind in ('habitos', 'retos'):
            base = f'/api/habitos-desafios/{kind}'
            payload = {'title': 'Mi cuidado', 'product_ids': [*own_ids, own_ids[0]]}
            saved = self.client.post(base, json=payload)
            self.assertEqual(saved.status_code, 201, saved.json)
            self.assertEqual(saved.json['product_ids'], own_ids)
            url = f"{base}/{saved.json['id']}"
            self.assertEqual(self.client.put(url, json={'title': 'Actualizado'}).json['product_ids'], own_ids)
            for unavailable in unavailable_ids:
                self.assertEqual(self.client.put(url, json={'product_ids': [unavailable]}).status_code, 400)
                self.assertEqual(self.client.post(base, json={**payload, 'product_ids': [unavailable]}).status_code, 400)
            self.assertEqual(self.client.put(url, json={'product_ids': []}).json['product_ids'], [])
            self.assertEqual(self.client.get(base).json['items'][0]['product_ids'], [])

    def test_weekly_habit_accumulates_without_duplicate_entries(self):
        path = '/api/habitos-desafios/habitos'
        habit = self.client.post(path, json={
            'title': 'Mi rutina', 'frequency': 'weekly', 'target_value': 4, 'focus': 'face', 'unit': 'aplicaciones',
        })
        self.assertEqual(habit.status_code, 201)
        self.assertEqual((habit.json['focus'], habit.json['unit']), ('face', 'aplicaciones'))
        progress = f"{path}/{habit.json['id']}/progreso"
        for _ in range(2):
            self.assertEqual(self.client.put(progress, json={'value': 2}).json['period_value'], 2)
        self.day.return_value = date(2026, 11, 24)
        self.assertEqual(self.client.put(progress, json={'value': 3}).status_code, 422)
        self.assertEqual(self.client.put(progress, json={'value': 1}).json['period_value'], 3)
        habit_url = f"{path}/{habit.json['id']}"
        changed = self.client.put(habit_url, json={'title': 'Rutina nueva', 'target_value': 6, 'focus': 'feet'})
        self.assertEqual(changed.status_code, 200)
        self.assertEqual(changed.json['focus'], 'feet')
        self.assertEqual((changed.json['title'], changed.json['target_value'], changed.json['period_value']),
                         ('Rutina nueva', 6, 3))
        self.assertEqual(self.client.put(habit_url, json={'target_value': 0}).status_code, 400)
        self.day.return_value = date(2026, 11, 30)
        self.assertEqual(self.client.get(path).json['items'][0]['period_value'], 0)
        self.assertEqual(self.client.delete(habit_url).status_code, 200)
        self.assertEqual(self.client.get(path).json['items'], [])
        self.day.return_value = date(2026, 11, 24)
        self.assertEqual(self.client.put(habit_url, json={'active': True}).json['period_value'], 3)
        self.auth.payload = {'sub': 'member-2'}
        self.assertEqual(self.client.put(habit_url, json={'title': 'Ajeno'}).status_code, 404)
        self.assertEqual(self.client.put(progress, json={'value': 1}).status_code, 404)
        self.assertEqual(self.client.get(path).json['items'], [])

    def test_challenge_counts_distinct_days_and_supports_undo(self):
        path = '/api/habitos-desafios/retos'
        challenge = self.client.post(path, json={
            'title': 'Constancia', 'duration_days': 2, 'focus': 'hair', 'unit': 'lavados',
        })
        self.assertEqual(challenge.status_code, 201)
        self.assertEqual((challenge.json['focus'], challenge.json['unit']), ('hair', 'lavados'))
        progress = f"{path}/{challenge.json['id']}/progreso"
        for _ in range(2):
            self.assertEqual(self.client.put(progress, json={'done': True}).json['days_done'], 1)
        self.day.return_value = date(2026, 11, 24)
        completed = self.client.put(progress, json={'done': True}).json
        self.assertEqual(completed['status'], 'completed')
        self.assertEqual(completed['days_done'], 2)
        self.assertIsNotNone(completed['completed_at'])
        reopened = self.client.put(progress, json={'done': False}).json
        self.assertEqual(reopened['status'], 'active')
        self.assertEqual(reopened['days_done'], 1)
        self.assertIsNone(reopened['completed_at'])
        challenge_url = f"{path}/{challenge.json['id']}"
        edited = self.client.put(challenge_url, json={
            'title': 'Rutina ajustada', 'duration_days': 1, 'unit': 'sesiones', 'focus': 'beard',
        })
        self.assertEqual(edited.status_code, 200)
        self.assertEqual((edited.json['title'], edited.json['unit'], edited.json['focus']),
                         ('Rutina ajustada', 'sesiones', 'beard'))
        self.assertEqual((edited.json['days_done'], edited.json['status']), (1, 'completed'))
        self.assertEqual(self.client.put(progress, json={'done': True}).status_code, 422)
        reopened_again = self.client.put(challenge_url, json={'duration_days': 3})
        self.assertEqual((reopened_again.json['days_done'], reopened_again.json['status']), (1, 'active'))
        self.assertEqual(self.client.put(challenge_url, json={'duration_days': 0}).status_code, 400)
        self.auth.payload = {'sub': 'member-2'}
        self.assertEqual(self.client.put(challenge_url, json={'title': 'Ajeno'}).status_code, 404)
        self.assertEqual(self.client.delete(challenge_url).status_code, 404)
        self.auth.payload = {'sub': 'member-1'}
        self.assertEqual(self.client.delete(challenge_url).status_code, 200)
        self.assertEqual(self.client.get(path).json['items'], [])
        with self.app.app_context():
            self.assertEqual(ChallengeDay.query.filter_by(challenge_id=challenge.json['id']).count(), 1)
        self.assertEqual(self.client.put(progress, json={'done': True}).status_code, 409)

    def test_daily_habit_closes_periods_and_preserves_history_when_goal_changes(self):
        base = '/api/habitos-desafios/habitos'
        saved = self.client.post(base, json={'title': 'Hidratación', 'target_value': 2}).json
        url = f"{base}/{saved['id']}"
        self.assertEqual((saved['period']['start'], saved['period']['end']), ('2026-11-23', '2026-11-23'))
        self.assertEqual(self.client.put(url + '/progreso', json={'value': 3}).status_code, 422)
        self.assertEqual(self.client.put(url + '/progreso', json={'value': 2}).json['period_value'], 2)
        self.day.return_value = date(2026, 11, 25)
        self.assertEqual(self.client.put(url + '/progreso', json={
            'value': 2, 'period_start': '2026-11-23',
        }).status_code, 409)
        edited = self.client.put(url, json={'target_value': 4, 'frequency': 'weekly'}).json
        self.assertEqual((edited['period']['start'], edited['period']['end']), ('2026-11-25', '2026-11-29'))
        self.assertEqual(edited['failed_count'], 1)
        self.assertEqual([(row['status'], row['value'], row['target']) for row in edited['history']],
                         [('failed', 0, 2), ('completed', 2, 2)])
        self.assertEqual(self.client.delete(url).status_code, 200)
        self.day.return_value = date(2026, 12, 5)
        archived = self.client.get('/api/habitos-desafios/historial/retirados?tipo=habitos').json['items'][0]
        self.assertEqual(archived['failed_count'], 1)
        self.assertEqual(archived['history'][0]['status'], 'cancelled')
        self.assertEqual(archived['history'][0]['end'], '2026-11-25')
        self.auth.payload = {'sub': 'member-2'}
        self.assertEqual(self.client.get('/api/habitos-desafios/historial/retirados?tipo=habitos').json['items'], [])
        self.auth.payload = {'sub': 'member-1'}
        resumed = self.client.put(url, json={'active': True}).json
        self.assertEqual(resumed['period']['start'], '2026-12-05')
        self.assertEqual(resumed['failed_count'], 1)
        self.assertEqual(resumed['history'], archived['history'])

    def test_challenge_renews_after_duration_and_counts_failed_cycles(self):
        base = '/api/habitos-desafios/retos'
        created = self.client.post(base, json={'title': 'Reto de dos días', 'duration_days': 2}).json
        progress = f"{base}/{created['id']}/progreso"
        self.assertEqual(self.client.put(progress, json={'done': True}).json['days_done'], 1)
        self.day.return_value = date(2026, 11, 25)
        renewed = self.client.put(progress, json={'done': True}).json
        self.assertEqual((renewed['period']['start'], renewed['period']['end']), ('2026-11-25', '2026-11-26'))
        self.assertEqual(renewed['failed_count'], 1)
        self.assertEqual((renewed['history'][0]['status'], renewed['history'][0]['value']), ('failed', 1))
        self.day.return_value = date(2026, 11, 26)
        self.assertEqual(self.client.put(progress, json={'done': True}).json['status'], 'completed')
        self.day.return_value = date(2026, 11, 27)
        renewed = self.client.get(base).json['items'][0]
        self.assertEqual((renewed['status'], renewed['days_done']), ('active', 0))
        self.assertEqual([row['status'] for row in renewed['history']], ['completed', 'failed'])

    def test_legacy_overrun_is_capped_and_can_be_corrected(self):
        base = '/api/habitos-desafios/habitos'
        with self.app.app_context():
            owner = User.query.filter_by(clerk_user_id='member-1').one()
            habit = Habit(user_id=owner.id, title='Registro anterior', target_value=7,
                          created_at=datetime(2026, 11, 23, 12, tzinfo=timezone.utc))
            db.session.add(habit)
            db.session.flush()
            habit_id = habit.id
            db.session.add(HabitEntry(habit_id=habit_id, day=date(2026, 11, 23), value=10))
            db.session.commit()
        current = self.client.get(base).json['items'][0]
        self.assertEqual((current['today_value'], current['period_value']), (7, 7))
        self.assertEqual(self.client.put(f'{base}/{habit_id}/progreso', json={'value': 6}).json['period_value'], 6)
