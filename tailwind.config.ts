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
        bg: {
          primary: '#0d1117',
          secondary: '#161b22',
          tertiary: '#21262d',
        },
        border: {
          default: '#30363d',
          subtle: '#21262d',
          emphasis: '#8b949e',
        },
        fg: {
          default: '#c9d1d9',
          muted: '#8b949e',
          subtle: '#6e7681',
        },
        accent: {
          blue: '#38bdf8',
          purple: '#a78bfa',
          green: '#34d399',
          orange: '#fb923c',
          pink: '#f472b6',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(56, 189, 248, 0)' },
          '50%': { boxShadow: '0 0 20px 4px rgba(56, 189, 248, 0.2)' },
        },
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
        'card-hover': '0 8px 24px rgba(0,0,0,0.4)',
        'glow-blue': '0 0 20px rgba(56, 189, 248, 0.3)',
        'glow-sm': '0 0 10px rgba(56, 189, 248, 0.2)',
      },
    },
  },
  plugins: [],
}

export default config
