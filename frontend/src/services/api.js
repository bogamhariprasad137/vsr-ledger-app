import { auth } from "./firebase";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const handleResponse = async (res) => {
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || `API Request failed with status ${res.status}`);
  }
  return res.json();
};

const getHeaders = async (hasBody = false) => {
  const headers = {};
  if (hasBody) {
    headers["Content-Type"] = "application/json";
  }
  if (auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      headers["Authorization"] = `Bearer ${token}`;
    } catch (err) {
      console.error("Failed to retrieve Firebase ID token:", err);
    }
  }
  return headers;
};

export const api = {
  // --- Auth Services ---
  auth: {
    login: async (idToken, expectedRole) => {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, role: expectedRole })
      });
      const data = await handleResponse(res);
      if (data.user) {
        localStorage.setItem("session_user", JSON.stringify(data.user));
        return data.user;
      }
      throw new Error("Invalid response format from login API.");
    },

    signup: async (idToken) => {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken })
      });
      const data = await handleResponse(res);
      if (data.user) {
        localStorage.setItem("session_user", JSON.stringify(data.user));
        return data.user;
      }
      throw new Error("Invalid response format from signup API.");
    },

    logout: async () => {
      localStorage.removeItem("session_user");
      return true;
    },

    getCurrentUser: () => {
      const stored = localStorage.getItem("session_user");
      return stored ? JSON.parse(stored) : null;
    },

    resetPassword: async (email) => {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      return handleResponse(res);
    }
  },

  // --- Students Services ---
  students: {
    getAll: async () => {
      const headers = await getHeaders(false);
      const res = await fetch(`${API_BASE}/students`, { headers });
      return handleResponse(res);
    },

    getById: async (id) => {
      const headers = await getHeaders(false);
      const res = await fetch(`${API_BASE}/students/${id}`, { headers });
      return handleResponse(res);
    },

    getByParentEmail: async (email) => {
      const headers = await getHeaders(false);
      const res = await fetch(`${API_BASE}/students/parent/${encodeURIComponent(email)}`, { headers });
      return handleResponse(res);
    },

    create: async (studentData) => {
      const headers = await getHeaders(true);
      const res = await fetch(`${API_BASE}/students`, {
        method: "POST",
        headers,
        body: JSON.stringify(studentData)
      });
      const data = await handleResponse(res);
      return data.student;
    },

    update: async (id, studentData) => {
      const headers = await getHeaders(true);
      const res = await fetch(`${API_BASE}/students/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(studentData)
      });
      return handleResponse(res);
    },

    delete: async (id) => {
      const headers = await getHeaders(false);
      const res = await fetch(`${API_BASE}/students/${id}`, {
        method: "DELETE",
        headers
      });
      return handleResponse(res);
    }
  },

  // --- Installments Services ---
  installments: {
    getByFeeId: async (studentId) => {
      const headers = await getHeaders(false);
      const res = await fetch(`${API_BASE}/installments/${studentId}`, { headers });
      return handleResponse(res);
    },

    save: async (feeId, installments) => {
      const headers = await getHeaders(true);
      const res = await fetch(`${API_BASE}/installments/${feeId}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ installments })
      });
      return handleResponse(res);
    }
  },

  // --- Payment & Receipts Services ---
  receipts: {
    getAll: async () => {
      const headers = await getHeaders(false);
      const res = await fetch(`${API_BASE}/receipts`, { headers });
      return handleResponse(res);
    },

    logPayment: async (paymentData) => {
      const headers = await getHeaders(true);
      const res = await fetch(`${API_BASE}/receipts/log`, {
        method: "POST",
        headers,
        body: JSON.stringify(paymentData)
      });
      const data = await handleResponse(res);
      return data.receipt;
    },

    download: async (receipt) => {
      const headers = await getHeaders(false);
      const res = await fetch(`${API_BASE}/receipts/download/${receipt.receipt_id}`, { headers });
      if (!res.ok) {
        throw new Error("Failed to fetch binary receipt PDF from backend.");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Receipt_${receipt.receipt_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }
  },
  // --- Reports Services ---
  reports: {
    download: async (type, filename) => {
      const headers = await getHeaders(false);
      const res = await fetch(`${API_BASE}/reports/download?type=${type}`, { headers });
      if (!res.ok) {
        throw new Error("Failed to fetch binary PDF report from backend.");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }
  },
  // --- Notifications Services ---
  notifications: {
    getAll: async (page = 1, limit = 20) => {
      const headers = await getHeaders(false);
      const res = await fetch(`${API_BASE}/notifications?page=${page}&limit=${limit}`, { headers });
      return handleResponse(res);
    },

    getUnreadCount: async () => {
      const headers = await getHeaders(false);
      const res = await fetch(`${API_BASE}/notifications/unread-count`, { headers });
      return handleResponse(res);
    },

    markAsRead: async (id) => {
      const headers = await getHeaders(false);
      const res = await fetch(`${API_BASE}/notifications/read/${id}`, {
        method: "PUT",
        headers
      });
      return handleResponse(res);
    },

    markAllAsRead: async () => {
      const headers = await getHeaders(false);
      const res = await fetch(`${API_BASE}/notifications/read-all`, {
        method: "PUT",
        headers
      });
      return handleResponse(res);
    }
  }
};
