import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  // If entries is not provided, will be automatically inferred from package.json
  entries: [
    // default
    "./src/index",
    // mkdist builder transpiles file-to-file keeping original sources structure
    {
      builder: "mkdist",
      input: "./src",
      outDir: "./dist",
      format: "esm",
    },
  ],

  // Change outDir, default is 'dist'
  outDir: "dist",

  // Generates .d.ts declaration file
  declaration: true,

  rollup: {
    emitCJS: true,
    esbuild: {
      minify: true,
    },
  },
});
