/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Body/UI. Poppins is the geometric sans the brand site sets its copy
        // in; it keeps a large x-height, which is what makes the 9–12px nav
        // and badge labels in this app readable on a phone.
        sans: ['Poppins', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        // Headlines. Jost carries the taller ascenders and airier geometry of
        // the marketing headline type — right for big text, too delicate for
        // 9px labels, so it is scoped to h1–h3 and .font-display.
        display: ['Jost', 'Poppins', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        /*
         * Smooth Transitions teal, replacing Tailwind's stock `teal`, so the
         * ~300 existing teal-* classes take the brand hue without a rewrite.
         *
         * 500 is the marketing teal as-is. 600 — the shade this app puts white
         * text on for every primary button — is pulled one step deeper so the
         * label clears 4.5:1 contrast; the brand's own bright-teal-under-white
         * pairing sits at 2.7:1, which is fine for a hero and not for a form
         * someone fills in on a job site.
         */
        teal: {
          50:  '#EFFAF7',
          100: '#D2F0E8',
          200: '#A6E1D4',
          300: '#71CDB9',
          400: '#3FB49D',
          500: '#1E9A84',
          600: '#0F8271',
          700: '#0C6B5D',
          800: '#0E564C',
          900: '#124840',
          950: '#052C27',
        },
        brand: {
          mint: '#26A68D',  // header/hero teal from the site
          light: '#5CC9B4', // the site's light accent button
          deep: '#0B6D5F',
          ink: '#124840',
        },
        ios: {
          blue: '#007AFF',
          green: '#34C759',
          orange: '#FF9500',
          red: '#FF3B30',
          yellow: '#FFCC00',
          purple: '#AF52DE',
          gray: {
            100: '#f4f7f6',
            200: '#e3eae8',
            300: '#cfd9d6',
            400: '#b9c5c2',
            500: '#7A8A85',
            600: '#64736E',
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
