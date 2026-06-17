import datetime
import random
from flask import Blueprint, request, jsonify, send_file, make_response, g
import io
from app.database import get_db_connection
from app.services.pdf_service import generate_receipt_pdf
from app.utils.auth import require_firebase_auth

receipts_bp = Blueprint('receipts', __name__)

@receipts_bp.route('', methods=['GET'])
@require_firebase_auth(role='admin')
def get_all_receipts():
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # Query receipts joined with parent name from students
            cursor.execute("""
                SELECT r.*, s.parent_name, inst.installment_number, f.pending_amount as remaining_balance
                FROM receipts r
                JOIN students s ON r.student_id = s.student_id
                JOIN installments inst ON r.installment_id = inst.installment_id
                JOIN fees f ON s.student_id = f.student_id
                ORDER BY r.payment_date DESC, r.receipt_id DESC
            """)
            receipts = cursor.fetchall()
            
            for r in receipts:
                if isinstance(r.get('payment_date'), (datetime.date, datetime.datetime)):
                    r['payment_date'] = r['payment_date'].isoformat()
                if isinstance(r.get('created_at'), (datetime.date, datetime.datetime)):
                    r['created_at'] = r['created_at'].isoformat()
                    
        return jsonify(receipts)
    except Exception as e:
        return jsonify({"success": False, "message": f"Database error: {str(e)}"}), 500

