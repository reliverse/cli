// import fs from "node:fs/promises";
// import { basename, dirname } from "node:path";
// import typescript from "@rollup/plugin-typescript";

import { defineConfig } from "rollup";
import commonjs from "@rollup/plugin-commonjs";
import esbuild from "rollup-plugin-esbuild";
import resolve from "@rollup/plugin-node-resolve";
import { spawn } from "node:child_process";

// const pkg = JSON.parse(
// 	await fs.readFile(new URL("./package.json", import.meta.url), "utf-8"),
// );

export default defineConfig({
	input: "src/index.ts",
	// output: [
	// 	{
	// 		dir: "dist",
	// 		format: "cjs",
	// 		entryFileNames: "[name].cjs",
	// 		chunkFileNames: "[name]-[hash].cjs",
	// 	},
	// 	{
	// 		dir: "dist",
	// 		format: "esm",
	// 		entryFileNames: "[name].mjs",
	// 		chunkFileNames: "[name]-[hash].mjs",
	// 	},
	// ],
	output: [
		{
			dir: "dist",
			format: "cjs",
			// manualChunks(id) {
			// 	if (id.includes("utils")) return "utils";
			// },
			entryFileNames: "[name].cjs",
			// chunkFileNames: "[name].cjs",
			dynamicImportInCjs: true,
		},
	],
	plugins: [
		esbuild(),
		commonjs(),
		resolve(),
		// typescript({
		// 	noEmit: true,
		// 	tsconfig: "tsconfig.json",
		// }),
		{
			name: "postbuild",
			writeBundle() {
				return new Promise((resolve, reject) => {
					const child = spawn("ts-node", ["./rollup.postbuild.mjs"], {
						stdio: "inherit",
						shell: true,
					});
					child.on("close", (code) => {
						if (code !== 0) {
							reject(
								new Error(`❌ rollup postbuild() exited with code ${code}`),
							);
						} else {
							resolve();
						}
					});
				});
			},
		},
	],
	// external: [
	// 	...Object.keys(pkg.dependencies || []),
	// 	...Object.keys(pkg.peerDependencies || []),
	// ],
});
