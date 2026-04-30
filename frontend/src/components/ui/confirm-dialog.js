import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { Button } from './button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './card';
import { cn } from '../../lib/utils';

/**
 * Confirmation dialog. Replaces the various window.confirm() calls
 * scattered through the app — those rendered as 2010-era browser-chrome
 * popups, and looked completely out of place against the rest of the
 * UI. This uses the same Card primitive as the edit modals, so it
 * lives in the same visual world.
 *
 * Usage:
 *   <ConfirmDialog
 *     open={isOpen}
 *     title="Delete this transaction?"
 *     description="This can't be undone."
 *     confirmLabel="Delete"
 *     variant="destructive"
 *     onConfirm={handleDelete}
 *     onCancel={() => setIsOpen(false)}
 *   />
 *
 * Closes on ESC and on backdrop click. Confirm button traps initial
 * focus so keyboard users don't accidentally tab into the destructive
 * action.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default', // 'default' | 'destructive'
  onConfirm,
  onCancel,
  loading = false,
}) {
  // Close on ESC.
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape' && !loading) onCancel?.();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, loading, onCancel]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[90] grid place-items-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => !loading && onCancel?.()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <Card>
              <CardHeader>
                <div className="flex items-start gap-3">
                  {variant === 'destructive' && (
                    <div className="h-9 w-9 rounded-lg grid place-items-center flex-shrink-0 bg-destructive/15 text-destructive">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                  )}
                  <CardTitle id="confirm-dialog-title" className="text-base leading-tight">
                    {title}
                  </CardTitle>
                </div>
              </CardHeader>
              {description && (
                <CardContent className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {description}
                </CardContent>
              )}
              <CardFooter className="justify-end gap-2">
                <Button variant="outline" onClick={onCancel} disabled={loading}>
                  {cancelLabel}
                </Button>
                <Button
                  // Auto-focus the confirm button so Enter confirms,
                  // matching native dialog conventions.
                  autoFocus
                  variant="outline"
                  onClick={onConfirm}
                  disabled={loading}
                  className={cn(
                    variant === 'destructive' &&
                      'border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20'
                  )}
                >
                  {loading ? `${confirmLabel}…` : confirmLabel}
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
