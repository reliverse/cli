import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/main.ts"],
  target: "es2022",
  minify: "terser",
  format: ["esm"],
  outDir: "dist",
  clean: true,
  dts: true,
});
