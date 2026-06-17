import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { Printer, CalendarDays, Wallet, AlertCircle, CheckCircle } from "lucide-react";

export default function ParentHistory() {
  const { activeStudent } = useAuth();
  const [downloadingReceiptId, setDownloadingReceiptId] = useState(null);
  const [downloadError, setDownloadError] = useState("");
  const [downloadSuccess, setDownloadSuccess] = useState("");

  if (!activeStudent) return null;

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

  const receipts = activeStudent.receipts || [];

  return (
    <div className="content-pane">
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.75rem", marginBottom: "0.25rem" }}>Payment Ledger</h1>
        <p style={{ color: "var(--warm-muted)", fontSize: "14px" }}>
          Historical overview of all completed fee transactions.
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

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th style={{ textAlign: "center" }}>Installment</th>
                <th>Category</th>
                <th>Payment Date</th>
                <th style={{ textAlign: "right" }}>Amount Paid</th>
                <th style={{ textAlign: "right" }}>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {receipts.length > 0 ? (
                receipts.map(rec => (
                  <tr key={rec.receipt_id}>
                    <td style={{ fontWeight: "600" }}>{activeStudent.student_name}</td>
                    <td style={{ textAlign: "center" }} className="mono-data">#{rec.installment_number || 1}</td>
                    <td>
                      <span className="badge badge-info" style={{ fontSize: "11px", textTransform: "none" }}>
                        {rec.fee_category || "General Fee"}
                      </span>
                    </td>
                    <td className="mono-data">{rec.payment_date}</td>
                    <td className="mono-data" style={{ fontWeight: "700", color: "var(--status-paid-text)", textAlign: "right" }}>
                      ₹{Number(rec.amount_paid).toFixed(2)}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: "0.25rem 0.5rem", fontSize: "12px", height: "auto", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                        onClick={() => handleReceiptDownload(rec)}
                        title="Download Invoice"
                        disabled={downloadingReceiptId === rec.receipt_id}
                      >
                        {downloadingReceiptId === rec.receipt_id ? (
                          <div style={{ width: "14px", height: "14px", border: "2px solid #ccc", borderTopColor: "#333", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                        ) : (
                          <Printer size={14} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", color: "var(--warm-muted)", padding: "2.5rem" }}>
                    No payment history entries found for the selected child.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
