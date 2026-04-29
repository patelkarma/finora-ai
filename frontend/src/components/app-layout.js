import React from 'react';
import { motion } from 'framer-motion';
import Sidebar from './sidebar';

/**
 * Authenticated app shell. Sidebar on the left at md+, hidden on mobile
 * (replaced by a top header inside Sidebar itself). Main content gets
 * a 240px left margin at md+ so it doesn't slide under the sidebar.
 *
 * A subtle radial brand-color blob sits behind everything to add depth
 * without distracting from the data.
 */
export function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 relative overflow-x-hidden">
      {/* Backdrop blob */}
      <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-32 left-1/3 h-[640px] w-[1100px] rounded-full opacity-[0.08] dark:opacity-[0.12] blur-3xl"
          style={{ background: 'hsl(var(--brand-from))' }}
        />
        <div
          className="absolute top-1/2 -right-32 h-[420px] w-[700px] rounded-full opacity-[0.06] dark:opacity-[0.08] blur-3xl"
          style={{ background: 'hsl(var(--brand-to))' }}
        />
      </div>

      <Sidebar />

      <motion.main
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="md:ml-60 px-4 sm:px-8 py-8 max-w-[1400px]"
      >
        {children}
      </motion.main>
    </div>
  );
}
