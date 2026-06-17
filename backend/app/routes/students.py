import datetime
import random
from flask import Blueprint, request, jsonify, g
from app.database import get_db_connection
from app.utils.auth import require_firebase_auth

students_bp = Blueprint('students', __name__)

@students_bp.route('', methods=['GET'])
@require_firebase_auth(role='admin')
def get_all_students():
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # Query students joined with their fee accounts
            cursor.execute("""
                SELECT s.*, 
                       f.fee_id,
                       f.admission_fee, 
                       f.admission_fee_paid, 
                       f.admission_fee_remaining, 
                       f.term_fee, 
                       f.term_fee_paid, 
                       f.term_fee_remaining, 
                       f.daycare_fee, 
                       f.daycare_fee_paid, 
                       f.daycare_fee_remaining, 
                       f.total_fee, 
                       f.paid_amount, 
                       f.pending_amount, 
                       f.due_date,
                       f.status AS fee_status 
                FROM students s 
                LEFT JOIN fees f ON s.student_id = f.student_id
                ORDER BY s.student_id DESC
            """)
            students = cursor.fetchall()
            
            # Format dates to string
            for s in students:
                if isinstance(s.get('admission_date'), (datetime.date, datetime.datetime)):
                    s['admission_date'] = s['admission_date'].isoformat()
                if isinstance(s.get('due_date'), (datetime.date, datetime.datetime)):
                    s['due_date'] = s['due_date'].isoformat()
                if isinstance(s.get('created_at'), (datetime.date, datetime.datetime)):
                    s['created_at'] = s['created_at'].isoformat()
                if isinstance(s.get('updated_at'), (datetime.date, datetime.datetime)):
                    s['updated_at'] = s['updated_at'].isoformat()
                
                # Ensure status is lowercase in the main object if needed, but UI expects it directly
                # UI might expect fee_status to match capitalization
                
        return jsonify(students)
    except Exception as e:
        return jsonify({"success": False, "message": f"Database error: {str(e)}"}), 500

@students_bp.route('/<int:student_id>', methods=['GET'])
@require_firebase_auth(role='admin')
def get_student_by_id(student_id):
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # Get Student and Fee Info
            cursor.execute("""
                SELECT s.*, 
                       f.fee_id,
                       f.admission_fee, 
                       f.admission_fee_paid, 
                       f.admission_fee_remaining, 
                       f.term_fee, 
                       f.term_fee_paid, 
                       f.term_fee_remaining, 
                       f.daycare_fee, 
                       f.daycare_fee_paid, 
                       f.daycare_fee_remaining, 
                       f.total_fee, 
                       f.paid_amount, 
                       f.pending_amount, 
                       f.due_date,
                       f.status AS fee_status 
                FROM students s 
                LEFT JOIN fees f ON s.student_id = f.student_id
                WHERE s.student_id = %s
            """, (student_id,))
            student = cursor.fetchone()
            
            if not student:
                return jsonify({"success": False, "message": "Student record not found."}), 404
                
            if isinstance(student.get('admission_date'), (datetime.date, datetime.datetime)):
                student['admission_date'] = student['admission_date'].isoformat()
            if isinstance(student.get('due_date'), (datetime.date, datetime.datetime)):
                student['due_date'] = student['due_date'].isoformat()
                
            fee_id = student.get('fee_id')
            
            # Fetch Installments
            installments = []
            if fee_id:
                cursor.execute("SELECT * FROM installments WHERE fee_id = %s ORDER BY installment_number", (fee_id,))
                installments = cursor.fetchall()
                for inst in installments:
                    if isinstance(inst.get('due_date'), (datetime.date, datetime.datetime)):
                        inst['due_date'] = inst['due_date'].isoformat()
                    if isinstance(inst.get('payment_date'), (datetime.date, datetime.datetime)):
                        inst['payment_date'] = inst['payment_date'].isoformat()
                        
            # Fetch Receipts
            cursor.execute("SELECT * FROM receipts WHERE student_id = %s ORDER BY payment_date DESC, receipt_id DESC", (student_id,))
            receipts = cursor.fetchall()
            for r in receipts:
                if isinstance(r.get('payment_date'), (datetime.date, datetime.datetime)):
                    r['payment_date'] = r['payment_date'].isoformat()
                    
            # Wrap as the frontend expects
            student['feeDetails'] = {
                "fee_id": student.get('fee_id'),
                "student_id": student.get('student_id'),
                "admission_fee": student.get('admission_fee'),
                "admission_fee_paid": student.get('admission_fee_paid'),
                "admission_fee_remaining": student.get('admission_fee_remaining'),
                "term_fee": student.get('term_fee'),
                "term_fee_paid": student.get('term_fee_paid'),
                "term_fee_remaining": student.get('term_fee_remaining'),
                "daycare_fee": student.get('daycare_fee'),
                "daycare_fee_paid": student.get('daycare_fee_paid'),
                "daycare_fee_remaining": student.get('daycare_fee_remaining'),
                "total_fee": student.get('total_fee'),
                "paid_amount": student.get('paid_amount'),
                "pending_amount": student.get('pending_amount'),
                "due_date": student.get('due_date'),
                "status": student.get('fee_status')
            } if fee_id else None
            
            student['installments'] = installments
            student['receipts'] = receipts
            
        return jsonify(student)
    except Exception as e:
        return jsonify({"success": False, "message": f"Database error: {str(e)}"}), 500

