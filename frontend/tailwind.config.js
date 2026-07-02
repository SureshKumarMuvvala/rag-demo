/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      screens: {
        // Header: show the middle tagline / full price stamp at/above 720px.
        hdr: '720px',
        // Explore tab: rail vs. horizontal chip bar threshold (per spec: <820px).
        nav: '820px',
        // Estimate tab: 3-pane vs. stacked threshold (per spec: <960px).
        wide: '960px',
      },
      colors: {
        ink: '#132029',
        'ink-soft': '#51636C',
        petrol: '#0E7C7B',
        'petrol-light': '#2FB6B0',
        'deep-petrol': '#0A5A59',
        accent: '#14B8A6',
        'accent-2': '#0EA5B5',
        amber: '#D98514',
        'amber-light': '#F0A93A',
        'value-green': '#2F7D5B',
        alert: '#D24B3A',
        'page-bg': '#EAF0F3',
        surfaces: '#FFFFFF',
        'tinted-surface': '#EDF6F6',
        borders: '#DCE5E8',
        'bright-green': '#7CC79A',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(19, 32, 41, 0.04), 0 10px 30px rgba(19, 32, 41, 0.07)',
        'card-lg': '0 2px 8px rgba(19, 32, 41, 0.05), 0 24px 56px rgba(14, 124, 123, 0.13)',
        glow: '0 10px 34px rgba(20, 184, 166, 0.38)',
        'glow-sm': '0 6px 18px rgba(20, 184, 166, 0.30)',
      },
      borderRadius: {
        xl: '0.85rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(115deg, #0A5A59 0%, #0E7C7B 42%, #14B8A6 100%)',
        'brand-gradient-soft': 'linear-gradient(115deg, rgba(14,124,123,0.10), rgba(20,184,166,0.10))',
      },
    },
  },
  plugins: [],
};
