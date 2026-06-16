import type { Config } from "tailwindcss";

/**
 * Ultraviolet Tailwind theme (PRD §7). Every custom color maps to the CSS
 * variables declared in `src/app/globals.css`, so they are usable as utility
 * classes (e.g. `bg-uv-navy`, `text-uv-text-primary`, `border-uhchi-primary`).
 * Loaded by Tailwind v4 via the `@config` directive in globals.css.
 */
const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        uv: {
          // core gradient (indigo → raspberry)
          navy: "var(--uv-navy)",
          "indigo-ink": "var(--uv-indigo-ink)",
          indigo: "var(--uv-indigo)",
          "indigo-mid": "var(--uv-indigo-mid)",
          "indigo-light": "var(--uv-indigo-light)",
          purple: "var(--uv-purple)",
          "purple-bright": "var(--uv-purple-bright)",
          "purple-warm": "var(--uv-purple-warm)",
          plum: "var(--uv-plum)",
          raspberry: "var(--uv-raspberry)",
          // functional surfaces
          "bg-primary": "var(--uv-bg-primary)",
          "bg-surface": "var(--uv-bg-surface)",
          "bg-elevated": "var(--uv-bg-elevated)",
          // text
          "text-primary": "var(--uv-text-primary)",
          "text-secondary": "var(--uv-text-secondary)",
          "text-muted": "var(--uv-text-muted)",
          // semantic
          success: "var(--uv-success)",
          warning: "var(--uv-warning)",
          error: "var(--uv-error)",
          info: "var(--uv-info)",
        },
        uhchi: {
          bg: "var(--uhchi-bg)",
          primary: "var(--uhchi-primary)",
          secondary: "var(--uhchi-secondary)",
          "red-dim": "var(--uhchi-red-dim)",
          "red-bright": "var(--uhchi-red-bright)",
          "teal-dim": "var(--uhchi-teal-dim)",
          "teal-bright": "var(--uhchi-teal-bright)",
        },
      },
      fontFamily: {
        display: "var(--font-display)",
        body: "var(--font-body)",
        sans: "var(--font-body)",
        mono: "var(--font-mono)",
      },
      backgroundImage: {
        "uv-gradient": "var(--uv-gradient)",
      },
      boxShadow: {
        "uv-glow": "0 0 2rem var(--uv-glow)",
      },
    },
  },
};

export default config;
