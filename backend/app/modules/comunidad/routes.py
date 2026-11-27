import json
import os
import re
import subprocess
import uuid
from datetime import datetime, timezone

from flask import (
    Blueprint,
    current_app,
    g,
    jsonify,
    request,
    send_from_directory,
    url_for,
)
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from PIL import Image

from app.auth import require_auth
from app.extensions import db
from app.modules.comunidad.models import (
    Comment,
    ForumComment,
    ForumFollow,
    ForumPost,
    ForumPostFavorite,
    ForumPostLike,
    ForumReport,
    ForumReportRead,
    ForumBulletin,
    Post,
)
from app.modules.perfil_salud.models import UserProfile
from app.modules.users.models import User
from app.modules.notificaciones.models import Notification
from app.modules.comunidad.moderation import (
    ImageModerationUnavailable, flagged_image, flagged_image_context, flagged_text, image_inputs,
)

comunidad_bp = Blueprint('comunidad', __name__, url_prefix='/api/comunidad')
MAX_FORUM_IMAGE_BYTES = 5 * 1024 * 1024
MAX_FORUM_COMMENT_PAGE_SIZE = 50
MAX_FORUM_POST_PAGE_SIZE = 30
FORUM_REPORT_REASON_LABELS = {
    'unsafe_advice': 'consejo de salud riesgoso',
    'disrespect': 'falta de respeto',
    'spam': 'publicidad o spam',
    'other': 'otro motivo',
    'explicit': 'contenido sexual explícito',
    'hate': 'discurso de odio',
    'violence': 'violencia o amenazas',
    'gore': 'sangre o violencia gráfica',
    'weapons': 'presencia de armas',
    'hentai': 'hentai o ilustración sexual explícita',
}
FORUM_REVIEW_FIELDS = {
    'title': 'el título', 'text': 'el texto', 'image': 'la imagen',
    'category': 'la categoría', 'tags': 'las etiquetas',
}
PRIVATE_COMMENT_STATUSES = ('pending_review', 'rejected')
IMAGE_REVIEW_UNAVAILABLE = 'image_review_unavailable'


def _text_detections(fields):
    detections = []
    for field, values in fields.items():
        reason = flagged_text(*values)
        if reason:
            detections.append({'field': field, 'reason': reason})
    return detections


def _queue_forum_review(target, target_type, detections):
    db.session.flush()
    primary = detections[0]
    db.session.add(ForumReport(
        reporter_user_id=target.user_id, target_type=target_type, target_id=target.id,
        reason=primary['reason'], medium='image' if primary['field'] == 'image' else 'text',
        detections=detections,
    ))
    detected = ', '.join(
        f"{FORUM_REPORT_REASON_LABELS[item['reason']]} en {FORUM_REVIEW_FIELDS[item['field']]}"
        for item in detections
        if item['reason'] != IMAGE_REVIEW_UNAVAILABLE
    )
    subject = 'Tu publicación está' if target_type == 'post' else 'Tu respuesta está'
    message = f'{subject} en revisión antes de publicarse.'
    if detected:
        message += f' Se detectó {detected}.'
    if any(item['reason'] == IMAGE_REVIEW_UNAVAILABLE for item in detections):
        message += ' La imagen se revisará manualmente porque el análisis automático no está disponible.'
    db.session.add(Notification(
        user_id=target.user_id, type='forum_moderation',
        title='Contenido pendiente de revisión', message=message,
    ))
    return {'id': target.id, 'status': 'pending_review', 'message': message}


def _notify_forum_reply(post, parent, author_id):
    recipient_id = parent.user_id if parent else post.user_id
    if recipient_id != author_id:
        db.session.add(Notification(
            user_id=recipient_id,
            type='forum_reply',
            title='Nueva respuesta en la comunidad',
            message='Alguien respondió a tu comentario.' if parent else 'Alguien respondió a tu publicación.',
            action_path=f'/comunidad?post={post.id}',
        ))


def _forum_text_error(*values):
    reason = flagged_text(*values)
    if reason:
        label = FORUM_REPORT_REASON_LABELS[reason]
        return jsonify({'error': f'Revisa el texto antes de enviarlo. Se detectó {label}.'}), 422
    return None


def _forum_image_detection(image_bytes):
    if image_bytes is None:
        return None, None
    try:
        pixels, jpeg = image_inputs(image_bytes)
    except (Image.DecompressionBombError, OSError, ValueError):
        return None, (jsonify({'error': 'Usa una imagen válida y estática de hasta 16 megapíxeles.'}), 400)
    try:
        reason = flagged_image(pixels) or flagged_image_context(jpeg)
    except (ImageModerationUnavailable, OSError, subprocess.SubprocessError, ValueError, TypeError, KeyError):
        current_app.logger.warning('Forum image classifier unavailable', exc_info=True)
        return IMAGE_REVIEW_UNAVAILABLE, None
    return reason, None


def _uploaded_forum_image():
    image = request.files.get('image')
    if not image or not image.filename:
        return None, None, None

    image_bytes = image.stream.read(MAX_FORUM_IMAGE_BYTES + 1)
    if len(image_bytes) > MAX_FORUM_IMAGE_BYTES:
        return None, None, (jsonify({'error': 'Image must be 5 MB or smaller'}), 413)

    signatures = {
        'image/jpeg': ('.jpg', lambda value: value.startswith(b'\xff\xd8\xff')),
        'image/png': ('.png', lambda value: value.startswith(b'\x89PNG\r\n\x1a\n')),
        'image/webp': (
            '.webp',
            lambda value: (
                len(value) >= 12
                and value[:4] == b'RIFF'
                and value[8:12] == b'WEBP'
            ),
        ),
    }
    image_type = signatures.get(image.mimetype.lower())
    if not image_type or not image_type[1](image_bytes):
        return None, None, (
            jsonify({'error': 'Only valid JPEG, PNG, or WebP images are allowed'}),
            400,
        )

    return image_bytes, image_type[0], None


