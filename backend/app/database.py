import os
import pymysql
import pymysql.cursors
import pymysql.constants.CLIENT
from flask import current_app

def get_db_connection():
    return pymysql.connect(
        host=current_app.config['DB_HOST'],
        user=current_app.config['DB_USER'],
        password=current_app.config['DB_PASSWORD'],
        database=current_app.config['DB_NAME'],
        port=current_app.config['DB_PORT'],
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True
    )

def init_db(app):
    """
    Initializes the database schema and seeds it with default data.
    """
    host = app.config['DB_HOST']
    user = app.config['DB_USER']
    password = app.config['DB_PASSWORD']
    db_name = app.config['DB_NAME']
    port = app.config['DB_PORT']
    
    print(f"Connecting to MySQL server at {host}:{port} to check/initialize database '{db_name}'...")
    
    try:
        # Step 1: Connect to server without database to create it
        conn = pymysql.connect(
            host=host,
            user=user,
            password=password,
            port=port,
            autocommit=True
        )
        with conn.cursor() as cursor:
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{db_name}`")
        conn.close()
        
        # Step 2: Connect to the specific database and execute schema
        conn = pymysql.connect(
            host=host,
            user=user,
            password=password,
            database=db_name,
            port=port,
            cursorclass=pymysql.cursors.DictCursor,
            client_flag=pymysql.constants.CLIENT.MULTI_STATEMENTS,
            autocommit=True
        )
        
        # Check if users table exists. If not, run schema
        with conn.cursor() as cursor:
            cursor.execute("SHOW TABLES LIKE 'users'")
            users_table_exists = cursor.fetchone()
            
        if not users_table_exists:
            print("Schema not found. Initializing database schema...")
            # Search for schema.sql in standard project locations
            schema_paths = [
                os.path.join(app.root_path, "..", "..", "database", "schema.sql"),
                os.path.join(app.root_path, "..", "database", "schema.sql"),
                "database/schema.sql"
            ]
            
            schema_content = None
            for path in schema_paths:
                if os.path.exists(path):
                    with open(path, "r", encoding="utf-8") as f:
                        schema_content = f.read()
                    break
            
            if schema_content:
                with conn.cursor() as cursor:
                    cursor.execute(schema_content)
                print("Database schema successfully initialized.")
            else:
                print("WARNING: schema.sql not found. Tables will be created on demand or must be loaded manually.")
                
        # Step 2b: Check if notifications table exists. If not, run migration
        with conn.cursor() as cursor:
            cursor.execute("SHOW TABLES LIKE 'notifications'")
            notifications_table_exists = cursor.fetchone()
            
        if not notifications_table_exists:
            print("Notifications table not found. Initializing notifications migration...")
            migration_paths = [
                os.path.join(app.root_path, "..", "..", "database", "migration_notifications.sql"),
                os.path.join(app.root_path, "..", "database", "migration_notifications.sql"),
                "database/migration_notifications.sql"
            ]
            
            migration_content = None
            for path in migration_paths:
                if os.path.exists(path):
                    with open(path, "r", encoding="utf-8") as f:
                        migration_content = f.read()
                    break
            
            if migration_content:
                with conn.cursor() as cursor:
                    cursor.execute(migration_content)
                print("Notifications table successfully created via migration.")
            else:
                print("WARNING: migration_notifications.sql not found. notifications table was not created.")

                
        # Step 3: Seed database if users table is empty
        with conn.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) as count FROM users")
            user_count = cursor.fetchone()['count']
            
        if user_count == 0:
            print("Database is empty. Seeding default data...")
            with conn.cursor() as cursor:
                # Disable foreign key checks during seed to ensure order flexibility
                cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
                
                # Seed Users
                cursor.execute("INSERT INTO users (user_id, firebase_uid, email, role) VALUES (1, 'uid-admin-1', 'admin@school.com', 'admin')")
                cursor.execute("INSERT INTO users (user_id, firebase_uid, email, role) VALUES (2, 'uid-parent-2', 'parent@family.com', 'parent')")
                
                # Seed Students
                cursor.execute("""
                    INSERT INTO students (student_id, student_name, parent_name, parent_email, parent_phone, class, admission_number, admission_date, status, user_id)
                    VALUES (1, 'Alice Smith', 'John Smith', 'parent@family.com', '+1 (555) 019-2834', 'Grade 5-A', 'ADM-2025-001', '2025-02-01', 'active', 2)
                """)
                cursor.execute("""
                    INSERT INTO students (student_id, student_name, parent_name, parent_email, parent_phone, class, admission_number, admission_date, status, user_id)
                    VALUES (2, 'Bob Smith', 'John Smith', 'parent@family.com', '+1 (555) 019-2834', 'Grade 3-C', 'ADM-2025-002', '2025-02-01', 'active', 2)
                """)
                cursor.execute("""
                    INSERT INTO students (student_id, student_name, parent_name, parent_email, parent_phone, class, admission_number, admission_date, status, user_id)
                    VALUES (3, 'Charlie Brown', 'Lucy Brown', 'charlie.parent@charity.org', '+1 (555) 043-9821', 'Grade 6-B', 'ADM-2025-003', '2025-02-05', 'inactive', NULL)
                """)
                
                # Seed Fees
                # Note that generated columns (admission_fee_remaining, total_fee, paid_amount, pending_amount etc.)
                # MUST NOT be inserted explicitly. Only regular columns: admission_fee, admission_fee_paid, term_fee, term_fee_paid, daycare_fee, daycare_fee_paid, due_date, status
                cursor.execute("""
                    INSERT INTO fees (fee_id, student_id, admission_fee, admission_fee_paid, term_fee, term_fee_paid, daycare_fee, daycare_fee_paid, due_date, status)
                    VALUES (1, 1, 1000.00, 1000.00, 2500.00, 1000.00, 1500.00, 0.00, '2026-09-01', 'pending')
                """)
                cursor.execute("""
                    INSERT INTO fees (fee_id, student_id, admission_fee, admission_fee_paid, term_fee, term_fee_paid, daycare_fee, daycare_fee_paid, due_date, status)
                    VALUES (2, 2, 1500.00, 0.00, 2000.00, 0.00, 1000.00, 0.00, '2026-10-01', 'pending')
                """)
                cursor.execute("""
                    INSERT INTO fees (fee_id, student_id, admission_fee, admission_fee_paid, term_fee, term_fee_paid, daycare_fee, daycare_fee_paid, due_date, status)
                    VALUES (3, 3, 2000.00, 0.00, 3000.00, 0.00, 1000.00, 0.00, '2026-05-01', 'overdue')
                """)
                
                # Seed Installments
                cursor.execute("INSERT INTO installments (installment_id, fee_id, installment_number, amount, due_date, payment_date, status) VALUES (1, 1, 1, 2000.00, '2026-03-01', '2026-03-01', 'paid')")
                cursor.execute("INSERT INTO installments (installment_id, fee_id, installment_number, amount, due_date, payment_date, status) VALUES (2, 1, 2, 1500.00, '2026-06-01', NULL, 'overdue')")
                cursor.execute("INSERT INTO installments (installment_id, fee_id, installment_number, amount, due_date, payment_date, status) VALUES (3, 1, 3, 1500.00, '2026-09-01', NULL, 'unpaid')")
                
                cursor.execute("INSERT INTO installments (installment_id, fee_id, installment_number, amount, due_date, payment_date, status) VALUES (4, 2, 1, 1500.00, '2026-04-01', NULL, 'overdue')")
                cursor.execute("INSERT INTO installments (installment_id, fee_id, installment_number, amount, due_date, payment_date, status) VALUES (5, 2, 2, 1500.00, '2026-07-01', NULL, 'unpaid')")
                cursor.execute("INSERT INTO installments (installment_id, fee_id, installment_number, amount, due_date, payment_date, status) VALUES (6, 2, 3, 1500.00, '2026-10-01', NULL, 'unpaid')")
                
                cursor.execute("INSERT INTO installments (installment_id, fee_id, installment_number, amount, due_date, payment_date, status) VALUES (7, 3, 1, 3000.00, '2026-01-01', NULL, 'overdue')")
                cursor.execute("INSERT INTO installments (installment_id, fee_id, installment_number, amount, due_date, payment_date, status) VALUES (8, 3, 2, 3000.00, '2026-05-01', NULL, 'unpaid')")
                
                # Seed Receipts
                cursor.execute("""
                    INSERT INTO receipts (receipt_id, receipt_number, installment_id, student_id, student_name, amount_paid, payment_date, payment_method, pdf_path)
                    VALUES (1, 'REC-2026-0001', 1, 1, 'Alice Smith', 2000.00, '2026-03-01', 'bank_transfer', '/receipts/REC-2026-0001.pdf')
                """)
                
                cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
            print("Database seeding completed.")
            
        conn.close()
    except Exception as e:
        print(f"ERROR: Failed to initialize/seed database: {e}")
        print("Please ensure MySQL is running locally and credentials in config.py are correct.")
