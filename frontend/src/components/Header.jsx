import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { Menu, UserCheck, Bell, Check, CheckCheck } from "lucide-react";

export default function Header({ title, mobileOpen, setMobileOpen }) {
  const { currentUser, connectedStudents, activeStudent, selectActiveStudent } = useAuth();
  
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const dropdownRef = useRef(null);

  const handleBurgerClick = () => {
    setMobileOpen(!mobileOpen);
  };

  // Fetch unread count initially and on mount
  useEffect(() => {
    if (currentUser) {
      fetchUnreadCount();
      // Setup polling every 30 seconds for live updates
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const res = await api.notifications.getUnreadCount();
      if (res.success) {
        setUnreadCount(res.unread_count);
      }
    } catch (err) {
      console.error("Failed to fetch unread count:", err);
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.notifications.getAll(1, 5);
      if (res.success) {
        setNotifications(res.notifications);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBellClick = () => {
    if (!dropdownOpen) {
      fetchNotifications();
    }
    setDropdownOpen(!dropdownOpen);
  };

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      const res = await api.notifications.markAsRead(id);
      if (res.success) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await api.notifications.markAllAsRead();
      if (res.success) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    return `${diffDays}d ago`;
  };

  return (
    <header className="top-header">
      <div className="header-title">
        <button className="burger-menu" onClick={handleBurgerClick} aria-label="Toggle Sidebar">
          <Menu size={24} color="#4B2E21" />
        </button>
        <h2>{title}</h2>
      </div>

      <div className="header-right">
        {currentUser?.role === "parent" && connectedStudents.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label
              htmlFor="student-switcher"
              style={{
                fontSize: "12px",
                fontWeight: "700",
                color: "var(--warm-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.05em"
              }}
            >
              Viewing Child:
            </label>
            <select
              id="student-switcher"
              className="form-control"
              style={{
                padding: "0.25rem 2rem 0.25rem 0.75rem",
                width: "auto",
                height: "32px",
                borderColor: "var(--structure-border)",
                backgroundColor: "#FFFDF7",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer"
              }}
              value={activeStudent?.student_id || ""}
              onChange={(e) => selectActiveStudent(e.target.value)}
            >
              {connectedStudents.map(student => (
                <option key={student.student_id} value={student.student_id}>
                  {student.student_name} ({student.class})
                </option>
              ))}
            </select>
          </div>
        )}

        {currentUser?.role === "parent" && activeStudent && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.25rem 0.75rem",
              borderRadius: "4px",
              backgroundColor: "rgba(13, 148, 136, 0.1)",
              border: "1px solid rgba(13, 148, 136, 0.2)"
            }}
          >
            <UserCheck size={14} color="#0D9488" />
            <span
              style={{
                fontSize: "12px",
                fontWeight: "600",
                color: "#0D9488"
              }}
            >
              {activeStudent.student_name}
            </span>
          </div>
        )}

        <div style={{ fontSize: "13px", color: "var(--warm-muted)", fontWeight: "500" }}>
          Term: <strong className="mono-data">2026 Academic Year</strong>
        </div>

        {/* Notification Bell Icon & Dropdown Panel */}
        <div className="notification-bell-container" ref={dropdownRef}>
          <button 
            className="notification-bell-btn" 
            onClick={handleBellClick}
            aria-label="Notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount}</span>
            )}
          </button>

          {dropdownOpen && (
            <div className="notification-dropdown">
              <div className="notification-dropdown-header">
                <h4>Notifications</h4>
                {unreadCount > 0 && (
                  <button className="notification-mark-all-btn" onClick={handleMarkAllAsRead}>
                    Mark all as read
                  </button>
                )}
              </div>

              {loading ? (
                <div className="notification-dropdown-empty">Loading...</div>
              ) : notifications.length === 0 ? (
                <div className="notification-dropdown-empty">No notifications</div>
              ) : (
                <ul className="notification-dropdown-list">
                  {notifications.map(n => (
                    <li 
                      key={n.id} 
                      className={`notification-dropdown-item ${!n.is_read ? 'unread' : ''}`}
                    >
                      <div className="notification-item-header">
                        <span className="notification-item-title">{n.title}</span>
                        {!n.is_read && (
                          <button 
                            className="notification-read-btn"
                            onClick={(e) => handleMarkAsRead(n.id, e)}
                            title="Mark as read"
                          >
                            <Check size={14} />
                          </button>
                        )}
                      </div>
                      <p className="notification-item-message">{n.message}</p>
                      <span className="notification-item-time">{formatRelativeTime(n.created_at)}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="notification-dropdown-footer">
                <Link 
                  to="/notifications" 
                  className="notification-view-all-link"
                  onClick={() => setDropdownOpen(false)}
                >
                  View All Notifications
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
