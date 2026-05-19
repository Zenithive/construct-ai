/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary brand green (from template)
        primary: "#1D9E75",
        'primary-dark': "#0F6E56",
        'primary-light': "#E1F5EE",
        'primary-mid': "#5DCAA5",
        // Surface tones (from template)
        'surface': "#ffffff",
        'surface-2': "#f7f7f5",
        'surface-3': "#f0f0ec",
      },
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'DM Sans', 'system-ui', 'sans-serif'],
        mono: ['var(--font-dm-mono)', 'DM Mono', 'monospace'],
      },
      borderRadius: {
        'theme-md': '8px',
        'theme-lg': '12px',
      },
    },
  },
  plugins: [],
};
