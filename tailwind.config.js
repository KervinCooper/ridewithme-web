/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // "Fleet command" dark theme, carried over from the previous rewrite's
        // src/styles/tokens.css — see docs/ARCHITECTURE.md.
        bg: '#08090b',
        surface: '#121317',
        surface2: '#1a1c22',
        border: '#262a33',
        text: '#f5f6f8',
        'text-muted': '#9ca3b0',
        accent: '#34d399',
        'accent-2': '#2bb889',
        info: '#38bdf8',
        warn: '#f5b841',
        danger: '#f0524b',
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
      },
      spacing: {
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        6: '24px',
        8: '32px',
        12: '48px',
      },
    },
  },
  plugins: [],
};
