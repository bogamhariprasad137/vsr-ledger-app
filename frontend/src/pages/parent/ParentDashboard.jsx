import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Wallet, CheckCircle2, ShieldAlert, Landmark, Info, ArrowUpRight, AlertCircle, CheckCircle, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../services/api";

export default function ParentDashboard() {
  const { activeStudent, currentUser, refreshActiveStudent } = useAuth();
  const [downloadingReceiptId, setDownloadingReceiptId] = useState(null);
  const [downloadError, setDownloadError] = useState("");
  const [downloadSuccess, setDownloadSuccess] = useState("");

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

  useEffect(() => {
    // Refresh student installment records on load
    refreshActiveStudent();
  }, [currentUser]);

  if (!activeStudent) {
    return (
      <div className="content-pane">
        <div className="card" style={{ padding: "2.5rem", textAlign: "center" }}>
          <Info size={40} color="var(--warm-muted)" style={{ marginBottom: "1rem" }} />
          <h3>No students connected</h3>
          <p style={{ color: "var(--warm-muted)", marginTop: "0.25rem" }}>
            We could not find any pre-registered students linked to the email <strong>{currentUser?.email}</strong>.
          </p>
        </div>
      </div>
    );
  }

  const fee = activeStudent.feeDetails;
  const installments = activeStudent.installments || [];
  const upcoming = installments.filter(i => i.status !== "paid").slice(0, 2);

  // Math totals
  const total = Number(fee?.total_fee) || 0;
  const paid = Number(fee?.paid_amount) || 0;
  const pending = Number(fee?.pending_amount) || 0;
  const pct = total > 0 ? Math.round((paid / total) * 100) : 0;

  return (
    <div className="content-pane">
      {/* Dashboard Overview Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.75rem", marginBottom: "0.25rem" }}>
          Welcome back, {activeStudent.parent_name}!
        </h1>
        <p style={{ color: "var(--warm-muted)", fontSize: "14px" }}>
          Viewing academic fees status for <strong>{activeStudent.student_name}</strong> (Admission No: <strong className="mono-data">{activeStudent.admission_number}</strong>).
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

      {/* Metrics Section */}
      <div className="grid-3" style={{ marginBottom: "2rem" }}>
        <div className="card metric-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="metric-label">Total Fee Account</span>
            <Wallet size={18} color="var(--warm-muted)" />
          </div>
          <div className="metric-value mono-data">₹{total.toFixed(2)}</div>
          <span style={{ fontSize: "11px", color: "var(--warm-muted)" }}>Current Academic Term</span>
        </div>

        <div className="card metric-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="metric-label">Total Amount Paid</span>
            <CheckCircle2 size={18} color="#0D9488" />
          </div>
          <div className="metric-value mono-data" style={{ color: "#0D9488" }}>
            ₹{paid.toFixed(2)}
          </div>
          <span style={{ fontSize: "11px", color: "#0D9488", fontWeight: "600" }}>{pct}% Cleared</span>
        </div>

        <div className="card metric-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="metric-label">Outstanding Balance</span>
            <ShieldAlert size={18} color={pending > 0 ? "var(--status-pending-text)" : "var(--status-paid-text)"} />
          </div>
          <div className="metric-value mono-data" style={{ color: pending > 0 ? "var(--status-pending-text)" : "var(--status-paid-text)" }}>
            ₹{pending.toFixed(2)}
          </div>
          <span style={{ fontSize: "11px", color: "var(--warm-muted)" }}>Installments Remaining</span>
        </div>
      </div>

      {/* Student Info & Fee Splits Section */}
      <div className="grid-2" style={{ marginBottom: "2rem" }}>
        {/* Student Information */}
        <div className="card">
          <div className="card-title">
            <span>Student Information</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--structure-border)", paddingBottom: "0.5rem" }}>
              <span style={{ color: "var(--warm-muted)" }}>Student Name:</span>
              <strong style={{ color: "var(--academic-charcoal)" }}>{activeStudent.student_name}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--structure-border)", paddingBottom: "0.5rem" }}>
              <span style={{ color: "var(--warm-muted)" }}>Class:</span>
              <strong style={{ color: "var(--academic-charcoal)" }}>{activeStudent.class}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--structure-border)", paddingBottom: "0.5rem" }}>
              <span style={{ color: "var(--warm-muted)" }}>Admission Number:</span>
              <strong className="mono-data" style={{ color: "var(--academic-charcoal)" }}>{activeStudent.admission_number}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--structure-border)", paddingBottom: "0.5rem" }}>
              <span style={{ color: "var(--warm-muted)" }}>Admission Date:</span>
              <strong className="mono-data" style={{ color: "var(--academic-charcoal)" }}>{activeStudent.admission_date}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--warm-muted)" }}>Overall Due Date:</span>
              <strong className="mono-data" style={{ color: "var(--status-pending-text)" }}>{fee?.due_date || "N/A"}</strong>
            </div>
          </div>
        </div>

        {/* Fee Splits */}
        <div className="card">
          <div className="card-title">
            <span>Fee Category Breakdown</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--structure-border)", paddingBottom: "0.5rem" }}>
              <span style={{ color: "var(--warm-muted)" }}>Admission Fee:</span>
              <strong className="mono-data">₹{Number(activeStudent.admission_fee || 0).toFixed(2)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--structure-border)", paddingBottom: "0.5rem" }}>
              <span style={{ color: "var(--warm-muted)" }}>Term Fee:</span>
              <strong className="mono-data">₹{Number(activeStudent.term_fee || 0).toFixed(2)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--structure-border)", paddingBottom: "0.5rem" }}>
              <span style={{ color: "var(--warm-muted)" }}>Daycare Fee:</span>
              <strong className="mono-data">₹{Number(activeStudent.daycare_fee || 0).toFixed(2)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "700", fontSize: "15px", color: "var(--sidebar-brown)", paddingTop: "0.25rem" }}>
              <span>Total Allocated Fee:</span>
              <strong className="mono-data">₹{total.toFixed(2)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Billing Progress Card */}
      <div className="card" style={{ marginBottom: "2rem" }}>
        <div className="card-title">
          <span>Installment Progress</span>
        </div>
        <div style={{ marginBottom: "0.5rem" }}>
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--warm-muted)", fontWeight: "600" }}>
          <span>Total Paid: ₹{paid.toFixed(2)}</span>
          <span>Balance: ₹{pending.toFixed(2)} ({100 - pct}% remaining)</span>
        </div>
      </div>

      {/* Grid: Upcoming Schedules, Recent Receipts, offline bank info */}
      <div className="grid-2" style={{ marginBottom: "2rem" }}>
        {/* Upcoming Installments */}
        <div className="card">
          <div className="card-title">
            <span>Upcoming Installment Schedules</span>
          </div>
          {upcoming.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {upcoming.map(inst => (
                <div
                  key={inst.installment_id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "1rem",
                    backgroundColor: "#FFFDF7",
                    border: "1px solid var(--structure-border)",
                    borderRadius: "6px"
                  }}
                >
                  <div>
                    <div style={{ fontWeight: "700", fontSize: "14px" }}>Installment #{inst.installment_number}</div>
                    <div style={{ fontSize: "12px", color: "var(--warm-muted)", marginTop: "0.2rem" }}>
                      Payment Due: <span className="mono-data">{inst.due_date}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span className="mono-data" style={{ fontWeight: "700", fontSize: "14px" }}>
                      ₹{Number(inst.amount).toFixed(2)}
                    </span>
                    <span className={`badge ${inst.status === "overdue" ? "badge-overdue" : "badge-info"}`}>
                      {inst.status}
                    </span>
                  </div>
                </div>
              ))}
              <div style={{ textAlign: "right", marginTop: "0.5rem" }}>
                <Link
                  to="/parent/history"
                  style={{
                    fontSize: "13px",
                    fontWeight: "600",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    color: "var(--sidebar-brown)"
                  }}
                >
                  View All History
                  <ArrowUpRight size={14} />
                </Link>
              </div>
            </div>
          ) : (
            <div style={{ color: "var(--status-paid-text)", fontWeight: "600", padding: "1rem", textAlign: "center" }}>
              All installments fully settled! Thank you.
            </div>
          )}
        </div>

        {/* Recent Receipts */}
        <div className="card">
          <div className="card-title">
            <span>Recent Receipts</span>
          </div>
          {activeStudent.receipts && activeStudent.receipts.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {activeStudent.receipts.slice(0, 2).map(rec => (
                <div
                  key={rec.receipt_id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "1rem",
                    backgroundColor: "#FFFDF7",
                    border: "1px solid var(--structure-border)",
                    borderRadius: "6px"
                  }}
                >
                  <div>
                    <div style={{ fontWeight: "700", fontSize: "14px" }}>{rec.receipt_number}</div>
                    <div style={{ fontSize: "12px", color: "var(--warm-muted)", marginTop: "0.2rem" }}>
                      Paid: <span className="mono-data">{rec.payment_date}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span className="mono-data" style={{ fontWeight: "700", fontSize: "14px", color: "var(--status-paid-text)" }}>
                      ₹{Number(rec.amount_paid).toFixed(2)}
                    </span>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: "0.25rem 0.5rem", fontSize: "11px", height: "auto", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                      onClick={() => handleReceiptDownload(rec)}
                      disabled={downloadingReceiptId === rec.receipt_id}
                      title="Download Receipt PDF"
                    >
                      {downloadingReceiptId === rec.receipt_id ? (
                        <div style={{ width: "11px", height: "11px", border: "1.5px solid #ccc", borderTopColor: "#333", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                      ) : (
                        <span>PDF</span>
                      )}
                    </button>
                  </div>
                </div>
              ))}
              <div style={{ textAlign: "right", marginTop: "0.5rem" }}>
                <Link
                  to="/parent/receipts"
                  style={{
                    fontSize: "13px",
                    fontWeight: "600",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    color: "var(--sidebar-brown)"
                  }}
                >
                  View All Receipts
                  <ArrowUpRight size={14} />
                </Link>
              </div>
            </div>
          ) : (
            <div style={{ color: "var(--warm-muted)", padding: "1rem", textAlign: "center", fontSize: "13px" }}>
              No receipt vouchers generated yet.
            </div>
          )}
        </div>
      </div>

      {/* Offline Payment Instructions */}
      <div className="card">
        <div className="card-title">
          <span>Offline Payment Instructions</span>
        </div>
        <p style={{ fontSize: "13px", color: "var(--warm-muted)", lineHeight: "1.4", marginBottom: "1rem" }}>
          To settle pending installments, please complete a bank transfer to the school's account and report the transaction reference to the administration.
        </p>

        <div
          style={{
            padding: "1rem",
            borderRadius: "6px",
            backgroundColor: "#FFFDF7",
            border: "1px solid var(--structure-border)",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "12px",
            color: "var(--academic-charcoal)",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem"
          }}
        >
          <div>
            <strong>BANK:</strong> National Academic Trust Bank
          </div>
          <div>
            <strong>ACCOUNT NAME:</strong> FirstCry Intellitots Educational Fund
          </div>
          <div>
            <strong>ACCOUNT NO:</strong> <span className="mono-data">9823-8712-9831</span>
          </div>
          <div>
            <strong>ROUTING NO:</strong> <span className="mono-data">021000021</span>
          </div>
          <div>
            <strong>REFERENCE:</strong> <span style={{ color: "var(--sidebar-brown)", fontWeight: "700" }}>{activeStudent.admission_number}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
