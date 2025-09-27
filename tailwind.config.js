/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Money Trust Microfinance brand colours
        primary: {
          DEFAULT: "#1E3A8A", // base blue
          light: "#3B82F6",
          dark: "#1E40AF",
        },
        secondary: {
          DEFAULT: "#10B981", // emerald
          light: "#34D399",
          dark: "#059669",
        },
        accent: {
          DEFAULT: "#F59E0B", // amber
          light: "#FBBF24",
          dark: "#D97706",
        },
      },
      keyframes: {
        // Defines a shimmer animation used for the global loading bar
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.5s linear infinite",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
