import "bootstrap/dist/css/bootstrap.min.css";
import React, { useState, useContext, useEffect } from "react";
import "./Login.css";
import api from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import logo from "../../assets/images/logo.png";
import leftImage from "../../assets/images/img-2.avif";


const Login = () => {
  const { login } = useContext(AuthContext);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("oauth_email");
    if (saved) setEmail(saved);
  }, []);

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await api.post("/auth/login", { email, password });
      const token = res.data.token;
      const user = res.data.user;

      if (!token) throw new Error("No token returned");

      if (remember) localStorage.setItem("remember", "1");
      else localStorage.removeItem("remember");

      localStorage.removeItem("oauth_email");
      login(user, token);
      window.location.href = "/";
    } catch (err) {
      setMessage(err?.response?.data?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const backendBase = process.env.REACT_APP_API_URL.replace("/api", "");
    window.location.href = `${backendBase}/oauth2/authorization/google`;
  };


  return (
    <div className="login-layout">

      {/* LEFT BRANDING PANEL */}
      <div
        className="branding-panel"
        style={{ backgroundImage: `url(${leftImage})` }}
      > </div>

      {/* RIGHT FORM PANEL */}
      <div className="form-panel">
        <div className="glass-card animated-card">

          {/* Logo */}
          <div className="logo-wrap">
            <img src={logo} alt="logo" className="logo" />
          </div>

          <h2 className="title">Welcome Back To Finora AI</h2>
          <p className="subtitle">Login to your account</p>

          <form onSubmit={handlePasswordLogin} className="login-form">

            {/* Email */}
            <div className="field">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=" "
              />
              <label>Email Address</label>
            </div>

            {/* Password */}
            <div className="field">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=" "
              />
              <label>Password</label>
            </div>

            <div className="row-between">
              <label className="remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Remember me
              </label>

              <a className="linklike" href="/signup">Sign up</a>
            </div>

            <button className="btn-primary pulse" type="submit" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          {message && <div className="message">{message}</div>}

          <div className="divider"><span>OR</span></div>

          <button
            type="button"
            className="btn-primary google-btn"
            onClick={handleGoogleLogin}
          >
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
              alt="Google"
              className="google-icon"
            />
            Continue with Google
          </button>

        </div>
      </div>
    </div>
  );
};

export default Login;
