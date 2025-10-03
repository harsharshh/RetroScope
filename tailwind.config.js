/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        surface: 'var(--surface)',
        'surface-border': 'var(--surface-border)',
        accent: 'var(--accent)',
        muted: 'var(--muted)',
        'muted-foreground': 'var(--muted-foreground)',
        retroscope: {
          teal: '#2ED3B7',
          orange: '#FF8C39',
          purple: '#B362FF',
        },
      },
      boxShadow: {
        glow: '0 25px 60px -15px var(--shadow-soft)',
      },
      backgroundImage: {
        'retroscope-gradient': 'linear-gradient(90deg, #2ED3B7 0%, #FF8C39 50%, #B362FF 100%)',
      },
    },
  },
  plugins: [],
}
