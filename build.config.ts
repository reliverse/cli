import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  declaration: false,
  clean: true,
  entries: [
    {
      builder: "mkdist",
      input: "./src/",
      outDir: "dist-npm/bin",
      format: "esm",
      ext: "js",
      pattern: [
        "**/*.ts",
        "**/*.tsx",
        "!**/*.d.ts",
        "!**/*.test.ts",
        "!**/__tests__/**",
      ],
    },
  ],
  rollup: {
    emitCJS: false,
    esbuild: {
      target: "es2023",
      minify: true,
      exclude: ["**/*.test.ts", "**/__tests__/**"],
    },
  },
});
