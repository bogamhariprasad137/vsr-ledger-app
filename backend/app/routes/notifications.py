import datetime
from flask import Blueprint, request, jsonify, g
from app.database import get_db_connection
from app.utils.auth import require_firebase_auth
from app.services.notification_service import check_and_generate_fee_notifications

notifications_bp = Blueprint('notifications', __name__)

@notifications_bp.route('', methods=['GET'])
@require_firebase_auth()
def get_notifications():
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 20, type=int)
    offset = (page - 1) * limit
    
    conn = get_db_connection()
    try:
        # Run the dynamic check & generator for overdue/due alerts on load
        check_and_generate_fee_notifications(conn)
        
        user = g.current_user
        role = user['role']
        
        notifications = []
        total = 0
        
        with conn.cursor() as cursor:
            if role == 'parent':
                # Parents can only see notifications for students mapped to their user_id
                cursor.execute("""
                    SELECT COUNT(*) as count 
                    FROM notifications 
                    WHERE student_id IN (SELECT student_id FROM students WHERE user_id = %s)
                """, (user['user_id'],))
                total = cursor.fetchone()['count']
                
                cursor.execute("""
                    SELECT n.*, s.student_name 
                    FROM notifications n
                    LEFT JOIN students s ON n.student_id = s.student_id
                    WHERE n.student_id IN (SELECT student_id FROM students WHERE user_id = %s)
                    ORDER BY n.created_at DESC, n.id DESC
                    LIMIT %s OFFSET %s
                """, (user['user_id'], limit, offset))
                notifications = cursor.fetchall()
                
            elif role == 'admin':
                # Admins see overdue fees, upcoming installments, and registrations
                # Admins must NEVER see parent payment receipt logs (type = 'payment_received')
                cursor.execute("""
                    SELECT COUNT(*) as count 
                    FROM notifications 
                    WHERE type IN ('overdue_fee', 'upcoming_installment', 'new_registration', 'new_parent')
                """)
                total = cursor.fetchone()['count']
                
                cursor.execute("""
                    SELECT n.*, s.student_name 
                    FROM notifications n
                    LEFT JOIN students s ON n.student_id = s.student_id
                    WHERE n.type IN ('overdue_fee', 'upcoming_installment', 'new_registration', 'new_parent')
                    ORDER BY n.created_at DESC, n.id DESC
                    LIMIT %s OFFSET %s
                """, (limit, offset))
                notifications = cursor.fetchall()
                
        # Format timestamps to ISO strings
        for n in notifications:
            if isinstance(n.get('created_at'), (datetime.date, datetime.datetime)):
                n['created_at'] = n['created_at'].isoformat()
                
        return jsonify({
            "success": True,
            "notifications": notifications,
            "total": total,
            "page": page,
            "limit": limit
        })
    except Exception as e:
        return jsonify({"success": False, "message": f"Database error: {str(e)}"}), 500
    finally:
        conn.close()

@notifications_bp.route('/unread-count', methods=['GET'])
@require_firebase_auth()
def get_unread_count():
    conn = get_db_connection()
    try:
        user = g.current_user
        role = user['role']
        unread_count = 0
        
        with conn.cursor() as cursor:
            if role == 'parent':
                cursor.execute("""
                    SELECT COUNT(*) as count 
                    FROM notifications 
                    WHERE is_read = FALSE 
                      AND student_id IN (SELECT student_id FROM students WHERE user_id = %s)
                """, (user['user_id'],))
                unread_count = cursor.fetchone()['count']
            elif role == 'admin':
                cursor.execute("""
                    SELECT COUNT(*) as count 
                    FROM notifications 
                    WHERE is_read = FALSE 
                      AND type IN ('overdue_fee', 'upcoming_installment', 'new_registration', 'new_parent')
                """)
                unread_count = cursor.fetchone()['count']
                
        return jsonify({
            "success": True,
            "unread_count": unread_count
        })
    except Exception as e:
        return jsonify({"success": False, "message": f"Database error: {str(e)}"}), 500
    finally:
        conn.close()

@notifications_bp.route('/read/<int:notification_id>', methods=['PUT'])
@require_firebase_auth()
def mark_as_read(notification_id):
    conn = get_db_connection()
    try:
        user = g.current_user
        role = user['role']
        
        with conn.cursor() as cursor:
            # 1. Fetch target notification
            cursor.execute("SELECT * FROM notifications WHERE id = %s", (notification_id,))
            notification = cursor.fetchone()
            
            if not notification:
                return jsonify({"success": False, "message": "Notification not found."}), 404
                
            # 2. Strict ownership/RBAC check
            if role == 'parent':
                # Verify that the student_id of the notification belongs to one of parent's children
                cursor.execute("""
                    SELECT student_id FROM students 
                    WHERE student_id = %s AND user_id = %s
                """, (notification['student_id'], user['user_id']))
                
                if not cursor.fetchone():
                    return jsonify({"success": False, "message": "Access denied. Unauthorized notification access."}), 403
            
            elif role == 'admin':
                # Admins cannot mark parent-only receipt logs as read
                if notification['type'] == 'payment_received':
                    return jsonify({"success": False, "message": "Access denied. Cannot modify parent receipts."}), 403
            
            # 3. Update status
            cursor.execute("UPDATE notifications SET is_read = TRUE WHERE id = %s", (notification_id,))
            
        return jsonify({
            "success": True,
            "message": "Notification marked as read."
        })
    except Exception as e:
        return jsonify({"success": False, "message": f"Database error: {str(e)}"}), 500
    finally:
        conn.close()

@notifications_bp.route('/read-all', methods=['PUT'])
@require_firebase_auth()
def mark_all_as_read():
    conn = get_db_connection()
    try:
        user = g.current_user
        role = user['role']
        
        with conn.cursor() as cursor:
            if role == 'parent':
                cursor.execute("""
                    UPDATE notifications 
                    SET is_read = TRUE 
                    WHERE is_read = FALSE 
                      AND student_id IN (SELECT student_id FROM students WHERE user_id = %s)
                """, (user['user_id'],))
            elif role == 'admin':
                cursor.execute("""
                    UPDATE notifications 
                    SET is_read = TRUE 
                    WHERE is_read = FALSE 
                      AND type IN ('overdue_fee', 'upcoming_installment', 'new_registration', 'new_parent')
                """)
                
        return jsonify({
            "success": True,
            "message": "All notifications marked as read."
        })
    except Exception as e:
        return jsonify({"success": False, "message": f"Database error: {str(e)}"}), 500
    finally:
        conn.close()
