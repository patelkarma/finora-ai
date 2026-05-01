import React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

// shadcn-flavored Button. Variants tuned to Finora's design tokens
// (violet primary, subtle muted ghost, brand-gradient hero).
//
// The gradient variant gets a layered shimmer: a pseudo-element with
// a moving white-highlight gradient sweeps across the button on hover.
// Pure CSS — no JS, no state, no rerender — so it's free.
const buttonVariants = cva(
  'relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 overflow-hidden [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background/60 backdrop-blur-sm hover:bg-accent hover:text-accent-foreground hover:border-input/80',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        gradient: [
          // Brand-gradient base + tinted halo + on-hover shimmer.
          'bg-brand-gradient text-white shadow-glow-md hover:shadow-glow-lg',
          // Slight scale-up on hover for tactile feedback. Cheap, high
          // signal, doesn't conflict with framer-motion wrappers.
          'hover:-translate-y-0.5',
          // The shimmer: a 200% wide diagonal highlight that lives at
          // -120% by default and runs to 120% via the `shine` keyframe
          // on hover. ::before keeps the effect off the children.
          'before:content-[""] before:absolute before:inset-0 before:pointer-events-none',
          'before:bg-shine before:bg-[length:200%_100%] before:bg-[position:-120%_0]',
          'before:opacity-0 hover:before:opacity-100 hover:before:animate-shine',
        ].join(' '),
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const Button = React.forwardRef(({ className, variant, size, asChild = false, children, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';
  // Slot only accepts a single child element. When asChild is true, we
  // can't wrap children in a span, so callers' children pass through
  // verbatim. The ::before shimmer doesn't need a wrapper anyway.
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    >
      {asChild ? children : <span className="relative z-10 inline-flex items-center gap-2">{children}</span>}
    </Comp>
  );
});
Button.displayName = 'Button';

export { Button, buttonVariants };
