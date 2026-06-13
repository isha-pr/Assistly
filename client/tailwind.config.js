/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#F97316', // Orange
          dark: '#EA580C',    // Orange Dark
          light: '#FDBA74',   // Orange Light
        },
        secondary: {
          DEFAULT: '#FFFFFF', // White
          off: '#FFF7ED',     // Off White
        }
      },
      boxShadow: {
        soft: '0 4px 20px -2px rgba(249, 115, 22, 0.08), 0 2px 8px -1px rgba(0, 0, 0, 0.04)',
      }
    },
  },
  plugins: [],
}
