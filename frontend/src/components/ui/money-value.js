import React from 'react';
import { cn } from '../../lib/utils';

/**
 * Tabular-numeral money display with optional sign coloring.
 * Use this everywhere a number lives in finance UI — guarantees columns
 * line up vertically because every digit is the same width.
 *
 * @param value         number (positive or negative)
 * @param currency      symbol or ISO code prefix (default ₹)
 * @param showSign      'always' | 'negative' | 'never' (default 'never')
 * @param colorize      tint negative red / positive green (default false)
 */
export function MoneyValue({
  value,
  currency = '₹',
  showSign = 'never',
  colorize = false,
  className,
  ...rest
}) {
  const num = Number(value) || 0;
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : showSign === 'always' ? '+' : '';
  const formatted = abs.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Concatenate as a single string. JSX inserts whitespace between
  // adjacent text expressions on separate lines, which would let the
  // browser wrap "+₹70,000.00" at the space between `+` and `₹` and
  // make stat cards different heights when the value has a sign.
  const display = `${sign}${currency}${formatted}`;

  return (
    <span
      className={cn(
        'num whitespace-nowrap',
        colorize && num < 0 && 'text-[hsl(var(--loss))]',
        colorize && num > 0 && 'text-[hsl(var(--gain))]',
        className
      )}
      {...rest}
    >
      {display}
    </span>
  );
}
