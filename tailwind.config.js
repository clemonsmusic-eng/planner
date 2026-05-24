/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        ios: {
          blue: '#007AFF',
          green: '#34C759',
          orange: '#FF9500',
          red: '#FF3B30',
          yellow: '#FFCC00',
          purple: '#AF52DE',
          gray: {
            100: '#f2f2f7',
            200: '#e5e5ea',
            300: '#d1d1d6',
            400: '#c7c7cc',
            500: '#aeaeb2',
            600: '#8e8e93',
          }
        }
      },
      screens: {
        'xs': '375px',
      },
    },
  },
  plugins: [],
}
