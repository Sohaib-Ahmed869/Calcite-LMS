/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  // Dark mode is opt-in via the `[data-admin-theme='dark']` attribute on the shell (see index.css);
  // we don't use Tailwind's `dark:` class strategy, so leave the default `media` off by scoping there.
  theme: {
    extend: {
      colors: {
        // Every token maps straight to its hex CSS var (set at runtime by BrandingProvider). Tailwind
        // opacity modifiers (e.g. ring-accent/20) gracefully fall back to the solid colour on these
        // var-based tokens; the brand tints that genuinely need alpha use inline
        // `rgba(var(--color-accent-rgb), …)` (the comma-form triple) in the components themselves.
        primary: {
          DEFAULT: 'var(--color-primary)',
          foreground: 'var(--color-primaryForeground)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          foreground: 'var(--color-accentForeground)',
        },
        background: 'var(--color-background)',
        foreground: 'var(--color-foreground)',
        card: {
          DEFAULT: 'var(--color-card)',
          foreground: 'var(--color-cardForeground)',
        },
        sidebar: {
          DEFAULT: 'var(--color-sidebar)',
          foreground: 'var(--color-sidebarForeground)',
          accent: 'var(--color-sidebarAccent)',
          border: 'var(--color-sidebarBorder)',
        },
        border: 'var(--color-border)',
        ring: 'var(--color-ring)',
        muted: {
          DEFAULT: 'var(--color-muted)',
          foreground: 'var(--color-mutedForeground)',
        },
        danger: 'var(--color-danger)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
      },
      borderRadius: {
        card: 'var(--radius-card)',
        btn: 'var(--radius-btn)',
        input: 'var(--radius-input)',
        pill: 'var(--radius-pill)',
      },
      fontFamily: {
        heading: 'var(--font-heading)',
        body: 'var(--font-body)',
        nav: 'var(--font-nav)',
        sans: 'var(--font-body)',
      },
      boxShadow: {
        card: 'var(--card-shadow)',
        soft: '0 1px 3px rgb(0 0 0 / 0.06), 0 6px 16px -8px rgb(0 0 0 / 0.10)',
        lift: '0 10px 30px -10px rgb(0 0 0 / 0.22)',
      },
    },
  },
  plugins: [],
};
