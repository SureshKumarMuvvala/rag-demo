/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#15242B',
        petrol: '#0E6E6E',
        'petrol-light': '#2DA0A0',
        amber: '#C2790C',
        'value-green': '#2F7D5B',
        alert: '#B5483A',
        'page-bg': '#E9EDEF',
        surfaces: '#FFFFFF',
        'tinted-surface': '#F2F8F8',
        borders: '#D9E0E3',
        'bright-green': '#7CC79A',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(21, 36, 43, 0.04), 0 4px 16px rgba(21, 36, 43, 0.06)',
      },
      borderRadius: {
        '2xl': '1rem',
      },
    },
  },
  plugins: [],
};
