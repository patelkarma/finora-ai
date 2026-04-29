import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import authService from '../../services/authService';
import { AuthLayout } from '../../components/auth-layout';
import { AuthMessage } from '../../components/auth-message';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await authService.forgotPassword(email);
      setMessage(
        res?.data?.message ||
          'If an account exists for that email, a reset link has been sent.'
      );
      setSubmitted(true);
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="We'll email you a link valid for 30 minutes."
    >
      {!submitted && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
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
              {loading ? 'Sending…' : 'Send reset link'}
            </Button>
          </motion.div>
        </form>
      )}

      <AuthMessage message={message} />

      {submitted && (
        <p className="mt-4 text-xs text-muted-foreground">
          If you don't see it within a minute, check your <strong>Spam</strong> or{' '}
          <strong>Promotions</strong> folder.
        </p>
      )}

      <div className="mt-6 flex items-center justify-between text-sm">
        <Link to="/login" className="text-muted-foreground hover:text-foreground transition-colors">
          ← Back to login
        </Link>
        <Link to="/signup" className="text-muted-foreground hover:text-foreground transition-colors">
          Create account
        </Link>
      </div>
    </AuthLayout>
  );
};

export default ForgotPassword;
