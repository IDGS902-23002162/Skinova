"""Grant the forum moderator role to one existing Clerk account.

From backend: .venv/Scripts/python.exe scripts/grant_forum_moderator.py <clerk-user-id>
"""

import argparse
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import create_app  # noqa: E402
from app.extensions import db  # noqa: E402
from app.modules.users.models import User  # noqa: E402


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('clerk_user_id')
    args = parser.parse_args()
    app = create_app()
    with app.app_context():
        user = User.query.filter_by(clerk_user_id=args.clerk_user_id).first()
        if not user:
            raise SystemExit('No existing Skinova user has that Clerk ID.')
        if user.role == 'admin':
            print('The account already has administrator access.')
            return
        user.role = 'moderator'
        db.session.commit()
        print('Moderator access granted to the selected account.')


if __name__ == '__main__':
    main()