def _save_forum_image(image_bytes, extension):
    filename = f'{uuid.uuid4().hex}{extension}'
    directory = os.path.join(current_app.instance_path, 'community_uploads')
    os.makedirs(directory, exist_ok=True)
    path = os.path.join(directory, filename)
    with open(path, 'wb') as image_file:
        image_file.write(image_bytes)
    return filename, path


def _get_user():
    user = User.query.filter_by(clerk_user_id=g.user_id).first()
    if not user:
        return None
    return user


def _forum_author_name(user_id):
    profile = UserProfile.query.filter_by(user_id=user_id).first()
    if profile and profile.preferred_name:
        return profile.preferred_name
    return 'Miembro de la comunidad'


def _forum_post_to_dict(post, current_user_id, *, followed_ids=None):
    data = post.to_dict()
    data['author'] = _forum_author_name(post.user_id)
    data['is_mine'] = post.user_id == current_user_id
    data['is_following_author'] = not data['is_mine'] and (
        post.user_id in followed_ids if followed_ids is not None
        else db.session.get(ForumFollow, (current_user_id, post.user_id)) is not None
    )
    data['image_url'] = (
        url_for('comunidad.get_forum_post_image', filename=post.image_storage_key)
        if post.image_storage_key
        else None
    )
    return data


def _forum_comment_to_dict(comment, current_user_id=None):
    data = comment.to_dict()
    data['is_mine'] = comment.user_id == current_user_id
    if comment.status != 'active':
        data['author'] = 'Moderación' if comment.status == 'hidden' else 'Miembro de la comunidad'
        data['content'] = 'Comentario oculto por moderación.' if comment.status == 'hidden' else 'Comentario eliminado.'
    else:
        data['author'] = _forum_author_name(comment.user_id)
        if comment.image_storage_key:
            data['image_url'] = url_for('comunidad.get_forum_post_image', filename=comment.image_storage_key)
    return data


@comunidad_bp.route('/posts', methods=['GET'])
@require_auth
def list_posts():
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    posts = Post.query.order_by(Post.created_at.desc()).all()
    return jsonify({'items': [
        {
            'id': post.id,
            'user_id': post.user_id,
            'title': post.title,
            'content': post.content,
            'type': post.type,
            'tags': post.tags,
            'status': post.status,
            'created_at': post.created_at.isoformat() if post.created_at else None,
        }
        for post in posts
    ]}), 200


@comunidad_bp.route('/posts', methods=['POST'])
@require_auth
def create_post():
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json(silent=True) or {}
    title = (data.get('title') or '').strip()
    content = (data.get('content') or '').strip()
    if not title or not content:
        return jsonify({'error': 'title and content are required'}), 400
    text_error = _forum_text_error(title, content)
    if text_error:
        return text_error

    post = Post(
        user_id=user.id,
        title=title,
        content=content,
        type=data.get('type', 'discussion'),
        tags=data.get('tags', []),
        status=data.get('status', 'active'),
    )
    db.session.add(post)
    db.session.commit()
    return jsonify({
        'id': post.id,
        'user_id': post.user_id,
        'title': post.title,
        'content': post.content,
        'type': post.type,
        'tags': post.tags,
        'status': post.status,
        'created_at': post.created_at.isoformat() if post.created_at else None,
    }), 201


@comunidad_bp.route('/posts/<post_id>', methods=['GET'])
@require_auth
def get_post(post_id):
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    post = Post.query.filter_by(id=post_id).first()
    if not post:
        return jsonify({'error': 'Post not found'}), 404

    comments = Comment.query.filter_by(post_id=post.id).order_by(Comment.created_at.asc()).all()
    return jsonify({
        'post': {
            'id': post.id,
            'user_id': post.user_id,
            'title': post.title,
            'content': post.content,
            'type': post.type,
            'tags': post.tags,
            'status': post.status,
            'created_at': post.created_at.isoformat() if post.created_at else None,
        },
        'comments': [{
            'id': comment.id,
            'post_id': comment.post_id,
            'user_id': comment.user_id,
            'parent_comment_id': comment.parent_comment_id,
            'content': comment.content,
            'status': comment.status,
            'created_at': comment.created_at.isoformat() if comment.created_at else None,
        } for comment in comments]
    }), 200


@comunidad_bp.route('/posts/<post_id>/comments', methods=['GET'])
@require_auth
def list_comments(post_id):
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    post = Post.query.filter_by(id=post_id).first()
    if not post:
        return jsonify({'error': 'Post not found'}), 404

    comments = Comment.query.filter_by(post_id=post.id).order_by(Comment.created_at.asc()).all()
    return jsonify({'items': [{
        'id': comment.id,
        'post_id': comment.post_id,
        'user_id': comment.user_id,
        'parent_comment_id': comment.parent_comment_id,
        'content': comment.content,
        'status': comment.status,
        'created_at': comment.created_at.isoformat() if comment.created_at else None,
    } for comment in comments]}), 200


@comunidad_bp.route('/posts/<post_id>/comments', methods=['POST'])
@require_auth
def create_comment(post_id):
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    post = Post.query.filter_by(id=post_id).first()
    if not post:
        return jsonify({'error': 'Post not found'}), 404

    data = request.get_json(silent=True) or {}
    content = (data.get('content') or '').strip()
    if not content:
        return jsonify({'error': 'content is required'}), 400
    text_error = _forum_text_error(content)
    if text_error:
        return text_error

    comment = Comment(
        post_id=post.id,
        user_id=user.id,
        parent_comment_id=data.get('parent_comment_id'),
        content=content,
        status=data.get('status', 'active'),
    )
    db.session.add(comment)
    db.session.commit()
    return jsonify({
        'id': comment.id,
        'post_id': comment.post_id,
        'user_id': comment.user_id,
        'parent_comment_id': comment.parent_comment_id,
        'content': comment.content,
        'status': comment.status,
        'created_at': comment.created_at.isoformat() if comment.created_at else None,
    }), 201


