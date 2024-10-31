// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

// https://astro.build/config
export default defineConfig({
  site: "https://docs.reliverse.org",
  integrations: [
    starlight({
      title: "Reliverse Docs",
      defaultLocale: "root",
      locales: {
        root: {
          label: "English",
          lang: "en",
        },
        pl: {
          label: "Polish (Polski)",
        },
        uk: {
          label: "Ukrainian (Українська)",
        },
      },
      social: {
        github: "https://github.com/blefnk/astro",
        discord: "https://discord.gg/C4Z46fHKQ8",
      },
      sidebar: [
        {
          label: "Relivator",
          autogenerate: { directory: "relivator" },
        },
        {
          label: "Reliverse",
          autogenerate: { directory: "reliverse" },
        },
      ],
    }),
  ],
});
