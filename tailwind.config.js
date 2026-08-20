/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // Paleta real do tema Electric Lime usado no app. Os tokens antigos
      // (brand.primary azul #0066FF, surface #0D1527) não eram referenciados
      // em nenhum componente — todo o app usa estes valores em hex literal.
      colors: {
        obsidian: '#050811',
        surface: {
          DEFAULT: '#090F1E',
          sunken: '#060A14',
          raised: '#0A101F'
        },
        lime: {
          brand: '#84CC16',
          bright: '#A3E635'
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
