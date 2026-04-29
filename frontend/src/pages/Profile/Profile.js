import React, { useState, useContext, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { AppLayout } from '../../components/app-layout';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

const Profile = () => {
  const { user, updateUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    salary: user?.salary || '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [variant, setVariant] = useState('success');

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  useEffect(() => {
    setForm({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      salary: user?.salary || '',
    });
  }, [user]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await api.put(`/users/${user.id}`, {
        name: form.name,
        phone: form.phone,
        salary: form.salary,
      });
      updateUser(res.data);
      setVariant('success');
      setMessage('Profile updated successfully.');
    } catch (err) {
      console.error(err);
      setVariant('error');
      setMessage(err?.response?.data?.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const initial = (user.name || user.email || '?').charAt(0).toUpperCase();

  return (
    <AppLayout>
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Update your personal details. Email is locked — sign in via that address.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Identity card — 1 col */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="text-center">
            <CardContent className="pt-8 pb-6">
              <div className="mx-auto h-20 w-20 rounded-full bg-brand-gradient grid place-items-center text-white text-2xl font-semibold shadow-lg shadow-primary/30 mb-4">
                {initial}
              </div>
              <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {user.name || 'You'}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
                {user.email}
              </p>
              {user.provider && (
                <span className="inline-block mt-3 px-2 py-0.5 rounded-full text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                  Signed up via {user.provider}
                </span>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Edit card — 2 col */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="lg:col-span-2"
        >
          <Card>
            <form onSubmit={handleSubmit}>
              <CardHeader>
                <CardTitle>Account details</CardTitle>
                <CardDescription>Changes save instantly to your account.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Your name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" value={form.email} disabled />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      name="phone"
                      value={form.phone || ''}
                      onChange={handleChange}
                      placeholder="+91…"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="salary">Monthly income</Label>
                    <Input
                      id="salary"
                      name="salary"
                      type="number"
                      value={form.salary || ''}
                      onChange={handleChange}
                      placeholder="0"
                    />
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {message && (
                    <motion.div
                      key={message}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.18 }}
                      className={
                        variant === 'success'
                          ? 'flex items-start gap-2 text-sm rounded-md border border-[hsl(var(--gain))]/30 bg-[hsl(var(--gain))]/10 text-[hsl(var(--gain))] px-3 py-2'
                          : 'flex items-start gap-2 text-sm rounded-md border border-destructive/30 bg-destructive/10 text-destructive px-3 py-2'
                      }
                    >
                      {variant === 'success' ? (
                        <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      )}
                      <span>{message}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
              <CardFooter className="justify-end">
                <Button type="submit" variant="gradient" disabled={loading}>
                  {loading ? 'Saving…' : 'Save changes'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default Profile;
