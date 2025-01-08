import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import Pages from "vite-plugin-pages";

// https://vite.dev/config
export default defineConfig({
  plugins: [
    react(),
    Pages({
      dirs: "src/pages",
      extensions: ["tsx", "ts"],
      exclude: ["**/components/**/*", "**/api/**/*"],
    }),
  ],
  resolve: {
    alias: {
      "~": "/src",
    },
  },
});
