export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        rose: {
          50: "#fbf1f5",
          100: "#f7e3ec",
          200: "#efc8d9",
          300: "#e3a8c1",
          400: "#d488a8",
          500: "#c46d92",
          600: "#a8567a",
          700: "#8a4563",
        },
        mauve: {
          50: "#f6f1f5",
          100: "#ece0ea",
          200: "#dcc6d6",
          300: "#c4a3bd",
          400: "#ab82a3",
          500: "#8f6789",
        },
        lavender: {
          50: "#f4f1f9",
          100: "#e9e2f2",
          200: "#d6cae8",
          300: "#bca8d8",
          400: "#a288c6",
          500: "#8769ac",
        },
        blush: { 50: "#fdf3f1", 100: "#f9e7e6", 200: "#f3d2d4" },
        cream: { 50: "#fdf9f4", 100: "#f8f1e8" },
        ivory: { 50: "#fefbf6", 100: "#fbf5ec" },
        gold: { 300: "#e7cf95", 400: "#d9b46b", 500: "#c79a4f" },
        rosegold: { 300: "#ecc9bd", 400: "#dca895", 500: "#c68a73" },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', "Georgia", "serif"],
        sans: ['"Quicksand"', "ui-rounded", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "2xl": "1.1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      boxShadow: {
        soft: "0 6px 24px rgba(150, 90, 120, 0.10)",
        "soft-lg": "0 12px 36px rgba(150, 90, 120, 0.14)",
        glow: "0 8px 22px rgba(196, 109, 146, 0.32)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "petal-fall": {
          "0%": { transform: "translateY(-8vh) rotate(0deg)", opacity: "0" },
          "12%": { opacity: "0.7" },
          "100%": { transform: "translateY(108vh) rotate(320deg)", opacity: "0" },
        },
        float: {
          "0%,100%": { transform: "translateY(0) rotate(0deg)" },
          "50%": { transform: "translateY(-6px) rotate(4deg)" },
        },
        shimmer: {
          "0%": { "background-position": "-200% 0" },
          "100%": { "background-position": "200% 0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.4s ease-out both",
        "petal-fall": "petal-fall linear infinite",
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 6s linear infinite",
      },
    },
  },
  plugins: [],
};
