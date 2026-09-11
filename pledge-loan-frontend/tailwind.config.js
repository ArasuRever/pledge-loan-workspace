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
          50: '#fbf7ee',
          100: '#f5edd3',
          500: '#b8860b',
          600: '#996515',
          700: '#7a4f0c'
        }
      }
    },
  },
  plugins: [],
}