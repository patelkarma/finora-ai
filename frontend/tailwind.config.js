/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      // Design tokens are CSS variables defined in src/index.css.
      // Tailwind reads them via hsl(var(--token)) so dark/light themes
      // swap by toggling a single .dark class on <html>.
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Finance-specific signal colors
        gain: 'hsl(var(--gain))',
        loss: 'hsl(var(--loss))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['Geist Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, hsl(var(--brand-from)) 0%, hsl(var(--brand-to)) 100%)',
        // Subtle dotted grid for atmospheric page backgrounds. Renders
        // as a faint constellation behind the content; opacity is held
        // low in CSS so it never competes with the data.
        'grid-pattern':
          'radial-gradient(circle at 1px 1px, hsl(var(--foreground) / 0.06) 1px, transparent 0)',
        // Vertical sheen used inside the gradient button on hover —
        // a moving highlight that reads as "premium".
        'shine':
          'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.30) 50%, transparent 70%)',
      },
      backgroundSize: {
        'grid-md': '24px 24px',
        'grid-lg': '32px 32px',
      },
      // Brand-tinted shadow ramp. shadow-glow-* lifts elements with a
      // soft violet halo; shadow-elevated is a crisper multi-layer
      // shadow for cards that need to sit above other cards.
      boxShadow: {
        'glow-sm': '0 0 18px -4px hsl(var(--brand-from) / 0.35)',
        'glow-md': '0 0 28px -6px hsl(var(--brand-from) / 0.45)',
        'glow-lg': '0 0 48px -8px hsl(var(--brand-from) / 0.55)',
        elevated:
          '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 24px -12px rgba(0,0,0,0.45), 0 4px 8px -6px rgba(0,0,0,0.3)',
      },
      // Display-scale typography for hero numbers. Tight tracking +
      // slightly heavier weight so a ₹48,000 reads as a marquee
      // number, not body text.
      fontSize: {
        'display-sm': ['2.75rem', { lineHeight: '1.05', letterSpacing: '-0.025em', fontWeight: '600' }],
        'display':    ['3.5rem',  { lineHeight: '1.02', letterSpacing: '-0.03em',  fontWeight: '600' }],
        'display-lg': ['4.5rem',  { lineHeight: '1',    letterSpacing: '-0.035em', fontWeight: '600' }],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        // Background-position sweep used for the shine highlight on
        // primary buttons. Travels left → right over ~1.4s on hover.
        shine: {
          '0%':   { backgroundPosition: '-120% 0' },
          '100%': { backgroundPosition: '120% 0' },
        },
        // Slow ambient drift for background blobs. Two of these stacked
        // with different durations build the mesh feel without ever
        // feeling synchronized.
        drift: {
          '0%, 100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '50%':      { transform: 'translate3d(40px,-20px,0) scale(1.05)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 hsl(var(--brand-from) / 0.4)' },
          '50%':      { boxShadow: '0 0 0 12px hsl(var(--brand-from) / 0)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
        shine:            'shine 1.4s ease-out',
        'drift-slow':     'drift 18s ease-in-out infinite',
        'drift-slower':   'drift 26s ease-in-out infinite',
        'pulse-glow':     'pulse-glow 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
