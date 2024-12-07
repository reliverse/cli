import { selectPrompt } from "@reliverse/prompts";
import relinka from "@reliverse/relinka";

import { REPO_SHORT_URLS } from "~/app/data/constants.js";

import { askProjectDetails } from "./04-askProjectDetails.js";

export async function buildBrandNewThing() {
  const endTitle =
    "📚 Check the docs to learn more: https://docs.reliverse.org/cli";
  const initialMessage =
    // "Let's build your own brand new digital thing from scratch! After that, you can customize everything however you like.";
    "Let's bring your vision to life by building something brand new from scratch! Once we're done, you'll have full freedom to customize it however you like. What category describes your project best?";

  const category = await selectPrompt({
    endTitle,
    title: initialMessage,
    options: [
      {
        label: "Development",
        value: "development",
        hint: "apps, sites, plugins, etc",
      },
      // {
      //   label: "[Coming soon] Design — Video — Music",
      //   value: "digital",
      //   disabled: true,
      // },
      // {
      //   label: "[Coming soon] Marketing — Writing",
      //   value: "marketing",
      //   disabled: true,
      // },
    ],
  });

  if (category === "development") {
    let template = "";

    const devProjectType = await selectPrompt({
      endTitle,
      title:
        "Fantastic! Let me help you craft a solid plan for your new project. Which subcategory best describes what you're working on?",
      options: [
        {
          label: "Web Development",
          value: "website",
          hint: "web apps, sites, plugins, and more",
        },
        // {
        //   label: "[Coming soon] Native Development",
        //   value: "native-dev",
        //   hint: "desktop and mobile",
        //   disabled: true,
        // },
        // {
        //   label: "[Coming soon] Command-line Tool",
        //   value: "command-line-tool",
        //   disabled: true,
        // },
        // {
        //   label: "[Coming soon] Game Development",
        //   value: "game-dev",
        //   disabled: true,
        // },
        // {
        //   label: "[Coming soon] Extensions",
        //   value: "extensions",
        //   disabled: true,
        // },
        // { label: "[Coming soon] Monorepo", value: "monorepo", disabled: true },
        // { label: "[Coming soon] Bot", value: "bot", disabled: true },
      ],
    });

    // if (devProjectType === "game-dev") {
    //   const gameSubcategory = await selectPrompt({
    //     endTitle,
    //     title: "What kind of game do you want to build?",
    //     options: [
    //       { label: "⚔️  2D/3D Video Game", value: "video-game", disabled: true },
    //       { label: "🌐 2D/3D Web Game", value: "web-game", disabled: true },
    //       { label: "🖥️  3D-based Web App", value: "3d-web-app", disabled: true },
    //     ],
    //   });

    // } else if (devProjectType === "native-dev") {
    //   const nativeSubcategory = await selectPrompt({
    //     endTitle,
    //     title: "What kind of native app do you want to build?",
    //     options: [
    //       { label: "📱 iOS Application", value: "ios-app", disabled: true },
    //       {
    //         label: "🌐 Android Application",
    //         value: "android-app",
    //         disabled: true,
    //       },
    //     ],
    //   });

    if (devProjectType === "website") {
      const websiteSubcategory = await selectPrompt({
        endTitle,
        title: "What type of website do you want me to help you build?",
        options: [
          {
            label: "Web App & Static Site",
            value: "web-app",
            hint: "Next.js, Vite, Astro, Vue, etc",
          },
          // {
          //   label: "[Coming soon] WordPress",
          //   value: "wordpress",
          //   hint: "The most popular CMS in the world",
          //   disabled: true,
          // },
          // {
          //   label: "[Coming soon] Classic Website",
          //   value: "classic-website",
          //   hint: "HTML/CSS/JS",
          //   disabled: true,
          // },
        ],
      });

      const framework = await selectPrompt({
        endTitle,
        title: "Time to make a choice! Which framework would you like to use?",
        options: [
          {
            label: "Next.js",
            value: "nextjs",
            hint: "recommended for most projects",
          },
          // {
          //   label: "[Coming soon] Vite",
          //   value: "vite",
          //   disabled: true,
          //   hint: "good for micro-frontends",
          // },
          // {
          //   label: "[Coming soon] Astro",
          //   value: "astro",
          //   disabled: true,
          //   hint: "good for static sites",
          // },
          // {
          //   label: "[Coming soon] Vue",
          //   value: "vue",
          //   disabled: true,
          //   hint: "good for single-page apps",
          // },
        ],
      });

      const websiteCategory = await selectPrompt({
        endTitle,
        title: "Let's narrow it down: What category best fits your website?",
        options: [
          { label: "E-commerce", value: "e-commerce" },
          // { label: "[Coming soon] Blog", value: "blog", disabled: true },
          // {
          //   label: "[Coming soon] Portfolio",
          //   value: "portfolio",
          //   disabled: true,
          // },
        ],
      });

      if (websiteCategory === "e-commerce") {
        template = REPO_SHORT_URLS.versatorGithubLink;
      }

      await askProjectDetails(
        template,
        " Your initial plan is all set! Now, let’s add some personal touches. Please share a few details about yourself and the app so I can personalize everything for you.",
        "buildBrandNewThing",
        true,
      );
      /* END OF WEBSITE CATEGORY */
    }

    // else if (devProjectType === "extensions") {
    //   const extensionSubcategory = await selectPrompt({
    //     endTitle,
    //     title: "What kind of extension do you want to build?",
    //     options: [
    //       {
    //         label: "🌐 Browser Extension",
    //         value: "browser-extension",
    //         disabled: true,
    //       },
    //       {
    //         label: "🔧 VSCode Extension",
    //         value: "vscode-extension",
    //         disabled: true,
    //       },
    //       { label: "📝 ESLint Plugin", value: "eslint-plugin", disabled: true },
    //     ],
    //   });

    //   const projectType = await selectPrompt({
    //     endTitle,
    //     title: "What kind of project do you want to build?",
    //     options: [
    //       { label: "📦 Monorepo", value: "monorepo", disabled: true },
    //       { label: "🤖 Bot", value: "bot", disabled: true },
    //     ],
    //   });
    // }
    else {
      relinka.warn(
        "⚠️ The selected development project type is currently unavailable. Please choose another option.",
      );
    }

    /* END OF DEVELOPMENT CATEGORY */
  }

  // else if (category === "digital") {
  //   relinka.warn(
  //     "🎨 Digital projects creation mode is currently under maintenance. Please check back later.",
  //   );
  //   const digitalSubcategory = await selectPrompt({
  //     endTitle,
  //     title: "Choose a digital subcategory:",
  //     options: [
  //       { label: "🎨 UI Design", value: "ui-design", disabled: true },
  //       { label: "🎨 Graphic Design", value: "graphic-design", disabled: true },
  //       { label: "🖌️  Digital Painting", value: "painting", disabled: true },
  //       { label: "🎧 Audio Related", value: "audio", disabled: true },
  //       { label: "🎬 Video Related", value: "video", disabled: true },
  //     ],
  //   });

  //   /* END OF DIGITAL CATEGORY */
  // }

  // else if (category === "marketing") {
  //   relinka.warn(
  //     "💰 Marketing projects creation mode is currently under maintenance. Please check back later.",
  //   );
  //   const marketingSubcategory = await selectPrompt({
  //     endTitle,
  //     title: "Choose a marketing subcategory:",
  //     options: [
  //       {
  //         label: "📈 SEO Optimization",
  //         value: "seo-optimization",
  //         disabled: true,
  //       },
  //       { label: "📝 Copywriting", value: "copywriting", disabled: true },
  //       {
  //         label: "📊 Social Media Campaign",
  //         value: "social-media-campaign",
  //         disabled: true,
  //       },
  //     ],
  //   });
  //   /* END OF MARKETING CATEGORY */
  // }
}
