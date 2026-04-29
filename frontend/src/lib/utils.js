import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * shadcn/ui's standard className helper. clsx handles conditional
 * concatenation; tailwind-merge resolves conflicting Tailwind classes
 * (e.g. cn('px-2', cond && 'px-4') -> 'px-4', not 'px-2 px-4').
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