@comunidad_bp.route('/foro/posts', methods=['GET'])
@require_auth
def list_forum_posts():
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    view = request.args.get('view', 'all')
    query = ForumPost.query.filter_by(status='active')
    if view == 'following':
        followed = db.session.query(ForumFollow.followed_id).filter_by(follower_id=user.id)
        query = query.filter(ForumPost.user_id.in_(followed))
    elif view == 'mine':
        query = query.filter_by(user_id=user.id)
    elif view == 'favorites':
        favorite_post_ids = db.session.query(ForumPostFavorite.post_id).filter_by(
            user_id=user.id, deleted_at=None
        )
        query = query.filter(ForumPost.id.in_(favorite_post_ids))
    elif view != 'all':
        return jsonify({'error': 'La vista debe ser following, all, mine o favorites.'}), 400

    try:
        limit = int(request.args.get('limit', 12))
        offset = int(request.args.get('offset', 0))
    except ValueError:
        return jsonify({'error': 'limit and offset must be integers'}), 400
    if limit < 1 or limit > MAX_FORUM_POST_PAGE_SIZE or offset < 0:
        return jsonify({'error': 'Invalid pagination values'}), 400
    category = request.args.get('category', '').strip()
    search = request.args.get('search', '').strip()
    if len(category) > 50 or len(search) > 100:
        return jsonify({'error': 'Filter is too long'}), 400
    if category and category != 'Todos':
        query = query.filter(ForumPost.category == category)
    if search:
        pattern = '%' + search.replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_') + '%'
        query = query.filter(or_(
            ForumPost.title.ilike(pattern, escape='\\'),
            ForumPost.content.ilike(pattern, escape='\\'),
        ))

    total = query.count()
    posts = query.order_by(ForumPost.created_at.desc(), ForumPost.id.desc()).offset(offset).limit(limit).all()
    post_ids = [post.id for post in posts]
    comment_counts = {}
    like_counts = {}
    favorite_ids = set()
    liked_ids = set()
    followed_ids = set()
    if post_ids:
        followed_ids = {
            author_id for (author_id,) in db.session.query(ForumFollow.followed_id).filter(
                ForumFollow.follower_id == user.id,
                ForumFollow.followed_id.in_({post.user_id for post in posts}),
            )
        }
        comment_counts = dict(
            db.session.query(ForumComment.post_id, func.count(ForumComment.id))
            .filter(ForumComment.post_id.in_(post_ids), ForumComment.status.notin_(PRIVATE_COMMENT_STATUSES))
            .group_by(ForumComment.post_id)
            .all()
        )
        like_counts = dict(
            db.session.query(ForumPostLike.post_id, func.count(ForumPostLike.id))
            .filter(ForumPostLike.post_id.in_(post_ids), ForumPostLike.deleted_at.is_(None))
            .group_by(ForumPostLike.post_id)
            .all()
        )
        favorite_ids = {
            row[0]
            for row in db.session.query(ForumPostFavorite.post_id)
            .filter(
                ForumPostFavorite.user_id == user.id,
                ForumPostFavorite.post_id.in_(post_ids),
                ForumPostFavorite.deleted_at.is_(None),
            )
            .all()
        }
        liked_ids = {
            row[0]
            for row in db.session.query(ForumPostLike.post_id)
            .filter(
                ForumPostLike.user_id == user.id,
                ForumPostLike.post_id.in_(post_ids),
                ForumPostLike.deleted_at.is_(None),
            )
            .all()
        }

    items = []
    for post in posts:
        item = _forum_post_to_dict(post, user.id, followed_ids=followed_ids)
        item['is_favorite'] = post.id in favorite_ids
        item['comments_count'] = comment_counts.get(post.id, 0)
        item['likes_count'] = like_counts.get(post.id, 0)
        item['is_liked'] = post.id in liked_ids
        items.append(item)

    return jsonify({'items': items, 'pagination': {
        'limit': limit, 'offset': offset, 'total': total,
        'has_more': offset + len(items) < total,
    }}), 200


@comunidad_bp.route('/foro/usuarios/<author_id>/seguir', methods=['PUT', 'DELETE'])
@require_auth
def set_forum_follow(author_id):
    user = _get_user()
    if not user:
        return jsonify({'error': 'Usuario no encontrado'}), 404
    if user.id == author_id:
        return jsonify({'error': 'No puedes seguirte a ti mismo.'}), 400
    if not db.session.get(User, author_id):
        return jsonify({'error': 'Usuario no encontrado'}), 404
    key = (user.id, author_id)
    if request.method == 'DELETE':
        ForumFollow.query.filter_by(follower_id=key[0], followed_id=key[1]).delete()
        db.session.commit()
        return jsonify({'is_following': False})
    if not db.session.get(ForumFollow, key):
        db.session.add(ForumFollow(follower_id=key[0], followed_id=key[1]))
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            if not db.session.get(ForumFollow, key):
                raise
    return jsonify({'is_following': True})


