import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

export default function Login() {
  const { login, isAuthenticated, loading, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;

  if (isAuthenticated) {
    return (
      <Navigate
        to={user.role === "super_admin" ? "/admin" : "/organization"}
        replace
      />
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const { user: loggedInUser } = await login(email, password);
      navigate(
        loggedInUser.role === "super_admin" ? "/admin" : "/organization",
        { replace: true },
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-panel">
        <div className="login-brand">
          <div className="login-logo">
            <img src="/fdx-logo.png" alt="FDX" />
          </div>
          <p>Private event photo delivery, powered by face intelligence</p>
        </div>

        <form className="login-card card" onSubmit={handleSubmit}>
          <h1>Sign in</h1>
          <p className="login-sub">
            One secure login for FDX and organization administrators.
          </p>

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@organization.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          {error ? (
            <p className="login-error" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            className="btn primary login-submit"
            disabled={submitting}
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>

          <Link to="/forgot-password" className="text-link">
            Forgot password?
          </Link>
        </form>
      </div>
    </div>
  );
}
