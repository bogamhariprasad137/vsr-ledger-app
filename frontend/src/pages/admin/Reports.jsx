import { useState } from "react";
import { FileText, Download, BarChart3, TrendingUp, Calendar, AlertTriangle, AlertCircle, CheckCircle } from "lucide-react";
import { api } from "../../services/api";

export default function Reports() {
  const [downloading, setDownloading] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [downloadSuccess, setDownloadSuccess] = useState("");

  const triggerDownload = async (type, filename) => {
    setDownloading(type);
    setDownloadError("");
    setDownloadSuccess("");
    try {
      await api.reports.download(type, filename);
      setDownloadSuccess(`${filename} downloaded successfully!`);
      setTimeout(() => setDownloadSuccess(""), 3000);
    } catch (err) {
      setDownloadError(`Failed to download report: ${err.message}`);
      setTimeout(() => setDownloadError(""), 5000);
    } finally {
      setDownloading("");
    }
  };

  return (
    <div className="content-pane">
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.75rem", marginBottom: "0.25rem" }}>System Reports</h1>
        <p style={{ color: "var(--warm-muted)", fontSize: "14px" }}>
          Generate and download PDF reports for billing summaries and transaction audits.
        </p>
      </div>

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

      <div className="grid-2">
        {/* Available Reports list */}
        <div className="card">
          <div className="card-title">
            <span>Billing Reports (PDF)</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div
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
                <div style={{ fontWeight: "700", fontSize: "14px" }}>Overall Collections Ledger</div>
                <div style={{ fontSize: "12px", color: "var(--warm-muted)", marginTop: "0.25rem" }}>
                  Detailed summary of total paid fees, pending allocations, and cash flows.
                </div>
              </div>
              <button
                className="btn btn-primary"
                style={{ fontSize: "12px", padding: "0.5rem 0.75rem" }}
                disabled={downloading !== ""}
                onClick={() => triggerDownload("collections", "Overall_Collections_Ledger_2026.pdf")}
              >
                <Download size={14} />
                <span>{downloading === "collections" ? "Generating..." : "Download PDF"}</span>
              </button>
            </div>

            <div
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
                <div style={{ fontWeight: "700", fontSize: "14px" }}>Arrears & Overdue Report</div>
                <div style={{ fontSize: "12px", color: "var(--warm-muted)", marginTop: "0.25rem" }}>
                  List of students with outstanding balances past the scheduled due date.
                </div>
              </div>
              <button
                className="btn btn-danger"
                style={{ fontSize: "12px", padding: "0.5rem 0.75rem" }}
                disabled={downloading !== ""}
                onClick={() => triggerDownload("arrears", "Overdue_Arrears_Report_2026.pdf")}
              >
                <Download size={14} />
                <span>{downloading === "arrears" ? "Generating..." : "Download PDF"}</span>
              </button>
            </div>

            <div
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
                <div style={{ fontWeight: "700", fontSize: "14px" }}>Student Roster Metadata</div>
                <div style={{ fontSize: "12px", color: "var(--warm-muted)", marginTop: "0.25rem" }}>
                  Export containing classes, guardian details, and active enrollment statuses.
                </div>
              </div>
              <button
                className="btn btn-primary"
                style={{ fontSize: "12px", padding: "0.5rem 0.75rem" }}
                disabled={downloading !== ""}
                onClick={() => triggerDownload("roster", "Student_Roster_Metadata_2026.pdf")}
              >
                <Download size={14} />
                <span>{downloading === "roster" ? "Generating..." : "Download PDF"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Analytics Card */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="card-title">
            <span>Audit Statistics Summary</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <TrendingUp size={20} color="var(--status-paid-text)" />
              <div>
                <div style={{ fontSize: "11px", color: "var(--warm-muted)", textTransform: "uppercase", fontWeight: "700" }}>Monthly Increase</div>
                <div style={{ fontWeight: "600", fontSize: "14px" }}>+12% Collection Velocity vs last Term</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <Calendar size={20} color="var(--status-info-text)" />
              <div>
                <div style={{ fontSize: "11px", color: "var(--warm-muted)", textTransform: "uppercase", fontWeight: "700" }}>Next Collection Milestone</div>
                <div style={{ fontWeight: "600", fontSize: "14px" }}>June 15, 2026 (Grade 5 Term 2 Installment)</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <AlertTriangle size={20} color="var(--status-pending-text)" />
              <div>
                <div style={{ fontSize: "11px", color: "var(--warm-muted)", textTransform: "uppercase", fontWeight: "700" }}>Auto-pay Failure Flag</div>
                <div style={{ fontWeight: "600", fontSize: "14px" }}>3 Guardian Card Accounts Awaiting Inquiries</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
