import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  entries: [
    {
      outDir: "dist",
      builder: "mkdist",
      input: "src",
      format: "esm",
      ext: "js",
      esbuild: {
        target: "es2022",
      },
    },
  ],

  rollup: {
    emitCJS: false,
    esbuild: {
      target: "es2022",
    },
  },

  declaration: false,
});
