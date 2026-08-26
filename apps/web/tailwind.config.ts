import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        emerald: {
          500: "#10b981",
          600: "#059669",
        },
        voxel: {
          dirt: "#5B3A29",
          stone: "#7C7C7C",
          grass: "#4E8732",
          wood: "#8B5A2B",
          diamond: "#4AE0E0",
          bedrock: "#1C1C1C",
        }
      },
    },
  },
  plugins: [],
};
export default config;
