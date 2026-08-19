/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#070D18',
        surface: {
          DEFAULT: '#0D1527',
          hover: '#131F38',
          card: '#0A1120',
          border: 'rgba(255, 255, 255, 0.08)'
        },
        brand: {
          primary: '#0066FF',
          accent: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
          cyan: '#06B6D4'
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Space Grotesk', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
