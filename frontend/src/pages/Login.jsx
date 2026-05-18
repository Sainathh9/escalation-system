import { useState } from "react";
import { apiFetch } from "../api/api";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!email || !password || (isRegistering && !name)) {
      setError("Please fill in all required fields.");
      return;
    }
    setLoading(true);
    setError("");

    if (isRegistering) {
      const res = await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });

      if (res.error) {
        setError(res.error);
        setLoading(false);
        return;
      }
      
      const loginRes = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (loginRes.error) {
        setError("Account created, but could not auto-login. Please sign in.");
        setIsRegistering(false);
        setLoading(false);
        return;
      }

      if (loginRes.token) {
        login(loginRes.token, loginRes.user);
      }
    } else {
      const res = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (res.error) {
        setError(res.error);
        setLoading(false);
        return;
      }

      if (res.token) {
        login(res.token, res.user);
      }
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">IF</div>
          <span className="login-logo-text">IncidentFlow</span>
        </div>

        <h1 className="login-title">
          {isRegistering ? "Create an account" : "Welcome back"}
        </h1>
        <p className="login-subtitle">
          {isRegistering
            ? "Sign up to start tracking incidents"
            : "Sign in to your account to continue"}
        </p>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleAuth}>
          {isRegistering && (
            <div className="form-group">
              <label className="form-label" htmlFor="login-name">
                Full Name
              </label>
              <input
                id="login-name"
                className="form-input"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus={isRegistering}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
              className="form-input"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus={!isRegistering}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">
              Password
            </label>
            <input
              id="login-password"
              className="form-input"
              type="password"
              placeholder={isRegistering ? "Create a strong password" : "Enter your password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary login-btn"
            disabled={loading}
            id="login-submit-btn"
            style={{ marginTop: "8px" }}
          >
            {loading
              ? isRegistering
                ? "Creating account..."
                : "Signing in..."
              : isRegistering
              ? "Sign Up"
              : "Sign In"}
          </button>
        </form>

        <div style={{ marginTop: "16px", textAlign: "center", fontSize: "13px", color: "var(--text-tertiary)" }}>
          {isRegistering ? (
            <>
              Already have an account?{" "}
              <button
                type="button"
                className="btn-link"
                style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontWeight: "500", padding: 0 }}
                onClick={() => {
                  setIsRegistering(false);
                  setError("");
                }}
              >
                Sign In
              </button>
            </>
          ) : (
            <>
              Don't have an account?{" "}
              <button
                type="button"
                className="btn-link"
                style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontWeight: "500", padding: 0 }}
                onClick={() => {
                  setIsRegistering(true);
                  setError("");
                }}
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
