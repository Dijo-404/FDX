import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    const response = await fetch("/api/v2/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload?.error?.message ?? "Password reset failed.");
      return;
    }
    navigate("/login", { replace: true });
  }

  return (
    <div className="public-shell">
      <form className="login-card card" onSubmit={submit}>
        <span className="login-mark">FDX</span>
        <div>
          <p className="eyebrow">Secure reset</p>
          <h1>Choose a new password</h1>
        </div>
        <div className="field">
          <label htmlFor="new-password">New password</label>
          <input
            id="new-password"
            type="password"
            minLength="10"
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="confirm-password">Confirm password</label>
          <input
            id="confirm-password"
            type="password"
            minLength="10"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
          />
        </div>
        {error ? (
          <p className="login-error" role="alert">
            {error}
          </p>
        ) : null}
        <button className="btn primary">Reset password</button>
        <Link to="/login" className="text-link">
          Cancel
        </Link>
      </form>
    </div>
  );
}