@students_bp.route('/parent/<email>', methods=['GET'])
@require_firebase_auth()
def get_students_by_parent_email(email):
    email = email.strip().lower()
    if g.current_user['role'] == 'parent' and g.current_user['email'].lower() != email:
        return jsonify({"success": False, "message": "Access denied. You can only view your own student records."}), 403
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # Query all students linked to this parent email
            cursor.execute("SELECT student_id FROM students WHERE LOWER(parent_email) = %s", (email,))
            student_ids = [row['student_id'] for row in cursor.fetchall()]
            
            results = []
            for sid in student_ids:
                # Reuse details fetching logic for each student
                cursor.execute("""
                    SELECT s.*, 
                           f.fee_id,
                           f.admission_fee, 
                           f.admission_fee_paid, 
                           f.admission_fee_remaining, 
                           f.term_fee, 
                           f.term_fee_paid, 
                           f.term_fee_remaining, 
                           f.daycare_fee, 
                           f.daycare_fee_paid, 
                           f.daycare_fee_remaining, 
                           f.total_fee, 
                           f.paid_amount, 
                           f.pending_amount, 
                           f.due_date,
                           f.status AS fee_status 
                    FROM students s 
                    LEFT JOIN fees f ON s.student_id = f.student_id
                    WHERE s.student_id = %s
                """, (sid,))
                student = cursor.fetchone()
                if not student:
                    continue
                    
                if isinstance(student.get('admission_date'), (datetime.date, datetime.datetime)):
                    student['admission_date'] = student['admission_date'].isoformat()
                if isinstance(student.get('due_date'), (datetime.date, datetime.datetime)):
                    student['due_date'] = student['due_date'].isoformat()
                    
                fee_id = student.get('fee_id')
                
                # Fetch installments
                installments = []
                if fee_id:
                    cursor.execute("SELECT * FROM installments WHERE fee_id = %s ORDER BY installment_number", (fee_id,))
                    installments = cursor.fetchall()
                    for inst in installments:
                        if isinstance(inst.get('due_date'), (datetime.date, datetime.datetime)):
                            inst['due_date'] = inst['due_date'].isoformat()
                        if isinstance(inst.get('payment_date'), (datetime.date, datetime.datetime)):
                            inst['payment_date'] = inst['payment_date'].isoformat()
                            
                # Fetch receipts
                cursor.execute("SELECT * FROM receipts WHERE student_id = %s ORDER BY payment_date DESC, receipt_id DESC", (sid,))
                receipts = cursor.fetchall()
                for r in receipts:
                    if isinstance(r.get('payment_date'), (datetime.date, datetime.datetime)):
                        r['payment_date'] = r['payment_date'].isoformat()
                        
                # Merge details
                student['feeDetails'] = {
                    "fee_id": student.get('fee_id'),
                    "student_id": student.get('student_id'),
                    "admission_fee": student.get('admission_fee'),
                    "admission_fee_paid": student.get('admission_fee_paid'),
                    "admission_fee_remaining": student.get('admission_fee_remaining'),
                    "term_fee": student.get('term_fee'),
                    "term_fee_paid": student.get('term_fee_paid'),
                    "term_fee_remaining": student.get('term_fee_remaining'),
                    "daycare_fee": student.get('daycare_fee'),
                    "daycare_fee_paid": student.get('daycare_fee_paid'),
                    "daycare_fee_remaining": student.get('daycare_fee_remaining'),
                    "total_fee": student.get('total_fee'),
                    "paid_amount": student.get('paid_amount'),
                    "pending_amount": student.get('pending_amount'),
                    "due_date": student.get('due_date'),
                    "status": student.get('fee_status')
                } if fee_id else None
                
                student['installments'] = installments
                student['receipts'] = receipts
                results.append(student)
                
        return jsonify(results)
    except Exception as e:
        return jsonify({"success": False, "message": f"Database error: {str(e)}"}), 500

