const { heroui } = require("@heroui/theme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'var(--font-geist-sans)', 'sans-serif'],
      },
    },
  },
  darkMode: "class",
  plugins: [
    require('@tailwindcss/forms'),
    heroui({
      themes: {
        light: {
          colors: {
            primary: {
              50: "#eff6ff",
              100: "#dbeafe", 
              200: "#bfdbfe",
              300: "#93c5fd",
              400: "#60a5fa",
              500: "#3b82f6",
              600: "#2563eb",
              700: "#1d4ed8",
              800: "#1e40af",
              900: "#1e3a8a",
              DEFAULT: "#2563eb",
              foreground: "#ffffff",
            },
          },
        },
        dark: {
          colors: {
            primary: {
              50: "#1e3a8a",
              100: "#1e40af",
              200: "#1d4ed8",
              300: "#2563eb",
              400: "#3b82f6",
              500: "#60a5fa",
              600: "#93c5fd",
              700: "#bfdbfe",
              800: "#dbeafe",
              900: "#eff6ff",
              DEFAULT: "#60a5fa",
              foreground: "#000000",
            },
            background: "#1a202c", // Dark background
            foreground: "#e2e8f0", // Light text
          },
        },
      },
    }),
  ],
}