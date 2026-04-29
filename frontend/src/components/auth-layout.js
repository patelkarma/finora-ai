import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';

/**
 * Shared shell for every auth screen. Replaces the old branding-image
 * panel with an animated gradient mesh — same brand vibe, zero stock
 * photos, and no extra HTTP roundtrip on first paint.
 *
 * Children render inside a centered glass card. Subtitle and step
 * indicator are optional.
 */
export function AuthLayout({ title, subtitle, step, children }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground font-sans">
      {/* Animated gradient mesh background. Three blurred radial blobs
          drift slowly so the page never feels static, but the motion
          is subtle enough not to distract from the form. */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <motion.div
          aria-hidden
          className="absolute -top-32 -left-32 h-[480px] w-[480px] rounded-full opacity-40 blur-3xl"
          style={{ background: 'hsl(var(--brand-from))' }}
          animate={{ x: [0, 60, 0], y: [0, 40, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          aria-hidden
          className="absolute top-1/3 -right-24 h-[520px] w-[520px] rounded-full opacity-30 blur-3xl"
          style={{ background: 'hsl(var(--brand-to))' }}
          animate={{ x: [0, -40, 0], y: [0, 60, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          aria-hidden
          className="absolute -bottom-32 left-1/3 h-[420px] w-[420px] rounded-full opacity-25 blur-3xl"
          style={{ background: 'hsl(var(--primary))' }}
          animate={{ x: [0, -60, 0], y: [0, -30, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Theme toggle — top right, always reachable */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      {/* Logo — top left (clickable to land on login) */}
      <a
        href="/login"
        className="absolute top-4 left-4 z-10 flex items-center gap-2 group"
        aria-label="Finora home"
      >
        <motion.div
          className="h-9 w-9 rounded-xl bg-brand-gradient grid place-items-center shadow-lg shadow-primary/30"
          whileHover={{ rotate: 8, scale: 1.05 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <Sparkles className="h-4 w-4 text-white" />
        </motion.div>
        <span className="font-semibold tracking-tight text-foreground/90 group-hover:text-foreground">
          Finora
        </span>
      </a>

      {/* Centered card */}
      <div className="relative min-h-screen grid place-items-center px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md"
        >
          <div className="rounded-2xl border bg-card/80 backdrop-blur-xl shadow-2xl shadow-black/10 p-8">
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              {subtitle && (
                <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
              )}
              {step && (
                <p className="mt-3 text-xs uppercase tracking-widest text-muted-foreground/80">
                  {step}
                </p>
              )}
            </div>
            {children}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
