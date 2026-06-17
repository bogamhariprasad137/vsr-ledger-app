import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../../services/api";
import { ArrowLeft, User, Phone, Mail, BadgeAlert, Landmark, FileCheck, Calendar, Printer } from "lucide-react";

export default function StudentDetail() {
  const { id } = useParams();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDetails = async () => {
    try {
      const data = await api.students.getById(id);
      setStudent(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleReceiptDownload = (rec) => {
    api.receipts.download(rec);
  };

  if (loading) {
    return (
      <div className="content-pane" style={{ textAlign: "center", paddingTop: "5rem" }}>
        <div style={{ fontSize: "16px", fontWeight: "600", color: "var(--sidebar-brown)" }}>
          Loading profile sheet...
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="content-pane">
        <Link to="/admin/students" className="btn btn-secondary" style={{ marginBottom: "1.5rem" }}>
          <ArrowLeft size={16} />
          <span>Back to Roster</span>
        </Link>
        <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
          <BadgeAlert size={48} color="#E11D48" style={{ marginBottom: "1rem" }} />
          <h3 style={{ color: "#E11D48", marginBottom: "0.5rem" }}>Failed to retrieve profile</h3>
          <p style={{ color: "var(--warm-muted)" }}>{error || "Student record could not be loaded."}</p>
        </div>
      </div>
    );
  }

  const fee = student.feeDetails ? {
    ...student.feeDetails,
    total_fee: Number(student.feeDetails.total_fee) || 0,
    paid_amount: Number(student.feeDetails.paid_amount) || 0,
    pending_amount: Number(student.feeDetails.pending_amount) || 0,
    admission_fee: Number(student.feeDetails.admission_fee) || 0,
    admission_fee_paid: Number(student.feeDetails.admission_fee_paid) || 0,
    admission_fee_remaining: Number(student.feeDetails.admission_fee_remaining) || 0,
    term_fee: Number(student.feeDetails.term_fee) || 0,
    term_fee_paid: Number(student.feeDetails.term_fee_paid) || 0,
    term_fee_remaining: Number(student.feeDetails.term_fee_remaining) || 0,
    daycare_fee: Number(student.feeDetails.daycare_fee) || 0,
    daycare_fee_paid: Number(student.feeDetails.daycare_fee_paid) || 0,
    daycare_fee_remaining: Number(student.feeDetails.daycare_fee_remaining) || 0,
  } : null;

  return (
    <div className="content-pane">
      {/* Navigation and Title Header */}
      <div style={{ marginBottom: "2rem" }}>
        <Link
          to="/admin/students"
          className="btn btn-secondary"
          style={{ marginBottom: "1rem", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
        >
          <ArrowLeft size={16} />
          <span>Back to Roster</span>
        </Link>
        <div>
          <h1 style={{ fontSize: "1.75rem", marginBottom: "0.25rem" }}>{student.student_name}</h1>
          <p style={{ color: "var(--warm-muted)", fontSize: "14px" }}>
            Admission No: <strong className="mono-data">{student.admission_number}</strong> | Roster Status:{" "}
            <span className={`badge ${student.status === "active" ? "badge-paid" : "badge-overdue"}`}>
              {student.status}
            </span>
          </p>
        </div>
      </div>

      {/* Grid: Personal Info vs Fee Ledger */}
      <div className="grid-2" style={{ marginBottom: "2rem" }}>
        {/* Personal Details */}
        <div className="card" style={{ height: "100%" }}>
          <div className="card-title">
            <span>Student Registration Profile</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", borderBottom: "1px solid #FFF8DC", paddingBottom: "0.75rem" }}>
              <User size={18} color="var(--warm-muted)" />
              <div>
                <div style={{ fontSize: "11px", color: "var(--warm-muted)", textTransform: "uppercase", fontWeight: "700" }}>Guardian / Parent Name</div>
                <div style={{ fontWeight: "600", fontSize: "14px" }}>{student.parent_name}</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", borderBottom: "1px solid #FFF8DC", paddingBottom: "0.75rem" }}>
              <Mail size={18} color="var(--warm-muted)" />
              <div>
                <div style={{ fontSize: "11px", color: "var(--warm-muted)", textTransform: "uppercase", fontWeight: "700" }}>Parent Registered Email</div>
                <div style={{ fontWeight: "600", fontSize: "14px" }}>{student.parent_email}</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", borderBottom: "1px solid #FFF8DC", paddingBottom: "0.75rem" }}>
              <Phone size={18} color="var(--warm-muted)" />
              <div>
                <div style={{ fontSize: "11px", color: "var(--warm-muted)", textTransform: "uppercase", fontWeight: "700" }}>Parent Contact Phone</div>
                <div style={{ fontWeight: "600", fontSize: "14px" }}>{student.parent_phone || "No phone registered"}</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <Calendar size={18} color="var(--warm-muted)" />
              <div>
                <div style={{ fontSize: "11px", color: "var(--warm-muted)", textTransform: "uppercase", fontWeight: "700" }}>Admission Date</div>
                <div style={{ fontWeight: "600", fontSize: "14px" }} className="mono-data">{student.admission_date}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Fee Billing Ledger */}
        <div className="card" style={{ height: "100%" }}>
          <div className="card-title">
            <span>Financial Balance Overview</span>
            <Link
              to={`/admin/students/${student.student_id}/installments`}
              className="btn btn-secondary"
              style={{ fontSize: "12px", padding: "0.25rem 0.5rem", height: "auto" }}
            >
              Configure Splits
            </Link>
          </div>
          {fee ? (
            <div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "1rem",
                  marginBottom: "1.5rem",
                  textAlign: "center"
                }}
              >
                <div style={{ padding: "0.75rem", backgroundColor: "#FFFDF7", border: "1px solid var(--structure-border)", borderRadius: "6px" }}>
                  <div style={{ fontSize: "10px", fontWeight: "700", color: "var(--warm-muted)" }}>TOTAL FEE</div>
                  <div className="mono-data" style={{ fontSize: "16px", fontWeight: "700", marginTop: "0.25rem" }}>
                    ₹{fee.total_fee.toLocaleString("en-IN")}
                  </div>
                </div>

                <div style={{ padding: "0.75rem", backgroundColor: "rgba(13, 148, 136, 0.05)", border: "1px solid rgba(13, 148, 136, 0.2)", borderRadius: "6px" }}>
                  <div style={{ fontSize: "10px", fontWeight: "700", color: "#0D9488" }}>TOTAL PAID</div>
                  <div className="mono-data" style={{ fontSize: "16px", fontWeight: "700", color: "#0D9488", marginTop: "0.25rem" }}>
                    ₹{fee.paid_amount.toLocaleString("en-IN")}
                  </div>
                </div>

                <div style={{ padding: "0.75rem", backgroundColor: "rgba(217, 119, 6, 0.05)", border: "1px solid rgba(217, 119, 6, 0.2)", borderRadius: "6px" }}>
                  <div style={{ fontSize: "10px", fontWeight: "700", color: "var(--status-pending-text)" }}>BALANCE</div>
                  <div className="mono-data" style={{ fontSize: "16px", fontWeight: "700", color: "var(--status-pending-text)", marginTop: "0.25rem" }}>
                    ₹{fee.pending_amount.toLocaleString("en-IN")}
                  </div>
                </div>
              </div>

              {/* Fee Category Splits Details */}
              <div style={{ marginBottom: "1.5rem", padding: "0.75rem", backgroundColor: "#FFFDF7", border: "1px solid var(--structure-border)", borderRadius: "6px" }}>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--warm-muted)", textTransform: "uppercase", borderBottom: "1px solid var(--structure-border)", paddingBottom: "0.25rem", marginBottom: "0.5rem" }}>
                  Fee Category Breakdowns (Splits)
                </div>
                <div className="table-responsive">
                  <table className="table" style={{ fontSize: "13px", margin: 0, width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={{ padding: "4px 8px", backgroundColor: "transparent", color: "var(--warm-muted)", borderBottom: "1px solid var(--structure-border)" }}>Category</th>
                        <th style={{ padding: "4px 8px", backgroundColor: "transparent", color: "var(--warm-muted)", borderBottom: "1px solid var(--structure-border)", textAlign: "right" }}>Allocated</th>
                        <th style={{ padding: "4px 8px", backgroundColor: "transparent", color: "var(--warm-muted)", borderBottom: "1px solid var(--structure-border)", textAlign: "right" }}>Paid</th>
                        <th style={{ padding: "4px 8px", backgroundColor: "transparent", color: "var(--warm-muted)", borderBottom: "1px solid var(--structure-border)", textAlign: "right" }}>Remaining</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: "6px 8px", fontWeight: "600", borderBottom: "1px solid var(--structure-border)" }}>Admission Fee</td>
                        <td className="mono-data" style={{ padding: "6px 8px", borderBottom: "1px solid var(--structure-border)", textAlign: "right" }}>₹{fee.admission_fee.toLocaleString("en-IN")}</td>
                        <td className="mono-data" style={{ padding: "6px 8px", borderBottom: "1px solid var(--structure-border)", textAlign: "right", color: "var(--status-paid-text)" }}>₹{fee.admission_fee_paid.toLocaleString("en-IN")}</td>
                        <td className="mono-data" style={{ padding: "6px 8px", borderBottom: "1px solid var(--structure-border)", textAlign: "right", color: fee.admission_fee_remaining > 0 ? "var(--status-pending-text)" : "inherit" }}>₹{fee.admission_fee_remaining.toLocaleString("en-IN")}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: "6px 8px", fontWeight: "600", borderBottom: "1px solid var(--structure-border)" }}>Term Fee</td>
                        <td className="mono-data" style={{ padding: "6px 8px", borderBottom: "1px solid var(--structure-border)", textAlign: "right" }}>₹{fee.term_fee.toLocaleString("en-IN")}</td>
                        <td className="mono-data" style={{ padding: "6px 8px", borderBottom: "1px solid var(--structure-border)", textAlign: "right", color: "var(--status-paid-text)" }}>₹{fee.term_fee_paid.toLocaleString("en-IN")}</td>
                        <td className="mono-data" style={{ padding: "6px 8px", borderBottom: "1px solid var(--structure-border)", textAlign: "right", color: fee.term_fee_remaining > 0 ? "var(--status-pending-text)" : "inherit" }}>₹{fee.term_fee_remaining.toLocaleString("en-IN")}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: "6px 8px", fontWeight: "600" }}>Daycare Fee</td>
                        <td className="mono-data" style={{ padding: "6px 8px", textAlign: "right" }}>₹{fee.daycare_fee.toLocaleString("en-IN")}</td>
                        <td className="mono-data" style={{ padding: "6px 8px", textAlign: "right", color: "var(--status-paid-text)" }}>₹{fee.daycare_fee_paid.toLocaleString("en-IN")}</td>
                        <td className="mono-data" style={{ padding: "6px 8px", textAlign: "right", color: fee.daycare_fee_remaining > 0 ? "var(--status-pending-text)" : "inherit" }}>₹{fee.daycare_fee_remaining.toLocaleString("en-IN")}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Progress visual bar */}
              <div style={{ marginBottom: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--warm-muted)", marginBottom: "0.35rem", fontWeight: "600" }}>
                  <span>Payment Progress</span>
                  <span>
                    {fee.total_fee > 0 ? Math.round((fee.paid_amount / fee.total_fee) * 100) : 0}% Paid
                  </span>
                </div>
                <div className="progress-bar-container">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${fee.total_fee > 0 ? (fee.paid_amount / fee.total_fee) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "13px", marginTop: "1rem" }}>
                <span>Account Status:</span>
                <span className={`badge ${fee.status === "Paid" ? "badge-paid" : fee.status === "Overdue" ? "badge-overdue" : "badge-pending"}`}>
                  {fee.status}
                </span>
              </div>
            </div>
          ) : (
            <div style={{ color: "var(--warm-muted)", fontSize: "14px", padding: "1rem", textAlign: "center" }}>
              No billing ledger attached to this student.
            </div>
          )}
        </div>
      </div>

      {/* Grid: Installment Timeline & Audited Receipts */}
      <div className="grid-2">
        {/* Installments vertical timeline */}
        <div className="card">
          <div className="card-title">
            <span>Installment Schedules</span>
          </div>
          <div className="timeline">
            {student.installments && student.installments.length > 0 ? (
              student.installments.map(inst => (
                <div className="timeline-item" key={inst.installment_id}>
                  <div className={`timeline-marker ${inst.status === "paid" ? "active" : ""}`} />
                  <div className="timeline-content">
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: "700" }}>Installment #{inst.installment_number}</div>
                      <div style={{ fontSize: "12px", color: "var(--warm-muted)", marginTop: "0.25rem" }}>
                        Due Date: <span className="mono-data">{inst.due_date}</span>
                        {inst.payment_date && (
                          <>
                            {" "}| Paid: <span className="mono-data">{inst.payment_date}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem" }}>
                      <span className="mono-data" style={{ fontWeight: "700", fontSize: "14px" }}>
                        ₹{inst.amount.toLocaleString("en-IN")}
                      </span>
                      <span
                        className={`badge ${
                          inst.status === "paid" ? "badge-paid" : inst.status === "overdue" ? "badge-overdue" : "badge-info"
                        }`}
                        style={{ fontSize: "10px" }}
                      >
                        {inst.status === "paid" ? "Paid" : inst.status === "overdue" ? "Overdue" : "Pending"}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: "var(--warm-muted)", padding: "1rem" }}>
                No installments configured. Create some using the Splits button above.
              </div>
            )}
          </div>
        </div>

        {/* Student Receipts Log */}
        <div className="card">
          <div className="card-title">
            <span>Audited Transactions Log</span>
          </div>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Receipt No</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th style={{ textAlign: "right" }}>Download</th>
                </tr>
              </thead>
              <tbody>
                {student.receipts && student.receipts.length > 0 ? (
                  student.receipts.map(rec => (
                    <tr key={rec.receipt_id}>
                      <td className="mono-data" style={{ fontWeight: "600" }}>{rec.receipt_number}</td>
                      <td className="mono-data" style={{ fontWeight: "600" }}>₹{rec.amount_paid.toLocaleString("en-IN")}</td>
                      <td className="mono-data">{rec.payment_date}</td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: "0.25rem 0.5rem", fontSize: "12px", height: "auto" }}
                          onClick={() => handleReceiptDownload(rec)}
                        >
                          <Printer size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" style={{ textAlign: "center", color: "var(--warm-muted)", padding: "2rem" }}>
                      No payment transaction receipts recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
