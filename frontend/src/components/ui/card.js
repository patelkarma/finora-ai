import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

/**
 * Card primitives. The `default` variant matches the previous
 * shadcn-style card (border + bg-card + shadow) so existing usages
 * stay pixel-identical. New variants:
 *
 *   - elevated: sits above other cards. Multi-layer shadow + a faint
 *     inner highlight on the top edge so it looks "lifted off the
 *     page" without using a stronger drop-shadow.
 *
 *   - glow: brand-tinted ring for KPI / call-to-action cards. Pairs
 *     with the gradient button family.
 *
 *   - glass: frosted backdrop. For floating panels above the
 *     atmospheric mesh background — mostly used on auth and modals.
 *
 * Pass `interactive` to opt into the hover lift + brand-glow border
 * effect. We don't make this default because dense list cards
 * shouldn't shift on hover.
 */
const cardVariants = cva(
  'rounded-xl border bg-card text-card-foreground transition-colors',
  {
    variants: {
      variant: {
        default:  'shadow',
        elevated: 'shadow-elevated',
        glow:     'shadow-glow-md border-primary/30',
        glass:    'border-white/10 dark:border-white/5 bg-card/70 backdrop-blur-xl shadow-elevated',
      },
      interactive: {
        true:  'card-lift cursor-pointer',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      interactive: false,
    },
  }
);

const Card = React.forwardRef(({ className, variant, interactive, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(cardVariants({ variant, interactive }), className)}
    {...props}
  />
));
Card.displayName = 'Card';

const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn('font-semibold leading-none tracking-tight', className)} {...props} />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
));
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, cardVariants };
