// @ts-check

/** @type import('dts-bundle-generator/config-schema').OutputOptions */
const commonOutputParams = {
	inlineDeclareGlobals: false,
	sortNodes: true,
};

/** @type import('dts-bundle-generator/config-schema').BundlerConfig */
const config = {
	compilationOptions: {
		preferredConfigPath: "./tsconfig.json",
	},

	entries: [
		{
			filePath: "./src/index.ts",
			outFile: "./dist/index.d.ts",
			noCheck: false,
			output: commonOutputParams,
		},

		/* {
			filePath: "./src/core.ts",
			outFile: "./dist/core.d.ts",
			failOnClass: true,
			libraries: { inlinedLibraries: ["valibot"] },
			output: commonOutputParams,
		}, */
	],
};

module.exports = config;
