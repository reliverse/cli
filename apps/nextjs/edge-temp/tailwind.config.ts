import type { Config } from "tailwindcss";

import baseConfig from "@acme/tailwind-config";

export default {
  content: ["./src/**/*.{js,jsx,ts,tsx,mdx}"],
  presets: [baseConfig],
} satisfies Config;
