import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { GraduationCap, Mail, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!email) {
      setErrorMsg("Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      const response = await resetPassword(email);
      setSuccessMsg(response.message || "Password recovery email has been sent successfully.");
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--canvas-cream)",
        padding: "1rem"
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "440px",
          padding: "2.5rem 2rem",
          boxShadow: "0 10px 25px rgba(42, 27, 20, 0.12)",
          borderRadius: "12px",
          border: "1px solid var(--structure-border)"
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              backgroundColor: "var(--sidebar-brown)",
              color: "#FFFFFF",
              marginBottom: "1rem"
            }}
          >
            <GraduationCap size={32} color="#F2E6B3" />
          </div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--academic-charcoal)" }}>
            Recover Password
          </h2>
          <p style={{ color: "var(--warm-muted)", fontSize: "14px", marginTop: "0.25rem" }}>
            Enter your email to receive recovery instructions.
          </p>
        </div>

        {errorMsg && (
          <div
            className="badge badge-overdue"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              width: "100%",
              padding: "0.75rem",
              borderRadius: "6px",
              marginBottom: "1.25rem",
              textTransform: "none",
              fontSize: "13px"
            }}
          >
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div
            className="badge badge-paid"
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "0.5rem",
              width: "100%",
              padding: "0.75rem",
              borderRadius: "6px",
              marginBottom: "1.25rem",
              textTransform: "none",
              fontSize: "13px",
              lineHeight: "1.4"
            }}
          >
            <CheckCircle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: "1.5rem" }}>
            <label className="form-label" htmlFor="recovery-email">
              Email Address
            </label>
            <div style={{ position: "relative" }}>
              <Mail
                size={16}
                color="var(--warm-muted)"
                style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}
              />
              <input
                id="recovery-email"
                type="email"
                className="form-control"
                placeholder="you@domain.com"
                style={{ paddingLeft: "36px" }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", padding: "0.75rem", fontSize: "14px" }}
            disabled={loading}
          >
            {loading ? "Sending link..." : "Send Recovery Instructions"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "1.5rem", borderTop: "1px solid var(--structure-border)", paddingTop: "1.25rem" }}>
          <Link
            to="/login"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "13px",
              fontWeight: "600",
              color: "var(--sidebar-brown)"
            }}
          >
            <ArrowLeft size={14} />
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
