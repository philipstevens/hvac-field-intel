import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        field: {
          bg: '#0B1422',
          surface: '#101C32',
          surface2: '#152440',
          surface3: '#1A2B4A',
          border: '#1F3050',
          'border-bright': '#2A4268',
          accent: '#F97316',
          'accent-hover': '#EA6A0A',
          text: '#DCE9F7',
          muted: '#587290',
          'muted-bright': '#8BAABF',
          green: '#22C55E',
          amber: '#F59E0B',
          red: '#EF4444',
          blue: '#3B82F6',
          purple: '#A855F7',
        },
      },
      fontFamily: {
        barlow: ['var(--font-barlow)', 'system-ui', 'sans-serif'],
        bc: ['var(--font-barlow-condensed)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
