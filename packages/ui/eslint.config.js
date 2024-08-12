import baseConfig from "@repo/eslintconfig/base";
import reactConfig from "@repo/eslintconfig/react";

/** @type {import('typescript-eslint').Config} */
export default [
	{
		ignores: [],
	},
	...baseConfig,
	...reactConfig,
];
