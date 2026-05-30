/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Symphonica palette — warm amber Academy tones
        academy: {
          gold: '#C9A227',
          amber: '#D4A017',
          cream: '#F5ECD7',
          burgundy: '#6B1A2C',
          dark: '#1A1209',
        },
        discord: {
          crimson: '#8B0000',
          void: '#1C0A1C',
          shadow: '#2D1B2D',
        },
        rating: {
          superior: '#FFD700',
          excellent: '#4ADE80',
          good: '#60A5FA',
          fair: '#FB923C',
          poor: '#F87171',
        },
      },
      fontFamily: {
        fantasy: ['"Cinzel"', 'serif'],
        body: ['"Inter"', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #C9A227, 0 0 10px #C9A227' },
          '100%': { boxShadow: '0 0 20px #C9A227, 0 0 40px #C9A227' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [],
};
