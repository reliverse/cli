import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  minify: "terser",
  format: ["esm"],
  clean: true,
  dts: true,
});
