import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // EasyStitch brand palette — warm, soft, crafty
        cream: {
          50:  '#fdfaf5',
          100: '#faf3e7',
          200: '#f4e4c8',
        },
        rose: {
          soft: '#f2a7a7',
          DEFAULT: '#e8786e',
          deep: '#c95c52',
        },
        sage: {
          soft: '#c4d4c0',
          DEFAULT: '#89a882',
          deep: '#5c7a55',
        },
        sand: {
          DEFAULT: '#c9a96e',
          deep: '#a07840',
        },
        ink: '#2a2118',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        soft: '0 4px 24px rgba(42, 33, 24, 0.08)',
        card: '0 2px 12px rgba(42, 33, 24, 0.06)',
        float: '0 8px 32px rgba(42, 33, 24, 0.12)',
      },
    },
  },
  plugins: [],
}

export default config
