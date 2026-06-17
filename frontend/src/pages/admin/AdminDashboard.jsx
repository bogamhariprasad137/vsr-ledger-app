import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../../services/api";
import {
  DollarSign,
  Users,
  AlertCircle,
  Calendar,
  Plus,
  Printer,
  CheckCircle,
  UserPlus,
  Banknote,
  Download,
  Info,
  CreditCard,
  Building,
  FileCheck
} from "lucide-react";



export default function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();


  const [students, setStudents] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [overdueAccounts, setOverdueAccounts] = useState([]);
  const [dashboardData, setDashboardData] = useState({
    totalStudents: 0,
    collected: 0,
    pending: 0,
    overdue: 0,
    admissionAllocated: 0,
    admissionCollected: 0,
    termAllocated: 0,
    termCollected: 0,
    daycareAllocated: 0,
    daycareCollected: 0
  });
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedInstallmentId, setSelectedInstallmentId] = useState("");
  const [studentInstallments, setStudentInstallments] = useState([]);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [modalError, setModalError] = useState("");
  const [modalSuccess, setModalSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const [downloadingReceiptId, setDownloadingReceiptId] = useState(null);
  const [downloadingStatement, setDownloadingStatement] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [downloadSuccess, setDownloadSuccess] = useState("");

  // Read URL query triggers
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("logPayment") === "true") {
      setShowLogModal(true);
      // Clean query parameter from address bar
      navigate("/admin/dashboard", { replace: true });
    }
  }, [location, navigate]);

  const loadDashboardData = async () => {
    try {
      const studentList = await api.students.getAll();
      setStudents(studentList);
      
      const receiptList = await api.receipts.getAll();
      const sortedReceipts = [...receiptList].sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));
      setReceipts(sortedReceipts); // Show full roster of recent logs

      // Calculate Metrics
      let totalAllocated = 0;
      let totalCollected = 0;
      let totalPending = 0;
      let totalOverdue = 0;

      let admissionAllocated = 0;
      let admissionCollected = 0;
      let termAllocated = 0;
      let termCollected = 0;
      let daycareAllocated = 0;
      let daycareCollected = 0;

      studentList.forEach(s => {
        totalAllocated += Number(s.total_fee) || 0;
        totalCollected += Number(s.paid_amount) || 0;

        admissionAllocated += Number(s.admission_fee) || 0;
        termAllocated += Number(s.term_fee) || 0;
        daycareAllocated += Number(s.daycare_fee) || 0;

        admissionCollected += Number(s.admission_fee_paid) || 0;
        termCollected += Number(s.term_fee_paid) || 0;
        daycareCollected += Number(s.daycare_fee_paid) || 0;
      });

      // Calculate Pending Fees = Total Allocated - Total Collected
      totalPending = totalAllocated - totalCollected;

      // Fetch installments to calculate overdue
      const allStudentsInstallments = await Promise.all(
        studentList.map(s => api.installments.getByFeeId(s.student_id))
      );
      const flatInsts = allStudentsInstallments.flat();
      
      flatInsts.forEach(inst => {
        if (inst.status === "overdue") {
          totalOverdue += Number(inst.amount) || 0;
        }
      });

      // Calculate Overdue Accounts Table data
      const today = new Date();
      const overdueList = studentList
        .map(s => {
          const fee = {
            fee_id: s.fee_id,
            status: s.fee_status || "pending",
            pending_amount: s.pending_amount || 0,
            due_date: s.due_date
          };
          if (!fee.fee_id) return null;
          const insts = flatInsts.filter(i => i.fee_id === fee.fee_id);
          const hasOverdueInstallment = insts.some(i => i.status === "overdue");
          const isOverdue = fee.status.toLowerCase() === "overdue" || hasOverdueInstallment || (fee.pending_amount > 0 && new Date(fee.due_date) < today);
          
          if (!isOverdue) return null;
          
          // Find oldest due date among overdue items
          const overdueDates = insts.filter(i => i.status === "overdue").map(i => new Date(i.due_date));
          if (fee.pending_amount > 0 && new Date(fee.due_date) < today) {
            overdueDates.push(new Date(fee.due_date));
          }
          const oldestDueDate = overdueDates.length > 0 ? new Date(Math.min(...overdueDates)) : new Date(fee.due_date);
          
          const daysOverdue = Math.max(0, Math.floor((today - oldestDueDate) / (1000 * 60 * 60 * 24)));
          
          return {
            student_id: s.student_id,
            student_name: s.student_name,
            parent_name: s.parent_name,
            outstanding_amount: fee.pending_amount,
            due_date: oldestDueDate.toISOString().split('T')[0],
            days_overdue: daysOverdue,
            status: "Overdue"
          };
        })
        .filter(x => x !== null)
        .sort((a, b) => b.days_overdue - a.days_overdue);

      setOverdueAccounts(overdueList);

      setDashboardData({
        totalStudents: studentList.length,
        allocated: totalAllocated,
        collected: totalCollected,
        pending: totalPending,
        overdue: totalOverdue,
        admissionAllocated,
        admissionCollected,
        termAllocated,
        termCollected,
        daycareAllocated,
        daycareCollected
      });
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Fetch student installments when student is selected in Modal
  useEffect(() => {
    const fetchInstallments = async () => {
      if (!selectedStudentId) {
        setStudentInstallments([]);
        return;
      }
      try {
        const details = await api.students.getById(selectedStudentId);
        const unpaid = details.installments.filter(inst => inst.status !== "paid");
        setStudentInstallments(unpaid);
        if (unpaid.length > 0) {
          setSelectedInstallmentId(unpaid[0].installment_id);
          setPaymentAmount(unpaid[0].amount);
        } else {
          setSelectedInstallmentId("");
          setPaymentAmount("");
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchInstallments();
  }, [selectedStudentId]);

  const handleInstallmentChange = (e) => {
    const instId = parseInt(e.target.value);
    setSelectedInstallmentId(instId);
    const inst = studentInstallments.find(i => i.installment_id === instId);
    if (inst) {
      setPaymentAmount(inst.amount);
    }
  };

  const handleLogPaymentSubmit = async (e) => {
    e.preventDefault();
    setModalError("");
    setModalSuccess("");

    if (!selectedStudentId || !selectedInstallmentId || !paymentAmount) {
      setModalError("Please complete all required fields.");
      return;
    }

    setLoading(true);
    try {
      await api.receipts.logPayment({
        student_id: selectedStudentId,
        installment_id: selectedInstallmentId,
        amount_paid: parseFloat(paymentAmount),
        payment_date: paymentDate,
        payment_method: paymentMethod
      });

      setModalSuccess("Payment logged successfully! Updating dashboards...");
      setTimeout(() => {
        setShowLogModal(false);
        // Reset states
        setSelectedStudentId("");
        setSelectedInstallmentId("");
        setPaymentAmount("");
        setModalSuccess("");
        setLoading(false);
        loadDashboardData();
      }, 1500);
    } catch (err) {
      setModalError(err.message);
      setLoading(false);
    }
  };

  const handleReceiptDownload = async (rec) => {
    setDownloadingReceiptId(rec.receipt_id);
    setDownloadError("");
    setDownloadSuccess("");
    try {
      await api.receipts.download(rec);
      setDownloadSuccess("Receipt downloaded successfully!");
      setTimeout(() => setDownloadSuccess(""), 3000);
    } catch (err) {
      setDownloadError(`Failed to download receipt: ${err.message}`);
      setTimeout(() => setDownloadError(""), 5000);
    } finally {
      setDownloadingReceiptId(null);
    }
  };

  const handleExportCSV = () => {
    const csvContent = `
Receipt Number,Student Name,Amount Paid,Payment Date,Payment Method
${receipts.map(r => `${r.receipt_number},${r.student_name},${r.amount_paid},${r.payment_date},${r.payment_method}`).join("\n")}
`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Collections_Overview_Export_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Helper to render payment method icon
  const getMethodIcon = (method) => {
    switch (method) {
      case "bank_transfer":
        return <Building size={16} color="var(--warm-muted)" />;
      case "card":
        return <CreditCard size={16} color="var(--warm-muted)" />;
      default:
        return <Banknote size={16} color="var(--warm-muted)" />;
    }
  };

  const handleExportPDF = async () => {
    setDownloadingStatement(true);
    setDownloadError("");
    setDownloadSuccess("");
    try {
      const filename = `Collections_Report_${new Date().toISOString().split("T")[0]}.pdf`;
      await api.reports.download('collections', filename);
      setDownloadSuccess("Collections Report downloaded successfully!");
      setTimeout(() => setDownloadSuccess(""), 3000);
    } catch (err) {
      setDownloadError(`Failed to download report: ${err.message}`);
      setTimeout(() => setDownloadError(""), 5000);
    } finally {
      setDownloadingStatement(false);
    }
  };

  return (
    <div className="content-pane" style={{ animation: "fadeIn 0.5s ease" }}>
      {/* Top Banner Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", marginBottom: "0.25rem" }}>Admin Dashboard</h1>
          <p style={{ color: "var(--warm-muted)", fontSize: "14px" }}>
            Overview of total collected fees, category splits, and active student rosters.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Download Status Toast Banner */}
      {downloadError && (
        <div className="badge badge-overdue" style={{ width: "100%", padding: "0.75rem", borderRadius: "4px", marginBottom: "1rem", textTransform: "none", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <AlertCircle size={16} />
          <span>{downloadError}</span>
        </div>
      )}
      {downloadSuccess && (
        <div className="badge badge-paid" style={{ width: "100%", padding: "0.75rem", borderRadius: "4px", marginBottom: "1rem", textTransform: "none", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <CheckCircle size={16} />
          <span>{downloadSuccess}</span>
        </div>
      )}

      {/* Metrics Row (4 Cards) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
        <div className="card metric-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span className="metric-label">Total Students</span>
            <Users size={20} color="var(--warm-muted)" />
          </div>
          <div className="metric-value mono-data">{dashboardData.totalStudents}</div>
          <div style={{ marginTop: "0.25rem" }}>
            <span className="badge badge-paid" style={{ fontSize: "10px", padding: "0.15rem 0.5rem" }}>
              Active Roster
            </span>
          </div>
        </div>

        <div className="card metric-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span className="metric-label">Fees Collected</span>
            <CheckCircle size={20} color="#0D9488" />
          </div>
          <div className="metric-value mono-data" style={{ color: "#0D9488" }}>{Math.round(dashboardData.collected)}</div>
          <div style={{ marginTop: "0.25rem" }}>
            <span className="badge badge-paid" style={{ fontSize: "10px", padding: "0.15rem 0.5rem" }}>
              Collected
            </span>
          </div>
        </div>

        <div className="card metric-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span className="metric-label">Pending Fees</span>
            <Calendar size={20} color="#D97706" />
          </div>
          <div className="metric-value mono-data" style={{ color: "#D97706" }}>{Math.round(dashboardData.pending)}</div>
          <div style={{ marginTop: "0.25rem" }}>
            <span className="badge badge-pending" style={{ fontSize: "10px", padding: "0.15rem 0.5rem" }}>
              Pending
            </span>
          </div>
        </div>

        <div className="card metric-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span className="metric-label">Overdue Fees</span>
            <AlertCircle size={20} color="#E11D48" />
          </div>
          <div className="metric-value mono-data" style={{ color: "#E11D48" }}>{Math.round(dashboardData.overdue)}</div>
          <div style={{ marginTop: "0.25rem" }}>
            <span className="badge badge-overdue" style={{ fontSize: "10px", padding: "0.15rem 0.5rem" }}>
              Overdue
            </span>
          </div>
        </div>
      </div>

      {/* Overdue Accounts & Quick Actions Grid */}
      <div className="grid-3" style={{ marginBottom: "2rem" }}>
        {/* Overdue Accounts Table */}
        <div className="card" style={{ gridColumn: "span 2 / span 2", padding: "1.5rem" }}>
          <div className="card-title" style={{ borderBottom: "1px solid var(--structure-border)", paddingBottom: "0.75rem", marginBottom: "1rem" }}>
            <span>Overdue Accounts Ledger</span>
          </div>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Parent Name</th>
                  <th style={{ textAlign: "right" }}>Outstanding Amount</th>
                  <th>Due Date</th>
                  <th style={{ textAlign: "center" }}>Days Overdue</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {overdueAccounts.length > 0 ? (
                  overdueAccounts.map(account => (
                    <tr 
                      key={account.student_id} 
                      style={{ 
                        backgroundColor: "rgba(225, 29, 72, 0.04)",
                        transition: "background-color 0.2s"
                      }}
                      className="hover-row"
                    >
                      <td style={{ fontWeight: "600" }}>{account.student_name}</td>
                      <td>{account.parent_name}</td>
                      <td className="mono-data" style={{ fontWeight: "700", textAlign: "right", color: "#E11D48" }}>
                        ₹{account.outstanding_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="mono-data">{account.due_date}</td>
                      <td className="mono-data" style={{ fontWeight: "700", textAlign: "center", color: "#E11D48" }}>
                        {account.days_overdue} days
                      </td>
                      <td>
                        <span className="badge badge-overdue">
                          Overdue
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", color: "var(--warm-muted)", padding: "2rem" }}>
                      No overdue accounts on the roster.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="card" style={{ display: "flex", flexDirection: "column", padding: "1.5rem" }}>
          <div className="card-title" style={{ borderBottom: "1px solid var(--structure-border)", paddingBottom: "0.75rem", marginBottom: "1rem" }}>
            <span>Quick Actions</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", justifyContent: "center", flex: 1 }}>
            <button
              onClick={() => navigate("/admin/students?action=add")}
              className="btn btn-primary"
              style={{ width: "100%", padding: "0.85rem", justifyContent: "center", gap: "0.75rem", fontSize: "13px" }}
            >
              <UserPlus size={18} />
              <span>Register New Student</span>
            </button>
            <button
              onClick={() => setShowLogModal(true)}
              className="btn btn-secondary"
              style={{ width: "100%", padding: "0.85rem", justifyContent: "center", gap: "0.75rem", fontSize: "13px", border: "1.5px solid var(--sidebar-brown)" }}
            >
              <Banknote size={18} />
              <span>Log Installment Payment</span>
            </button>
            <button
              onClick={handleExportPDF}
              className="btn btn-secondary"
              style={{ width: "100%", padding: "0.85rem", justifyContent: "center", gap: "0.75rem", fontSize: "13px", border: "1.5px solid var(--sidebar-brown)", display: "flex", alignItems: "center" }}
              disabled={downloadingStatement}
            >
              {downloadingStatement ? (
                <>
                  <div style={{ width: "16px", height: "16px", border: "2px solid #ccc", borderTopColor: "#333", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                  <span>Generating Statement...</span>
                </>
              ) : (
                <>
                  <Download size={18} />
                  <span>Download PDF Statement</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Full-width Table: Recent Transactions */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--structure-border)", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#FFFDF7" }}>
          <h3 style={{ fontSize: "1.125rem", fontWeight: "700", color: "var(--sidebar-brown)" }}>Recent Transactions</h3>
        </div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr style={{ backgroundColor: "#FFFDF7" }}>
                <th>Receipt No.</th>
                <th>Student Name</th>
                <th>Class</th>
                <th>Amount Paid</th>
                <th>Date</th>
                <th>Method</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {receipts.length > 0 ? (
                receipts.map(rec => (
                  <tr key={rec.receipt_id} style={{ transition: "background-color 0.2s" }} className="hover-row">
                    <td className="mono-data" style={{ fontWeight: "700", color: "var(--sidebar-brown)", fontSize: "13px" }}>
                      {rec.receipt_number}
                    </td>
                    <td style={{ fontWeight: "600" }}>{rec.student_name}</td>
                    <td style={{ color: "var(--warm-muted)" }}>
                      {students.find(s => s.student_id === rec.student_id)?.class || "Grade 5-A"}
                    </td>
                    <td className="mono-data" style={{ fontWeight: "700" }}>
                      ₹{rec.amount_paid.toLocaleString("en-IN")}
                    </td>
                    <td className="mono-data">{rec.payment_date}</td>
                    <td style={{ textTransform: "capitalize", verticalAlign: "middle" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        {getMethodIcon(rec.payment_method)}
                        <span>{rec.payment_method.replace("_", " ")}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-paid" style={{ fontSize: "11px" }}>
                        Paid
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: "0.25rem 0.5rem", fontSize: "12px", height: "auto", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                        onClick={() => handleReceiptDownload(rec)}
                        title="Download Receipt Vouchers"
                        disabled={downloadingReceiptId === rec.receipt_id}
                      >
                        {downloadingReceiptId === rec.receipt_id ? (
                          <div style={{ width: "14px", height: "14px", border: "2px solid #ccc", borderTopColor: "#333", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                        ) : (
                          <Download size={14} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", color: "var(--warm-muted)", padding: "2.5rem" }}>
                    No payments logged in the current session.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Payment Dialog Overlay */}
      {showLogModal && (
        <div className="dialog-overlay">
          <div className="dialog" style={{ maxWidth: "520px" }}>
            <div className="dialog-header">
              <h3 style={{ fontSize: "1.25rem" }}>Log Student Transaction</h3>
              <button
                style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "var(--warm-muted)" }}
                onClick={() => setShowLogModal(false)}
              >
                &times;
              </button>
            </div>

            {modalError && (
              <div
                className="badge badge-overdue"
                style={{ width: "100%", padding: "0.75rem", borderRadius: "4px", marginBottom: "1rem", textTransform: "none" }}
              >
                {modalError}
              </div>
            )}

            {modalSuccess && (
              <div
                className="badge badge-paid"
                style={{ width: "100%", padding: "0.75rem", borderRadius: "4px", marginBottom: "1rem", textTransform: "none" }}
              >
                {modalSuccess}
              </div>
            )}

            <form onSubmit={handleLogPaymentSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="modal-student">
                  Select Active Student
                </label>
                <select
                  id="modal-student"
                  className="form-control"
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Student --</option>
                  {students
                    .filter(s => s.status === "active")
                    .map(student => (
                      <option key={student.student_id} value={student.student_id}>
                        {student.student_name} ({student.admission_number})
                      </option>
                    ))}
                </select>
              </div>

              {selectedStudentId && (
                <>
                  <div className="form-group">
                    <label className="form-label" htmlFor="modal-installment">
                      Select Installment Term
                    </label>
                    {studentInstallments.length > 0 ? (
                      <select
                        id="modal-installment"
                        className="form-control"
                        value={selectedInstallmentId}
                        onChange={handleInstallmentChange}
                        required
                      >
                        {studentInstallments.map(inst => (
                          <option key={inst.installment_id} value={inst.installment_id}>
                            Installment #{inst.installment_number} - Due Date: {inst.due_date} (₹{Number(inst.amount).toFixed(2)})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div style={{ fontSize: "13px", color: "var(--status-paid-text)", fontWeight: "600", padding: "0.5rem 0" }}>
                        All installments for this student are fully paid!
                      </div>
                    )}
                  </div>

                  {selectedInstallmentId && (
                    <>
                      <div className="form-group">
                        <label className="form-label" htmlFor="modal-amount">
                          Payment Amount (₹)
                        </label>
                        <input
                          id="modal-amount"
                          type="number"
                          className="form-control mono-data"
                          value={paymentAmount}
                          disabled
                          readOnly
                        />
                        <span style={{ fontSize: "11px", color: "var(--warm-muted)" }}>
                          Note: Payments must exactly match the set installment block size.
                        </span>
                      </div>

                      <div className="grid-2">
                        <div className="form-group">
                          <label className="form-label" htmlFor="modal-method">
                            Payment Method
                          </label>
                          <select
                            id="modal-method"
                            className="form-control"
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                          >
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="cash">Cash Settlement</option>
                            <option value="cheque">Cheque Draft</option>
                            <option value="card">Card Payment</option>
                          </select>
                        </div>

                        <div className="form-group">
                          <label className="form-label" htmlFor="modal-date">
                            Payment Date
                          </label>
                          <input
                            id="modal-date"
                            type="date"
                            className="form-control"
                            value={paymentDate}
                            onChange={(e) => setPaymentDate(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              <div className="dialog-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowLogModal(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || !selectedInstallmentId}
                >
                  Confirm Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
