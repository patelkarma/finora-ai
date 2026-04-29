import React from 'react';
import { motion } from 'framer-motion';

/**
 * Page wrapper for authenticated routes. The new Navbar is mounted in
 * App.js so it's shared across every authenticated page; this layout
 * just provides the content container, subtle backdrop, and a fade-in
 * entry animation.
 */
export function AppLayout({ children }) {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 relative">
      {/* Subtle backdrop — large blurred brand-color blob behind everything. */}
      <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-48 left-1/2 -translate-x-1/2 h-[640px] w-[1100px] rounded-full opacity-[0.06] dark:opacity-[0.10] blur-3xl"
          style={{ background: 'hsl(var(--brand-from))' }}
        />
      </div>

      <motion.main
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="max-w-7xl mx-auto px-4 sm:px-6 py-8"
      >
        {children}
      </motion.main>
    </div>
  );
}
