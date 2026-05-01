import React from 'react';
import { cn } from '../../lib/utils';

/**
 * Standard input. The default focus ring stayed at "tech generic" for
 * too long — replaced the ring-offset 2px ring with a softer brand
 * halo (ring-1 + a wider ring-4 at low opacity) so focused fields
 * read as tactile and on-brand. Hover gets a subtle border tint so
 * an idle form telegraphs which fields are interactive.
 */
const Input = React.forwardRef(({ className, type, ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      'flex h-10 w-full rounded-md border border-input bg-background/80 px-3 py-2 text-sm text-foreground',
      'transition-[box-shadow,border-color,background-color] duration-150',
      'file:border-0 file:bg-transparent file:text-sm file:font-medium',
      'placeholder:text-muted-foreground',
      'hover:border-input/80 hover:bg-background',
      'focus-visible:outline-none focus-visible:border-ring focus-visible:bg-background',
      'focus-visible:shadow-[0_0_0_4px_hsl(var(--ring)/0.18)]',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    {...props}
  />
));
Input.displayName = 'Input';

export { Input };
