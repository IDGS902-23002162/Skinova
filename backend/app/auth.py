import os
from functools import wraps
from flask import request, jsonify, g
from clerk_backend_api import Clerk
from clerk_backend_api.security.types import AuthenticateRequestOptions

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        secret_key = os.environ.get("CLERK_SECRET_KEY")
        if not secret_key:
            return jsonify({"error": "CLERK_SECRET_KEY is not configured on the backend"}), 500
        
        clerk = Clerk(bearer_auth=secret_key)
        # Authenticate the request using the official Clerk SDK
        request_state = clerk.authenticate_request(request, AuthenticateRequestOptions())
        
        if request_state.is_signed_in:
            # Token is valid, make the user ID available
            g.user_id = request_state.payload.get('sub')
            return f(*args, **kwargs)
        else:
            # Handle unauthorized / invalid tokens
            error_reason = "Unauthorized"
            if request_state.reason:
                if hasattr(request_state.reason, 'value'):
                    error_reason = request_state.reason.value[1]
                else:
                    error_reason = str(request_state.reason)
            return jsonify({"error": "Unauthorized", "reason": error_reason}), 401
            
    return decorated
