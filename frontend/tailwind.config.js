/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1B2559",
        marigold: { DEFAULT: "#F0A202", soft: "#FFF4D6", deep: "#8A5E00" },
        paper: "#F6F7FB",
        line: "#D9DDEA",
        slate2: "#4A5270",
        leaf: { DEFAULT: "#1E7F5C", soft: "#E3F4EC" },
        brick: { DEFAULT: "#B3361F", soft: "#FBE9E5" },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "Georgia", "serif"],
        sans: ['"Public Sans"', "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};
