import React from 'react';
import { motion } from 'framer-motion';
import Sidebar from './sidebar';

/**
 * Authenticated app shell. Sidebar on the left at lg+, hidden on
 * mobile (replaced by a top header inside Sidebar itself). Main
 * content gets a 240px left margin at lg+ so it doesn't slide under
 * the sidebar.
 *
 * The previous version had two static brand blobs behind the content.
 * Replaced with the same drifting brand mesh used on auth screens —
 * three blurred radial blobs slowly translating with offset durations,
 * plus a faded dotted grid masked toward the corners. End result:
 * content reads as floating above an atmospheric, alive surface
 * rather than sitting on flat near-black.
 */
export function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-x-hidden">
      {/* Atmospheric backdrop. -z-10 keeps it under everything. */}
      <div aria-hidden className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
        {/* Dotted grid, faded at the edges so it doesn't fight the data. */}
        <div className="absolute inset-0 bg-grid mask-radial opacity-60 dark:opacity-40" />

        {/* Brand-color drifting blobs — same DNA as auth-layout, sized
            and positioned for the wider authenticated viewport. */}
        <motion.div
          className="absolute -top-40 left-[18%] h-[560px] w-[820px] rounded-full blur-3xl
                     opacity-[0.10] dark:opacity-[0.16]"
          style={{ background: 'hsl(var(--brand-from))' }}
          animate={{ x: [0, 60, 0], y: [0, 40, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-1/3 -right-40 h-[420px] w-[700px] rounded-full blur-3xl
                     opacity-[0.08] dark:opacity-[0.12]"
          style={{ background: 'hsl(var(--brand-to))' }}
          animate={{ x: [0, -50, 0], y: [0, 50, 0] }}
          transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-32 left-1/3 h-[380px] w-[600px] rounded-full blur-3xl
                     opacity-[0.06] dark:opacity-[0.10]"
          style={{ background: 'hsl(var(--primary))' }}
          animate={{ x: [0, -40, 0], y: [0, -30, 0] }}
          transition={{ duration: 32, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <Sidebar />

      <motion.main
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="lg:ml-60 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-[1400px]"
      >
        {children}
      </motion.main>
    </div>
  );
}
