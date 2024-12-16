import type { TailwindReplacement, TailwindThemeVariable } from "~/types.js";

export const TAILWIND_REPLACEMENTS: TailwindReplacement[] = [
  // Configuration file changes
  {
    pattern: /@tailwind (base|components|utilities);/g,
    replacement: '@import "tailwindcss";',
    description: "Replace @tailwind directives with @import",
  },
  // Shadow scale changes
  {
    pattern: /shadow-sm/g,
    replacement: "shadow-xs",
    description: "Update shadow-sm to shadow-xs",
  },
  {
    pattern: /\bshadow\b(?!-)/g,
    replacement: "shadow-sm",
    description: "Update shadow to shadow-sm",
  },
  {
    pattern: /drop-shadow-sm/g,
    replacement: "drop-shadow-xs",
    description: "Update drop-shadow-sm to drop-shadow-xs",
  },
  {
    pattern: /\bdrop-shadow\b(?!-)/g,
    replacement: "drop-shadow-sm",
    description: "Update drop-shadow to drop-shadow-sm",
  },
  // Blur scale changes
  {
    pattern: /blur-sm/g,
    replacement: "blur-xs",
    description: "Update blur-sm to blur-xs",
  },
  {
    pattern: /\bblur\b(?!-)/g,
    replacement: "blur-sm",
    description: "Update blur to blur-sm",
  },
  // Border radius changes
  {
    pattern: /rounded-sm/g,
    replacement: "rounded-xs",
    description: "Update rounded-sm to rounded-xs",
  },
  {
    pattern: /\brounded\b(?!-)/g,
    replacement: "rounded-sm",
    description: "Update rounded to rounded-sm",
  },
  // Outline changes
  {
    pattern: /outline-none/g,
    replacement: "outline-hidden",
    description: "Replace outline-none with outline-hidden",
  },
  // CSS variable syntax in arbitrary values
  {
    pattern: /\[(--[\w-]+)\]/g,
    replacement: "($1)",
    description: "Update CSS variable syntax in arbitrary values",
  },
  // Hover variant update
  {
    pattern: /hover:/g,
    replacement: "hover:",
    description:
      "Keep hover: variant (now only applies when hover is supported)",
  },
  // Stacked variants order change (left-to-right)
  {
    pattern: /(first|last):\*:/g,
    replacement: "*:$1:",
    description: "Update stacked variants order to left-to-right",
  },
  // Ring width change
  {
    pattern: /\bring\b(?!-)/g,
    replacement: "ring-3",
    description: "Update default ring width from 3px to 1px",
  },
  // Theme function updates
  {
    pattern: /theme\(([\w.]+)\)/g,
    replacement: (match, p1) => {
      const parts = p1.split(".");
      if (parts[0] === "colors") {
        return `var(--color-${parts.slice(1).join("-")})`;
      }
      if (parts[0] === "screens") {
        return `var(--breakpoint-${parts[1]})`;
      }
      return match;
    },
    description: "Update theme() function to use CSS variables",
  },
  // Linear gradient updates
  {
    pattern: /bg-gradient-/g,
    replacement: "bg-linear-",
    description: "Update gradient utilities to new naming",
  },
  // Font stretch utilities
  {
    pattern: /font-condensed/g,
    replacement: "font-stretch-condensed",
    description: "Update font-condensed to font-stretch-condensed",
  },
  {
    pattern: /font-expanded/g,
    replacement: "font-stretch-expanded",
    description: "Update font-expanded to font-stretch-expanded",
  },
];

export const DEFAULT_THEME_VARIABLES: TailwindThemeVariable[] = [
  {
    name: "--font-sans",
    value:
      "ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'",
  },
  {
    name: "--font-serif",
    value: "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif",
  },
  {
    name: "--font-mono",
    value:
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
  { name: "--spacing", value: "0.25rem" },
];
