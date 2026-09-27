import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Single Working Accent: Burnt Terracotta (~5% of pixels)
        accent: {
          DEFAULT: "#C84420",
          hover: "#B23B1B",
          subtle: "#FAF0ED",
          darkSubtle: "#2A1612",
        },
        // Semantic Muted (Not Neon)
        credit: {
          DEFAULT: "#2B6854",
          subtle: "#EDF5F2",
          darkSubtle: "#13231E",
        },
        debt: {
          DEFAULT: "#A83C24",
          subtle: "#FDF1EE",
          darkSubtle: "#291512",
        },
        // Flat Neutral Hierarchy
        light: {
          bg: "#F9F9F8",
          surface: "#FFFFFF",
          subtle: "#F2F2F0",
          border: "#E4E4E1",
          borderLight: "#EEEEEC",
          textPrimary: "#141516",
          textSecondary: "#5F6368",
          textMuted: "#8F9398",
        },
        dark: {
          bg: "#101112",
          surface: "#17181A",
          subtle: "#1E2022",
          border: "#282A2D",
          borderLight: "#202224",
          textPrimary: "#ECECEC",
          textSecondary: "#93979B",
          textMuted: "#616569",
        },
      },
      borderRadius: {
        DEFAULT: "8px",
        sm: "6px",
        md: "8px",
        lg: "8px",
        xl: "8px",
        "2xl": "8px",
        "3xl": "8px",
        full: "9999px",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        body: ["var(--font-plus-jakarta)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgba(0, 0, 0, 0.04)",
        none: "none",
      },
    },
  },
  plugins: [],
};

export default config;
