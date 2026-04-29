import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import authService from '../../services/authService';
import { AuthLayout } from '../../components/auth-layout';
import { AuthMessage } from '../../components/auth-message';
import { PasswordStrength } from '../../components/password-strength';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

const PASSWORD_POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/;

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (!token) {
      setMessage('Reset link is missing or invalid. Please request a new one.');
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
      await authService.resetPassword(token, password);
      setMessage('Password updated. Redirecting to login…');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setMessage(
        err?.response?.data?.message || 'Could not reset password. The link may have expired.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Choose a new password" subtitle="Make it strong — and unique to Finora.">
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
          <Label htmlFor="confirm">Confirm new password</Label>
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
            {loading ? 'Updating…' : 'Update password'}
          </Button>
        </motion.div>

        <AuthMessage message={message} />
      </form>

      <div className="mt-6 flex items-center justify-between text-sm">
        <Link to="/login" className="text-muted-foreground hover:text-foreground transition-colors">
          ← Back to login
        </Link>
        <Link
          to="/forgot-password"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Request new link
        </Link>
      </div>
    </AuthLayout>
  );
};

export default ResetPassword;
