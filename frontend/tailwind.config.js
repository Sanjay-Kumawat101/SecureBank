/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#eef1f7',
          100: '#d7ddec',
          200: '#b0bbd9',
          300: '#8899c5',
          400: '#5c6fa8',
          500: '#3d5089',
          600: '#293b6e',
          700: '#1e2c56',
          800: '#141d3d',
          900: '#0b1128',
          950: '#060a17',
        },
        security: {
          light: '#f5f3ff',
          DEFAULT: '#6d28d9',
          dark: '#4c1d95',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
