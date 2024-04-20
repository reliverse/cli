import baseConfig from "@tools/eslintconfig/base";
import reactConfig from "@tools/eslintconfig/react";

/** @type {import('typescript-eslint').Config} */
export default [
	{
		ignores: [],
	},
	...baseConfig,
	...reactConfig,
];
