from flask import Blueprint, request, jsonify, g
from app.database import get_db_connection
from app.utils.auth import require_firebase_auth

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
@require_firebase_auth()
def login():
    user = g.current_user
    
    # Optional role validation if requested by the client
    data = request.json or {}
    expected_role = data.get('role')
    if expected_role and user['role'] != expected_role:
        return jsonify({
            "success": False, 
            "message": f"Unauthorized role. Expected '{expected_role}' but found '{user['role']}'."
        }), 403
        
    return jsonify({
        "success": True,
        "user": {
            "user_id": user['user_id'],
            "firebase_uid": user['firebase_uid'],
            "email": user['email'],
            "role": user['role']
        }
    })

@auth_bp.route('/signup', methods=['POST'])
@require_firebase_auth()
def signup():
    email = g.firebase_user['email']
    firebase_uid = g.firebase_user['uid']
    print(f"[SIGNUP DEBUG] Email from Firebase: '{email}', UID: '{firebase_uid}'")
    
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # 1. Verify if email is pre-registered in students as parent_email
            cursor.execute("SELECT * FROM students WHERE LOWER(parent_email) = %s", (email,))
            student_match = cursor.fetchone()
            print(f"[SIGNUP DEBUG] Student match found: {student_match}")
            
            if not student_match:
                print(f"[SIGNUP DEBUG] Blocked signup for unregistered email: '{email}'")
                return jsonify({
                    "success": False, 
                    "message": "Self-signup blocked: Parent email is not pre-registered by school administration."
                }), 403
                
            # 2. Check if user already exists
            cursor.execute("SELECT * FROM users WHERE LOWER(email) = %s", (email,))
            existing_user = cursor.fetchone()
            
            if existing_user:
                # Update firebase_uid in MySQL if it is unlinked or mismatching
                if not existing_user['firebase_uid'] or existing_user['firebase_uid'] != firebase_uid:
                    cursor.execute(
                        "UPDATE users SET firebase_uid = %s WHERE user_id = %s",
                        (firebase_uid, existing_user['user_id'])
                    )
                    existing_user['firebase_uid'] = firebase_uid
                
                return jsonify({
                    "success": True,
                    "user": {
                        "user_id": existing_user['user_id'],
                        "firebase_uid": existing_user['firebase_uid'],
                        "email": existing_user['email'],
                        "role": existing_user['role']
                    }
                })
                
            # 3. Create new user in users table
            cursor.execute(
                "INSERT INTO users (firebase_uid, email, role) VALUES (%s, %s, 'parent')",
                (firebase_uid, email)
            )
            new_id = cursor.lastrowid
            
            # 4. Link existing student records to this new user_id
            cursor.execute(
                "UPDATE students SET user_id = %s WHERE LOWER(parent_email) = %s",
                (new_id, email)
            )
            
            return jsonify({
                "success": True,
                "user": {
                    "user_id": new_id,
                    "firebase_uid": firebase_uid,
                    "email": email,
                    "role": "parent"
                }
            })
    except Exception as e:
        return jsonify({"success": False, "message": f"Database error: {str(e)}"}), 500

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.json or {}
    email = data.get('email', '').strip().lower()
    if not email:
        return jsonify({"success": False, "message": "Email is required."}), 400
        
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM users WHERE LOWER(email) = %s", (email,))
            user = cursor.fetchone()
            
        if not user:
            return jsonify({"success": False, "message": "No account registered with this email address."}), 404
            
        return jsonify({
            "success": True, 
            "message": f"Simulated password reset verification email dispatched to {email}."
        })
    except Exception as e:
        return jsonify({"success": False, "message": f"Database error: {str(e)}"}), 500
