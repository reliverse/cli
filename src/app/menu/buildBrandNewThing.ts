import { selectPrompt } from "@reliverse/prompts";

import type { ReliverseConfig } from "~/types/config.js";

import { REPO_SHORT_URLS } from "~/app/data/constants.js";
import { relinka } from "~/utils/console.js";

import {
  randomDevProjectTypeTitle,
  randomFrameworkTitle,
  randomInitialMessage,
  randomWebsiteCategoryTitle,
  randomWebsiteDetailsTitle,
} from "../data/messages.js";
import { createWebProject } from "./createWebProject.js";

export async function buildBrandNewThing(
  isDev: boolean,
  checkpointName?: string,
  config?: ReliverseConfig,
): Promise<void> {
  const endTitle =
    "📚 Check the docs to learn more: https://docs.reliverse.org/reliverse/cli";
  const initialMessage =
    randomInitialMessage[
      Math.floor(Math.random() * randomInitialMessage.length)
    ];

  // If template is specified in config, use it directly
  if (config?.defaultTemplate) {
    await createWebProject({
      template: config.defaultTemplate,
      message: initialMessage,
      mode: "buildBrandNewThing",
      allowI18nPrompt: config.shouldUseI18n,
      isDev,
      checkpointName,
      config,
    });
    return;
  }

  // Get category from config or prompt
  let category = config?.defaultCategory;
  if (!category) {
    const result = await selectPrompt({
      endTitle,
      title: initialMessage,
      options: [
        {
          label: "Development",
          value: "development",
          hint: "apps, sites, plugins, etc",
        },
        {
          label: "...",
          hint: "coming soon",
          value: "coming-soon",
          disabled: true,
        },
      ],
    });
    if (result !== "development") {
      relinka("error", "Invalid category selected");
      return;
    }
    category = result;
  }

  if (category === "development") {
    let template = "";

    // Get project type from config or prompt
    let devProjectType = config?.defaultProjectType;
    if (!devProjectType) {
      const result = await selectPrompt({
        endTitle,
        title:
          randomDevProjectTypeTitle[
            Math.floor(Math.random() * randomDevProjectTypeTitle.length)
          ],
        options: [
          {
            label: "Web Development",
            value: "website",
            hint: "web apps, sites, plugins, and more",
          },
          {
            label: "...",
            hint: "coming soon",
            value: "coming-soon",
            disabled: true,
          },
        ],
      });
      if (result !== "website") {
        relinka("error", "Invalid project type selected");
        return;
      }
      devProjectType = result;
    }

    if (devProjectType === "website") {
      // Get framework from config or prompt
      let framework = config?.defaultFramework;
      if (!framework) {
        const result = await selectPrompt({
          endTitle,
          title:
            randomFrameworkTitle[
              Math.floor(Math.random() * randomFrameworkTitle.length)
            ],
          options: [
            {
              label: "Next.js",
              value: "nextjs",
              hint: "recommended for most projects",
            },
            {
              label: "...",
              hint: "coming soon",
              value: "coming-soon",
              disabled: true,
            },
          ],
        });
        if (result !== "nextjs") {
          relinka("error", "Invalid framework selected");
          return;
        }
        framework = result;
      }

      // Get website category from config or prompt
      let websiteCategory = config?.defaultWebsiteCategory;
      if (!websiteCategory) {
        const result = await selectPrompt({
          endTitle,
          title:
            randomWebsiteCategoryTitle[
              Math.floor(Math.random() * randomWebsiteCategoryTitle.length)
            ],
          options: [
            { label: "E-commerce", value: "e-commerce" },
            {
              label: "...",
              hint: "coming soon",
              value: "coming-soon",
              disabled: true,
            },
          ],
        });
        if (result !== "e-commerce") {
          relinka("error", "Invalid website category selected");
          return;
        }
        websiteCategory = result;
      }

      if (websiteCategory === "e-commerce") {
        template = REPO_SHORT_URLS.relivatorGithubLink;
      }

      await createWebProject({
        template,
        message:
          randomWebsiteDetailsTitle[
            Math.floor(Math.random() * randomWebsiteDetailsTitle.length)
          ],
        mode: "buildBrandNewThing",
        allowI18nPrompt: config?.shouldUseI18n,
        isDev,
        checkpointName,
        config,
      });
    } else {
      relinka(
        "warn",
        "⚠️ The selected development project type is currently unavailable. Please choose another option.",
      );
    }
  }
}
