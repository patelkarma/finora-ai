import React, { useContext, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard,
  Receipt,
  Target,
  Sparkles,
  MessageSquare,
  User,
  LogOut,
  Settings,
  Shield,
  Menu,
  X,
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { ThemeToggle } from './theme-toggle';
import { cn } from '../lib/utils';

const NAV_ITEMS = [
  { to: '/dashboard',     label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/transactions',  label: 'Transactions', icon: Receipt },
  { to: '/budgets',       label: 'Budgets',      icon: Target },
  { to: '/ai-insights',   label: 'Insights',     icon: Sparkles },
  { to: '/chat',          label: 'Ask AI',       icon: MessageSquare },
];

/**
 * Desktop sidebar (240px, fixed left). On mobile (<md) it collapses to a
 * top header with a hamburger that reveals a full-screen drawer.
 *
 * Active route gets a violet pill that smoothly slides between items via
 * Framer Motion's layoutId.
 */
export default function Sidebar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initial = (user?.name || user?.email || '?').charAt(0).toUpperCase();

  return (
    <>
      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-40 h-14 px-4 flex items-center justify-between border-b border-zinc-200/60 dark:border-zinc-800/60 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-brand-gradient grid place-items-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Finora</span>
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            onClick={() => setDrawerOpen(true)}
            className="h-10 w-10 grid place-items-center rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed top-0 left-0 z-30 h-screen w-60 flex-col border-r border-zinc-200/60 dark:border-zinc-800/60 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-xl">
        {/* Brand */}
        <Link to="/dashboard" className="flex items-center gap-2.5 px-5 h-16 border-b border-zinc-200/60 dark:border-zinc-800/60">
          <motion.div
            className="h-9 w-9 rounded-lg bg-brand-gradient grid place-items-center shadow-md shadow-primary/30"
            whileHover={{ rotate: 8, scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <Sparkles className="h-4 w-4 text-white" />
          </motion.div>
          <span className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Finora
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'text-zinc-900 dark:text-zinc-50'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="sidebar-active"
                      className="absolute inset-0 -z-10 rounded-lg bg-zinc-100 dark:bg-zinc-800/60"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  )}
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: theme + profile */}
        <div className="px-3 pb-4 space-y-2 border-t border-zinc-200/60 dark:border-zinc-800/60 pt-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
              Theme
            </span>
            <ThemeToggle />
          </div>

          <div ref={profileRef} className="relative">
            <button
              onClick={() => setProfileOpen((v) => !v)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-brand-gradient grid place-items-center text-white text-sm font-semibold shadow-md shadow-primary/30">
                {initial}
              </div>
              <div className="min-w-0 text-left">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">
                  {user?.name || 'You'}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                  {user?.email}
                </p>
              </div>
            </button>

            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-full left-0 right-0 mb-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-xl py-1"
                >
                  <button
                    onClick={() => { setProfileOpen(false); navigate('/profile'); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                  >
                    <User className="h-4 w-4" /> Profile
                  </button>
                  <button
                    onClick={() => { setProfileOpen(false); navigate('/profile'); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                  >
                    <Settings className="h-4 w-4" /> Settings
                  </button>
                  <button
                    onClick={() => { setProfileOpen(false); navigate('/privacy'); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                  >
                    <Shield className="h-4 w-4" /> Privacy
                  </button>
                  <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="lg:hidden fixed top-0 left-0 z-50 h-full w-72 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 flex flex-col"
            >
              <div className="flex items-center justify-between px-5 h-14 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-brand-gradient grid place-items-center">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-50">Finora</span>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="h-9 w-9 grid place-items-center rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex-1 p-3 space-y-1">
                {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setDrawerOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
                        isActive
                          ? 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-50'
                          : 'text-zinc-600 dark:text-zinc-400'
                      )
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </NavLink>
                ))}
              </nav>
              <div className="border-t border-zinc-200 dark:border-zinc-800 p-3 space-y-1">
                <button
                  onClick={() => { setDrawerOpen(false); navigate('/profile'); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                >
                  <User className="h-4 w-4" /> Profile
                </button>
                <button
                  onClick={() => { setDrawerOpen(false); navigate('/privacy'); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                >
                  <Shield className="h-4 w-4" /> Privacy
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