@receipts_bp.route('/log', methods=['POST'])
@require_firebase_auth(role='admin')
def log_payment():
    data = request.json or {}
    student_id = data.get('student_id')
    installment_id = data.get('installment_id')
    amount_paid = data.get('amount_paid')
    payment_date = data.get('payment_date')
    payment_method = data.get('payment_method', 'bank_transfer')
    
    if not student_id or not installment_id or amount_paid is None:
        return jsonify({"success": False, "message": "Missing required transaction details."}), 400
        
    try:
        amount_paid = float(amount_paid)
        if amount_paid <= 0:
            return jsonify({"success": False, "message": "Payment amount must be greater than zero."}), 400
    except ValueError:
        return jsonify({"success": False, "message": "Invalid payment amount."}), 400
        
    if not payment_date:
        payment_date = datetime.date.today().isoformat()
        
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("START TRANSACTION")
            
            # 1. Verify student exists
            cursor.execute("SELECT student_name, parent_name FROM students WHERE student_id = %s", (student_id,))
            student = cursor.fetchone()
            if not student:
                cursor.execute("ROLLBACK")
                return jsonify({"success": False, "message": "Student record not found."}), 404
                
            # 2. Verify fee record exists
            cursor.execute("SELECT * FROM fees WHERE student_id = %s", (student_id,))
            fee = cursor.fetchone()
            if not fee:
                cursor.execute("ROLLBACK")
                return jsonify({"success": False, "message": "Fee record not found."}), 404
                
            # 3. Verify installment exists
            cursor.execute("SELECT * FROM installments WHERE installment_id = %s", (installment_id,))
            inst = cursor.fetchone()
            if not inst:
                cursor.execute("ROLLBACK")
                return jsonify({"success": False, "message": "Installment record not found."}), 404
                
            if inst['status'] == 'paid':
                cursor.execute("ROLLBACK")
                return jsonify({"success": False, "message": "Installment is already fully paid."}), 400
                
            if float(inst['amount']) != amount_paid:
                cursor.execute("ROLLBACK")
                return jsonify({"success": False, "message": f"Payment amount (₹{amount_paid}) must match the installment amount (₹{inst['amount']})."}), 400
                
            # 4. Priority Payment Allocation Waterfall
            prev_adm_paid = float(fee['admission_fee_paid'])
            prev_term_paid = float(fee['term_fee_paid'])
            prev_daycare_paid = float(fee['daycare_fee_paid'])
            
            # Compute new total paid
            new_total_paid = prev_adm_paid + prev_term_paid + prev_daycare_paid + amount_paid
            
            # Re-allocate
            admission_fee = float(fee['admission_fee'])
            term_fee = float(fee['term_fee'])
            daycare_fee = float(fee['daycare_fee'])
            total_fee = admission_fee + term_fee + daycare_fee
            
            temp_paid = new_total_paid
            new_adm_paid = min(temp_paid, admission_fee)
            temp_paid -= new_adm_paid
            
            new_term_paid = min(temp_paid, term_fee)
            temp_paid -= new_term_paid
            
            new_daycare_paid = min(temp_paid, daycare_fee)
            
            # Compute new balance and status
            pending_amount = total_fee - new_total_paid
            new_status = "pending"
            if pending_amount <= 0:
                pending_amount = 0.0
                new_status = "paid"
            else:
                today_str = datetime.date.today().isoformat()
                if fee['due_date'].isoformat() < today_str:
                    new_status = "overdue"
                    
            # Update fees table
            cursor.execute("""
                UPDATE fees 
                SET admission_fee_paid = %s, term_fee_paid = %s, daycare_fee_paid = %s, status = %s
                WHERE fee_id = %s
            """, (new_adm_paid, new_term_paid, new_daycare_paid, new_status, fee['fee_id']))
            
            # 5. Update installment status
            cursor.execute("""
                UPDATE installments 
                SET status = 'paid', payment_date = %s
                WHERE installment_id = %s
            """, (payment_date, installment_id))
            
            # 6. Determine fee categories covered by this payment
            categories = []
            if new_adm_paid - prev_adm_paid > 0:
                categories.append("Admission Fee")
            if new_term_paid - prev_term_paid > 0:
                categories.append("Term Fee")
            if new_daycare_paid - prev_daycare_paid > 0:
                categories.append("Daycare Fee")
            fee_category = " & ".join(categories) or "General Fee"
            
            # 7. Create Receipt
            receipt_no = f"REC-{int(datetime.datetime.now().timestamp()) % 10000:04d}-{random.randint(1000, 9999)}"
            pdf_path = f"/receipts/{receipt_no}.pdf"
            
            cursor.execute("""
                INSERT INTO receipts (receipt_number, installment_id, student_id, student_name, amount_paid, payment_date, payment_method, pdf_path)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (receipt_no, installment_id, student_id, student['student_name'], amount_paid, payment_date, payment_method, pdf_path))
            
            receipt_id = cursor.lastrowid
            cursor.execute("COMMIT")
            
            # Fetch inserted receipt details to return to frontend
            return jsonify({
                "success": True,
                "receipt": {
                    "receipt_id": receipt_id,
                    "receipt_number": receipt_no,
                    "installment_id": installment_id,
                    "installment_number": inst['installment_number'],
                    "student_id": student_id,
                    "student_name": student['student_name'],
                    "parent_name": student['parent_name'],
                    "amount_paid": amount_paid,
                    "payment_date": payment_date,
                    "payment_method": payment_method,
                    "pdf_path": pdf_path,
                    "remaining_balance": pending_amount,
                    "institution_name": "FirstCry Intellitots",
                    "fee_category": fee_category
                }
            })
    except Exception as e:
        conn.cursor().execute("ROLLBACK")
        return jsonify({"success": False, "message": f"Database transaction failed: {str(e)}"}), 500

@receipts_bp.route('/download/<int:receipt_id>', methods=['GET'])
@require_firebase_auth()
def download_receipt(receipt_id):
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # Fetch receipt
            cursor.execute("SELECT * FROM receipts WHERE receipt_id = %s", (receipt_id,))
            receipt = cursor.fetchone()
            if not receipt:
                return jsonify({"success": False, "message": "Receipt not found."}), 404
                
            # RBAC check: Parents can only download their own children's receipts
            if g.current_user['role'] == 'parent':
                cursor.execute("SELECT student_id FROM students WHERE student_id = %s AND user_id = %s", (receipt['student_id'], g.current_user['user_id']))
                if not cursor.fetchone():
                    return jsonify({"success": False, "message": "Access denied. You can only download receipts for your own children."}), 403
                
            # Fetch student and fee info
            cursor.execute("SELECT parent_name, admission_number FROM students WHERE student_id = %s", (receipt['student_id'],))
            student = cursor.fetchone()
            parent_name = student['parent_name'] if student else 'N/A'
            admission_number = student['admission_number'] if student else 'N/A'
            
            cursor.execute("SELECT pending_amount FROM fees WHERE student_id = %s", (receipt['student_id'],))
            fee = cursor.fetchone()
            remaining_balance = float(fee['pending_amount']) if fee else 0.0
            
            # Fetch installment info to determine fee category
            cursor.execute("SELECT * FROM installments WHERE installment_id = %s", (receipt['installment_id'],))
            inst = cursor.fetchone()
            installment_number = inst['installment_number'] if inst else 'N/A'
            
            # Deduce fee category splits
            # We can re-evaluate what was paid by comparing total paid before/after, or simply query fee configurations
            cursor.execute("SELECT * FROM fees WHERE student_id = %s", (receipt['student_id'],))
            fee_rec = cursor.fetchone()
            
            # A fallback check for the category
            fee_category = "Installment Payment"
            if fee_rec:
                # Based on the installment number and total paid, we can give a descriptive label
                categories = []
                # Simple logic: if installment_id is 1 or name suggests, or just general
                cursor.execute("""
                    SELECT r.amount_paid, r.receipt_id 
                    FROM receipts r 
                    WHERE r.student_id = %s 
                    ORDER BY r.payment_date, r.receipt_id
                """, (receipt['student_id'],))
                prior_receipts = cursor.fetchall()
                
                # Sum payments up to this one
                cumulative_paid = 0.0
                for pr in prior_receipts:
                    cumulative_paid += float(pr['amount_paid'])
                    if pr['receipt_id'] == receipt_id:
                        break
                        
                prev_paid = cumulative_paid - float(receipt['amount_paid'])
                
                # Allocation waterfall
                adm = float(fee_rec['admission_fee'])
                trm = float(fee_rec['term_fee'])
                day = float(fee_rec['daycare_fee'])
                
                prev_adm_allocated = min(prev_paid, adm)
                rem_prev = prev_paid - prev_adm_allocated
                prev_trm_allocated = min(rem_prev, trm)
                rem_prev -= prev_trm_allocated
                prev_day_allocated = min(rem_prev, day)
                
                curr_adm_allocated = min(cumulative_paid, adm)
                rem_curr = cumulative_paid - curr_adm_allocated
                curr_trm_allocated = min(rem_curr, trm)
                rem_curr -= curr_trm_allocated
                curr_day_allocated = min(rem_curr, day)
                
                categories = []
                if curr_adm_allocated - prev_adm_allocated > 0:
                    categories.append("Admission Fee")
                if curr_trm_allocated - prev_trm_allocated > 0:
                    categories.append("Term Fee")
                if curr_day_allocated - prev_day_allocated > 0:
                    categories.append("Daycare Fee")
                fee_category = " & ".join(categories) or "General Fee"
            
            # Format date to string for ReportLab
            if isinstance(receipt['payment_date'], (datetime.date, datetime.datetime)):
                receipt['payment_date'] = receipt['payment_date'].isoformat()
                
            pdf_data = generate_receipt_pdf(receipt, parent_name, remaining_balance, fee_category, admission_number, installment_number)
            
            # Send file as binary attachment
            response = make_response(pdf_data)
            response.headers['Content-Type'] = 'application/pdf'
            response.headers['Content-Disposition'] = f'attachment; filename=Receipt_{receipt["receipt_number"]}.pdf'
            return response
    except Exception as e:
        return jsonify({"success": False, "message": f"PDF Generation failed: {str(e)}"}), 500