@students_bp.route('', methods=['POST'])
@require_firebase_auth(role='admin')
def create_student():
    data = request.json or {}
    
    student_name = data.get('student_name', '').strip()
    parent_name = data.get('parent_name', '').strip()
    parent_email = data.get('parent_email', '').strip().lower()
    parent_phone = data.get('parent_phone', '').strip()
    student_class = data.get('class', '').strip()
    
    if not student_name or not parent_name or not parent_email or not student_class:
        return jsonify({"success": False, "message": "Missing required student details."}), 400
        
    admission_number = data.get('admission_number', '').strip()
    if not admission_number:
        admission_number = f"ADM-{int(datetime.datetime.now().timestamp()) % 10000:04d}"
        
    admission_date = data.get('admission_date')
    if not admission_date:
        admission_date = datetime.date.today().isoformat()
        
    admission_fee = float(data.get('admission_fee') or 0.0)
    term_fee = float(data.get('term_fee') or 0.0)
    daycare_fee = float(data.get('daycare_fee') or 0.0)
    total_fee = admission_fee + term_fee + daycare_fee
    initial_payment = float(data.get('initial_payment') or 0.0)
    
    if initial_payment > total_fee:
        return jsonify({"success": False, "message": "Initial payment cannot be greater than total fee."}), 400
        
    due_date = data.get('due_date')
    if not due_date:
        due_date = (datetime.date.today() + datetime.timedelta(days=90)).isoformat()
        
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # Check duplicate admission number
            cursor.execute("SELECT student_id FROM students WHERE LOWER(admission_number) = %s", (admission_number.lower(),))
            if cursor.fetchone():
                return jsonify({"success": False, "message": "Duplicate admission number not allowed."}), 400
                
            # Start transaction explicitly
            cursor.execute("START TRANSACTION")
            
            # Check if parent email is registered in users, get user_id
            cursor.execute("SELECT user_id FROM users WHERE LOWER(email) = %s", (parent_email,))
            user = cursor.fetchone()
            user_id = user['user_id'] if user else None
            
            # Insert Student
            cursor.execute("""
                INSERT INTO students (student_name, parent_name, parent_email, parent_phone, class, admission_number, admission_date, status, user_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, 'active', %s)
            """, (student_name, parent_name, parent_email, parent_phone, student_class, admission_number, admission_date, user_id))
            
            student_id = cursor.lastrowid
            
            # Priority waterfall allocation for initial payment
            temp_paid = initial_payment
            admission_fee_paid = min(temp_paid, admission_fee)
            temp_paid -= admission_fee_paid
            
            term_fee_paid = min(temp_paid, term_fee)
            temp_paid -= term_fee_paid
            
            daycare_fee_paid = min(temp_paid, daycare_fee)
            
            pending_amount = total_fee - initial_payment
            
            # Determine fee status
            fee_status = "pending"
            if pending_amount == 0:
                fee_status = "paid"
            else:
                today_str = datetime.date.today().isoformat()
                if due_date < today_str:
                    fee_status = "overdue"
                    
            # Insert Fee
            cursor.execute("""
                INSERT INTO fees (student_id, admission_fee, admission_fee_paid, term_fee, term_fee_paid, daycare_fee, daycare_fee_paid, due_date, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (student_id, admission_fee, admission_fee_paid, term_fee, term_fee_paid, daycare_fee, daycare_fee_paid, due_date, fee_status))
            
            fee_id = cursor.lastrowid
            
            # Initialize Installments
            if initial_payment == total_fee:
                # Fully Paid Upfront
                cursor.execute("""
                    INSERT INTO installments (fee_id, installment_number, amount, due_date, payment_date, status)
                    VALUES (%s, 1, %s, %s, %s, 'paid')
                """, (fee_id, total_fee, due_date, admission_date))
                inst_id = cursor.lastrowid
                
                # Log receipt
                receipt_no = f"REC-{int(datetime.datetime.now().timestamp()) % 10000:04d}-{random.randint(1000, 9999)}"
                pdf_path = f"/receipts/{receipt_no}.pdf"
                cursor.execute("""
                    INSERT INTO receipts (receipt_number, installment_id, student_id, student_name, amount_paid, payment_date, payment_method, pdf_path)
                    VALUES (%s, %s, %s, %s, %s, %s, 'bank_transfer', %s)
                """, (receipt_no, inst_id, student_id, student_name, total_fee, admission_date, pdf_path))
                
            elif initial_payment > 0:
                # Partially Paid Upfront
                cursor.execute("""
                    INSERT INTO installments (fee_id, installment_number, amount, due_date, payment_date, status)
                    VALUES (%s, 1, %s, %s, %s, 'paid')
                """, (fee_id, initial_payment, admission_date, admission_date))
                inst_id = cursor.lastrowid
                
                # Log receipt
                receipt_no = f"REC-{int(datetime.datetime.now().timestamp()) % 10000:04d}-{random.randint(1000, 9999)}"
                pdf_path = f"/receipts/{receipt_no}.pdf"
                cursor.execute("""
                    INSERT INTO receipts (receipt_number, installment_id, student_id, student_name, amount_paid, payment_date, payment_method, pdf_path)
                    VALUES (%s, %s, %s, %s, %s, %s, 'bank_transfer', %s)
                """, (receipt_no, inst_id, student_id, student_name, initial_payment, admission_date, pdf_path))
                
                # 2 unpaid remaining installments
                rem = total_fee - initial_payment
                inst2_amt = round(rem / 2, 2)
                inst3_amt = round(rem - inst2_amt, 2)
                
                due2 = (datetime.date.today() + datetime.timedelta(days=30)).isoformat()
                due3 = (datetime.date.today() + datetime.timedelta(days=60)).isoformat()
                
                cursor.execute("""
                    INSERT INTO installments (fee_id, installment_number, amount, due_date, payment_date, status)
                    VALUES (%s, 2, %s, %s, NULL, 'unpaid')
                """, (fee_id, inst2_amt, due2))
                cursor.execute("""
                    INSERT INTO installments (fee_id, installment_number, amount, due_date, payment_date, status)
                    VALUES (%s, 3, %s, %s, NULL, 'unpaid')
                """, (fee_id, inst3_amt, due3))
                
            else:
                # No initial payment: Split total into 3 installments
                inst_amt = round(total_fee / 3, 2)
                inst_last = round(total_fee - (inst_amt * 2), 2)
                
                for i in range(1, 4):
                    due_inst = (datetime.date.today() + datetime.timedelta(days=i * 30)).isoformat()
                    amt = inst_last if i == 3 else inst_amt
                    cursor.execute("""
                        INSERT INTO installments (fee_id, installment_number, amount, due_date, payment_date, status)
                        VALUES (%s, %s, %s, %s, NULL, 'unpaid')
                    """, (fee_id, i, amt, due_inst))
                    
            cursor.execute("COMMIT")
            
        return jsonify({
            "success": True,
            "student": {
                "student_id": student_id,
                "student_name": student_name,
                "parent_name": parent_name,
                "parent_email": parent_email,
                "parent_phone": parent_phone,
                "class": student_class,
                "admission_number": admission_number,
                "admission_date": admission_date,
                "status": "active"
            }
        }), 201
    except Exception as e:
        conn.cursor().execute("ROLLBACK")
        return jsonify({"success": False, "message": f"Database transaction failed: {str(e)}"}), 500

@students_bp.route('/<int:student_id>', methods=['PUT'])
@require_firebase_auth(role='admin')
def update_student(student_id):
    data = request.json or {}
    
    student_name = data.get('student_name')
    parent_name = data.get('parent_name')
    parent_phone = data.get('parent_phone')
    student_class = data.get('class')
    status = data.get('status')
    parent_email = data.get('parent_email')
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # 1. Check if student exists
            cursor.execute("SELECT * FROM students WHERE student_id = %s", (student_id,))
            student = cursor.fetchone()
            if not student:
                return jsonify({"success": False, "message": "Student record not found."}), 404
                
            cursor.execute("START TRANSACTION")
            
            # Construct update statement
            updates = []
            params = []
            
            if student_name is not None:
                updates.append("student_name = %s")
                params.append(student_name.strip())
            if parent_name is not None:
                updates.append("parent_name = %s")
                params.append(parent_name.strip())
            if parent_phone is not None:
                updates.append("parent_phone = %s")
                params.append(parent_phone.strip())
            if student_class is not None:
                updates.append("class = %s")
                params.append(student_class.strip())
            if status is not None:
                updates.append("status = %s")
                params.append(status)
            if parent_email is not None:
                new_email = parent_email.strip().lower()
                updates.append("parent_email = %s")
                params.append(new_email)
                
                # Update user_id reference if new email matches a registered user
                cursor.execute("SELECT user_id FROM users WHERE LOWER(email) = %s", (new_email,))
                user = cursor.fetchone()
                user_id = user['user_id'] if user else None
                updates.append("user_id = %s")
                params.append(user_id)
                
            if updates:
                sql = f"UPDATE students SET {', '.join(updates)} WHERE student_id = %s"
                params.append(student_id)
                cursor.execute(sql, tuple(params))
                
            # 2. Update fee configuration if fee amounts are sent
            admission_fee = data.get('admission_fee')
            term_fee = data.get('term_fee')
            daycare_fee = data.get('daycare_fee')
            
            if admission_fee is not None or term_fee is not None or daycare_fee is not None:
                # Get existing fee info
                cursor.execute("SELECT * FROM fees WHERE student_id = %s", (student_id,))
                fee_rec = cursor.fetchone()
                
                if fee_rec:
                    new_adm = float(admission_fee) if admission_fee is not None else float(fee_rec['admission_fee'])
                    new_term = float(term_fee) if term_fee is not None else float(fee_rec['term_fee'])
                    new_daycare = float(daycare_fee) if daycare_fee is not None else float(fee_rec['daycare_fee'])
                    
                    new_total = new_adm + new_term + new_daycare
                    current_paid = float(fee_rec['paid_amount']) # Wait, generated column value! Let's sum the paid fields manually to be sure
                    # paid_amount = admission_fee_paid + term_fee_paid + daycare_fee_paid
                    adm_paid = float(fee_rec['admission_fee_paid'])
                    trm_paid = float(fee_rec['term_fee_paid'])
                    day_paid = float(fee_rec['daycare_fee_paid'])
                    total_paid = adm_paid + trm_paid + day_paid
                    
                    if new_total < total_paid:
                        cursor.execute("ROLLBACK")
                        return jsonify({"success": False, "message": f"Total fee ({new_total}) cannot be reduced below paid amount of ₹{total_paid}."}), 400
                        
                    # Re-run priority allocation for the total_paid
                    temp_p = total_paid
                    new_adm_paid = min(temp_p, new_adm)
                    temp_p -= new_adm_paid
                    
                    new_term_paid = min(temp_p, new_term)
                    temp_p -= new_term_paid
                    
                    new_daycare_paid = min(temp_p, new_daycare)
                    
                    # Re-calculate status
                    pending = new_total - total_paid
                    new_status = "pending"
                    if pending == 0:
                        new_status = "paid"
                    else:
                        today_str = datetime.date.today().isoformat()
                        if fee_rec['due_date'].isoformat() < today_str:
                            new_status = "overdue"
                            
                    cursor.execute("""
                        UPDATE fees 
                        SET admission_fee = %s, admission_fee_paid = %s,
                            term_fee = %s, term_fee_paid = %s,
                            daycare_fee = %s, daycare_fee_paid = %s,
                            status = %s
                        WHERE student_id = %s
                    """, (new_adm, new_adm_paid, new_term, new_term_paid, new_daycare, new_daycare_paid, new_status, student_id))
                    
            cursor.execute("COMMIT")
        return jsonify({"success": True, "message": "Student record updated successfully."})
    except Exception as e:
        conn.cursor().execute("ROLLBACK")
        return jsonify({"success": False, "message": f"Database transaction failed: {str(e)}"}), 500

@students_bp.route('/<int:student_id>', methods=['DELETE'])
@require_firebase_auth(role='admin')
def delete_student(student_id):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # 1. Enforce hard-deletion safety constraint
            # Check if any installments are paid or if receipts exist
            cursor.execute("SELECT fee_id FROM fees WHERE student_id = %s", (student_id,))
            fee_rec = cursor.fetchone()
            
            if fee_rec:
                fee_id = fee_rec['fee_id']
                cursor.execute("SELECT COUNT(*) as count FROM installments WHERE fee_id = %s AND status = 'paid'", (fee_id,))
                paid_inst_count = cursor.fetchone()['count']
                
                cursor.execute("SELECT COUNT(*) as count FROM receipts WHERE student_id = %s", (student_id,))
                receipt_count = cursor.fetchone()['count']
                
                if paid_inst_count > 0 or receipt_count > 0:
                    return jsonify({
                        "success": False, 
                        "message": "Hard-deletion blocked: This student profile contains financial histories (paid installments or receipts). Please deactivate the profile status to 'inactive' instead of deleting."
                    }), 400
                    
                cursor.execute("START TRANSACTION")
                # Clean up unpaid installments
                cursor.execute("DELETE FROM installments WHERE fee_id = %s AND status != 'paid'", (fee_id,))
                # Clean up fee account
                cursor.execute("DELETE FROM fees WHERE fee_id = %s", (fee_id,))
                
            else:
                cursor.execute("START TRANSACTION")
                
            # Clean up student record
            cursor.execute("DELETE FROM students WHERE student_id = %s", (student_id,))
            cursor.execute("COMMIT")
            
        return jsonify({"success": True, "message": "Student profile deleted successfully."})
    except Exception as e:
        conn.cursor().execute("ROLLBACK")
        return jsonify({"success": False, "message": f"Database transaction failed: {str(e)}"}), 500
