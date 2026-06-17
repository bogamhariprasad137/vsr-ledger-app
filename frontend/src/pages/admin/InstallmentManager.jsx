import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api } from "../../services/api";
import { ArrowLeft, Plus, Trash2, ShieldCheck, ShieldAlert, CheckCircle, Info, Lock } from "lucide-react";

export default function InstallmentManager() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [installments, setInstallments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    try {
      const data = await api.students.getById(id);
      setStudent(data);
      // Create local deep copy of installments for editing
      const insts = data.installments.map(i => ({ ...i }));
      setInstallments(insts);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleRowChange = (index, field, value) => {
    const updated = [...installments];
    updated[index][field] = value;
    setInstallments(updated);
  };

  const handleAddRow = () => {
    // Determine next installment number
    const nextNum = installments.length > 0 ? Math.max(...installments.map(i => i.installment_number)) + 1 : 1;
    // Base amount is remainder of unpaid portion
    const feeTotal = student?.feeDetails?.total_fee || 0;
    const currentSum = installments.reduce((acc, row) => acc + parseFloat(row.amount || 0), 0);
    const remainder = Math.max(0, feeTotal - currentSum);

    const newRow = {
      installment_id: `temp-${Date.now()}`, // Temporary ID
      fee_id: student.feeDetails.fee_id,
      installment_number: nextNum,
      amount: remainder.toFixed(2),
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      payment_date: null,
      status: "unpaid"
    };

    setInstallments([...installments, newRow]);
  };

  const handleRemoveRow = (index) => {
    const row = installments[index];
    if (row.status === "paid") {
      setErrorMsg("Violation: Paid installments are locked and cannot be deleted.");
      return;
    }
    const updated = [...installments];
    updated.splice(index, 1);
    
    // Re-sequence installment numbers
    const sequenced = updated.map((item, idx) => ({
      ...item,
      installment_number: idx + 1
    }));
    
    setInstallments(sequenced);
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      // API save will execute checking assertions
      await api.installments.save(student.feeDetails.fee_id, installments);
      setSuccessMsg("Installment schedules saved successfully.");
      setTimeout(() => {
        navigate(`/admin/students/${student.student_id}`);
        setIsSaving(false);
      }, 500);
    } catch (err) {
      setErrorMsg(err.message);
      setIsSaving(false);
    }
  };

  // Math validations
  const totalFee = student?.feeDetails?.total_fee || 0;
  const currentSum = installments.reduce((acc, row) => acc + parseFloat(row.amount || 0), 0);
  const diff = Math.abs(currentSum - totalFee);
  const isValidSum = diff < 0.01;

  if (loading) {
    return (
      <div className="content-pane" style={{ textAlign: "center", paddingTop: "5rem" }}>
        <div style={{ fontSize: "16px", fontWeight: "600", color: "var(--sidebar-brown)" }}>
          Loading schedules planner...
        </div>
      </div>
    );
  }

  return (
    <div className="content-pane">
      {/* Navigation Header */}
      <div style={{ marginBottom: "2rem" }}>
        <Link
          to={`/admin/students/${student?.student_id}`}
          className="btn btn-secondary"
          style={{ marginBottom: "1rem", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
        >
          <ArrowLeft size={16} />
          <span>Back to Profile</span>
        </Link>
        <div>
          <h1 style={{ fontSize: "1.75rem", marginBottom: "0.25rem" }}>Configure Installment Splits</h1>
          <p style={{ color: "var(--warm-muted)", fontSize: "14px" }}>
            Student: <strong>{student?.student_name}</strong> | Total Fee: <strong className="mono-data">₹{totalFee.toLocaleString("en-IN")}</strong>
          </p>
        </div>
      </div>

      {/* Global Alerts */}
      {errorMsg && (
        <div
          className="badge badge-overdue"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            width: "100%",
            padding: "1rem",
            borderRadius: "6px",
            marginBottom: "1.5rem",
            textTransform: "none",
            fontSize: "13px"
          }}
        >
          <ShieldAlert size={16} />
          <div>{errorMsg}</div>
        </div>
      )}

      {successMsg && (
        <div
          className="badge badge-paid"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            width: "100%",
            padding: "1rem",
            borderRadius: "6px",
            marginBottom: "1.5rem",
            textTransform: "none",
            fontSize: "13px"
          }}
        >
          <CheckCircle size={16} />
          <div>{successMsg}</div>
        </div>
      )}

      {/* Splitter Grid Card */}
      <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {isValidSum ? (
              <div
                className="badge badge-paid"
                style={{ display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.35rem 0.75rem" }}
              >
                <ShieldCheck size={14} />
                <span>Balances Equal</span>
              </div>
            ) : (
              <div
                className="badge badge-overdue"
                style={{ display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.35rem 0.75rem" }}
              >
                <ShieldAlert size={14} />
                <span>Math Imbalance</span>
              </div>
            )}
            <span style={{ fontSize: "13px", color: "var(--warm-muted)", fontWeight: "600" }}>
              Total Allocated: <span className="mono-data" style={{ color: isValidSum ? "var(--status-paid-text)" : "var(--status-overdue-text)" }}>₹{currentSum.toLocaleString("en-IN")}</span>
            </span>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleAddRow}
            style={{ display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.5rem 0.75rem", fontSize: "13px" }}
          >
            <Plus size={14} />
            <span>Add Splitting Term</span>
          </button>
        </div>

        {/* Input Table */}
        <div className="table-responsive">
          <table className="table" style={{ borderBottom: "none" }}>
            <thead>
              <tr>
                <th style={{ width: "80px" }}>No.</th>
                <th>Installment Amount (₹)</th>
                <th>Payment Due Date</th>
                <th style={{ width: "120px" }}>Status</th>
                <th style={{ width: "100px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {installments.map((row, index) => {
                const isPaid = row.status === "paid";
                return (
                  <tr key={row.installment_id} style={{ backgroundColor: isPaid ? "#F9FAFB" : "transparent" }}>
                    <td className="mono-data" style={{ fontWeight: "700", verticalAlign: "middle" }}>
                      #{row.installment_number}
                    </td>
                    <td>
                      <div style={{ position: "relative" }}>
                        {isPaid && (
                          <Lock
                            size={12}
                            color="var(--warm-muted)"
                            style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }}
                          />
                        )}
                        <input
                          type="number"
                          className="form-control mono-data"
                          style={{ paddingLeft: isPaid ? "28px" : "10px", maxWidth: "200px" }}
                          value={row.amount}
                          onChange={(e) => handleRowChange(index, "amount", e.target.value)}
                          disabled={isPaid}
                          required
                        />
                      </div>
                    </td>
                    <td>
                      <input
                        type="date"
                        className="form-control mono-data"
                        style={{ maxWidth: "220px" }}
                        value={row.due_date}
                        onChange={(e) => handleRowChange(index, "due_date", e.target.value)}
                        disabled={isPaid}
                        required
                      />
                    </td>
                    <td style={{ verticalAlign: "middle" }}>
                      <span
                        className={`badge ${
                          isPaid ? "badge-paid" : row.status === "overdue" ? "badge-overdue" : "badge-info"
                        }`}
                        style={{ fontSize: "11px", fontWeight: "700" }}
                      >
                        {isPaid ? "Paid" : row.status === "overdue" ? "Overdue" : "Pending"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right", verticalAlign: "middle" }}>
                      <button
                        type="button"
                        className="btn btn-danger"
                        style={{ padding: "0.35rem", height: "auto" }}
                        onClick={() => handleRemoveRow(index)}
                        disabled={isPaid}
                        title={isPaid ? "Paid installments are locked" : "Remove Installment Term"}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Warnings & Submission Details */}
      {!isValidSum && (
        <div
          className="badge badge-overdue"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            width: "100%",
            padding: "1rem",
            borderRadius: "6px",
            marginBottom: "1.5rem",
            textTransform: "none",
            fontSize: "13px"
          }}
        >
          <Info size={16} />
          <span>
            The sum of all installments must equal the Student Total Fee account of ₹{totalFee.toLocaleString("en-IN")}. Currently off by:{" "}
            <strong>₹{(totalFee - currentSum).toLocaleString("en-IN")}</strong>.
          </span>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
        <Link to={`/admin/students/${student?.student_id}`} className="btn btn-secondary">
          Discard Changes
        </Link>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={!isValidSum || isSaving}
          style={{ minWidth: "160px" }}
        >
          {isSaving ? "Saving..." : "Confirm Splitting config"}
        </button>
      </div>
    </div>
  );
}
