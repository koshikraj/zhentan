import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        claw: {
          DEFAULT: "#F0B90B",
          400: "#F5D042",
          500: "#F0B90B",
          600: "#D4A506",
        },
        primary: {
          400: "#38bdf8",
          500: "#0ea5e9",
        },
        accent: {
          teal: "#2dd4bf",
          indigo: "#818cf8",
        },
      },
    },
  },
  plugins: [],
};

export default config;
