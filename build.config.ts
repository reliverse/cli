import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  declaration: false,
  entries: [
    {
      builder: "mkdist",
      outDir: "dist-npm",
      format: "esm",
      input: "src",
      ext: "js",
    },
  ],
  rollup: {
    emitCJS: false,
    esbuild: {
      exclude: ["**/*.test.ts"],
      target: "es2023",
      minify: true,
    },
  },
});
