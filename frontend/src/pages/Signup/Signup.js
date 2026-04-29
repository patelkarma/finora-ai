import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Check } from 'lucide-react';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { AuthLayout } from '../../components/auth-layout';
import { AuthMessage } from '../../components/auth-message';
import { PasswordStrength } from '../../components/password-strength';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { cn } from '../../lib/utils';

const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/;

const stepVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 40 : -40,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
  },
  exit: (direction) => ({
    x: direction > 0 ? -40 : 40,
    opacity: 0,
    transition: { duration: 0.2 },
  }),
};

const Signup = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [otp, setOtp] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);

  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Reset OTP state if email is changed after verification
  useEffect(() => {
    setOtpVerified(false);
    setOtp('');
  }, [email]);

  const validateStep = () => {
    if (step === 1) {
      if (!name || !email) return setMessage('Please fill required fields.'), false;
      if (name.trim().length < 2) return setMessage('Name must be at least 2 characters.'), false;
    }
    if (step === 2) {
      if (!password || !confirmPassword) return setMessage('Please fill password fields.'), false;
      if (password !== confirmPassword) return setMessage('Passwords do not match.'), false;
      if (!STRONG_PASSWORD.test(password))
        return (
          setMessage('Password must meet all five criteria below.'),
          false
        );
    }
    return true;
  };

  const nextStep = () => {
    if (!validateStep()) return;
    setMessage(null);
    setDirection(1);
    setStep((s) => s + 1);
  };

  const prevStep = () => {
    setMessage(null);
    setDirection(-1);
    setStep((s) => s - 1);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (!otpVerified) {
      setMessage('Please verify OTP before creating account');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/signup', {
        name,
        email,
        password,
        age: age || null,
        phone: phone || null,
      });

      const loginRes = await api.post('/auth/login', { email, password });
      const token = loginRes.data.token;
      const user = loginRes.data.user;
      if (!token) throw new Error('Login failed after signup');

      login(user, token);
      navigate('/enter-salary');
    } catch (err) {
      const data = err?.response?.data;
      const fieldErrors = data?.fields
        ? Object.entries(data.fields)
            .map(([field, reason]) => `${field}: ${reason}`)
            .join('\n')
        : null;
      setMessage(fieldErrors || data?.message || err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async () => {
    setMessage(null);
    if (!email) {
      setMessage('Enter email to request OTP.');
      return;
    }
    setOtpLoading(true);
    try {
      await api.post('/auth/request-otp', { email });
      setMessage('OTP sent. Check your inbox (and Spam / Promotions).');
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Failed to send OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setMessage(null);
    setOtpLoading(true);
    try {
      await api.post('/auth/verify-otp', { email, code: otp });
      setOtpVerified(true);
      setMessage('Email verified successfully ✓');
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Invalid OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Smart finances, in three quick steps."
      step={`Step ${step} of 3`}
    >
      {/* Step indicator dots */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              s === step ? 'w-8 bg-primary' :
              s < step ? 'w-1.5 bg-primary/60' :
                         'w-1.5 bg-muted'
            )}
          />
        ))}
      </div>

      <div className="relative min-h-[280px]">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            <form onSubmit={handleSignup}>
              {step === 1 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Karma Patel"
                      autoComplete="name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="age">Age</Label>
                      <Input
                        id="age"
                        type="number"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder="20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Mobile <span className="text-muted-foreground font-normal">(optional)</span></Label>
                      <Input
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91…"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                  </div>
                  <Button type="button" variant="gradient" size="lg" className="w-full mt-2" onClick={nextStep}>
                    Continue
                  </Button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="new-password"
                    />
                    <PasswordStrength password={password} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm">Confirm password</Label>
                    <Input
                      id="confirm"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button type="button" variant="outline" size="lg" onClick={prevStep}>
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </Button>
                    <Button type="button" variant="gradient" size="lg" className="flex-1" onClick={nextStep}>
                      Continue
                    </Button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <Button
                    type="button"
                    variant={otpVerified ? 'outline' : 'gradient'}
                    size="lg"
                    className="w-full"
                    disabled={otpLoading || otpVerified}
                    onClick={handleRequestOtp}
                  >
                    {otpLoading ? 'Sending…' : otpVerified ? 'OTP sent' : `Send OTP to ${email || 'your email'}`}
                  </Button>

                  <p className="text-xs text-muted-foreground -mt-2">
                    Didn't get the email? Check your <strong>Spam</strong> or{' '}
                    <strong>Promotions</strong> folder.
                  </p>

                  <div className="space-y-2">
                    <Label htmlFor="otp">Enter OTP</Label>
                    <Input
                      id="otp"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.preventDefault();
                      }}
                      placeholder="6-digit code"
                      inputMode="numeric"
                      maxLength={6}
                      className="text-center tracking-[0.5em] font-mono"
                    />
                  </div>

                  <Button
                    type="button"
                    variant={otpVerified ? 'secondary' : 'outline'}
                    size="lg"
                    className="w-full"
                    disabled={otpLoading || otpVerified}
                    onClick={handleVerifyOtp}
                  >
                    {otpVerified ? (
                      <>
                        <Check className="h-4 w-4" />
                        Verified
                      </>
                    ) : otpLoading ? (
                      'Verifying…'
                    ) : (
                      'Verify OTP'
                    )}
                  </Button>

                  <div className="flex gap-2 pt-2">
                    <Button type="button" variant="outline" size="lg" onClick={prevStep}>
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </Button>
                    <Button
                      type="submit"
                      variant="gradient"
                      size="lg"
                      className="flex-1"
                      disabled={loading || !otpVerified}
                    >
                      {loading ? 'Creating account…' : 'Create account'}
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </motion.div>
        </AnimatePresence>
      </div>

      <AuthMessage message={message} />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to="/login" className="text-primary font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
};

export default Signup;
