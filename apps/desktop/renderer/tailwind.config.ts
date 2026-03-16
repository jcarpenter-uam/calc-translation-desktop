import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}", "../../../packages/app/src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "rgb(var(--color-canvas) / <alpha-value>)",
        panel: "rgb(var(--color-panel) / <alpha-value>)",
        line: "rgb(var(--color-line) / <alpha-value>)",
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        "ink-muted": "rgb(var(--color-ink-muted) / <alpha-value>)",
        accent: "rgb(var(--color-accent) / <alpha-value>)",
        "accent-hover": "rgb(var(--color-accent-hover) / <alpha-value>)",
        "accent-contrast": "rgb(var(--color-accent-contrast) / <alpha-value>)",
        lime: "rgb(var(--color-lime) / <alpha-value>)",
        "lime-hover": "rgb(var(--color-lime-hover) / <alpha-value>)",
        "lime-contrast": "rgb(var(--color-lime-contrast) / <alpha-value>)",
      },
      boxShadow: {
        panel: "0 24px 48px -24px rgb(var(--color-shadow) / 0.24)",
      },
    },
  },
  plugins: [],
} satisfies Config;
