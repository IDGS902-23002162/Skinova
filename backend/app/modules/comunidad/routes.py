from flask import Blueprint, jsonify, request, g

from app.auth import require_auth
from app.extensions import db
from app.modules.comunidad.models import Comment, ForumComment, ForumPost, Post
from app.modules.users.models import User

comunidad_bp = Blueprint('comunidad', __name__, url_prefix='/api/comunidad')


def _get_user():
    user = User.query.filter_by(clerk_user_id=g.user_id).first()
    if not user:
        return None
    return user


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

    posts = ForumPost.query.order_by(ForumPost.created_at.desc()).all()
    return jsonify({'items': [post.to_dict() for post in posts]}), 200


@comunidad_bp.route('/foro/posts', methods=['POST'])
@require_auth
def create_forum_post():
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json(silent=True) or {}
    title = (data.get('title') or '').strip()
    content = (data.get('content') or '').strip()
    if not title or not content:
        return jsonify({'error': 'title and content are required'}), 400

    post = ForumPost(
        user_id=user.id,
        title=title,
        content=content,
        category=data.get('category', 'discussion'),
        tags=data.get('tags', []),
        status=data.get('status', 'active'),
    )
    db.session.add(post)
    db.session.commit()
    return jsonify(post.to_dict()), 201


@comunidad_bp.route('/foro/posts/<post_id>/comments', methods=['GET'])
@require_auth
def list_forum_comments(post_id):
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    post = ForumPost.query.filter_by(id=post_id).first()
    if not post:
        return jsonify({'error': 'Post not found'}), 404

    comments = ForumComment.query.filter_by(post_id=post.id).order_by(ForumComment.created_at.asc()).all()
    return jsonify({'items': [comment.to_dict() for comment in comments]}), 200


@comunidad_bp.route('/foro/posts/<post_id>/comments', methods=['POST'])
@require_auth
def create_forum_comment(post_id):
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    post = ForumPost.query.filter_by(id=post_id).first()
    if not post:
        return jsonify({'error': 'Post not found'}), 404

    data = request.get_json(silent=True) or {}
    content = (data.get('content') or '').strip()
    if not content:
        return jsonify({'error': 'content is required'}), 400

    comment = ForumComment(
        post_id=post.id,
        user_id=user.id,
        parent_comment_id=data.get('parent_comment_id'),
        content=content,
        status=data.get('status', 'active'),
    )
    db.session.add(comment)
    db.session.commit()
    return jsonify(comment.to_dict()), 201
