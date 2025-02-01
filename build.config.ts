import { defineBuildConfig } from "unbuild";

import pubConfig from "./pub.config.js";

export default defineBuildConfig({
  declaration: true,
  clean: false,
  entries: [
    {
      outDir: "dist-npm/bin",
      builder: "mkdist",
      format: "esm",
      input: "src",
      ext: "js",
    },
  ],
  rollup: {
    emitCJS: false,
    esbuild: {
      target: "es2023",
      minify: pubConfig.shouldMinify,
      exclude: ["**/*.test.ts", "**/__tests__/**"],
    },
  },
});
