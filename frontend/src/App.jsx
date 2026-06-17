import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";

// Auth Pages
import Login from "./pages/auth/Login";
import ForgotPassword from "./pages/auth/ForgotPassword";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import StudentList from "./pages/admin/StudentList";
import StudentDetail from "./pages/admin/StudentDetail";
import InstallmentManager from "./pages/admin/InstallmentManager";
import ReceiptLedger from "./pages/admin/ReceiptLedger";
import Reports from "./pages/admin/Reports";
import Settings from "./pages/admin/Settings";
import FeeManagement from "./pages/admin/FeeManagement";

// Parent Pages
import ParentDashboard from "./pages/parent/ParentDashboard";
import ParentProfile from "./pages/parent/ParentProfile";
import ParentHistory from "./pages/parent/ParentHistory";
import ParentReceipts from "./pages/parent/ParentReceipts";

// Layout Wrapper
function Layout({ children, title, allowedRole }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <ProtectedRoute allowedRole={allowedRole}>
      <div className="app-container">
        <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
        <div className="main-content">
          <Header title={title} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
          {children}
        </div>
      </div>
    </ProtectedRoute>
  );
}

// Root redirector based on session role
function RootRedirect() {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#F2E6B3',
        color: '#4B2E21',
        fontWeight: 'bold',
        fontSize: '1.2rem',
        fontFamily: "'Geist', sans-serif"
      }}>
        Loading Session Details...
      </div>
    );
  }

  if (currentUser) {
    if (currentUser.role === "admin") {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (currentUser.role === "parent") {
      return <Navigate to="/parent/dashboard" replace />;
    }
  }
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Admin protected routes */}
          <Route
            path="/admin/dashboard"
            element={
              <Layout title="Dashboard Summary" allowedRole="admin">
                <AdminDashboard />
              </Layout>
            }
          />
          <Route
            path="/admin/students"
            element={
              <Layout title="Student Directory" allowedRole="admin">
                <StudentList />
              </Layout>
            }
          />
          <Route
            path="/admin/fee-management"
            element={
              <Layout title="Fee Management" allowedRole="admin">
                <FeeManagement />
              </Layout>
            }
          />
          <Route
            path="/admin/students/:id"
            element={
              <Layout title="Student Profile Details" allowedRole="admin">
                <StudentDetail />
              </Layout>
            }
          />
          <Route
            path="/admin/students/:id/installments"
            element={
              <Layout title="Installment Planner" allowedRole="admin">
                <InstallmentManager />
              </Layout>
            }
          />
          <Route
            path="/admin/receipts"
            element={
              <Layout title="Transaction Audit Ledger" allowedRole="admin">
                <ReceiptLedger />
              </Layout>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <Layout title="System Reports" allowedRole="admin">
                <Reports />
              </Layout>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <Layout title="System Settings" allowedRole="admin">
                <Settings />
              </Layout>
            }
          />

          {/* Parent Portal protected routes */}
          <Route
            path="/parent/dashboard"
            element={
              <Layout title="Child Status Summary" allowedRole="parent">
                <ParentDashboard />
              </Layout>
            }
          />
          <Route
            path="/parent/profile"
            element={
              <Layout title="Child Profile Details" allowedRole="parent">
                <ParentProfile />
              </Layout>
            }
          />
          <Route
            path="/parent/history"
            element={
              <Layout title="Completed Transactions History" allowedRole="parent">
                <ParentHistory />
              </Layout>
            }
          />
          <Route
            path="/parent/receipts"
            element={
              <Layout title="Voucher Invoice Downloads" allowedRole="parent">
                <ParentReceipts />
              </Layout>
            }
          />

          {/* Fallbacks */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
