import datetime

def create_notification(conn, user_id, student_id, title, message, type):
    """
    Utility function to insert a notification into the database.
    Prevents duplicates by checking if the exact same notification (by student_id, type, and title)
    was already created within the last 24 hours.
    """
    try:
        with conn.cursor() as cursor:
            # Check for duplicate created in the last 24 hours
            cursor.execute("""
                SELECT id FROM notifications 
                WHERE (user_id = %s OR (user_id IS NULL AND %s IS NULL))
                  AND (student_id = %s OR (student_id IS NULL AND %s IS NULL))
                  AND type = %s 
                  AND title = %s
                  AND created_at >= NOW() - INTERVAL 1 DAY
            """, (user_id, user_id, student_id, student_id, type, title))
            
            if cursor.fetchone():
                # Duplicate found, skip insertion
                return None
                
            cursor.execute("""
                INSERT INTO notifications (user_id, student_id, title, message, type, is_read)
                VALUES (%s, %s, %s, %s, %s, FALSE)
            """, (user_id, student_id, title, message, type))
            return cursor.lastrowid
    except Exception as e:
        print(f"Error creating notification: {e}")
        return None

def check_and_generate_fee_notifications(conn):
    """
    Scans installments for unpaid items and generates overdue, due today, or due tomorrow alerts.
    Dates are computed relative to the current local server time.
    """
    try:
        today = datetime.date.today()
        
        with conn.cursor() as cursor:
            # Fetch all unpaid or overdue installments with student and parent user details
            cursor.execute("""
                SELECT inst.installment_id, inst.installment_number, inst.amount, inst.due_date, inst.status,
                       s.student_id, s.student_name, u.firebase_uid AS parent_firebase_uid
                FROM installments inst
                JOIN fees f ON inst.fee_id = f.fee_id
                JOIN students s ON f.student_id = s.student_id
                LEFT JOIN users u ON s.user_id = u.user_id
                WHERE inst.status != 'paid'
            """)
            installments = cursor.fetchall()
            
            for inst in installments:
                due_date = inst['due_date']
                if isinstance(due_date, str):
                    due_date = datetime.date.fromisoformat(due_date)
                elif isinstance(due_date, datetime.datetime):
                    due_date = due_date.date()
                
                days_diff = (due_date - today).days
                
                # Determine alert details
                alert_type = None
                title = None
                parent_msg = None
                admin_msg = None
                
                if days_diff < 0:
                    alert_type = "overdue_fee"
                    title = f"Overdue Fee: Installment #{inst['installment_number']}"
                    parent_msg = f"Fee installment of ₹{inst['amount']:.2f} for {inst['student_name']} is overdue (Due Date: {due_date}). Please pay as soon as possible."
                    admin_msg = f"Fee installment of ₹{inst['amount']:.2f} for {inst['student_name']} is overdue (Due Date: {due_date})."
                elif days_diff == 0:
                    alert_type = "upcoming_installment"
                    title = f"Fee Due Today: Installment #{inst['installment_number']}"
                    parent_msg = f"Fee installment of ₹{inst['amount']:.2f} for {inst['student_name']} is due today."
                    admin_msg = f"Fee installment of ₹{inst['amount']:.2f} for {inst['student_name']} is due today."
                elif days_diff == 1:
                    alert_type = "upcoming_installment"
                    title = f"Fee Due Tomorrow: Installment #{inst['installment_number']}"
                    parent_msg = f"Fee installment of ₹{inst['amount']:.2f} for {inst['student_name']} is due tomorrow."
                    admin_msg = f"Fee installment of ₹{inst['amount']:.2f} for {inst['student_name']} is due tomorrow."
                
                # If there's an alert to trigger
                if alert_type:
                    # 1. Generate parent notification if the parent user exists
                    if inst['parent_firebase_uid']:
                        create_notification(
                            conn=conn,
                            user_id=inst['parent_firebase_uid'],
                            student_id=inst['student_id'],
                            title=title,
                            message=parent_msg,
                            type=alert_type
                        )
                    
                    # 2. Generate admin notification (user_id IS NULL)
                    create_notification(
                        conn=conn,
                        user_id=None,
                        student_id=inst['student_id'],
                        title=title,
                        message=admin_msg,
                        type=alert_type
                    )
                    
    except Exception as e:
        print(f"Error checking/generating fee notifications: {e}")
