from flask import Blueprint, request, jsonify, g
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timezone
from app.extensions import db
from app.auth import require_auth
from app.modules.users.models import User, Subscription
from app.modules.perfil_salud.models import UserProfile, UserRestriction
import stripe
import os

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
stripe_webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")

def extract_period_end(stripe_sub_dict):
    if not isinstance(stripe_sub_dict, dict):
        return None
    ts = stripe_sub_dict.get('current_period_end')
    if not ts and stripe_sub_dict.get('items', {}).get('data'):
        items_data = stripe_sub_dict['items']['data']
        if len(items_data) > 0:
            ts = items_data[0].get('current_period_end')
    if ts:
        try:
            return datetime.fromtimestamp(ts, tz=timezone.utc)
        except Exception:
            return None
    return None

users_bp = Blueprint('users', __name__, url_prefix='/api')

@users_bp.route('/me', methods=['GET'])
@require_auth
def get_me():
    clerk_user_id = g.user_id
    
    # Intenta buscar al usuario
    user = User.query.filter_by(clerk_user_id=clerk_user_id).first()
    
    if not user:
        # El usuario no existe, creamos su cuenta y su perfil atómico
        try:
            user = User(clerk_user_id=clerk_user_id)
            db.session.add(user)
            db.session.flush() # Para obtener el user.id generado

            profile = UserProfile(user_id=user.id, onboarding_completed=False)
            db.session.add(profile)
            
            db.session.commit()
        except IntegrityError:
            # En caso de que otra petición haya creado el usuario concurrentemente
            db.session.rollback()
            user = User.query.filter_by(clerk_user_id=clerk_user_id).first()
            if not user:
                return jsonify({"error": "Failed to create user"}), 500
    
    # Busca su perfil (si por alguna razón existe el user pero no el perfil)
    profile = UserProfile.query.filter_by(user_id=user.id).first()
    if not profile:
        try:
            profile = UserProfile(user_id=user.id, onboarding_completed=False)
            db.session.add(profile)
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            profile = UserProfile.query.filter_by(user_id=user.id).first()
    
    # Responde con el formato esperado
    return jsonify({
        "id": user.id,
        "role": user.role,
        "onboarding_completed": profile.onboarding_completed,
        "profile": {
            "preferred_name": profile.preferred_name
        }
    }), 200

@users_bp.route('/onboarding', methods=['PUT'])
@require_auth
def update_onboarding():
    clerk_user_id = g.user_id
    
    # Primero encontramos al usuario interno
    user = User.query.filter_by(clerk_user_id=clerk_user_id).first()
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    profile = UserProfile.query.filter_by(user_id=user.id).first()
    if not profile:
        return jsonify({"error": "Profile not found"}), 404

    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid payload"}), 400

    # Actualizamos campos del perfil, ignorando los que no existen
    allowed_fields = [
        'preferred_name', 'assistant_tone', 'skin_type', 'sensitivity_level',
        'goals', 'dermatological_history', 'budget', 'consents', 
        'timezone', 'notification_preferences', 'use_location', 'manual_city'
    ]
    
    try:
        for field in allowed_fields:
            if field in data:
                setattr(profile, field, data[field])
        
        # Guardamos alergias como UserRestriction
        if 'allergies' in data and isinstance(data['allergies'], list):
            # Limpiamos las alergias anteriores para reemplazarlas
            UserRestriction.query.filter_by(user_id=user.id, type='allergy').delete()
            for allergy_name in data['allergies']:
                restriction = UserRestriction(
                    user_id=user.id,
                    type='allergy',
                    name=allergy_name
                )
                db.session.add(restriction)
        
        # Al final, marcamos el onboarding como completado
        profile.onboarding_completed = True
        
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to update onboarding", "details": str(e)}), 500

    return jsonify({
        "message": "Onboarding completed successfully",
        "onboarding_completed": True
    }), 200

