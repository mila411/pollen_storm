/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'pollen': {
          'yellow': '#ffd700',
          'orange': '#ff8c00',
          'red': '#ff4500',
        },
        'bg': {
          'dark': '#0a0e27',
          'darker': '#050810',
        }
      },
      fontFamily: {
        sans: ['var(--font-noto-sans-jp)', 'sans-serif'],
      },
    },
  },
  plugins: [],
}