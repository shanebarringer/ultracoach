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
            // Mountain Peak Primary - Alpine Blue
            primary: {
              50: "#f0f9ff",
              100: "#e0f2fe", 
              200: "#bae6fd",
              300: "#7dd3fc",
              400: "#38bdf8",
              500: "#0ea5e9",
              600: "#0284c7",
              700: "#0369a1",
              800: "#075985",
              900: "#0c4a6e",
              DEFAULT: "#0284c7",
              foreground: "#ffffff",
            },
            // Mountain Peak Secondary - Summit Gold
            secondary: {
              50: "#fffbeb",
              100: "#fef3c7",
              200: "#fde68a",
              300: "#fcd34d",
              400: "#fbbf24",
              500: "#f59e0b",
              600: "#d97706",
              700: "#b45309",
              800: "#92400e",
              900: "#78350f",
              DEFAULT: "#fbbf24",
              foreground: "#0f172a",
            },
            // Training Zone Colors from Endurance Athlete
            success: "#059669",      // Zone 1 - Recovery
            warning: "#f97316",      // Zone 3 - Tempo  
            danger: "#ef4444",       // Zone 4 - Threshold
            // Mountain Peak Neutrals - Granite Gray
            default: {
              50: "#f8fafc",
              100: "#f1f5f9",
              200: "#e2e8f0",
              300: "#cbd5e1",
              400: "#94a3b8",
              500: "#64748b",
              600: "#475569",
              700: "#334155",
              800: "#1e293b",
              900: "#0f172a",
              DEFAULT: "#64748b",
              foreground: "#0f172a",
            },
            },
          background: "#f8fafc",
          foreground: "#0f172a",
        },
        dark: {
          background: "#0f172a",
          foreground: "#f1f5f9",
          colors: {
            // Mountain Peak Dark Mode
            primary: {
              50: "#0c4a6e",
              100: "#075985",
              200: "#0369a1",
              300: "#0284c7",
              400: "#0ea5e9",
              500: "#38bdf8",
              600: "#7dd3fc",
              700: "#bae6fd",
              800: "#e0f2fe",
              900: "#f0f9ff",
              DEFAULT: "#38bdf8",
              foreground: "#0f172a",
            },
            secondary: {
              DEFAULT: "#fbbf24",
              foreground: "#0f172a",
            },
            success: "#059669",
            warning: "#f97316", 
            danger: "#ef4444",
            default: {
              DEFAULT: "#475569",
              foreground: "#f1f5f9",
            },
          },
        },
      },
    }),
  ],
}