@users_bp.route('/create-checkout-session', methods=['POST'])
@require_auth
def create_checkout_session():
    clerk_user_id = g.user_id
    user = User.query.filter_by(clerk_user_id=clerk_user_id).first()
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    try:
        checkout_session = stripe.checkout.Session.create(
            line_items=[
                {
                    'price_data': {
                        'currency': 'mxn',
                        'product_data': {
                            'name': 'Skinova Premium',
                        },
                        'unit_amount': 9900,
                        'recurring': {
                            'interval': 'month'
                        }
                    },
                    'quantity': 1,
                },
            ],
            mode='subscription',
            success_url=request.headers.get('origin', 'http://localhost:5173') + '/suscripciones?success=true&session_id={CHECKOUT_SESSION_ID}',
            cancel_url=request.headers.get('origin', 'http://localhost:5173') + '/suscripciones?canceled=true',
            client_reference_id=str(user.id),
        )
        return jsonify({'id': checkout_session.id, 'url': checkout_session.url})
    except Exception as e:
        print(f"Error en Stripe Checkout: {e}")
        return jsonify(error=str(e)), 400

@users_bp.route('/verify-checkout-session', methods=['POST'])
@require_auth
def verify_checkout_session():
    clerk_user_id = g.user_id
    user = User.query.filter_by(clerk_user_id=clerk_user_id).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json() or {}
    session_id = data.get('session_id')
    if not session_id:
        return jsonify({"error": "session_id is required"}), 400

    try:
        session = stripe.checkout.Session.retrieve(session_id)
        if session.client_reference_id and session.client_reference_id != str(user.id):
            return jsonify({"error": "Unauthorized session"}), 403

        if session.status == 'complete' or session.payment_status == 'paid':
            sub = Subscription.query.filter_by(user_id=user.id).first()
            if not sub:
                sub = Subscription(user_id=user.id)
                db.session.add(sub)

            sub.provider = 'stripe'
            sub.external_subscription_id = session.subscription
            sub.plan_code = 'skinova_premium'
            sub.status = 'active'

            if session.subscription:
                try:
                    stripe_sub = stripe.Subscription.retrieve(session.subscription).to_dict()
                    sub.status = stripe_sub.get('status', 'active')
                    sub.cancel_at_period_end = stripe_sub.get('cancel_at_period_end', False)
                    sub.current_period_end = extract_period_end(stripe_sub)
                except Exception as ex:
                    print(f"Warning retrieving subscription details: {ex}")

            db.session.commit()
            return jsonify({
                "message": "Suscripción verificada y actualizada",
                "is_subscribed": sub.status == 'active',
                "subscription": {
                    "id": sub.id,
                    "plan_code": sub.plan_code,
                    "status": sub.status,
                    "cancel_at_period_end": sub.cancel_at_period_end,
                    "current_period_end": sub.current_period_end.isoformat() if sub.current_period_end else None
                }
            }), 200
        else:
            return jsonify({"error": "Session is not completed", "status": session.status}), 400
    except Exception as e:
        print(f"Error verifying session: {e}")
        return jsonify({"error": str(e)}), 400

