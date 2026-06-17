import datetime
from flask import Blueprint, request, jsonify, g
from app.database import get_db_connection
from app.utils.auth import require_firebase_auth

installments_bp = Blueprint('installments', __name__)

@installments_bp.route('/<int:student_id>', methods=['GET'])
@require_firebase_auth()
def get_installments_by_student_id(student_id):
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            if g.current_user['role'] == 'parent':
                cursor.execute("SELECT student_id FROM students WHERE student_id = %s AND user_id = %s", (student_id, g.current_user['user_id']))
                if not cursor.fetchone():
                    return jsonify({"success": False, "message": "Access denied. Student is not linked to your account."}), 403
            # Query installments for student_id by joining with fees table
            cursor.execute("""
                SELECT i.* 
                FROM installments i
                JOIN fees f ON i.fee_id = f.fee_id
                WHERE f.student_id = %s
                ORDER BY i.installment_number
            """, (student_id,))
            installments = cursor.fetchall()
            
            # Format dates
            for inst in installments:
                if isinstance(inst.get('due_date'), (datetime.date, datetime.datetime)):
                    inst['due_date'] = inst['due_date'].isoformat()
                if isinstance(inst.get('payment_date'), (datetime.date, datetime.datetime)):
                    inst['payment_date'] = inst['payment_date'].isoformat()
                    
        return jsonify(installments)
    except Exception as e:
        return jsonify({"success": False, "message": f"Database error: {str(e)}"}), 500

@installments_bp.route('/<int:fee_id>', methods=['POST'])
@require_firebase_auth(role='admin')
def save_installments(fee_id):
    data = request.json or {}
    updated_rows = data.get('installments', [])
    
    if not updated_rows:
        return jsonify({"success": False, "message": "No installment data provided."}), 400
        
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # 1. Fetch fee record
            cursor.execute("SELECT * FROM fees WHERE fee_id = %s", (fee_id,))
            fee = cursor.fetchone()
            if not fee:
                return jsonify({"success": False, "message": "Fee record not found."}), 404
                
            total_fee = float(fee['total_fee'])
            
            # 2. Check sum of installments matches total fee
            total_sum = sum(float(row.get('amount') or 0) for row in updated_rows)
            tolerance = 0.01
            if abs(total_sum - total_fee) > tolerance:
                return jsonify({
                    "success": False,
                    "message": f"Installment sum (₹{total_sum:.2f}) does not equal the student's total fee account (₹{total_fee:.2f})."
                }), 400
                
            # 3. Check that paid installments are untouched
            cursor.execute("SELECT * FROM installments WHERE fee_id = %s AND status = 'paid'", (fee_id,))
            existing_paid = cursor.fetchall()
            
            for orig in existing_paid:
                # Find matching row in updated list
                # Match by installment_number since installment_id might be transient
                updated = next((u for u in updated_rows if int(u.get('installment_number')) == orig['installment_number']), None)
                if not updated or float(updated.get('amount') or 0) != float(orig['amount']):
                    return jsonify({
                        "success": False,
                        "message": f"Violation: Paid installment #{orig['installment_number']} is read-only and its amount cannot be modified."
                    }), 400
            
            # 4. Start transaction to update installments
            cursor.execute("START TRANSACTION")
            
            # Delete old unpaid installments
            cursor.execute("DELETE FROM installments WHERE fee_id = %s AND status != 'paid'", (fee_id,))
            
            # Insert new/updated installments
            for row in updated_rows:
                status = row.get('status', 'unpaid')
                if status == 'paid':
                    # Paid installments are left untouched in the database, do not insert them again
                    continue
                    
                installment_number = int(row['installment_number'])
                amount = float(row['amount'])
                due_date = row['due_date']
                
                cursor.execute("""
                    INSERT INTO installments (fee_id, installment_number, amount, due_date, payment_date, status)
                    VALUES (%s, %s, %s, %s, NULL, %s)
                """, (fee_id, installment_number, amount, due_date, status))
                
            cursor.execute("COMMIT")
            
            # Fetch and return updated list
            cursor.execute("SELECT * FROM installments WHERE fee_id = %s ORDER BY installment_number", (fee_id,))
            updated_list = cursor.fetchall()
            for inst in updated_list:
                if isinstance(inst.get('due_date'), (datetime.date, datetime.datetime)):
                    inst['due_date'] = inst['due_date'].isoformat()
                if isinstance(inst.get('payment_date'), (datetime.date, datetime.datetime)):
                    inst['payment_date'] = inst['payment_date'].isoformat()
                    
        return jsonify(updated_list)
    except Exception as e:
        conn.cursor().execute("ROLLBACK")
        return jsonify({"success": False, "message": f"Database transaction failed: {str(e)}"}), 500
