import unittest
from datetime import date
from unittest.mock import MagicMock, patch

from app import create_app
from app.extensions import db
from app.modules.habitos_desafios.models import ChallengeDay
from app.modules.users.models import User
from config import DevelopmentConfig


class HabitsProgressTests(unittest.TestCase):
    def setUp(self):
        with patch.object(DevelopmentConfig, 'SQLALCHEMY_DATABASE_URI', 'sqlite:///:memory:'):
            app = create_app()
        app.config['TESTING'] = True
        context = app.app_context()
        context.push()
        self.addCleanup(context.pop)
        db.create_all()
        db.session.add_all([User(clerk_user_id='member-1'), User(clerk_user_id='member-2')])
        db.session.commit()
        self.client = app.test_client()
        self.auth = MagicMock(is_signed_in=True, payload={'sub': 'member-1'})
        self.enterContext(patch.dict('os.environ', {'CLERK_SECRET_KEY': 'test-only'}))
        clerk = self.enterContext(patch('app.auth.Clerk'))
        clerk.return_value.authenticate_request.return_value = self.auth
        self.day = self.enterContext(patch('app.modules.habitos_desafios.routes._today', return_value=date(2026, 11, 23)))

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
        self.day.return_value = date(2026, 11, 26)
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
        reopened_again = self.client.put(challenge_url, json={'duration_days': 3})
        self.assertEqual((reopened_again.json['days_done'], reopened_again.json['status']), (1, 'active'))
        self.assertEqual(self.client.put(challenge_url, json={'duration_days': 0}).status_code, 400)
        self.auth.payload = {'sub': 'member-2'}
        self.assertEqual(self.client.put(challenge_url, json={'title': 'Ajeno'}).status_code, 404)
        self.assertEqual(self.client.delete(challenge_url).status_code, 404)
        self.auth.payload = {'sub': 'member-1'}
        self.assertEqual(self.client.delete(challenge_url).status_code, 200)
        self.assertEqual(self.client.get(path).json['items'], [])
        self.assertEqual(ChallengeDay.query.filter_by(challenge_id=challenge.json['id']).count(), 1)
        self.assertEqual(self.client.put(progress, json={'done': True}).status_code, 409)
