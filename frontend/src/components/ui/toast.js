import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Tiny in-house toast system — small enough that pulling in
 * react-hot-toast would be heavier than what we built. Matches the
 * existing Card / Button primitives stylistically.
 *
 * Usage:
 *   const toast = useToast();
 *   toast.success("Saved");
 *   toast.error("Could not save", { duration: 6000 });
 *
 * Mount <Toaster /> once at app root.
 */

const ToastContext = createContext(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Soft-fail: returning a no-op interface lets pre-mount renders
    // not crash. Helpful in tests and during the first paint before
    // <Toaster /> mounts.
    return {
      success: () => {},
      error: () => {},
      info: () => {},
      dismiss: () => {},
    };
  }
  return ctx;
};

const variantStyles = {
  success: 'border-[hsl(var(--gain))]/30 bg-[hsl(var(--gain))]/10 text-[hsl(var(--gain))]',
  error: 'border-destructive/30 bg-destructive/10 text-destructive',
  info: 'border-zinc-200 dark:border-zinc-800 bg-card text-card-foreground',
};

const variantIcon = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

let nextId = 1;

export function Toaster({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const tm = timersRef.current.get(id);
    if (tm) {
      clearTimeout(tm);
      timersRef.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (variant, message, options = {}) => {
      const id = nextId++;
      const duration = options.duration ?? 4000;
      setToasts((prev) => [...prev, { id, variant, message }]);
      if (duration > 0) {
        const tm = setTimeout(() => dismiss(id), duration);
        timersRef.current.set(id, tm);
      }
      return id;
    },
    [dismiss]
  );

  const value = {
    success: (msg, opts) => push('success', msg, opts),
    error: (msg, opts) => push('error', msg, opts),
    info: (msg, opts) => push('info', msg, opts),
    dismiss,
  };

  // Cleanup all timers on unmount.
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((tm) => clearTimeout(tm));
      timers.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Stack viewport — fixed top-right, mobile bottom-center via responsive class. */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed inset-0 z-[100] flex flex-col items-end gap-2 p-4 sm:p-6"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const Icon = variantIcon[t.variant] || Info;
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: 16, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 16, scale: 0.96 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className={cn(
                  'pointer-events-auto flex items-start gap-3 min-w-[260px] max-w-md',
                  'rounded-lg border px-4 py-3 shadow-lg shadow-black/5 dark:shadow-black/40',
                  'backdrop-blur-sm',
                  variantStyles[t.variant]
                )}
              >
                <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p className="text-sm leading-relaxed flex-1 text-zinc-900 dark:text-zinc-50">
                  {t.message}
                </p>
                <button
                  onClick={() => dismiss(t.id)}
                  className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50 -mr-1 -mt-0.5"
                  aria-label="Dismiss"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
