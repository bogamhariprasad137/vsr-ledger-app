import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../services/api";
import {
  Search,
  Filter,
  CreditCard,
  Banknote,
  CheckCircle,
  Calendar,
  AlertCircle,
  Users,
  Settings,
  Plus,
  Printer,
  ChevronRight,
  Info,
  Download
} from "lucide-react";


export default function FeeManagement() {
  const navigate = useNavigate();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Data state
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedStudentInsts, setSelectedStudentInsts] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [summaryData, setSummaryData] = useState({
    allocated: 0,
    collected: 0,
    pending: 0,
    overdue: 0
  });

  // Fast payment modal/form state
  const [logPaymentModal, setLogPaymentModal] = useState(false);
  const [selectedInstallmentId, setSelectedInstallmentId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [downloadingReceiptId, setDownloadingReceiptId] = useState(null);
  const [downloadError, setDownloadError] = useState("");
  const [downloadSuccess, setDownloadSuccess] = useState("");

  const handleReceiptDownload = async (rec) => {
    if (!rec) return;
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

  const loadData = async () => {
    try {
      const data = await api.students.getAll();
      setStudents(data);

      const receiptList = await api.receipts.getAll();
      setReceipts(receiptList);

      // Math metrics summaries
      let allocated = 0;
      let collected = 0;
      let pending = 0;
      let overdue = 0;

      data.forEach(s => {
        allocated += Number(s.total_fee) || 0;
        collected += Number(s.paid_amount) || 0;
      });

      // Calculate Pending Fees = Total Allocated - Total Collected
      pending = allocated - collected;

      // Calculate overdue amount from installments
      const studentInstsList = await Promise.all(
        data.map(s => api.installments.getByFeeId(s.student_id))
      );
      const flatInsts = studentInstsList.flat();
      flatInsts.forEach(inst => {
        if (inst.status === "overdue") {
          overdue += Number(inst.amount) || 0;
        }
      });

      setSummaryData({
        allocated,
        collected,
        pending,
        overdue
      });

      // Maintain selection state if student is already selected
      if (selectedStudent) {
        const updatedSelected = data.find(s => s.student_id === selectedStudent.student_id);
        if (updatedSelected) {
          setSelectedStudent(updatedSelected);
          const insts = await api.installments.getByFeeId(updatedSelected.student_id);
          setSelectedStudentInsts(insts);
        }
      }
    } catch (err) {
      console.error("Failed to load fee management data:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update selected student details panel
  const handleSelectStudent = async (student) => {
    setSelectedStudent(student);
    setFormError("");
    setFormSuccess("");
    try {
      const insts = await api.installments.getByFeeId(student.student_id);
      setSelectedStudentInsts(insts);
      
      const unpaid = insts.filter(i => i.status !== "paid");
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

  const handleInstallmentChange = (e) => {
    const instId = parseInt(e.target.value);
    setSelectedInstallmentId(instId);
    const inst = selectedStudentInsts.find(i => i.installment_id === instId);
    if (inst) {
      setPaymentAmount(inst.amount);
    }
  };

  const handleLogPaymentSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!selectedInstallmentId || !paymentAmount) {
      setFormError("Please select a pending installment to log.");
      return;
    }

    setSubmitting(true);
    try {
      await api.receipts.logPayment({
        student_id: selectedStudent.student_id,
        installment_id: selectedInstallmentId,
        amount_paid: parseFloat(paymentAmount),
        payment_date: paymentDate,
        payment_method: paymentMethod
      });

      setFormSuccess("Payment processed successfully!");
      setTimeout(() => {
        setFormSuccess("");
        setSubmitting(false);
        loadData();
      }, 1200);
    } catch (err) {
      setFormError(err.message);
      setSubmitting(false);
    }
  };

  // Filters
  const filteredStudents = students.filter(s => {
    const matchesSearch =
      s.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.admission_number.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesClass = classFilter === "" || s.class === classFilter;
    const matchesStatus =
      statusFilter === "" ||
      s.fee_status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesClass && matchesStatus;
  });

  const uniqueClasses = Array.from(new Set(students.map(s => s.class)));

  return (
    <div className="content-pane" style={{ animation: "fadeIn 0.5s ease" }}>
      {/* Top Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.75rem", marginBottom: "0.25rem" }}>Fee Management Portal</h1>
        <p style={{ color: "var(--warm-muted)", fontSize: "14px" }}>
          Configure student custom installment plans, audit receivables, and record manual logs.
        </p>
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

      {/* Summary Metrics Row (4 Cards) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
        <div className="card metric-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span className="metric-label">Total Allocated</span>
            <Users size={20} color="var(--warm-muted)" />
          </div>
          <div className="metric-value mono-data">{Math.round(summaryData.allocated)}</div>
          <div style={{ marginTop: "0.25rem" }}>
            <span className="badge badge-info" style={{ fontSize: "10px", padding: "0.15rem 0.5rem" }}>
              Total Billed
            </span>
          </div>
        </div>

        <div className="card metric-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span className="metric-label">Total Collected</span>
            <CheckCircle size={20} color="#0D9488" />
          </div>
          <div className="metric-value mono-data" style={{ color: "#0D9488" }}>{Math.round(summaryData.collected)}</div>
          <div style={{ marginTop: "0.25rem" }}>
            <span className="badge badge-paid" style={{ fontSize: "10px", padding: "0.15rem 0.5rem" }}>
              Cleared Dues
            </span>
          </div>
        </div>

        <div className="card metric-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span className="metric-label">Pending Balance</span>
            <Calendar size={20} color="#D97706" />
          </div>
          <div className="metric-value mono-data" style={{ color: "#D97706" }}>{Math.round(summaryData.pending)}</div>
          <div style={{ marginTop: "0.25rem" }}>
            <span className="badge badge-pending" style={{ fontSize: "10px", padding: "0.15rem 0.5rem" }}>
              Expected
            </span>
          </div>
        </div>

        <div className="card metric-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span className="metric-label">Overdue Outstanding</span>
            <AlertCircle size={20} color="#E11D48" />
          </div>
          <div className="metric-value mono-data" style={{ color: "#E11D48" }}>{Math.round(summaryData.overdue)}</div>
          <div style={{ marginTop: "0.25rem" }}>
            <span className="badge badge-overdue" style={{ fontSize: "10px", padding: "0.15rem 0.5rem" }}>
              Arrears
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Search, Table, and Selected Detail Panel */}
      <div className="grid-3" style={{ alignItems: "start" }}>
        {/* Left Side: Student Fee Status Table */}
        <div className="card" style={{ gridColumn: "span 2 / span 2", padding: "1.5rem" }}>
          <div style={{ borderBottom: "1px solid var(--structure-border)", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
            <h3 style={{ fontSize: "1.125rem", color: "var(--sidebar-brown)", marginBottom: "1rem" }}>Student Fee Ledgers</h3>
            
            {/* Search and Filters */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "1rem" }}>
              <div style={{ position: "relative" }}>
                <Search
                  size={16}
                  color="var(--warm-muted)"
                  style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }}
                />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by student or admission no..."
                  style={{ paddingLeft: "32px", fontSize: "13px" }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Filter size={14} color="var(--warm-muted)" />
                <select 
                  className="form-control" 
                  style={{ fontSize: "13px" }}
                  value={classFilter} 
                  onChange={(e) => setClassFilter(e.target.value)}
                >
                  <option value="">All Classes</option>
                  {uniqueClasses.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Settings size={14} color="var(--warm-muted)" />
                <select 
                  className="form-control" 
                  style={{ fontSize: "13px" }}
                  value={statusFilter} 
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="Paid">Paid</option>
                  <option value="Pending">Pending</option>
                  <option value="Overdue">Overdue</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Class</th>
                  <th style={{ textAlign: "right" }}>Total Fee</th>
                  <th style={{ textAlign: "right" }}>Paid</th>
                  <th style={{ textAlign: "right" }}>Balance</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length > 0 ? (
                  filteredStudents.map(s => {
                    const isSelected = selectedStudent?.student_id === s.student_id;
                    return (
                      <tr 
                        key={s.student_id} 
                        onClick={() => handleSelectStudent(s)}
                        style={{ 
                          cursor: "pointer", 
                          backgroundColor: isSelected ? "rgba(75, 46, 33, 0.05)" : "inherit",
                          fontWeight: isSelected ? "600" : "normal"
                        }}
                        className="hover-row"
                      >
                        <td style={{ fontWeight: "600" }}>{s.student_name}</td>
                        <td>{s.class}</td>
                        <td className="mono-data" style={{ textAlign: "right" }}>₹{s.total_fee.toLocaleString("en-IN")}</td>
                        <td className="mono-data" style={{ textAlign: "right", color: "var(--status-paid-text)" }}>₹{s.paid_amount.toLocaleString("en-IN")}</td>
                        <td className="mono-data" style={{ textAlign: "right", color: s.pending_amount > 0 ? "var(--status-pending-text)" : "inherit" }}>₹{s.pending_amount.toLocaleString("en-IN")}</td>
                        <td>
                          <span className={`badge ${s.fee_status === "Paid" ? "badge-paid" : s.fee_status === "Overdue" ? "badge-overdue" : "badge-pending"}`}>
                            {s.fee_status}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/students/${s.student_id}/installments`);
                            }}
                            className="btn btn-secondary"
                            style={{ padding: "0.25rem 0.5rem", fontSize: "11px", height: "auto" }}
                          >
                            Configure Splits
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: "center", color: "var(--warm-muted)", padding: "2.5rem" }}>
                      No matching records found on the ledger.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Installments Details Panel & Log Form */}
        <div className="card" style={{ padding: "1.5rem" }}>
          {selectedStudent ? (
            <div>
              <div style={{ borderBottom: "1px solid var(--structure-border)", paddingBottom: "0.75rem", marginBottom: "1rem" }}>
                <h3 style={{ fontSize: "1.125rem", color: "var(--sidebar-brown)" }}>Installments & logging</h3>
                <p style={{ fontSize: "12px", color: "var(--warm-muted)" }}>
                  Configured splits for <strong>{selectedStudent.student_name}</strong> ({selectedStudent.class})
                </p>
              </div>

              {/* Fee splits details table */}
              <div style={{ backgroundColor: "#FFFDF7", border: "1px solid var(--structure-border)", borderRadius: "6px", padding: "0.75rem", fontSize: "12px", marginBottom: "1rem" }}>
                <div style={{ fontWeight: "700", textTransform: "uppercase", color: "var(--warm-muted)", marginBottom: "0.5rem", borderBottom: "1px solid var(--structure-border)", paddingBottom: "0.25rem" }}>
                  Category Splits
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                  <span>Admission Fee:</span>
                  <span className="mono-data" style={{ fontWeight: "600" }}>₹{selectedStudent.admission_fee.toLocaleString("en-IN")}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                  <span>Term Fee:</span>
                  <span className="mono-data" style={{ fontWeight: "600" }}>₹{selectedStudent.term_fee.toLocaleString("en-IN")}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Daycare Fee:</span>
                  <span className="mono-data" style={{ fontWeight: "600" }}>₹{selectedStudent.daycare_fee.toLocaleString("en-IN")}</span>
                </div>
              </div>

              {/* Installments vertical timeline */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
                {selectedStudentInsts.map(inst => {
                  const rec = receipts.find(r => r.installment_id === inst.installment_id);
                  return (
                    <div 
                      key={inst.installment_id} 
                      style={{ 
                        display: "flex", 
                        justifyContent: "space-between", 
                        alignItems: "center", 
                        padding: "0.625rem", 
                        backgroundColor: "#FFFFFF", 
                        border: "1px solid var(--structure-border)", 
                        borderRadius: "6px",
                        fontSize: "13px"
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: "700" }}>Installment #{inst.installment_number}</div>
                        <div style={{ fontSize: "11px", color: "var(--warm-muted)", marginTop: "2px" }}>
                          Due: <span className="mono-data">{inst.due_date}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                        <div className="mono-data" style={{ fontWeight: "700" }}>₹{inst.amount.toLocaleString("en-IN")}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", marginTop: "2px" }}>
                          <span className={`badge ${inst.status === "paid" ? "badge-paid" : inst.status === "overdue" ? "badge-overdue" : "badge-info"}`} style={{ fontSize: "9px", padding: "0.1rem 0.35rem" }}>
                            {inst.status}
                          </span>
                          {inst.status === "paid" && rec && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReceiptDownload(rec);
                              }}
                              className="btn btn-secondary"
                              style={{
                                padding: "0.15rem 0.35rem",
                                fontSize: "10px",
                                height: "auto",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center"
                              }}
                              disabled={downloadingReceiptId === rec.receipt_id}
                              title="Download Receipt PDF"
                            >
                              {downloadingReceiptId === rec.receipt_id ? (
                                <div style={{ width: "10px", height: "10px", border: "1.5px solid #ccc", borderTopColor: "#333", borderRadius: "50%", animation: "spin 1.5s linear infinite" }} />
                              ) : (
                                <Download size={10} />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Log Payment Form */}
              {selectedStudentInsts.some(i => i.status !== "paid") ? (
                <div style={{ borderTop: "1px solid var(--structure-border)", paddingTop: "1rem" }}>
                  <h4 style={{ fontSize: "13px", fontWeight: "700", color: "var(--sidebar-brown)", marginBottom: "0.75rem" }}>Quick Transaction Log</h4>
                  
                  {formError && (
                    <div className="badge badge-overdue" style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "4px", fontSize: "11px", textTransform: "none", marginBottom: "0.75rem", display: "flex", gap: "0.25rem", alignItems: "center" }}>
                      <AlertCircle size={12} />
                      <span>{formError}</span>
                    </div>
                  )}

                  {formSuccess && (
                    <div className="badge badge-paid" style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "4px", fontSize: "11px", textTransform: "none", marginBottom: "0.75rem", display: "flex", gap: "0.25rem", alignItems: "center" }}>
                      <CheckCircle size={12} />
                      <span>{formSuccess}</span>
                    </div>
                  )}

                  <form onSubmit={handleLogPaymentSubmit}>
                    <div className="form-group" style={{ marginBottom: "0.75rem" }}>
                      <label className="form-label" style={{ fontSize: "11px" }} htmlFor="installment-select">Select Installment</label>
                      <select 
                        id="installment-select"
                        className="form-control" 
                        style={{ fontSize: "12px", height: "30px" }}
                        value={selectedInstallmentId}
                        onChange={handleInstallmentChange}
                      >
                        {selectedStudentInsts.filter(i => i.status !== "paid").map(i => (
                          <option key={i.installment_id} value={i.installment_id}>
                            Installment #{i.installment_number} (₹{i.amount.toLocaleString("en-IN")})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.75rem" }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: "11px" }} htmlFor="payment-date-input">Payment Date</label>
                        <input 
                          id="payment-date-input"
                          type="date" 
                          className="form-control" 
                          style={{ fontSize: "12px", height: "30px", padding: "0.25rem" }}
                          value={paymentDate}
                          onChange={(e) => setPaymentDate(e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: "11px" }} htmlFor="payment-method-select">Method</label>
                        <select 
                          id="payment-method-select"
                          className="form-control" 
                          style={{ fontSize: "12px", height: "30px" }}
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                        >
                          <option value="bank_transfer">Bank Transfer</option>
                          <option value="cash">Cash</option>
                          <option value="cheque">Cheque</option>
                          <option value="card">Card</option>
                        </select>
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      className="btn btn-primary" 
                      style={{ width: "100%", padding: "0.5rem", fontSize: "12px", height: "34px", justifyContent: "center" }}
                      disabled={submitting}
                    >
                      {submitting ? "Logging transaction..." : "Log Installment Payment"}
                    </button>
                  </form>
                </div>
              ) : (
                <div style={{ padding: "1rem", backgroundColor: "rgba(13, 148, 136, 0.05)", border: "1px dashed rgba(13, 148, 136, 0.2)", borderRadius: "6px", textAlign: "center", fontSize: "13px", color: "#0D9488", fontWeight: "600" }}>
                  All installments are fully settled!
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--warm-muted)" }}>
              <CreditCard size={32} color="var(--warm-muted)" style={{ marginBottom: "1rem" }} />
              <h4 style={{ fontSize: "14px", fontWeight: "700", color: "var(--academic-charcoal)" }}>No Student Selected</h4>
              <p style={{ fontSize: "12px", marginTop: "0.25rem" }}>
                Select a student from the fee ledger table to view installment schedules and log payments directly.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
