import { defineConfig } from 'windicss/helpers';

/**
 * WindiCSS configuration for the Money Trust Microfinance application.  We
 * enable dark mode via a `class` strategy so that toggling a `dark` class
 * on the `<html>` element switches themes.  The `attributify` option is
 * enabled to allow attribute‑based utility shortcuts (e.g. `bg="primary"`).
 * Brand colours are defined under `theme.extend` to ensure a consistent
 * visual identity across components.  See https://windicss.org/ for more.
 */
export default defineConfig({
  darkMode: 'class',
  attributify: true,
  theme: {
    extend: {
      colors: {
        // Money Trust Microfinance brand colours.  These can be adjusted in
        // one place and will propagate across all components using
        // `bg-primary`, `text-primary`, etc.
        primary: {
          DEFAULT: '#1E3A8A', // base blue
          light: '#3B82F6',
          dark: '#1E40AF',
        },
        secondary: {
          DEFAULT: '#10B981', // emerald
          light: '#34D399',
          dark: '#059669',
        },
        accent: {
          DEFAULT: '#F59E0B', // amber
          light: '#FBBF24',
          dark: '#D97706',
        },
      },
      keyframes: {
        // Defines a shimmer animation used for the global loading bar.  The
        // gradient moves from left to right repeatedly.  WindiCSS will
        // generate the CSS for `animate-shimmer` automatically.
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.5s linear infinite',
      },
    },
  },
});