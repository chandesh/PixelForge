/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        // MongoDB-inspired palette
        primary: {
          dark: "#001E2B",
          DEFAULT: "#001E2B",
          light: "#003049",
        },
        accent: {
          DEFAULT: "#00ED64",
          hover: "#00C755",
          light: "#B8FCC8",
        },
        surface: {
          DEFAULT: "#0E2A38",
          light: "#1C3D4F",
          lighter: "#2A4A5C",
          card: "#0E2A38",
        },
        border: {
          DEFAULT: "#1C3D4F",
          light: "#2A4A5C",
        },
        text: {
          primary: "#FFFFFF",
          secondary: "#A8C4D4",
          muted: "#6E8E9E",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      spacing: {
        "2": "8px",
        "4": "16px",
        "6": "24px",
        "8": "32px",
        "12": "48px",
        "16": "64px",
      },
      borderRadius: {
        DEFAULT: "8px",
        lg: "12px",
        xl: "16px",
      },
      boxShadow: {
        card: "0 2px 8px rgba(0, 0, 0, 0.3)",
        "card-hover": "0 4px 16px rgba(0, 0, 0, 0.4)",
      },
    },
  },
  plugins: [],
};
