import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Warm parchment background for light mode
        parchment: {
          50:  '#FAFAF8',
          100: '#F5F3EF',
          200: '#EDE9E2',
          300: '#DDD8CE',
        },
        // Brand amber accent
        amber: {
          50:  '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        },
        // Deep slate for dark mode
        slate: {
          850: '#1A2233',
          900: '#111827',
          950: '#0B1120',
        },
      },
      fontFamily: {
        serif:  ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
        sans:   ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono:   ['ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        // Recipe-optimised scale — larger than typical
        'recipe-sm':  ['0.9375rem', { lineHeight: '1.5rem' }],   // 15px
        'recipe-base':['1.0625rem', { lineHeight: '1.75rem' }],  // 17px
        'recipe-lg':  ['1.1875rem', { lineHeight: '1.875rem' }], // 19px
        'recipe-xl':  ['1.375rem',  { lineHeight: '2rem' }],     // 22px
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '112': '28rem',
        '128': '32rem',
      },
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
      boxShadow: {
        'card':    '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-md': '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
        'card-lg': '0 10px 15px -3px rgb(0 0 0 / 0.07), 0 4px 6px -4px rgb(0 0 0 / 0.05)',
      },
      borderRadius: {
        'xl':  '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.15s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
