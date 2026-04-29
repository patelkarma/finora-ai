import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { AuthLayout } from '../../components/auth-layout';
import { AuthMessage } from '../../components/auth-message';
import { PasswordStrength } from '../../components/password-strength';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

const PASSWORD_POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/;

const SetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (!token) {
      setMessage('Invalid or expired password-setup link.');
      return;
    }
    if (password !== confirm) {
      setMessage('Passwords do not match.');
      return;
    }
    if (!PASSWORD_POLICY.test(password)) {
      setMessage('Password must meet all five criteria below.');
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/auth/set-password`,
        { password },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage('Password set successfully. Redirecting to login…');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Failed to set password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Set your password"
      subtitle="One-time setup so you can sign in with email + password too."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
          <PasswordStrength password={password} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input
            id="confirm"
            type="password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
          <Button
            type="submit"
            variant="gradient"
            size="lg"
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Saving…' : 'Save password'}
          </Button>
        </motion.div>

        <AuthMessage message={message} />
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link to="/login" className="hover:text-foreground transition-colors">
          ← Back to login
        </Link>
      </p>
    </AuthLayout>
  );
};

export default SetPassword;
