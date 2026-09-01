/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Brand colors
        coral: "#C94A4A",
        "coral-soft": "#FBE9E9",
        teal: "#297D76",
        "teal-soft": "#E4F3F1",
        yellow: "#FFE66D",

        // Custom color tokens
        primary: "#C94A4A",
        secondary: "#297D76",
        accent: "#FFE66D",

        // Semantic surface and text roles
        surface: "#FFFFFF",
        ink: "#1A1917",
        "ink-secondary": "#5C5A54",
        separator: "#E8E6E1",

        // Background colors
        "background-light": "#FAFAFA",
        "background-dark": "#1A1A2E",

        // Warm grays
        "warm-gray": {
          50: "#FAF9F7",
          100: "#F5F3F0",
          200: "#E8E6E1",
          300: "#D3D0C9",
          400: "#A9A69E",
          500: "#7F7C74",
          600: "#5C5A54",
          700: "#434139",
          800: "#2D2B26",
          900: "#1A1917",
        },
      },
      fontFamily: {
        sans: ["System", "sans-serif"],
        heading: ["Nunito_900Black"],
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "20px",
      },
      boxShadow: {
        warm: "0 4px 14px 0 rgba(0, 0, 0, 0.05)",
        "warm-lg": "0 10px 25px -3px rgba(0, 0, 0, 0.08)",
      },
    },
  },
  plugins: [],
};
