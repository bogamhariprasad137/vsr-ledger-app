from flask import Blueprint, request, jsonify, make_response, g
from app.database import get_db_connection
from app.services.pdf_service import generate_report_pdf
from app.utils.auth import require_firebase_auth
import datetime

reports_bp = Blueprint('reports', __name__)

@reports_bp.route('/download', methods=['GET'])
@require_firebase_auth(role='admin')
def download_report():
    report_type = request.args.get('type', 'collections').lower()
    
    if report_type not in ['collections', 'arrears', 'roster']:
        return jsonify({"success": False, "message": "Invalid report type specified."}), 400
        
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # 1. Fetch overall summary metrics
            cursor.execute("SELECT COUNT(*) as total_students FROM students")
            total_students = cursor.fetchone()['total_students']
            
            cursor.execute("""
                SELECT 
                    SUM(total_fee) as total_allocated,
                    SUM(paid_amount) as total_collected,
                    SUM(pending_amount) as total_pending,
                    SUM(admission_fee) as admission_allocated,
                    SUM(admission_fee_paid) as admission_collected,
                    SUM(term_fee) as term_allocated,
                    SUM(term_fee_paid) as term_collected,
                    SUM(daycare_fee) as daycare_allocated,
                    SUM(daycare_fee_paid) as daycare_collected
                FROM fees
            """)
            fees_summary = cursor.fetchone()
            
            # Fetch total overdue sum from installments
            cursor.execute("SELECT SUM(amount) as total_overdue FROM installments WHERE status = 'overdue'")
            total_overdue_row = cursor.fetchone()
            total_overdue = float(total_overdue_row['total_overdue'] or 0.0)
            
            # Extract basic metric values safely
            total_allocated = float(fees_summary['total_allocated'] or 0.0)
            total_collected = float(fees_summary['total_collected'] or 0.0)
            total_pending = float(fees_summary['total_pending'] or 0.0)
            
            admission_allocated = float(fees_summary['admission_allocated'] or 0.0)
            admission_collected = float(fees_summary['admission_collected'] or 0.0)
            term_allocated = float(fees_summary['term_allocated'] or 0.0)
            term_collected = float(fees_summary['term_collected'] or 0.0)
            daycare_allocated = float(fees_summary['daycare_allocated'] or 0.0)
            daycare_collected = float(fees_summary['daycare_collected'] or 0.0)
            
            admission_pct = (admission_collected / admission_allocated * 100) if admission_allocated > 0 else 0.0
            term_pct = (term_collected / term_allocated * 100) if term_allocated > 0 else 0.0
            daycare_pct = (daycare_collected / daycare_allocated * 100) if daycare_allocated > 0 else 0.0
            
            metrics = {
                "total_students": total_students,
                "total_allocated": total_allocated,
                "total_collected": total_collected,
                "total_pending": total_pending,
                "total_overdue": total_overdue,
                "admission_allocated": admission_allocated,
                "admission_collected": admission_collected,
                "admission_pct": admission_pct,
                "term_allocated": term_allocated,
                "term_collected": term_collected,
                "term_pct": term_pct,
                "daycare_allocated": daycare_allocated,
                "daycare_collected": daycare_collected,
                "daycare_pct": daycare_pct
            }
            
            # 2. Gather specific details based on report type
            if report_type == "arrears":
                # Fetch overdue accounts details
                cursor.execute("""
                    SELECT 
                        s.student_name, 
                        s.parent_name, 
                        f.pending_amount as outstanding_amount, 
                        MIN(i.due_date) as oldest_due_date
                    FROM students s
                    JOIN fees f ON s.student_id = f.student_id
                    JOIN installments i ON f.fee_id = i.fee_id
                    WHERE i.status = 'overdue'
                    GROUP BY s.student_id, s.student_name, s.parent_name, f.pending_amount
                """)
                arrears_rows = cursor.fetchall()
                arrears_list = []
                today = datetime.date.today()
                for row in arrears_rows:
                    oldest_due = row['oldest_due_date']
                    days_overdue = (today - oldest_due).days if oldest_due else 0
                    arrears_list.append({
                        "student_name": row['student_name'],
                        "parent_name": row['parent_name'],
                        "outstanding_amount": float(row['outstanding_amount'] or 0.0),
                        "days_overdue": max(0, days_overdue)
                    })
                # Sort by days_overdue DESC
                arrears_list.sort(key=lambda x: x['days_overdue'], reverse=True)
                metrics['arrears_list'] = arrears_list
                
            elif report_type == "roster":
                # Fetch student enrollment roster details
                cursor.execute("""
                    SELECT 
                        s.student_name, 
                        s.admission_number, 
                        s.class, 
                        f.total_fee, 
                        f.paid_amount
                    FROM students s
                    LEFT JOIN fees f ON s.student_id = f.student_id
                    ORDER BY s.class, s.student_name
                """)
                roster_rows = cursor.fetchall()
                roster_list = []
                for row in roster_rows:
                    roster_list.append({
                        "admission_number": row['admission_number'],
                        "student_name": row['student_name'],
                        "class": row['class'],
                        "total_fee": float(row['total_fee'] or 0.0),
                        "paid_amount": float(row['paid_amount'] or 0.0)
                    })
                metrics['roster_list'] = roster_list
                
        # 3. Generate and send PDF response
        pdf_data = generate_report_pdf(report_type, metrics)
        response = make_response(pdf_data)
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = f'attachment; filename=System_Report_{report_type}_{datetime.date.today().isoformat()}.pdf'
        return response
        
    except Exception as e:
        return jsonify({"success": False, "message": f"Failed to generate report PDF: {str(e)}"}), 500
