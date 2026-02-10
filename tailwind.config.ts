import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        obrica: {
          orange: "#E85D24",
          "orange-dark": "#D14D1A",
          "orange-light": "#F07040",
          dark: "#2B3138",
          "dark-light": "#3D454E",
          cream: "#F5F0EB",
          white: "#FFFFFF",
        },
      },
    },
  },
  plugins: [],
};
export default config;
