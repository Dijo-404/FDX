import { useState } from "react";
import { Link } from "react-router-dom";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/v2/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(
        payload?.error?.message ?? "Password reset could not be requested.",
      );
      return;
    }
    setMessage(payload.data.message);
  }

  return (
    <div className="public-shell">
      <form className="login-card public-auth-card card" onSubmit={submit}>
        <span className="login-mark">FDX</span>
        <div>
          <p className="eyebrow">Account recovery</p>
          <h1>Reset password</h1>
          <p className="login-sub">
            Enter your account email to receive a secure reset link.
          </p>
        </div>
        <div className="field">
          <label htmlFor="reset-email">Email</label>
          <input
            id="reset-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        {message ? (
          <p className="success-text" role="status">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="login-error" role="alert">
            {error}
          </p>
        ) : null}
        <button className="btn primary">Send reset link</button>
        <Link to="/login" className="text-link">
          Back to sign in
        </Link>
      </form>
    </div>
  );
}
