"""Seed the local SQLite database with repeatable community demo records."""

import uuid

from app import create_app
from app.extensions import db
from app.modules.comunidad.models import ForumComment, ForumPost, ForumPostFavorite
from app.modules.perfil_salud.models import UserProfile
from app.modules.users.models import User


LOCAL_DATABASE_URI = 'sqlite:///./skinova_local.db'
DEMO_NAMESPACE = uuid.UUID('4e9a1c50-966b-4717-9e3d-406a83d570cf')


def demo_id(value):
    return str(uuid.uuid5(DEMO_NAMESPACE, value))


app = create_app('development')
if app.config['SQLALCHEMY_DATABASE_URI'] != LOCAL_DATABASE_URI:
    raise SystemExit(
        'Seed detenido: configura DATABASE_URL=sqlite:///./skinova_local.db '
        'para evitar modificar una base externa.'
    )


with app.app_context():
    db.create_all()

    demo_users = [
        ('skinova-local-demo-owner', 'Perfil demo local'),
        ('skinova-local-demo-ana', 'Ana (demo)'),
        ('skinova-local-demo-sofia', 'Sofía (demo)'),
        ('skinova-local-demo-lucia', 'Lucía (demo)'),
    ]
    users = {}

    for clerk_user_id, preferred_name in demo_users:
        user = User.query.filter_by(clerk_user_id=clerk_user_id).first()
        if not user:
            user = User(
                id=demo_id(clerk_user_id),
                clerk_user_id=clerk_user_id,
                role='user',
            )
            db.session.add(user)
            db.session.flush()

        profile = UserProfile.query.filter_by(user_id=user.id).first()
        if not profile:
            db.session.add(
                UserProfile(
                    user_id=user.id,
                    preferred_name=preferred_name,
                    onboarding_completed=True,
                )
            )
        users[clerk_user_id] = user

    local_accounts = User.query.filter(
        ~User.clerk_user_id.startswith('skinova-local-demo-')
    ).all()
    owner = (
        local_accounts[0]
        if len(local_accounts) == 1
        else users['skinova-local-demo-owner']
    )

    def author_for(clerk_user_id):
        if clerk_user_id == 'skinova-local-demo-owner':
            return owner
        return users[clerk_user_id]

    post_specs = [
        (
            'routine-morning',
            '¿Cómo mantienen sencilla su rutina de mañana?',
            'Estoy buscando una rutina fácil de seguir. ¿Qué paso les ayuda más a ser constantes?',
            'Rutinas',
            'skinova-local-demo-owner',
        ),
        (
            'sensitive-skin',
            '¿Cómo registran los cambios de su piel?',
            'Empecé a anotar cómo se siente mi piel cada día. ¿Qué detalles suelen observar ustedes?',
            'Piel sensible',
            'skinova-local-demo-ana',
        ),
        (
            'sunscreen-habit',
            'Un pequeño hábito para recordar el protector solar',
            'Dejarlo junto a las llaves me ayuda a acordarme antes de salir.',
            'Recomendaciones',
            'skinova-local-demo-sofia',
        ),
        (
            'product-introduction',
            '¿Cómo organizan la introducción de un producto nuevo?',
            'Me sirve ir con calma y anotar qué producto incorporé. ¿Tienen algún método para llevar ese registro?',
            'Rutinas',
            'skinova-local-demo-lucia',
        ),
        (
            'night-routine',
            'Mi rutina nocturna de tres pasos',
            'Simplificar mis pasos por la noche me ayudó a mantener una rutina que sí puedo repetir.',
            'Recomendaciones',
            'skinova-local-demo-owner',
        ),
    ]
    posts = {}

    for key, title, content, category, author_key in post_specs:
        post_id = demo_id(f'post:{key}')
        post = db.session.get(ForumPost, post_id)
        if not post:
            post = ForumPost(
                id=post_id,
                title=title,
                content=content,
                category=category,
                tags=[],
                status='active',
            )
            db.session.add(post)
        post.user_id = author_for(author_key).id
        posts[key] = post

    reply_specs = [
        (
            'routine-tip',
            'routine-morning',
            'skinova-local-demo-ana',
            'A mí me ayuda dejar preparados mis productos para tenerlos a la vista.',
        ),
        (
            'routine-thanks',
            'routine-morning',
            'skinova-local-demo-owner',
            '¡Gracias! Voy a probarlo para que mi rutina sea más fácil de seguir.',
        ),
        (
            'skin-observation',
            'sensitive-skin',
            'skinova-local-demo-sofia',
            'Anotar la fecha y cómo se siente me ha ayudado a ver patrones.',
        ),
        (
            'sunscreen-reply',
            'sunscreen-habit',
            'skinova-local-demo-lucia',
            'También me funciona poner un recordatorio junto a mis cosas de diario.',
        ),
        (
            'product-reply',
            'product-introduction',
            'skinova-local-demo-owner',
            'Llevar una lista con la fecha de inicio suena muy práctico.',
        ),
    ]

    for key, post_key, author_key, content in reply_specs:
        comment_id = demo_id(f'comment:{key}')
        comment = db.session.get(ForumComment, comment_id)
        if not comment:
            comment = ForumComment(
                id=comment_id,
                post_id=posts[post_key].id,
                content=content,
                status='active',
            )
            db.session.add(comment)
        comment.user_id = author_for(author_key).id

    favorite_specs = [
        ('skinova-local-demo-owner', 'sensitive-skin'),
        ('skinova-local-demo-owner', 'sunscreen-habit'),
        ('skinova-local-demo-ana', 'routine-morning'),
    ]

    for user_key, post_key in favorite_specs:
        favorite_id = demo_id(f'favorite:{user_key}:{post_key}')
        favorite = db.session.get(ForumPostFavorite, favorite_id)
        if not favorite:
            favorite = ForumPostFavorite(
                id=favorite_id,
                post_id=posts[post_key].id,
            )
            db.session.add(favorite)
        favorite.user_id = author_for(user_key).id
        favorite.deleted_at = None

    db.session.commit()
    print(
        'Datos demo locales listos: 4 perfiles de prueba, 5 publicaciones, '
        '5 respuestas y 3 favoritos. No se modificó la base externa.'
    )
