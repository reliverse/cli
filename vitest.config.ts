import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["examples/**/*.test.ts"],
    exclude: ["node_modules", "dist-jsr", "dist-npm"],
    alias: {
      "~/": new URL("./src/", import.meta.url).pathname,
      "#/*": new URL("./addons/*", import.meta.url).pathname,
    },
    watch: false,
  },
});
