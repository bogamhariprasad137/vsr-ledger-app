import { useState, useEffect } from "react";
import { api } from "../services/api";
import { Bell, BellOff, Check, CheckCheck, AlertCircle, Calendar, UserPlus, Receipt, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadNotifications();
  }, [page]);

  const loadNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.notifications.getAll(page, limit);
      if (res.success) {
        setNotifications(res.notifications);
        setTotal(res.total);
      } else {
        throw new Error(res.message || "Failed to load notifications");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      const res = await api.notifications.markAsRead(id);
      if (res.success) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      }
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await api.notifications.markAllAsRead();
      if (res.success) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      }
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case "overdue_fee":
        return <AlertCircle size={20} color="#E11D48" />;
      case "upcoming_installment":
        return <Calendar size={20} color="#D97706" />;
      case "new_registration":
        return <UserPlus size={20} color="#2563EB" />;
      case "new_parent":
        return <UserPlus size={20} color="#0D9488" />;
      case "payment_received":
        return <Receipt size={20} color="#0D9488" />;
      default:
        return <Bell size={20} color="#6B5B52" />;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  };

  const hasUnread = notifications.some(n => !n.is_read);
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="content-pane">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Link to="/" className="btn btn-secondary" style={{ padding: "0.5rem", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ArrowLeft size={16} />
          </Link>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "700" }}>Notification Center</h2>
        </div>
        
        {hasUnread && (
          <button className="btn btn-primary" onClick={handleMarkAllAsRead} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <CheckCheck size={16} />
            Mark all as read
          </button>
        )}
      </div>

      {error && (
        <div className="card" style={{ borderLeft: "4px solid var(--status-overdue-text)", color: "var(--status-overdue-text)", padding: "1rem" }}>
          Error: {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", fontSize: "1.2rem", fontWeight: "600", color: "var(--warm-muted)" }}>
          Loading your notifications...
        </div>
      ) : notifications.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "4rem 2rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "50%", backgroundColor: "rgba(107, 91, 82, 0.1)", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center" }}>
            <BellOff size={32} color="var(--warm-muted)" />
          </div>
          <h3 style={{ fontSize: "1.25rem", fontWeight: "700" }}>No Notifications Yet</h3>
          <p style={{ color: "var(--warm-muted)", maxWidth: "400px" }}>
            We'll notify you here when there are fee updates, new student enrollments, payment receipts, or pending installment alerts.
          </p>
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {notifications.map(n => (
              <div 
                key={n.id} 
                className="card" 
                style={{ 
                  margin: 0,
                  display: "flex", 
                  gap: "1rem", 
                  alignItems: "flex-start", 
                  borderLeft: !n.is_read ? "4px solid var(--sidebar-brown)" : "1px solid var(--structure-border)",
                  backgroundColor: !n.is_read ? "rgba(242, 230, 179, 0.1)" : "var(--pure-surface)",
                  padding: "1.25rem"
                }}
              >
                <div style={{ marginTop: "2px" }}>
                  {getIcon(n.type)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                    <div>
                      <h4 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "0.25rem" }}>
                        {n.title}
                        {n.student_name && (
                          <span style={{ fontSize: "12px", fontWeight: "600", color: "#0D9488", backgroundColor: "rgba(13, 148, 136, 0.1)", padding: "2px 6px", borderRadius: "4px", marginLeft: "8px" }}>
                            {n.student_name}
                          </span>
                        )}
                      </h4>
                      <p style={{ color: "var(--warm-muted)", fontSize: "14px", lineHeight: "1.5" }}>{n.message}</p>
                      <span style={{ fontSize: "12px", color: "#A39682", fontWeight: "500", display: "inline-block", marginTop: "0.5rem" }}>
                        {formatDate(n.created_at)}
                      </span>
                    </div>
                    {!n.is_read && (
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => handleMarkAsRead(n.id)}
                        style={{ padding: "0.375rem 0.75rem", fontSize: "12px", display: "flex", alignItems: "center", gap: "0.25rem" }}
                        title="Mark as read"
                      >
                        <Check size={14} />
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination" style={{ marginTop: "1.5rem" }}>
              <div>
                Showing page {page} of {totalPages} ({total} total notifications)
              </div>
              <div className="pagination-controls">
                <button 
                  className="btn btn-secondary" 
                  disabled={page === 1} 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <button 
                  className="btn btn-secondary" 
                  disabled={page === totalPages} 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
