/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Brand colors
        coral: "#FF6B6B",
        teal: "#4ECDC4",
        yellow: "#FFE66D",

        // Custom color tokens
        primary: "#FF6B6B",
        secondary: "#4ECDC4",
        accent: "#FFE66D",

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
