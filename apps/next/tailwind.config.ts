import type { Config } from "tailwindcss";

import baseConfig from "@repo/tailwind/web";
import { fontFamily } from "tailwindcss/defaultTheme";

export default {
	// We need to append the path to the UI package to content
	// content array so that those classes are included correctly
	content: [...baseConfig.content, "../../packages/ui/**/*.{ts,tsx}"],
	presets: [baseConfig],
	theme: {
		extend: {
			fontFamily: {
				mono: ["var(--font-inter-mono)", ...fontFamily.mono],
				sans: ["var(--font-inter-sans)", ...fontFamily.sans],
			},
		},
	},
} satisfies Config;
