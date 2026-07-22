/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f4f6ff',
          100: '#e9edff',
          200: '#cdd5ff',
          300: '#a2b0ff',
          400: '#6e80ff',
          500: '#4353ff',
          600: '#2531fa',
          700: '#1920e6',
          800: '#151bbd',
          900: '#171d96',
          950: '#0c0f57',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
