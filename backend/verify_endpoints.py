import datetime
import unittest
from unittest.mock import MagicMock, patch

# Import backend modules
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__))))

from app.services.notification_service import create_notification, check_and_generate_fee_notifications

class TestNotificationService(unittest.TestCase):

    def test_create_notification_duplicate_detection(self):
        """
        Verify that create_notification queries for duplicates in the last 24h
        and returns None if a duplicate exists.
        """
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
        
        # Scenario A: Duplicate exists
        mock_cursor.fetchone.return_value = {"id": 123}
        
        res = create_notification(
            conn=mock_conn,
            user_id="parent-uid",
            student_id=5,
            title="Overdue Fee: Installment #1",
            message="Your fee is overdue.",
            type="overdue_fee"
        )
        
        self.assertIsNone(res)
        # Verify SELECT query was called
        mock_cursor.execute.assert_called()
        self.assertIn("SELECT id FROM notifications", mock_cursor.execute.call_args[0][0])
        
        # Scenario B: No duplicate exists
        mock_cursor.fetchone.return_value = None
        mock_cursor.lastrowid = 789
        
        res = create_notification(
            conn=mock_conn,
            user_id="parent-uid",
            student_id=5,
            title="Overdue Fee: Installment #1",
            message="Your fee is overdue.",
            type="overdue_fee"
        )
        
        self.assertEqual(res, 789)
        # Verify INSERT query was called
        self.assertIn("INSERT INTO notifications", mock_cursor.execute.call_args[0][0])

    @patch('app.services.notification_service.create_notification')
    def test_fee_notification_generator_logic(self, mock_create_notification):
        """
        Verify check_and_generate_fee_notifications correctly calculates alert rules:
        - Overdue (days_diff < 0)
        - Due Today (days_diff == 0)
        - Due Tomorrow (days_diff == 1)
        """
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
        
        today = datetime.date.today()
        
        # Set up mock installments
        overdue_date = today - datetime.timedelta(days=5)
        due_today_date = today
        due_tomorrow_date = today + datetime.timedelta(days=1)
        future_date = today + datetime.timedelta(days=5)
        
        mock_cursor.fetchall.return_value = [
            {
                "installment_id": 1,
                "installment_number": 1,
                "amount": 1500.0,
                "due_date": overdue_date,
                "status": "unpaid",
                "student_id": 10,
                "student_name": "Alice Smith",
                "parent_firebase_uid": "parent-uid"
            },
            {
                "installment_id": 2,
                "installment_number": 2,
                "amount": 2000.0,
                "due_date": due_today_date,
                "status": "unpaid",
                "student_id": 10,
                "student_name": "Alice Smith",
                "parent_firebase_uid": "parent-uid"
            },
            {
                "installment_id": 3,
                "installment_number": 3,
                "amount": 2500.0,
                "due_date": due_tomorrow_date,
                "status": "unpaid",
                "student_id": 11,
                "student_name": "Bob Smith",
                "parent_firebase_uid": None  # No linked parent yet
            },
            {
                "installment_id": 4,
                "installment_number": 4,
                "amount": 3000.0,
                "due_date": future_date,
                "status": "unpaid",
                "student_id": 11,
                "student_name": "Bob Smith",
                "parent_firebase_uid": None
            }
        ]
        
        # Run generator
        check_and_generate_fee_notifications(mock_conn)
        
        # Count notifications generated
        calls = mock_create_notification.call_args_list
        
        # Verify call arguments
        # Overdue fee generates 2 alerts (1 parent, 1 admin)
        # Due today generates 2 alerts (1 parent, 1 admin)
        # Due tomorrow generates 1 alert (0 parent, 1 admin because no linked parent exists)
        # Future date generates 0 alerts
        self.assertEqual(len(calls), 5)
        
        # Check call contents
        types_created = [call[1]['type'] for call in calls]
        titles_created = [call[1]['title'] for call in calls]
        
        self.assertIn("overdue_fee", types_created)
        self.assertIn("upcoming_installment", types_created)
        self.assertIn("Overdue Fee: Installment #1", titles_created)
        self.assertIn("Fee Due Today: Installment #2", titles_created)
        self.assertIn("Fee Due Tomorrow: Installment #3", titles_created)

if __name__ == "__main__":
    unittest.main()
