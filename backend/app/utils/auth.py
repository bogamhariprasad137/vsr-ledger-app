import functools
import jwt
import requests
import os
from flask import request, jsonify, g
from jwt.exceptions import ExpiredSignatureError, InvalidSignatureError, InvalidTokenError
from app.database import get_db_connection
import firebase_admin
from firebase_admin import credentials

GOOGLE_CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
FIREBASE_PROJECT_ID = "intellitots-fee-hub"

# Simple cache for Google public certificates
_certs_cache = {}

# Initialize Firebase Admin SDK
_has_sdk_credentials = False
cert_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
if not cert_path:
    # Search in common local folders
    candidates = [
        os.path.join(os.path.dirname(__file__), "..", "..", "serviceAccountKey.json"),
        os.path.join(os.path.dirname(__file__), "..", "serviceAccountKey.json"),
        os.path.join(os.path.dirname(__file__), "serviceAccountKey.json"),
        "serviceAccountKey.json"
    ]
    for path in candidates:
        if os.path.exists(path):
            cert_path = path
            break

if cert_path and os.path.exists(cert_path):
    _has_sdk_credentials = True

try:
    firebase_admin.get_app()
except ValueError:
    if _has_sdk_credentials:
        try:
            cred = credentials.Certificate(cert_path)
            firebase_admin.initialize_app(cred)
            print(f"Firebase Admin SDK initialized successfully using certificate: {cert_path}")
        except Exception as e:
            print(f"Failed to initialize Firebase Admin SDK with certificate: {e}. Falling back to default.")
            _has_sdk_credentials = False
            firebase_admin.initialize_app(options={'projectId': FIREBASE_PROJECT_ID})
    else:
        firebase_admin.initialize_app(options={'projectId': FIREBASE_PROJECT_ID})
        print("Firebase Admin SDK initialized with project ID option (Zero-Config fallback active).")

def get_google_public_keys():
    global _certs_cache
    if not _certs_cache:
        try:
            response = requests.get(GOOGLE_CERTS_URL, timeout=5)
            response.raise_for_status()
            _certs_cache = response.json()
        except Exception as e:
            raise Exception(f"Failed to fetch Firebase public certificates: {str(e)}")
    return _certs_cache

def verify_firebase_token(token):
    # Local development bypass for testing on localhost
    if token and token.startswith("mock-token-"):
        from flask import current_app
        is_local = (
            current_app.config.get('DB_HOST') in ('localhost', '127.0.0.1') or 
            os.environ.get("FLASK_ENV") == "development" or 
            os.environ.get("DEBUG") == "True"
        )
        if is_local:
            mock_email = token.replace("mock-token-", "").strip().lower()
            return {
                "email": mock_email,
                "sub": f"mock-uid-{mock_email.split('@')[0]}",
                "uid": f"mock-uid-{mock_email.split('@')[0]}"
            }

    # Try using the official Firebase Admin SDK first if we have credentials
    if _has_sdk_credentials:
        try:
            from firebase_admin import auth as firebase_auth
            return firebase_auth.verify_id_token(token)
        except Exception as sdk_err:
            return _verify_token_fallback(token)
    else:
        # Otherwise, directly use the fast fallback (PyJWT verification using cached Google public certificates)
        return _verify_token_fallback(token)

def _verify_token_fallback(token):
    # 1. Decode token header to locate the certificate key ID (kid)
    try:
        header = jwt.get_unverified_header(token)
        kid = header.get('kid')
        if not kid:
            raise InvalidTokenError("Missing 'kid' in token header.")
    except Exception as e:
        raise InvalidTokenError(f"Malformed token: {str(e)}")

    # 2. Retrieve the public certificates
    try:
        certs = get_google_public_keys()
    except Exception:
        global _certs_cache
        _certs_cache = {}
        certs = get_google_public_keys()

    if kid not in certs:
        raise InvalidTokenError("Token 'kid' does not match any Google certificates.")

    cert_pem = certs[kid]

    # 3. Parse certificate and extract public key
    from cryptography.x509 import load_pem_x509_certificate
    try:
        cert_obj = load_pem_x509_certificate(cert_pem.encode('utf-8'))
        public_key = cert_obj.public_key()
    except Exception as e:
        raise InvalidTokenError(f"Failed to parse X.509 certificate: {str(e)}")

    # 4. Decode and verify claims using PyJWT with public key
    decoded = jwt.decode(
        token,
        public_key,
        audience=FIREBASE_PROJECT_ID,
        issuer=f"https://securetoken.google.com/{FIREBASE_PROJECT_ID}",
        algorithms=["RS256"],
        leeway=120
    )
    return decoded

def require_firebase_auth(role=None):
    def decorator(f):
        @functools.wraps(f)
        def decorated_function(*args, **kwargs):
            # 1. Extract Bearer token from the Authorization header or request body
            auth_header = request.headers.get('Authorization')
            token = None
            if auth_header and auth_header.startswith('Bearer '):
                token = auth_header.split('Bearer ')[-1].strip()
            else:
                if request.is_json:
                    body = request.get_json(silent=True) or {}
                    token = body.get('idToken')
            
            if not token:
                return jsonify({"success": False, "message": "Authorization token is missing."}), 401

            try:
                # 2. Verify token
                decoded_token = verify_firebase_token(token)
                email = decoded_token.get('email', '').strip().lower()
                uid = decoded_token.get('sub') or decoded_token.get('uid')
                
                if not email or not uid:
                    return jsonify({"success": False, "message": "Invalid Firebase token payload."}), 401

                # 3. Query MySQL users table to find and validate the user role
                conn = get_db_connection()
                with conn.cursor() as cursor:
                    cursor.execute("SELECT * FROM users WHERE LOWER(email) = %s", (email,))
                    user = cursor.fetchone()

                    # 4. Relational Sync: Auto-link on first login
                    if user:
                        if not user.get('firebase_uid') or user.get('firebase_uid') != uid:
                            cursor.execute(
                                "UPDATE users SET firebase_uid = %s WHERE user_id = %s",
                                (uid, user['user_id'])
                            )
                            # fetch updated user record
                            cursor.execute("SELECT * FROM users WHERE user_id = %s", (user['user_id'],))
                            user = cursor.fetchone()

                if not user:
                    # Allow signup route to proceed even if user is not in local MySQL database yet
                    if request.path.endswith('/api/auth/signup') or request.path.endswith('/signup'):
                        g.firebase_user = {"email": email, "uid": uid}
                        return f(*args, **kwargs)
                    return jsonify({"success": False, "message": "User not registered in local database."}), 403

                # 5. Role checking
                if role and user['role'] != role:
                    return jsonify({"success": False, "message": "Access denied. Insufficient permissions."}), 403

                # Store user in Flask context g
                g.current_user = user
                g.firebase_user = {"email": email, "uid": uid}
                
            except ExpiredSignatureError:
                return jsonify({"success": False, "message": "Token has expired."}), 401
            except Exception as e:
                return jsonify({"success": False, "message": f"Authentication failed: {str(e)}"}), 401

            return f(*args, **kwargs)
        return decorated_function
    return decorator
