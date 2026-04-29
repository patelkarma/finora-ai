import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

const checks = [
  { label: '8+ characters',          test: (p) => p.length >= 8 },
  { label: 'lowercase letter',       test: (p) => /[a-z]/.test(p) },
  { label: 'uppercase letter',       test: (p) => /[A-Z]/.test(p) },
  { label: 'number',                 test: (p) => /\d/.test(p) },
  { label: 'special character',      test: (p) => /[^A-Za-z0-9]/.test(p) },
];

/**
 * Live strength indicator that mirrors the server-side StrongPassword
 * regex. Shows a 5-segment bar that fills as each criterion is met,
 * plus a checklist that animates as criteria pass.
 */
export function PasswordStrength({ password = '' }) {
  const passed = checks.map((c) => c.test(password));
  const score = passed.filter(Boolean).length;
  const tone =
    score <= 2 ? 'bg-destructive' :
    score === 3 ? 'bg-yellow-500' :
    score === 4 ? 'bg-amber-400' :
                  'bg-[hsl(var(--gain))]';

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {checks.map((_, i) => (
          <motion.div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full',
              i < score ? tone : 'bg-muted'
            )}
            initial={false}
            animate={{ scaleX: i < score ? 1 : 1, opacity: i < score ? 1 : 0.6 }}
            transition={{ duration: 0.2 }}
          />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        {checks.map((c, i) => (
          <li
            key={c.label}
            className={cn(
              'transition-colors',
              passed[i] ? 'text-[hsl(var(--gain))]' : 'text-muted-foreground'
            )}
          >
            {passed[i] ? '✓' : '○'} {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