@users_bp.route('/subscription', methods=['GET'])
@require_auth
def get_user_subscription():
    clerk_user_id = g.user_id
    user = User.query.filter_by(clerk_user_id=clerk_user_id).first()
    if not user:
        try:
            user = User(clerk_user_id=clerk_user_id)
            db.session.add(user)
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            user = User.query.filter_by(clerk_user_id=clerk_user_id).first()
        if not user:
            return jsonify({"error": "User not found"}), 404

    sub = Subscription.query.filter_by(user_id=user.id).first()

    # Auto-sincronización en modo desarrollo si la BD local aún no tiene registrado el pago
    if not sub or sub.status != 'active':
        try:
            sessions = stripe.checkout.Session.list(limit=5)
            for s in sessions.data:
                if s.client_reference_id == str(user.id) and s.status == 'complete' and s.subscription:
                    stripe_sub = stripe.Subscription.retrieve(s.subscription).to_dict()
                    if stripe_sub.get('status') == 'active':
                        if not sub:
                            sub = Subscription(user_id=user.id)
                            db.session.add(sub)
                        sub.provider = 'stripe'
                        sub.external_subscription_id = s.subscription
                        sub.plan_code = 'skinova_premium'
                        sub.status = 'active'
                        sub.cancel_at_period_end = stripe_sub.get('cancel_at_period_end', False)
                        sub.current_period_end = extract_period_end(stripe_sub)
                        db.session.commit()
                        break
        except Exception as ex:
            print(f"Aviso al auto-sincronizar suscripción Stripe: {ex}")

    is_subscribed = sub is not None and sub.status == 'active'
    return jsonify({
        "is_subscribed": is_subscribed,
        "subscription": {
            "id": sub.id,
            "plan_code": sub.plan_code,
            "status": sub.status,
            "cancel_at_period_end": sub.cancel_at_period_end,
            "current_period_end": sub.current_period_end.isoformat() if sub.current_period_end else None
        } if sub else None
    }), 200

@users_bp.route('/cancel-subscription', methods=['POST'])
@require_auth
def cancel_subscription():
    clerk_user_id = g.user_id
    user = User.query.filter_by(clerk_user_id=clerk_user_id).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    sub = Subscription.query.filter_by(user_id=user.id).first()
    if not sub or sub.status != 'active':
        return jsonify({"error": "No cuentas con una suscripción activa."}), 400

    try:
        if sub.external_subscription_id:
            try:
                stripe.Subscription.cancel(sub.external_subscription_id)
            except Exception as ex:
                print(f"Aviso al cancelar en Stripe: {ex}")

        sub.status = 'canceled'
        db.session.commit()
        return jsonify({
            "message": "Suscripción cancelada exitosamente",
            "is_subscribed": False,
            "status": "canceled"
        }), 200
    except Exception as e:
        print(f"Error canceling subscription: {e}")
        return jsonify({"error": str(e)}), 400

@users_bp.route('/stripe-webhook', methods=['POST'])
def stripe_webhook():
    payload = request.get_data(as_text=True)
    sig_header = request.headers.get('Stripe-Signature')

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, stripe_webhook_secret
        )
    except ValueError as e:
        return 'Invalid payload', 400
    except stripe.error.SignatureVerificationError as e:
        return 'Invalid signature', 400

    # Handle the event
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        user_id = session.get('client_reference_id')
        subscription_id = session.get('subscription')
        
        if user_id and subscription_id:
            sub = Subscription.query.filter_by(user_id=user_id).first()
            if not sub:
                sub = Subscription(user_id=user_id)
                db.session.add(sub)
                
            sub.provider = 'stripe'
            sub.external_subscription_id = subscription_id
            sub.plan_code = 'skinova_premium'
            sub.status = 'active'
            try:
                stripe_sub = stripe.Subscription.retrieve(subscription_id).to_dict()
                sub.status = stripe_sub.get('status', 'active')
                sub.cancel_at_period_end = stripe_sub.get('cancel_at_period_end', False)
                sub.current_period_end = extract_period_end(stripe_sub)
            except Exception as e:
                print(f"Webhook sub details error: {e}")
            db.session.commit()

    elif event['type'] == 'customer.subscription.updated':
        subscription = event['data']['object']
        sub = Subscription.query.filter_by(external_subscription_id=subscription.get('id')).first()
        if sub:
            sub.status = subscription.get('status', sub.status)
            sub.cancel_at_period_end = subscription.get('cancel_at_period_end', False)
            sub.current_period_end = extract_period_end(subscription)
            db.session.commit()

    elif event['type'] == 'customer.subscription.deleted':
        subscription = event['data']['object']
        sub = Subscription.query.filter_by(external_subscription_id=subscription.get('id')).first()
        if sub:
            sub.status = 'canceled'
            db.session.commit()

    return 'Success', 200
