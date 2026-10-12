/** @type {import('tailwindcss').Config} */
import colors from 'tailwindcss/colors';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    borderRadius: {
      none: '0',
      sm: '0.25rem',
      DEFAULT: '0.375rem',
      md: '0.375rem',
      lg: '0.5rem',
      xl: '0.5rem',
      '2xl': '0.5rem',
      '3xl': '0.5rem',
      full: '9999px',
    },
    extend: {
      colors: {
        blue: {
          50: '#eff4f9',
          100: '#dce6f0',
          200: '#c0d0e0',
          300: '#9fb5ce',
          400: '#7594b5',
          500: '#4e7399',
          600: '#355b80',
          700: '#294967',
          800: '#213c56',
          900: '#173b67',
          950: '#102d50',
        },
        emerald: colors.teal,
      },
    },
  },
  plugins: [],
};

