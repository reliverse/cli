import nextPlugin from "@next/eslint-plugin-next";

/** @type {Awaited<import('typescript-eslint').Config>} */
export default [
	{
		files: ["**/*.ts", "**/*.tsx"],
		plugins: {
			// "@stylistic": stylistic,
			"@next/next": nextPlugin,
		},
		rules: {
			...nextPlugin.configs.recommended.rules,
			...nextPlugin.configs["core-web-vitals"].rules,

			// TypeError: context.getAncestors is not a function
			"@next/next/no-duplicate-head": "off",

			// @see https://eslint.style/packages/default
			// "@stylistic/indent": ["error", 2],
		},
	},
];
