import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ShieldCheck, Lock, Zap } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';

/**
 * Split-panel auth shell. Left side is a brand showcase (gradient,
 * mocked product preview, trust signals) — right side is the form.
 *
 * Why split-panel: a centered glass card reads as a form. A split
 * layout reads as a product. The left panel does the same job a
 * marketing landing page would: communicates "this is real software"
 * before the user has even started typing.
 *
 * On <lg the left panel collapses entirely and we render the
 * traditional centered card so signup remains usable on mobile.
 */
export function AuthSplitLayout({ title, subtitle, children, mobileHeadline }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground font-sans">
      {/* Theme toggle — top right, always reachable */}
      <div className="absolute top-4 right-4 z-30">
        <ThemeToggle />
      </div>

      <div className="relative grid grid-cols-1 lg:grid-cols-2 min-h-screen">
        {/* LEFT — brand showcase, hidden on mobile */}
        <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden bg-brand-gradient text-white">
          {/* Lighting / orbs */}
          <div className="absolute -top-32 -left-20 h-[420px] w-[420px] rounded-full bg-white/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-16 h-[380px] w-[380px] rounded-full bg-white/10 blur-3xl pointer-events-none" />
          {/* Subtle dotted grid for texture */}
          <div className="absolute inset-0 bg-grid mask-radial opacity-30 pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-white/15 backdrop-blur grid place-items-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-semibold tracking-tight">Finora</span>
            </div>
          </div>

          {/* Mocked dashboard preview — signals "this is what you'll
              see after signing in" without paying for screenshots. */}
          <div className="relative z-10 my-10">
            <p className="text-xs uppercase tracking-widest text-white/70 mb-3">
              {mobileHeadline || 'Money, but the smart kind'}
            </p>
            <h1 className="text-3xl xl:text-4xl font-semibold tracking-tight leading-tight max-w-md">
              See where your money goes — and ask why.
            </h1>
            <p className="mt-4 text-white/80 text-sm leading-relaxed max-w-md">
              An AI assistant that actually reads your transactions: detects
              subscriptions, flags weird spending, and forecasts your next 30
              days in one chat.
            </p>

            <BrandPreview />
          </div>

          <div className="relative z-10 grid grid-cols-3 gap-4 text-xs text-white/85">
            <Trust icon={ShieldCheck} label="GDPR-ready" sub="Export & delete" />
            <Trust icon={Lock} label="Encrypted" sub="JWT + OAuth" />
            <Trust icon={Zap} label="Real-time" sub="Streamed AI" />
          </div>
        </div>

        {/* RIGHT — form panel. On mobile, this is the entire screen. */}
        <div className="relative flex flex-col justify-center px-6 py-12 sm:px-12">
          {/* Atmospheric mesh on the form side too — keeps the panel
              from feeling like a flat sheet of paper. */}
          <div aria-hidden className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
            <div className="absolute inset-0 bg-grid mask-radial opacity-50 dark:opacity-30" />
            <motion.div
              className="absolute -top-20 -right-20 h-[360px] w-[360px] rounded-full blur-3xl
                         opacity-25 dark:opacity-30"
              style={{ background: 'hsl(var(--brand-from))' }}
              animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
              transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-md mx-auto"
          >
            {/* Mobile-only logo (left panel hides at <lg) */}
            <div className="lg:hidden flex items-center gap-2.5 mb-8">
              <div className="h-9 w-9 rounded-xl bg-brand-gradient grid place-items-center shadow-glow-sm">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold tracking-tight">Finora</span>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                {title}
              </h2>
              {subtitle && (
                <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>

            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

/**
 * Trust pill — small block highlighting one trust property.
 */
function Trust({ icon: Icon, label, sub }) {
  return (
    <div className="flex items-start gap-2">
      <div className="h-7 w-7 rounded-md bg-white/15 grid place-items-center flex-shrink-0">
        <Icon className="h-3.5 w-3.5 text-white" />
      </div>
      <div className="leading-tight">
        <p className="font-medium text-white">{label}</p>
        <p className="text-white/65 text-[11px]">{sub}</p>
      </div>
    </div>
  );
}

/**
 * Mocked product preview — a stylized dashboard card. Shows what the
 * app feels like in 12 lines of SVG-ish HTML, no real data, no API
 * calls. The point is "this app is a real product".
 */
function BrandPreview() {
  // Static demo data — pure visual, never read for actual numbers.
  const spark = [3, 5, 4, 7, 6, 9, 8, 12, 10, 14, 13, 16, 15, 18, 21];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="mt-8 max-w-md"
    >
      <div className="rounded-2xl border border-white/15 bg-white/8 backdrop-blur-xl p-5 shadow-2xl shadow-black/30"
           style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/65">Net cashflow</p>
            <p className="text-2xl font-semibold tracking-tight num-display">+₹48,000.00</p>
          </div>
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 font-medium">
            positive
          </span>
        </div>

        <div className="h-12 mb-4">
          <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-full">
            <defs>
              <linearGradient id="brand-preview-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%"  stopColor="rgba(255,255,255,0.4)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </linearGradient>
            </defs>
            {(() => {
              const min = Math.min(...spark);
              const max = Math.max(...spark);
              const range = max - min || 1;
              const stepX = 100 / (spark.length - 1);
              const pts = spark.map((v, i) => ({ x: i * stepX, y: 30 - ((v - min) / range) * 26 - 2 }));
              const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
              const fill = `${line} L100,30 L0,30 Z`;
              return (
                <>
                  <path d={fill} fill="url(#brand-preview-fill)" />
                  <path d={line} fill="none" stroke="white" strokeWidth="1.4" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
                </>
              );
            })()}
          </svg>
        </div>

        {/* Two stat rows — give the preview the feel of real chrome */}
        <div className="space-y-2">
          {[
            { label: 'Income',      value: '₹70,000', tone: 'rgba(74, 222, 128, 0.95)' },
            { label: 'Expenses',    value: '₹22,000', tone: 'rgba(248, 113, 113, 0.95)' },
          ].map((r) => (
            <div key={r.label} className="flex items-center justify-between text-xs">
              <span className="text-white/70">{r.label}</span>
              <span className="font-medium tabular-nums" style={{ color: r.tone }}>{r.value}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default AuthSplitLayout;
