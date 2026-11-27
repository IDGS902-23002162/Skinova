import os
import unittest
from unittest.mock import patch

os.environ["TESTING"] = "True"

from app import create_app, db
from app.modules.users.models import User
from app.modules.ai_history.models import AiHistory


class TestConsultaIaChat(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.app.config["TESTING"] = True
        cls.client = cls.app.test_client()

    def setUp(self):
        self.ctx = self.app.app_context()
        self.ctx.push()
        self.user_id = "test_chat_user_001"
        self.clerk_id = "clerk_test_chat_001"
        user = User.query.filter_by(id=self.user_id).first()
        if not user:
            user = User(id=self.user_id, clerk_user_id=self.clerk_id)
            db.session.add(user)
            db.session.commit()

        self.entry = AiHistory(
            user_id=self.user_id,
            interaction_type="product_query",
            query_text="CeraVe Cleanser",
            subject="CeraVe Foaming Cleanser",
            summary="Limpiador suave.",
            result={"subject": "CeraVe Foaming Cleanser", "summary": "Limpiador suave."},
        )
        db.session.add(self.entry)
        db.session.commit()

    def tearDown(self):
        AiHistory.query.filter_by(user_id=self.user_id).delete()
        User.query.filter_by(id=self.user_id).delete()
        db.session.commit()
        self.ctx.pop()

    def test_chat_requires_message(self):
        resp = self.client.post(
            "/api/products/chat",
            headers={"X-Test-User-Id": self.clerk_id},
            json={"history_id": self.entry.id, "message": "   "},
        )
        self.assertEqual(resp.status_code, 400)

    @patch("app.services.gemini_service.chat_product_with_gemini", return_value="Úsalo mañana y noche antes del hidratante.")
    def test_chat_persists_messages_and_returns_reply(self, mock_gemini):
        resp = self.client.post(
            "/api/products/chat",
            headers={"X-Test-User-Id": self.clerk_id},
            json={"history_id": self.entry.id, "message": "¿Cuándo lo aplico?"},
        )
        self.assertEqual(resp.status_code, 200)
        body = resp.get_json()
        self.assertTrue(body["success"])
        self.assertEqual(body["data"]["reply"], "Úsalo mañana y noche antes del hidratante.")
        mock_gemini.assert_called_once()

        db.session.expire_all()
        updated = AiHistory.query.filter_by(id=self.entry.id).first()
        chat_msgs = updated.result.get("chat_messages", [])
        self.assertEqual(len(chat_msgs), 2)
        self.assertEqual(chat_msgs[0]["role"], "user")
        self.assertEqual(chat_msgs[0]["content"], "¿Cuándo lo aplico?")
        self.assertEqual(chat_msgs[1]["role"], "assistant")
        self.assertEqual(chat_msgs[1]["content"], "Úsalo mañana y noche antes del hidratante.")


if __name__ == "__main__":
    unittest.main()