@comunidad_bp.route('/foro/posts', methods=['POST'])
@require_auth
def create_forum_post():
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    if request.mimetype == 'multipart/form-data' and request.content_length:
        if request.content_length > MAX_FORUM_IMAGE_BYTES + 64 * 1024:
            return jsonify({'error': 'Image must be 5 MB or smaller'}), 413

    if request.mimetype == 'multipart/form-data':
        data = request.form
    else:
        data = request.get_json(silent=True) or {}

    if not isinstance(data, (dict, type(request.form))):
        return jsonify({'error': 'Expected an object'}), 400

    title = data.get('title')
    content = data.get('content')
    if not isinstance(title, str) or not isinstance(content, str):
        return jsonify({'error': 'title and content must be strings'}), 400

    title = title.strip()
    content = content.strip()
    if not title or not content:
        return jsonify({'error': 'title and content are required'}), 400
    if len(content) > 3000:
        return jsonify({'error': 'content must be 3000 characters or fewer'}), 400
    if len(title) > 200:
        return jsonify({'error': 'title must be 200 characters or fewer'}), 400

    category = data.get('category') or 'General'
    if not isinstance(category, str):
        return jsonify({'error': 'category must be a string'}), 400
    category = category.strip() or 'General'
    if len(category) > 50:
        return jsonify({'error': 'category must be 50 characters or fewer'}), 400

    tags = data.get('tags', [])
    if isinstance(tags, str):
        try:
            tags = json.loads(tags)
        except ValueError:
            return jsonify({'error': 'tags must be a JSON array'}), 400
    if not isinstance(tags, list) or any(not isinstance(tag, str) for tag in tags):
        return jsonify({'error': 'tags must be an array of strings'}), 400

    detections = _text_detections({
        'title': (title,), 'text': (content,), 'category': (category,), 'tags': tags,
    })

    image_bytes, image_extension, image_error = _uploaded_forum_image()
    if image_error:
        return image_error
    reason, image_error = _forum_image_detection(image_bytes)
    if image_error:
        return image_error
    if reason:
        detections.append({'field': 'image', 'reason': reason})

    image_storage_key = None
    image_path = None
    if image_bytes:
        try:
            image_storage_key, image_path = _save_forum_image(
                image_bytes,
                image_extension,
            )
        except OSError:
            current_app.logger.exception('Could not store forum post image')
            return jsonify({'error': 'Could not store the image'}), 500

    post = ForumPost(
        user_id=user.id,
        title=title,
        content=content,
        category=category,
        tags=tags,
        image_storage_key=image_storage_key,
        status='pending_review' if detections else 'active',
    )
    db.session.add(post)
    try:
        pending = _queue_forum_review(post, 'post', detections) if detections else None
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        if image_path:
            try:
                os.remove(image_path)
            except OSError:
                current_app.logger.exception('Could not remove unreferenced forum image')
        current_app.logger.exception('Could not create forum post')
        return jsonify({'error': 'Could not create forum post'}), 500

    if pending:
        return jsonify(pending), 202
    response = _forum_post_to_dict(post, user.id)
    response.update({
        'is_favorite': False,
        'comments_count': 0,
        'likes_count': 0,
        'is_liked': False,
    })
    return jsonify(response), 201


@comunidad_bp.route('/foro/posts/<post_id>', methods=['GET'])
@require_auth
def get_forum_post(post_id):
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    post = ForumPost.query.filter_by(id=post_id, status='active').first()
    if not post:
        return jsonify({'error': 'Post not found'}), 404
    item = _forum_post_to_dict(post, user.id)
    item['comments_count'] = ForumComment.query.filter_by(post_id=post.id).filter(
        ForumComment.status.notin_(PRIVATE_COMMENT_STATUSES),
    ).count()
    item['likes_count'] = ForumPostLike.query.filter_by(post_id=post.id, deleted_at=None).count()
    item['is_liked'] = ForumPostLike.query.filter_by(post_id=post.id, user_id=user.id, deleted_at=None).first() is not None
    item['is_favorite'] = ForumPostFavorite.query.filter_by(post_id=post.id, user_id=user.id, deleted_at=None).first() is not None
    return jsonify(item), 200


@comunidad_bp.route('/foro/uploads/<filename>', methods=['GET'])
@require_auth
def get_forum_post_image(filename):
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    if not re.fullmatch(r'[0-9a-f]{32}\.(jpg|png|webp)', filename):
        return jsonify({'error': 'Image not found'}), 404
    post_image = ForumPost.query.filter_by(image_storage_key=filename, status='active').first()
    comment_image = (
        ForumComment.query.join(ForumPost, ForumPost.id == ForumComment.post_id)
        .filter(ForumComment.image_storage_key == filename, ForumComment.status == 'active',
                ForumPost.status == 'active').first()
    ) if not post_image else None
    if not post_image and not comment_image:
        return jsonify({'error': 'Image not found'}), 404

    directory = os.path.join(current_app.instance_path, 'community_uploads')
    return send_from_directory(directory, filename, conditional=True)


@comunidad_bp.route('/foro/posts/<post_id>/like', methods=['PUT', 'DELETE'])
@require_auth
def set_forum_post_like(post_id):
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    post = ForumPost.query.filter_by(id=post_id, status='active').first()
    if not post:
        return jsonify({'error': 'Post not found'}), 404

    like = ForumPostLike.query.filter_by(user_id=user.id, post_id=post.id).first()
    if request.method == 'PUT':
        if not like:
            like = ForumPostLike(user_id=user.id, post_id=post.id)
            db.session.add(like)
            try:
                db.session.commit()
            except IntegrityError:
                db.session.rollback()
                like = ForumPostLike.query.filter_by(user_id=user.id, post_id=post.id).first()
                if not like:
                    raise
        if like.deleted_at is not None:
            like.deleted_at = None
            db.session.commit()
    elif like and like.deleted_at is None:
        like.deleted_at = datetime.now(timezone.utc)
        db.session.commit()

    likes_count = ForumPostLike.query.filter_by(post_id=post.id, deleted_at=None).count()
    return jsonify({
        'is_liked': like is not None and like.deleted_at is None,
        'likes_count': likes_count,
    }), 200


@comunidad_bp.route('/foro/posts/<post_id>/favorite', methods=['PUT', 'DELETE'])
@require_auth
def set_forum_post_favorite(post_id):
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    post = ForumPost.query.filter_by(id=post_id, status='active').first()
    if not post:
        return jsonify({'error': 'Post not found'}), 404

    favorite = ForumPostFavorite.query.filter_by(
        user_id=user.id,
        post_id=post.id,
    ).first()

    if request.method == 'PUT':
        if not favorite:
            favorite = ForumPostFavorite(user_id=user.id, post_id=post.id)
            db.session.add(favorite)
            try:
                db.session.commit()
            except IntegrityError:
                db.session.rollback()
                favorite = ForumPostFavorite.query.filter_by(user_id=user.id, post_id=post.id).first()
                if not favorite:
                    raise
        if favorite.deleted_at is not None:
            favorite.deleted_at = None
            db.session.commit()
    elif favorite and favorite.deleted_at is None:
        favorite.deleted_at = datetime.now(timezone.utc)
        db.session.commit()

    return jsonify({'is_favorite': favorite is not None and favorite.deleted_at is None}), 200


