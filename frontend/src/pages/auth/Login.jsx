import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { GraduationCap, Lock, Mail, User, Info } from "lucide-react";

export default function Login() {
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const [isSignup, setIsSignup] = useState(false);
  const [role, setRole] = useState("admin"); // 'admin' or 'parent'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!email || !password) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }

    if (isSignup) {
      if (password !== confirmPassword) {
        setErrorMsg("Passwords do not match.");
        return;
      }
      if (password.length < 6) {
        setErrorMsg("Password must be at least 6 characters.");
        return;
      }
    }

    setLoading(false);
    try {
      if (isSignup) {
        setLoading(true);
        await signup(email, password);
        setSuccessMsg("Account registered successfully! Redirecting...");
        setTimeout(() => navigate("/parent/dashboard"), 1500);
      } else {
        setLoading(true);
        const user = await login(email, password, role);
        if (user.role === "admin") {
          navigate("/admin/dashboard");
        } else {
          navigate("/parent/dashboard");
        }
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoCredentials = (selectedRole) => {
    setRole(selectedRole);
    if (selectedRole === "admin") {
      setEmail("admin@school.com");
      setPassword("admin123");
    } else {
      setEmail("parent@family.com");
      setPassword("parent123");
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
        {/* Header Branding */}
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
          <h2 style={{ fontSize: "1.75rem", fontWeight: "700", color: "var(--academic-charcoal)" }}>
            Fees & Receipt Portal
          </h2>
          <p style={{ color: "var(--warm-muted)", fontSize: "14px", marginTop: "0.25rem" }}>
            FirstCry Intellitots
          </p>
        </div>

        {/* Action Type Toggle */}
        {!isSignup && (
          <div
            className="tabs-container"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              borderBottom: "none",
              backgroundColor: "rgba(75, 46, 33, 0.05)",
              borderRadius: "6px",
              padding: "4px",
              marginBottom: "1.5rem"
            }}
          >
            <button
              type="button"
              className={`tab ${role === "admin" ? "active" : ""}`}
              style={{
                textAlign: "center",
                padding: "0.5rem",
                borderRadius: "4px",
                borderBottom: "none",
                fontSize: "13px",
                fontWeight: "600",
                backgroundColor: role === "admin" ? "var(--sidebar-brown)" : "transparent",
                color: role === "admin" ? "#FFFFFF" : "var(--warm-muted)"
              }}
              onClick={() => {
                setRole("admin");
                setErrorMsg("");
              }}
            >
              Administrator
            </button>
            <button
              type="button"
              className={`tab ${role === "parent" ? "active" : ""}`}
              style={{
                textAlign: "center",
                padding: "0.5rem",
                borderRadius: "4px",
                borderBottom: "none",
                fontSize: "13px",
                fontWeight: "600",
                backgroundColor: role === "parent" ? "var(--sidebar-brown)" : "transparent",
                color: role === "parent" ? "#FFFFFF" : "var(--warm-muted)"
              }}
              onClick={() => {
                setRole("parent");
                setErrorMsg("");
              }}
            >
              Parent Portal
            </button>
          </div>
        )}

        {/* Status Alerts */}
        {errorMsg && (
          <div
            className="badge badge-overdue"
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
              fontWeight: "500",
              lineHeight: "1.4"
            }}
          >
            <Info size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
            <span>{errorMsg}</span>
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
              padding: "0.75rem",
              borderRadius: "6px",
              marginBottom: "1.25rem",
              textTransform: "none",
              fontSize: "13px"
            }}
          >
            <Info size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Input Forms */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email-input">
              Email Address
            </label>
            <div style={{ position: "relative" }}>
              <Mail
                size={16}
                color="var(--warm-muted)"
                style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}
              />
              <input
                id="email-input"
                type="email"
                className="form-control"
                placeholder="you@domain.com"
                style={{ paddingLeft: "36px" }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password-input">
              Password
            </label>
            <div style={{ position: "relative" }}>
              <Lock
                size={16}
                color="var(--warm-muted)"
                style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}
              />
              <input
                id="password-input"
                type="password"
                className="form-control"
                placeholder="••••••••"
                style={{ paddingLeft: "36px" }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {isSignup && (
            <div className="form-group">
              <label className="form-label" htmlFor="confirm-password-input">
                Confirm Password
              </label>
              <div style={{ position: "relative" }}>
                <Lock
                  size={16}
                  color="var(--warm-muted)"
                  style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}
                />
                <input
                  id="confirm-password-input"
                  type="password"
                  className="form-control"
                  placeholder="••••••••"
                  style={{ paddingLeft: "36px" }}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {!isSignup && (
            <div style={{ textAlign: "right", marginBottom: "1.25rem" }}>
              <Link
                to="/forgot-password"
                style={{ fontSize: "13px", fontWeight: "600", color: "var(--sidebar-brown)" }}
              >
                Forgot Password?
              </Link>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", padding: "0.75rem", fontSize: "14px", marginTop: "0.5rem" }}
            disabled={loading}
          >
            {loading ? "Authenticating Session..." : isSignup ? "Create Parent Account" : "Access Portal"}
          </button>
        </form>

        {/* Switch Action Links */}
        <div style={{ textAlign: "center", marginTop: "1.5rem", borderTop: "1px solid var(--structure-border)", paddingTop: "1.25rem" }}>
          {isSignup ? (
            <p style={{ fontSize: "13px", color: "var(--warm-muted)" }}>
              Already registered?{" "}
              <button
                type="button"
                style={{
                  border: "none",
                  background: "none",
                  fontWeight: "700",
                  color: "var(--sidebar-brown)",
                  cursor: "pointer"
                }}
                onClick={() => {
                  setIsSignup(false);
                  setErrorMsg("");
                }}
              >
                Sign In
              </button>
            </p>
          ) : (
            <>
              {role === "parent" && (
                <p style={{ fontSize: "13px", color: "var(--warm-muted)", marginBottom: "0.75rem" }}>
                  First time visiting?{" "}
                  <button
                    type="button"
                    style={{
                      border: "none",
                      background: "none",
                      fontWeight: "700",
                      color: "var(--sidebar-brown)",
                      cursor: "pointer"
                    }}
                    onClick={() => {
                      setIsSignup(true);
                      setErrorMsg("");
                    }}
                  >
                    Create Account
                  </button>
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
