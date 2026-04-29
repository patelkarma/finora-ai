import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';

/**
 * Shared inline message box for auth pages. Auto-detects success vs
 * error from {variant} or by sniffing the message text.
 */
export function AuthMessage({ message, variant }) {
  const isSuccess =
    variant === 'success' ||
    (variant === undefined &&
      message &&
      /verified|sent|updated|success|✓/i.test(message));

  return (
    <AnimatePresence mode="wait">
      {message && (
        <motion.div
          key={message}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
          className={cn(
            'flex items-start gap-2 text-sm rounded-md border px-3 py-2 mt-3',
            isSuccess
              ? 'bg-[hsl(var(--gain))]/10 border-[hsl(var(--gain))]/30 text-[hsl(var(--gain))]'
              : 'bg-destructive/10 border-destructive/30 text-destructive'
          )}
        >
          {isSuccess ? (
            <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          )}
          <span className="whitespace-pre-line">{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