@comunidad_bp.route('/foro/posts/<post_id>/comments', methods=['GET'])
@require_auth
def list_forum_comments(post_id):
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    post = ForumPost.query.filter_by(id=post_id, status='active').first()
    if not post:
        return jsonify({'error': 'Post not found'}), 404

    try:
        limit = int(request.args.get('limit', 5))
        offset = int(request.args.get('offset', 0))
    except ValueError:
        return jsonify({'error': 'limit and offset must be integers'}), 400
    if limit < 1 or limit > MAX_FORUM_COMMENT_PAGE_SIZE or offset < 0:
        return jsonify({
            'error': f'limit must be between 1 and {MAX_FORUM_COMMENT_PAGE_SIZE}, and offset cannot be negative',
        }), 400

    parent_id = request.args.get('parent_id')
    if parent_id is not None:
        parent = ForumComment.query.filter_by(id=parent_id, post_id=post.id).first()
        if not parent or parent.status in PRIVATE_COMMENT_STATUSES:
            return jsonify({'error': 'Parent comment not found in this post'}), 400

    comments_query = ForumComment.query.filter_by(
        post_id=post.id,
        parent_comment_id=parent_id,
    ).filter(ForumComment.status.notin_(PRIVATE_COMMENT_STATUSES))
    total = comments_query.count()
    comments = (
        comments_query
        .order_by(ForumComment.created_at.asc(), ForumComment.id.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    comment_ids = [comment.id for comment in comments]
    child_counts = {}
    if comment_ids:
        child_counts = dict(
            db.session.query(ForumComment.parent_comment_id, func.count(ForumComment.id))
            .filter(ForumComment.parent_comment_id.in_(comment_ids),
                    ForumComment.status.notin_(PRIVATE_COMMENT_STATUSES))
            .group_by(ForumComment.parent_comment_id)
            .all()
        )
    items = []
    for comment in comments:
        item = _forum_comment_to_dict(comment, user.id)
        item['replies_count'] = child_counts.get(comment.id, 0)
        items.append(item)
    return jsonify({
        'items': items,
        'pagination': {
            'limit': limit,
            'offset': offset,
            'total': total,
            'has_more': offset + len(comments) < total,
        },
    }), 200


@comunidad_bp.route('/foro/posts/<post_id>/comments', methods=['POST'])
@require_auth
def create_forum_comment(post_id):
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    post = ForumPost.query.filter_by(id=post_id, status='active').first()
    if not post:
        return jsonify({'error': 'Post not found'}), 404

    multipart = request.mimetype == 'multipart/form-data'
    if multipart and request.content_length and request.content_length > MAX_FORUM_IMAGE_BYTES + 64 * 1024:
        return jsonify({'error': 'Image must be 5 MB or smaller'}), 413
    data = request.form if multipart else (request.get_json(silent=True) or {})
    if not multipart and not isinstance(data, dict):
        return jsonify({'error': 'Expected an object'}), 400
    content = data.get('content')
    if not isinstance(content, str):
        return jsonify({'error': 'content must be a string'}), 400

    content = content.strip()
    if not content:
        return jsonify({'error': 'content is required'}), 400

    if len(content) > 3000:
        return jsonify({'error': 'content must be 3000 characters or fewer'}), 400
    detections = _text_detections({'text': (content,)})

    parent_id = data.get('parent_comment_id')
    parent = None
    if parent_id is not None:
        if not isinstance(parent_id, str):
            return jsonify({'error': 'Parent comment not found in this post'}), 400
        parent = ForumComment.query.filter_by(id=parent_id, post_id=post.id, status='active').first()
        if not parent:
            return jsonify({'error': 'Parent comment not found in this post'}), 400

    image_bytes, extension, image_error = _uploaded_forum_image()
    if image_error:
        return image_error
    reason, image_error = _forum_image_detection(image_bytes)
    if image_error:
        return image_error
    if reason:
        detections.append({'field': 'image', 'reason': reason})
    image_key = image_path = None
    if image_bytes:
        try:
            image_key, image_path = _save_forum_image(image_bytes, extension)
        except OSError:
            current_app.logger.exception('Could not store forum reply image')
            return jsonify({'error': 'No pudimos guardar la imagen.'}), 500

    comment = ForumComment(
        post_id=post.id,
        user_id=user.id,
        parent_comment_id=parent_id,
        content=content,
        image_storage_key=image_key,
        status='pending_review' if detections else 'active',
    )
    db.session.add(comment)
    try:
        pending = _queue_forum_review(comment, 'comment', detections) if detections else None
        if pending is None:
            _notify_forum_reply(post, parent, user.id)
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        if image_path:
            try:
                os.remove(image_path)
            except OSError:
                current_app.logger.exception('Could not remove unreferenced forum image')
        current_app.logger.exception('Could not create forum reply')
        return jsonify({'error': 'No pudimos publicar la respuesta.'}), 500
    if pending:
        return jsonify(pending), 202
    response = _forum_comment_to_dict(comment, user.id)
    response['replies_count'] = 0
    return jsonify(response), 201


@comunidad_bp.route('/foro/posts/<post_id>', methods=['PATCH', 'DELETE'])
@require_auth
def manage_forum_post(post_id):
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    post = ForumPost.query.filter_by(id=post_id, status='active').first()
    if not post:
        return jsonify({'error': 'Post not found'}), 404
    if post.user_id != user.id:
        return jsonify({'error': 'Only the author can change this post'}), 403
    if request.method == 'DELETE':
        post.status = 'deleted'
        db.session.commit()
        return '', 204
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({'error': 'Expected an object'}), 400
    for field, maximum in (('title', 200), ('content', 3000), ('category', 50)):
        if field in data:
            value = data[field]
            if not isinstance(value, str) or not value.strip() or len(value.strip()) > maximum:
                return jsonify({'error': f'Invalid {field}'}), 400
            text_error = _forum_text_error(value)
            if text_error:
                return text_error
            setattr(post, field, value.strip())
    db.session.commit()
    return jsonify(_forum_post_to_dict(post, user.id)), 200


@comunidad_bp.route('/foro/posts/<post_id>/comments/<comment_id>', methods=['PATCH', 'DELETE'])
@require_auth
def manage_forum_comment(post_id, comment_id):
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    comment = ForumComment.query.filter_by(id=comment_id, post_id=post_id, status='active').first()
    if not comment:
        return jsonify({'error': 'Comment not found'}), 404
    if comment.user_id != user.id:
        return jsonify({'error': 'Only the author can change this comment'}), 403
    if request.method == 'DELETE':
        comment.status = 'deleted'
        db.session.commit()
        return '', 204
    data = request.get_json(silent=True)
    content = data.get('content') if isinstance(data, dict) else None
    if not isinstance(content, str) or not content.strip() or len(content.strip()) > 3000:
        return jsonify({'error': 'Invalid content'}), 400
    text_error = _forum_text_error(content)
    if text_error:
        return text_error
    comment.content = content.strip()
    db.session.commit()
    return jsonify(_forum_comment_to_dict(comment, user.id)), 200


@comunidad_bp.route('/foro/me', methods=['GET'])
@require_auth
def forum_me():
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({'is_moderator': user.role in ('admin', 'moderator')}), 200


@comunidad_bp.route('/foro/reports', methods=['POST', 'GET'])
@require_auth
def forum_reports():
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    if request.method == 'GET':
        if user.role not in ('admin', 'moderator'):
            return jsonify({'error': 'Moderator access required'}), 403
        pending = ForumReport.query.filter_by(status='pending')
        seen = db.session.query(ForumReportRead.report_id).filter_by(user_id=user.id)
        unread = pending.filter(~ForumReport.id.in_(seen)).count()
        if request.args.get('summary') == '1':
            return jsonify({'unread': unread}), 200
        reason = request.args.get('reason')
        if reason in FORUM_REPORT_REASON_LABELS or reason == IMAGE_REVIEW_UNAVAILABLE:
            pending = pending.filter_by(reason=reason)
        medium = request.args.get('medium')
        if medium in ('content', 'text', 'image'):
            pending = pending.filter_by(medium=medium)
        target_type = request.args.get('target_type')
        if target_type in ('post', 'comment'):
            pending = pending.filter_by(target_type=target_type)
        reports = pending.order_by(
            ForumReport.id.in_(seen).asc(), ForumReport.created_at.asc(), ForumReport.id.asc(),
        ).limit(100).all()
        report_ids = [report.id for report in reports]
        read_ids = {report_id for (report_id,) in seen.filter(ForumReportRead.report_id.in_(report_ids))}
        items = []
        for report in reports:
            target = (ForumPost if report.target_type == 'post' else ForumComment).query.filter_by(id=report.target_id).first()
            image_key = target.image_storage_key if target else None
            items.append({
                'id': report.id, 'target_type': report.target_type,
                'target_id': report.target_id, 'reason': report.reason, 'medium': report.medium,
                'detections': report.detections,
                'details': report.details, 'created_at': report.created_at.isoformat(),
                'is_read': report.id in read_ids,
                'preview': (target.content if report.detections else target.content[:300])
                if target else 'Contenido no disponible',
                'post_id': (target.id if report.target_type == 'post' else target.post_id) if target else None,
                'title': target.title if report.target_type == 'post' and target else None,
                'image_url': (url_for('comunidad.get_forum_report_image', filename=image_key)
                              if image_key else None),
            })
        return jsonify({'items': items, 'unread': unread}), 200
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({'error': 'Expected an object'}), 400
    target_type = data.get('target_type')
    target_id = data.get('target_id')
    reason = data.get('reason')
    medium = data.get('medium', 'content')
    details = data.get('details', '')
    if (target_type not in ('post', 'comment') or not isinstance(target_id, str)
            or medium not in ('content', 'text', 'image')
            or not isinstance(reason, str) or reason not in FORUM_REPORT_REASON_LABELS):
        return jsonify({'error': 'Invalid report'}), 400
    if not isinstance(details, str) or len(details) > 1000:
        return jsonify({'error': 'Invalid details'}), 400
    target = (ForumPost if target_type == 'post' else ForumComment).query.filter_by(id=target_id, status='active').first()
    if not target:
        return jsonify({'error': 'Content not found'}), 404
    if target.user_id == user.id:
        return jsonify({'error': 'You cannot report your own content'}), 400
    if medium == 'image' and not target.image_storage_key:
        return jsonify({'error': 'Este contenido no tiene imagen adjunta.'}), 400
    existing = ForumReport.query.filter_by(
        reporter_user_id=user.id, target_type=target_type, target_id=target_id, medium=medium,
    ).first()
    if existing:
        return jsonify({'status': existing.status}), 200
    report = ForumReport(reporter_user_id=user.id, target_type=target_type,
                         target_id=target_id, medium=medium, reason=reason, details=details.strip())
    db.session.add(report)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({'status': 'pending'}), 200
    return jsonify({'status': 'pending'}), 201


@comunidad_bp.route('/foro/reports/<report_id>/read', methods=['PUT'])
@require_auth
def read_forum_report(report_id):
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    if user.role not in ('admin', 'moderator'):
        return jsonify({'error': 'Moderator access required'}), 403
    if not ForumReport.query.filter_by(id=report_id, status='pending').first():
        return jsonify({'error': 'Reporte pendiente no encontrado.'}), 404
    if db.session.get(ForumReportRead, (report_id, user.id)) is None:
        db.session.add(ForumReportRead(report_id=report_id, user_id=user.id))
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            if db.session.get(ForumReportRead, (report_id, user.id)) is None:
                raise
    return jsonify({'is_read': True}), 200


@comunidad_bp.route('/foro/reports/uploads/<filename>', methods=['GET'])
@require_auth
def get_forum_report_image(filename):
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    if user.role not in ('admin', 'moderator'):
        return jsonify({'error': 'Moderator access required'}), 403
    if not re.fullmatch(r'[0-9a-f]{32}\.(jpg|png|webp)', filename):
        return jsonify({'error': 'Image not found'}), 404
    pending_report = any(
        ForumReport.query.join(model, ForumReport.target_id == model.id)
        .filter(ForumReport.status == 'pending', ForumReport.target_type == target_type,
                model.image_storage_key == filename).first()
        for target_type, model in (('post', ForumPost), ('comment', ForumComment))
    )
    if not pending_report:
        return jsonify({'error': 'Image not found'}), 404
    directory = os.path.join(current_app.instance_path, 'community_uploads')
    return send_from_directory(directory, filename, conditional=True)


@comunidad_bp.route('/foro/reports/<report_id>', methods=['PATCH'])
@require_auth
def review_forum_report(report_id):
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    if user.role not in ('admin', 'moderator'):
        return jsonify({'error': 'Moderator access required'}), 403
    report = ForumReport.query.filter_by(id=report_id, status='pending').first()
    if not report:
        return jsonify({'error': 'Report not found'}), 404
    data = request.get_json(silent=True)
    decision = data.get('decision') if isinstance(data, dict) else None
    if report.detections:
        return _review_held_content(report, decision)
    if decision not in ('hide', 'dismiss'):
        return jsonify({'error': 'decision must be hide or dismiss'}), 400
    if decision == 'hide':
        target = (ForumPost if report.target_type == 'post' else ForumComment).query.filter_by(id=report.target_id).first()
        if target and target.status == 'active':
            target.status = 'hidden'
            content_type = 'publicación' if report.target_type == 'post' else 'comentario'
            hidden_label = 'ocultada' if report.target_type == 'post' else 'ocultado'
            db.session.add(Notification(
                user_id=target.user_id,
                type='forum_moderation',
                title=f'Tu {content_type} fue {hidden_label}',
                message=(f'Moderación ocultó tu {content_type} tras revisar un reporte. '
                         f'Motivo: {FORUM_REPORT_REASON_LABELS[report.reason]}.'),
                action_path=(f'/comunidad?post={target.post_id}'
                             if report.target_type == 'comment' else None),
            ))
    report.status = 'resolved' if decision == 'hide' else 'dismissed'
    db.session.commit()
    return jsonify({'status': report.status}), 200


def _review_held_content(report, decision):
    if decision not in ('approve', 'reject'):
        return jsonify({'error': 'Selecciona aprobar o rechazar el contenido.'}), 400

    status = 'approved' if decision == 'approve' else 'rejected'
    claimed = ForumReport.query.filter_by(id=report.id, status='pending').update({'status': status})
    if not claimed:
        db.session.rollback()
        return jsonify({'error': 'Esta revisión ya se resolvió.'}), 409

    is_post = report.target_type == 'post'
    model = ForumPost if is_post else ForumComment
    target = model.query.filter_by(id=report.target_id, status='pending_review').first()
    if not target:
        db.session.rollback()
        return jsonify({'error': 'El contenido pendiente ya no está disponible.'}), 409
    post_id = target.id if is_post else target.post_id
    if decision == 'approve' and not is_post:
        post = ForumPost.query.filter_by(id=post_id, status='active').with_for_update().first()
        if not post:
            db.session.rollback()
            return jsonify({'error': 'La publicación original ya no está disponible. Puedes rechazar la respuesta.'}), 409
        parent = ForumComment.query.filter_by(
            id=target.parent_comment_id, post_id=post.id, status='active',
        ).first() if target.parent_comment_id else None
        _notify_forum_reply(post, parent, target.user_id)
    target.status = 'active' if decision == 'approve' else 'rejected'
    db.session.add(Notification(
        user_id=target.user_id, type='forum_moderation',
        title='Contenido aprobado' if decision == 'approve' else 'Contenido rechazado',
        message=('Moderación aprobó tu contenido y ya está visible en la comunidad.'
                 if decision == 'approve' else 'Moderación revisó tu contenido y decidió rechazar su publicación.'),
        action_path=f'/comunidad?post={post_id}' if decision == 'approve' else None,
    ))
    db.session.commit()
    return jsonify({'status': status}), 200


def _forum_sent_at(value):
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.isoformat()


@comunidad_bp.route('/foro/notifications', methods=['GET'])
@require_auth
def list_forum_notifications():
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    query = Notification.query.filter(
        Notification.user_id == user.id,
        Notification.type.in_(('forum_reply', 'forum_moderation')),
    )
    unread = query.filter(Notification.read_at.is_(None)).count()
    items = query.order_by(Notification.created_at.desc()).limit(20).all()
    return jsonify({'unread': unread, 'items': [{
        'id': item.id, 'title': item.title, 'message': item.message,
        'action_path': item.action_path, 'is_read': item.read_at is not None,
        'created_at': _forum_sent_at(item.created_at),
    } for item in items]}), 200


@comunidad_bp.route('/foro/notifications/<notification_id>/read', methods=['PUT'])
@require_auth
def read_forum_notification(notification_id):
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    item = Notification.query.filter(
        Notification.id == notification_id,
        Notification.user_id == user.id,
        Notification.type.in_(('forum_reply', 'forum_moderation')),
    ).first()
    if not item:
        return jsonify({'error': 'Notification not found'}), 404
    if item.read_at is None:
        item.read_at = datetime.now(timezone.utc)
        db.session.commit()
    return jsonify({'is_read': True}), 200


def _forum_bulletin_to_dict(bulletin, current_user_id, current_user_role):
    return {
        'id': bulletin.id,
        'title': bulletin.title,
        'content': bulletin.content,
        'image_url': (url_for('comunidad.get_forum_bulletin_image', filename=bulletin.image_storage_key)
                      if bulletin.image_storage_key else None),
        'author': _forum_author_name(bulletin.user_id),
        'is_mine': bulletin.user_id == current_user_id,
        'can_manage': bulletin.user_id == current_user_id or current_user_role == 'admin',
        'created_at': _forum_sent_at(bulletin.created_at),
        'updated_at': bulletin.updated_at.isoformat() if bulletin.updated_at else None,
    }


@comunidad_bp.route('/foro/bulletins', methods=['GET', 'POST'])
@require_auth
def forum_bulletins():
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    if request.method == 'GET':
        bulletins = (ForumBulletin.query.filter_by(status='published')
                     .order_by(ForumBulletin.created_at.desc(), ForumBulletin.id.desc())
                     .limit(5).all())
        return jsonify({'items': [_forum_bulletin_to_dict(item, user.id, user.role) for item in bulletins]}), 200

    if user.role not in ('admin', 'moderator'):
        return jsonify({'error': 'Moderator access required'}), 403
    if request.mimetype == 'multipart/form-data' and request.content_length:
        if request.content_length > MAX_FORUM_IMAGE_BYTES + 64 * 1024:
            return jsonify({'error': 'Image must be 5 MB or smaller'}), 413
    data = request.form if request.mimetype in ('multipart/form-data', 'application/x-www-form-urlencoded') else request.get_json(silent=True)
    if not isinstance(data, (dict, type(request.form))):
        return jsonify({'error': 'Expected an object'}), 400
    title = data.get('title')
    content = data.get('content')
    if (not isinstance(title, str) or not title.strip() or len(title.strip()) > 120
            or not isinstance(content, str) or not content.strip() or len(content.strip()) > 1000):
        return jsonify({'error': 'Title and content are required and must fit the limits'}), 400
    image_bytes, image_extension, image_error = _uploaded_forum_image()
    if image_error:
        return image_error
    image_storage_key = None
    if image_bytes:
        try:
            image_storage_key, _ = _save_forum_image(image_bytes, image_extension)
        except OSError:
            current_app.logger.exception('Could not store forum bulletin image')
            return jsonify({'error': 'Could not store the image'}), 500
    bulletin = ForumBulletin(user_id=user.id, title=title.strip(),
                             content=content.strip(), image_storage_key=image_storage_key,
                             status='published')
    db.session.add(bulletin)
    try:
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        _remove_forum_bulletin_image(image_storage_key)
        current_app.logger.exception('Could not create forum bulletin')
        return jsonify({'error': 'Could not create the bulletin'}), 500
    return jsonify(_forum_bulletin_to_dict(bulletin, user.id, user.role)), 201


def _remove_forum_bulletin_image(filename):
    if not filename:
        return
    path = os.path.join(current_app.instance_path, 'community_uploads', filename)
    try:
        os.remove(path)
    except FileNotFoundError:
        pass
    except OSError:
        current_app.logger.exception('Could not remove forum bulletin image')


@comunidad_bp.route('/foro/bulletins/uploads/<filename>', methods=['GET'])
@require_auth
def get_forum_bulletin_image(filename):
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    if not re.fullmatch(r'[0-9a-f]{32}\.(jpg|png|webp)', filename):
        return jsonify({'error': 'Image not found'}), 404
    if not ForumBulletin.query.filter_by(image_storage_key=filename, status='published').first():
        return jsonify({'error': 'Image not found'}), 404
    directory = os.path.join(current_app.instance_path, 'community_uploads')
    return send_from_directory(directory, filename, conditional=True)


@comunidad_bp.route('/foro/bulletins/<bulletin_id>', methods=['PATCH', 'DELETE'])
@require_auth
def manage_forum_bulletin(bulletin_id):
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    if user.role not in ('admin', 'moderator'):
        return jsonify({'error': 'Moderator access required'}), 403
    bulletin = ForumBulletin.query.filter_by(id=bulletin_id, status='published').first()
    if not bulletin:
        return jsonify({'error': 'Bulletin not found'}), 404
    if bulletin.user_id != user.id and user.role != 'admin':
        return jsonify({'error': 'Only its author or an administrator can change this bulletin'}), 403

    if request.method == 'DELETE':
        bulletin.status = 'deleted'
        try:
            db.session.commit()
        except SQLAlchemyError:
            db.session.rollback()
            current_app.logger.exception('Could not delete forum bulletin')
            return jsonify({'error': 'Could not delete the bulletin'}), 500
        return '', 204
    if request.mimetype == 'multipart/form-data' and request.content_length:
        if request.content_length > MAX_FORUM_IMAGE_BYTES + 64 * 1024:
            return jsonify({'error': 'Image must be 5 MB or smaller'}), 413
    data = request.form if request.mimetype in ('multipart/form-data', 'application/x-www-form-urlencoded') else request.get_json(silent=True)
    if not isinstance(data, (dict, type(request.form))):
        return jsonify({'error': 'Expected an object'}), 400
    remove_image = data.get('remove_image', False)
    if remove_image not in (False, True, 'true', 'false'):
        return jsonify({'error': 'Invalid remove_image'}), 400
    remove_image = remove_image is True or remove_image == 'true'
    image_bytes, image_extension, image_error = _uploaded_forum_image()
    if image_error:
        return image_error
    if remove_image and image_bytes:
        return jsonify({'error': 'Cannot upload and remove an image at the same time'}), 400
    for field, maximum in (('title', 120), ('content', 1000)):
        if field in data:
            value = data[field]
            if not isinstance(value, str) or not value.strip() or len(value.strip()) > maximum:
                return jsonify({'error': f'Invalid {field}'}), 400
            setattr(bulletin, field, value.strip())
    old_image = bulletin.image_storage_key
    new_image = None
    if image_bytes:
        try:
            new_image, _ = _save_forum_image(image_bytes, image_extension)
        except OSError:
            current_app.logger.exception('Could not store forum bulletin image')
            return jsonify({'error': 'Could not store the image'}), 500
        bulletin.image_storage_key = new_image
    elif remove_image:
        bulletin.image_storage_key = None
    if old_image and (remove_image or new_image):
        bulletin.image_history = [*(bulletin.image_history or []), old_image]
    try:
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        _remove_forum_bulletin_image(new_image)
        current_app.logger.exception('Could not update forum bulletin')
        return jsonify({'error': 'Could not update the bulletin'}), 500
    return jsonify(_forum_bulletin_to_dict(bulletin, user.id, user.role)), 200
