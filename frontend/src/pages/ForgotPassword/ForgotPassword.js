import "bootstrap/dist/css/bootstrap.min.css";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import "../Login/Login.css";
import authService from "../../services/authService";
import logo from "../../assets/images/logo.png";
import leftImage from "../../assets/images/img-2.avif";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await authService.forgotPassword(email);
      setMessage(res?.data?.message || "If an account exists for that email, a reset link has been sent.");
      setSubmitted(true);
    } catch (err) {
      setMessage(err?.response?.data?.message || "Something went wrong. Please try again.");
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

          <h2 className="title">Forgot your password?</h2>
          <p className="subtitle">
            Enter your email and we'll send a reset link valid for 30 minutes.
          </p>

          {!submitted && (
            <form onSubmit={handleSubmit} className="login-form">
              <div className="field">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder=" "
                />
                <label>Email address</label>
              </div>

              <button className="btn-primary pulse" type="submit" disabled={loading}>
                {loading ? "Sending..." : "Send reset link"}
              </button>
            </form>
          )}

          {message && <div className="message">{message}</div>}

          {submitted && (
            <small style={{ display: "block", marginTop: "12px", opacity: 0.75 }}>
              If you don't see it within a minute, please check your <strong>Spam</strong> or <strong>Promotions</strong> folder.
            </small>
          )}

          <div className="row-between" style={{ marginTop: "1rem" }}>
            <Link className="linklike" to="/login">Back to login</Link>
            <Link className="linklike" to="/signup">Sign up</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
