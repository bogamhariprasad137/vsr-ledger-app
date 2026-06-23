-- Relational Database DDL Migration Script
-- Create notifications table with indexes for fast retrieval

USE fees_tracker;

CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(128) DEFAULT NULL, -- Firebase UID (nullable for admin/global alerts)
    student_id INT DEFAULT NULL, -- Nullable (FK to students)
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- e.g. 'overdue_fee', 'upcoming_installment', 'new_registration', 'new_parent', 'payment_received'
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    INDEX idx_notifications_user_id (user_id),
    INDEX idx_notifications_student_id (student_id),
    INDEX idx_notifications_is_read (is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
