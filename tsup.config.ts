import { defineConfig } from "tsup";

export default defineConfig({
  clean: true,
  dts: true,
  entry: ["src/index.ts"],
  external: ["fs", "path", "pathe", "fs-extra"],
  format: ["esm"],
  minify: "terser",
  target: "es2022",
});
