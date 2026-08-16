import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
export default function AcceptInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { setAuthenticatedSession } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  async function submit(event) {
    event.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/v2/auth/invitations/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(
          payload?.error?.message || "Invitation could not be accepted",
        );
      setAuthenticatedSession(payload);
      const user = payload?.data?.user ?? payload?.user;
      navigate(
        user?.role === "collaborator" ? "/collaborator" : "/organization",
        {
          replace: true,
        },
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <div className="public-shell">
      <form className="login-card public-auth-card card" onSubmit={submit}>
        <span className="login-mark">FDX</span>
        <div>
          <p className="eyebrow">Secure invitation</p>
          <h1>Create your password</h1>
          <p className="login-sub">Activate your invited FDX account.</p>
        </div>
        <div className="field">
          <label htmlFor="invite-password">New password</label>
          <input
            id="invite-password"
            type="password"
            minLength="10"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="invite-password-confirmation">Confirm password</label>
          <input
            id="invite-password-confirmation"
            type="password"
            minLength="10"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        {error ? (
          <p className="login-error" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className="btn primary" disabled={submitting}>
          {submitting ? "Activating…" : "Activate account"}
        </button>
        <Link to="/login" className="text-link">
          Back to sign in
        </Link>
      </form>
    </div>
  );
}
