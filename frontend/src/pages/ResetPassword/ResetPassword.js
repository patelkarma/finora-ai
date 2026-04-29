import "bootstrap/dist/css/bootstrap.min.css";
import React, { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import "../Login/Login.css";
import authService from "../../services/authService";
import logo from "../../assets/images/logo.png";
import leftImage from "../../assets/images/img-2.avif";

const PASSWORD_POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/;

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (!token) {
      setMessage("Reset link is missing or invalid. Please request a new one.");
      return;
    }
    if (password !== confirm) {
      setMessage("Passwords do not match.");
      return;
    }
    if (!PASSWORD_POLICY.test(password)) {
      setMessage("Password must be 8+ characters with uppercase, lowercase, digit and special character.");
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword(token, password);
      setMessage("Password updated. Redirecting to login...");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setMessage(err?.response?.data?.message || "Could not reset password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-layout">
      <div className="branding-panel" style={{ backgroundImage: `url(${leftImage})` }} />

      <div className="form-panel">
        <div className="glass-card animated-card">
          <div className="logo-wrap">
            <img src={logo} alt="logo" className="logo" />
          </div>

          <h2 className="title">Choose a new password</h2>
          <p className="subtitle">
            Use 8+ characters, with uppercase, lowercase, digit and special character.
          </p>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="field">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=" "
              />
              <label>New password</label>
            </div>

            <div className="field">
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder=" "
              />
              <label>Confirm new password</label>
            </div>

            <button className="btn-primary pulse" type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update password"}
            </button>
          </form>

          {message && <div className="message">{message}</div>}

          <div className="row-between" style={{ marginTop: "1rem" }}>
            <Link className="linklike" to="/login">Back to login</Link>
            <Link className="linklike" to="/forgot-password">Request a new link</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
