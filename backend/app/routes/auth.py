from flask import Blueprint, request, jsonify, g
from app.database import get_db_connection
from app.utils.auth import require_firebase_auth
from app.services.notification_service import create_notification

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
            # 1. Check if user already exists in the users table
            cursor.execute("SELECT * FROM users WHERE LOWER(email) = %s", (email.lower(),))
            existing_user = cursor.fetchone()
            
            # Determine if this is an admin email (either primary admin or pre-registered in DB as admin)
            is_admin_email = (email.lower() == 'bogamhari137@gmail.com') or (existing_user and existing_user['role'] == 'admin')
            student_match = True
            
            if not is_admin_email:
                cursor.execute("SELECT * FROM students WHERE LOWER(parent_email) = %s", (email,))
                student_match = cursor.fetchone()
                print(f"[SIGNUP DEBUG] Student match found: {student_match}")
            
            if not student_match:
                print(f"[SIGNUP DEBUG] Blocked signup for unregistered email: '{email}'")
                return jsonify({
                    "success": False, 
                    "message": "Self-signup blocked: Parent email is not pre-registered by school administration."
                }), 403
            
            if existing_user:
                # Update firebase_uid in MySQL if it is unlinked or mismatching
                updates = []
                params = []
                if not existing_user['firebase_uid'] or existing_user['firebase_uid'] != firebase_uid:
                    updates.append("firebase_uid = %s")
                    params.append(firebase_uid)
                if is_admin_email and existing_user['role'] != 'admin':
                    updates.append("role = 'admin'")
                
                if updates:
                    sql = f"UPDATE users SET {', '.join(updates)} WHERE user_id = %s"
                    params.append(existing_user['user_id'])
                    cursor.execute(sql, tuple(params))
                    
                    # Refetch existing user
                    cursor.execute("SELECT * FROM users WHERE user_id = %s", (existing_user['user_id'],))
                    existing_user = cursor.fetchone()
                
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
            role = 'admin' if is_admin_email else 'parent'
            cursor.execute(
                "INSERT INTO users (firebase_uid, email, role) VALUES (%s, %s, %s)",
                (firebase_uid, email, role)
            )
            new_id = cursor.lastrowid
            
            if is_admin_email:
                return jsonify({
                    "success": True,
                    "user": {
                        "user_id": new_id,
                        "firebase_uid": firebase_uid,
                        "email": email,
                        "role": "admin"
                    }
                })
                
            # 4. Link existing student records to this new user_id
            cursor.execute(
                "UPDATE students SET user_id = %s WHERE LOWER(parent_email) = %s",
                (new_id, email)
            )
            
            # Trigger admin notification for parent registration
            create_notification(
                conn=conn,
                user_id=None,
                student_id=None,
                title="New Parent Account Created",
                message=f"Parent {email} has successfully registered and linked to their child's profile.",
                type="new_parent"
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
