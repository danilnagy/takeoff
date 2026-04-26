import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        grid: "#d8dee8",
        accent: "#2563eb"
      }
    }
  },
  plugins: []
};

export default config;
