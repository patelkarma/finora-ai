import "bootstrap/dist/css/bootstrap.min.css";
import React, { useState, useContext, useEffect } from "react";
import "./Signup.css";
import api from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import logo from "../../assets/images/logo.png";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import leftImage from "../../assets/images/img-2.avif";

const Signup = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [step, setStep] = useState(1);

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [captcha, setCaptcha] = useState("");

  const [otp, setOtp] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);

  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    setOtpVerified(false);
    setOtp("");
  }, [email]);


  // Mirror of server-side StrongPasswordValidator regex.
  // Keep these two in sync if the policy changes.
  const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/;

  const validateStep = () => {
    if (step === 1) {
      if (!name || !email) {
        setMessage("Please fill required fields.");
        return false;
      }
      if (name.trim().length < 2) {
        setMessage("Name must be at least 2 characters.");
        return false;
      }
    }
    if (step === 2) {
      if (!password || !confirmPassword) {
        setMessage("Please fill password fields.");
        return false;
      }
      if (password !== confirmPassword) {
        setMessage("Passwords do not match.");
        return false;
      }
      if (!STRONG_PASSWORD.test(password)) {
        setMessage(
          "Password must be 8–128 characters and include an uppercase letter, a lowercase letter, a number, and a special character."
        );
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (!validateStep()) return;
    setMessage(null);
    setStep(step + 1);
  };

  const prevStep = () => {
    setMessage(null);
    setStep(step - 1);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (!otpVerified) {
      setMessage("Please verify OTP before creating account");
      return;
    }

    setLoading(true);
    try {
      const signupRes = await api.post("/auth/signup", {
        name,
        email,
        password,
        age: age || null,
        phone: phone || null,
      });

      if (signupRes.status !== 200) {
        throw new Error("Signup failed");
      }

      const loginRes = await api.post("/auth/login", { email, password });

      const token = loginRes.data.token;
      const user = loginRes.data.user;

      if (!token) throw new Error("Login failed after signup");

      login(user, token);
      navigate("/enter-salary");
    } catch (err) {
      // Server returns { message, fields: { fieldName: "reason" } } on
      // validation errors — surface the field reasons so the user can fix them.
      const data = err?.response?.data;
      const fieldErrors = data?.fields
        ? Object.entries(data.fields)
            .map(([field, reason]) => `${field}: ${reason}`)
            .join("\n")
        : null;
      const msg =
        fieldErrors ||
        data?.message ||
        (typeof data === "string" ? data : null) ||
        err.message ||
        "Signup failed";
      setMessage(msg);
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  // For smanuall signup and otp verification.
  const handleRequestOtpMobile = async () => {
    setMessage(null);
    if (!phone && !email) {
      setMessage("Enter phone or email to request OTP.");
      return;
    }
    setOtpLoading(true);
    try {
      const payload = email ? { email } : { phone };
      await api.post("/auth/request-otp", payload);
      setMessage("OTP sent. Check your inbox / phone.");
    } catch (err) {
      setMessage(err?.response?.data?.message || "Failed to send OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setMessage(null);
    if (!email) {
      setMessage("Please enter email before requesting OTP.");
      return;
    }
    setOtpLoading(true);
    try {
      await api.post("/auth/verify-otp", { email, code: otp });
      setOtpVerified(true);
      setMessage("Email verified successfully ✅");
    } catch (err) {
      setMessage(err?.response?.data?.message || "Invalid OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <div className="login-layout">

      {/* LEFT PANEL */}
      <div
        className="branding-panel"
        style={{ backgroundImage: `url(${leftImage})` }}
      > </div>

      {/* RIGHT PANEL */}
      <div className="form-panel">
        <div className="glass-card animated-card">

          {/* LOGO */}
          <div className="logo-wrap">
            <img src={logo} alt="logo" className="logo" />
          </div>

          {/* BACK BUTTON */}
          {step > 1 && (
            <button type="button" className="back-btn" onClick={prevStep}>
              <FaArrowLeft />
            </button>
          )}

          <h2 className="title">Sign Up To Finora AI</h2>
          <p className="subtitle">Step {step} of 3</p>

          <form onSubmit={handleSignup}>

            {/* STEP 1 */}
            {step === 1 && (
              <>
                <div className="field">
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder=" " />
                  <label>Name</label>
                </div>

                <div className="field">
                  <input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder=" " />
                  <label>Age</label>
                </div>

                <div className="field">
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder=" " />
                  <label>Mobile (optional)</label>
                </div>

                <div className="field">
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder=" " />
                  <label>Email Address</label>
                </div>

                <button type="button" className="btn-primary" onClick={nextStep}>
                  NEXT
                </button>
              </>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <>
                <div className="field">
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder=" " />
                  <label>Password</label>
                </div>
                <small style={{ display: "block", marginTop: "-8px", marginBottom: "12px", opacity: 0.75 }}>
                  Must be 8–128 chars and include an uppercase letter, a lowercase letter, a number, and a special character.
                </small>

                <div className="field">
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder=" " />
                  <label>Confirm Password</label>
                </div>

                <div className="field">
                  <input value={captcha} onChange={(e) => setCaptcha(e.target.value)} placeholder=" " />
                  <label>Captcha</label>
                </div>

                <div className="btn-row">
                  <button type="button" className="secondary-btn" onClick={prevStep}>
                    BACK
                  </button>
                  <button type="button" className="btn-primary" onClick={nextStep}>
                    NEXT
                  </button>
                </div>
              </>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <>
                <button type="button" className="btn-primary" disabled={otpLoading} onClick={handleRequestOtpMobile}>
                  {otpLoading ? "Sending OTP..." : "Send OTP (email)"}
                </button>

                <small style={{ display: "block", marginTop: "8px", marginBottom: "8px", opacity: 0.75 }}>
                  Didn't get the email? Check your <strong>Spam</strong> or <strong>Promotions</strong> folder — it can take up to a minute to arrive.
                </small>

                <div className="field">
                  <input
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                    placeholder=" "
                  />
                  <label>Enter OTP</label>
                </div>

                <button
                  type="button"
                  className="btn-primary"
                  disabled={otpLoading || otpVerified}
                  onClick={handleVerifyOtp}
                >
                  {otpVerified ? "✓ Verified" : otpLoading ? "Verifying..." : "Verify OTP"}
                </button>

                <button
                  type="submit"
                  className="btn-primary extra-top-padding"
                  disabled={loading}
                >
                  {loading ? "Creating account..." : "Create Account & Login"}
                </button>


              </>
            )}
          </form>

          {message && <div className="message">{message}</div>}

          <div className="divider"><span>OR</span></div>
          <div className="links">
            <a href="/login">Already have an account? Login</a>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Signup;
