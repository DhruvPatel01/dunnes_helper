/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#00703c',
          50: '#f0f7f3',
          100: '#d6ede2',
          500: '#00703c',
          600: '#005c31',
          700: '#004825'
        }
      }
    }
  },
  plugins: []
}
