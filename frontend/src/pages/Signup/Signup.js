import "bootstrap/dist/css/bootstrap.min.css";
import React, { useState, useContext, useEffect } from "react";
import "./Signup.css";
import api from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import logo from "../../assets/images/logo.png";
import { FaArrowLeft } from "react-icons/fa";
import leftImage from "../../assets/images/img-2.avif";

const Signup = () => {
  const { login } = useContext(AuthContext);

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
  const [message, setMessage] = useState(null);

  useEffect(() => {
    setOtpVerified(false);
    setOtp("");
  }, [email]);


  const validateStep = () => {
    if (step === 1) {
      if (!name || !email) {
        setMessage("Please fill required fields.");
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
      window.location.href = "/enter-salary";
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data ||
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
    setLoading(true);
    try {
      const payload = email ? { email } : { phone };
      await api.post("/auth/request-otp", payload);
      setMessage("OTP sent. Check your inbox / phone.");
    } catch (err) {
      setMessage(err?.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setMessage(null);
    if (!email) {
      setMessage("Please enter email before requesting OTP.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/verify-otp", { email, code: otp });
      setOtpVerified(true);
      setMessage("Email verified successfully ✅");
    } catch (err) {
      setMessage(err?.response?.data?.message || "Invalid OTP");
    } finally {
      setLoading(false);
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
                <button type="button" className="btn-primary" onClick={handleRequestOtpMobile}>
                  Send OTP (email)
                </button>

                <div className="field">
                  <input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder=" " />
                  <label>Enter OTP</label>
                </div>

                <button type="button" className="btn-primary" onClick={handleVerifyOtp}>
                  Verify OTP
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
