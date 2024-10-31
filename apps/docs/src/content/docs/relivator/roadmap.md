---
title: Relivator's ROADMAP.md
description: Key features and improvements planned for the Relivator Next.js template and the Reliverse CLI.
---

## Relivator & Reliverse Roadmap

*The roadmap below may be outdated. We will fully update this README.md with the release of Relivator 1.3.0.*

*The roadmap below outlines the key features and improvements planned for the Next.js Reliverse starter and the Reliverse CLI. Items not marked may already be configured but might not have been thoroughly tested. If you spot any issues, please open an issue.*

- [x] 1. Build on [Next.js 15](https://nextjs.org) [App Router](https://nextjs.org/docs/app) & [Route Handlers](https://nextjs.org/docs/app/building-the-application/routing/route-handlers), with [Million Lint](https://million.dev) and [Turbopack](https://turbo.build/pack) support (with optional [Turborepo v2](https://turbo.build/blog/turbo-2-0) for faster builds). Utilize [React 19](https://react.dev) (with the new [React Compiler](https://react.dev/learn/react-compiler) and [eslint-plugin-react-compiler](https://react.dev/learn/react-compiler#installing-eslint-plugin-react-compiler)), [TailwindCSS](https://tailwindcss.com), and [TypeScript 5](https://typescriptlang.org) as core technologies.
- [x] 2. Implement [Drizzle ORM](https://orm.drizzle.team) to support **both MySQL and PostgreSQL** databases, and integrate with [Neon](https://neon.tech), [Railway](https://railway.app?referralCode=sATgpf), [PlanetScale](https://planetscale.com), and [Vercel](https://vercel.com) services.
- [x] 3. Configure `next.config.js` with i18n, MDX, with both [Million.js Compiler & Million Lint](https://million.dev/blog/lint-rc) support. Enable these cool experiments: after, forceSwcTransforms, instrumentationHook (disabled by default), mdxRs, optimisticClientCache, [optimizePackageImports](https://nextjs.org/docs/app/api-reference/next-config-js/optimizePackageImports), optimizeServerReact, [ppr (Partial Prerendering)](https://nextjs.org/docs/app/api-reference/next-config-js/partial-prerendering), reactCompiler (disabled by default), serverMinification, turbo.
- [x] 4. Aim for thorough documentation and a beginner-friendly approach throughout the project.
- [x] 5. Configure and comment on `middleware.ts` for i18n and next-auth.
- [x] 6. Set up a Content-Security-Policy (CSP) system to prevent XSS attacks (disabled by default).
- [x] 7. Provide well-configured VSCode settings and recommended extensions (set `"extensions.ignoreRecommendations"` to `true` if you don't want to see the recommendations).
- [x] 8. Optimize the [Next.js Metadata API](https://nextjs.org/docs/app/building-the-application/optimizing/metadata) for SEO, integrating file-system handlers.
- [x] 9. Integrate a TailwindCSS screen size indicator for local project runs.
- [x] 10. Implement extensive internationalization in 11 languages (English, German, Spanish, Persian, French, Hindi, Italian, Polish, Turkish, Ukrainian, Chinese) using the [next-intl](https://next-intl-docs.vercel.app) library, which works on both server and client, and include support for `next dev --turbo`.
- [x] 11. Implement authentication through **both [Clerk](https://clerk.com) and [Auth.js (next-auth@beta/NextAuth.js)](https://authjs.dev)**.
- [x] 12. Implement [tRPC](https://trpc.io) and [TanStack Query](https://tanstack.com/query) (with [React Normy](https://github.com/klis87/normy#readme)) for advanced server and client data fetching.
- [x] 13. Establish a user subscription and checkout system using [Stripe](https://github.com/stripe/stripe-node#readme).
- [x] 14. Ensure type-safety validations for project schemas and UI fields using the [zod](https://zod.dev) library.
- [x] 15. Employ [ESLint v9](https://eslint.org) with [TypeScript-ESLint v8](https://typescript-eslint.io) and configure `eslint.config.js` (**Linting can take some time, so please be patient**) to work with both [Biome](https://biomejs.dev) ~~and [Prettier](https://prettier.io) (including the Sort Imports Prettier plugin)~~ for readable, clean, and safe code. **Currently not available | TODO:** use `pnpm ui:eslint` to open the [ESLint Flat Config Viewer](https://github.com/antfu/eslint-flat-config-viewer#eslint-flat-config-viewer) UI tool. **Note:** Starting Relivator 1.3.0 Prettier can be added manually by running `reliverse` command (read [the announcement](https://github.com/blefnk/relivator-nextjs-starter/issues/36)).
- [x] 16. Elegantly implement the font system, utilizing [Inter](https://rsms.me/inter) and additional typefaces.
- [x] 17. Develop a storefront, incorporating product, category, and subcategory functionality.
- [x] 18. Design a modern, cleanly composed UI using [Radix](https://radix-ui.com), with attractive UI components from [shadcn/ui](https://ui.shadcn.com).
- [x] 19. Compose a comprehensive, beginner-friendly `README.md`, including descriptions of [environment variables](https://nextjs.org/docs/basic-features/environment-variables).
- [ ] 20. Realize blog functionality through the use of MDX files.
- [ ] 21. Use absolute paths everywhere where applied in the project. The project has a predictable and consistent import logic, no unnecessary use of things like `import * as React`.
- [ ] 22. Use [Kysely](https://kysely.dev) with Drizzle to achieve full TypeScript SQL query builder type-safety.
- [ ] 23. Translate README.md and related files into more languages.
- [ ] 24. Transform beyond a simple e-commerce store to become a universal website starter.
- [ ] 25. Tidy up `package.json` with correctly installed and orderly sorted packages in `dependencies` and `devDependencies`.
- [ ] 26. The project author should publish a series of detailed videos on how to use this project. There should also be some enthusiasts willing to publish their own videos about the project on their resources.
- [ ] 27. Reduce the number of project packages, config files, and etc., as much as possible.
- [ ] 28. Reduce HTML tag nesting and ensure correct usage of HTML tags whenever possible.
- [ ] 29. Prioritize accessibility throughout, for both app user UI (User Interface) and UX (User Experience), as well as developers' DX (Developer Experience). Maintain usability without compromising aesthetics.
- [ ] 30. Prefer using [const-arrow](https://freecodecamp.org/news/when-and-why-you-should-use-es6-arrow-functions-and-when-you-shouldnt-3d851d7f0b26) and [type](https://million.dev/docs/manual-mode/block) over [function](https://freecodecamp.org/news/the-difference-between-arrow-functions-and-normal-functions) and [interface](https://totaltypescript.com/type-vs-interface-which-should-you-use) where applicable, and vice versa where applicable correspondingly, with using helpful ESLint [arrow-functions](https://github.com/JamieMason/eslint-plugin-prefer-arrow-functions#readme) plugin, to maintain readable and clean code by adhering to specific [recommendations](https://youtu.be/nuML9SmdbJ4) for [functional programming](https://toptal.com/javascript/functional-programming-javascript).
- [ ] 31. Optimize all app elements to improve dev cold start and build speeds.
- [ ] 32. Move each related system to its special folder (into the `src/core` folder), so any system can be easily removed from the project as needed.
- [ ] 33. Move component styles to .css or .scss files, or use packages that provide "syntactic sugar" for styles in .tsx files by using [tokenami](https://github.com/tokenami/tokenami#readme) CSS library. Implement possibility to implement [Figma Tokens System](https://blog.devgenius.io/link-figma-and-react-using-figma-tokens-89e6cc874b4d) to work seamlessly with the project. Tip: go to point #90 of this roadmap to learn more about new ways to use CSS-in-JS.
- [ ] 34. Migrate to Auth.js (next-auth@beta/NextAuth.js)' [next-auth@beta](https://npmjs.com/package/next-auth?activeTab=versions) ([discussions](https://github.com/nextauthjs/next-auth/releases/tag/next-auth%405.0.0-beta.4)), and to [React 19](https://19.react.dev/blog/2024/04/25/react-19).
- [ ] 35. Manage email verification, newsletter sign-ups, and email marketing via [Resend](https://resend.com) and [React Email](https://react.email).
- [ ] 36. Make sure each page and the middleware are green or yellow, but not red, upon build in the development terminal.
- [ ] 37. Make each environment variable optional, allowing the app to operate without anything configured, simply omitting specific code sections as necessary.
- [ ] 38. Keep the project on the best possible way of writing good and clean code, by following guidelines like [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript/tree/master/react) / [Airbnb React/JSX Style Guide](https://github.com/airbnb/javascript/tree/master/react). Use `??` (nullish coalescing) everywhere instead of `||` (logical OR) (unless there's a good reason to use it in the specific cases) – [why we should use nullish coalescing](https://stackoverflow.com/questions/61480993/when-should-i-use-nullish-coalescing-vs-logical-or); (Is there any ESLint rule/plugin for that?).
- [ ] 39. Keep the project free from things like `@ts-expect-error`, `eslint-disable`, `biome-ignore`, and others related not very safety things.
- [ ] 40. Keep the cookie count as low as possible, prepare for a cookie-free future, implement cookie management and notifications.
- [ ] 41. Introduce a comment system for products, including Review and Question types.
- [ ] 42. Integrate valuable things from [Next.js' Examples](https://github.com/vercel/next.js/tree/canary/examples) into this project.
- [ ] 43. Integrate valuable insights from [Next.js Weekly](https://nextjsweekly.com/issues) into this starter.
- [ ] 44. Implement type-safe [GraphQL](https://hygraph.com/learn/graphql) support by using [Fuse.js](https://fusejs.org) framework.
- [ ] 45. Implement the best things from [Payload CMS](https://github.com/payloadcms/payload) with Relivator's improvements.
- [ ] 46. Implement Storybook 8.x support (read the "[Storybook for React Server Components](https://storybook.js.org/blog/storybook-react-server-components)" announcement).
- [ ] 47. Implement smart and unified log system, both for development and production, both for console and writing to specific files.
- [ ] 48. Implement Sentry to handle errors and CSP reports for the application.
- [ ] 49. Implement Relivator's/Reliverse's own version of [Saas UI](https://saas-ui.dev) to be fully compatible with our project with only needed functionality, with using Tailwind and Shadcn instead of Chakra.
- [ ] 50. Implement our own fork of [Radix Themes](https://radix-ui.com) library with set up `<main>` as wrapper instead of its current `<section>`; OR implement our very own solution which generates Tailwind instead of Radix's classes.
- [ ] 51. Implement full [Million.js](https://million.dev) support (read [Million 3.0 Announcement](https://million.dev/blog/million-3) to learn more).
- [ ] 52. Implement file uploads using [UploadThing](https://uploadthing.com) and [Cloudinary](https://cloudinary.com) (NOTE: "res.cloudinary.com" and "utfs.io" should be added to `nextConfig.images.remotePatterns`).
- [ ] 53. Implement dynamic switching between app features, like database provider, by making corresponding checks for environment variables.
- [ ] 54. Implement docs to the project and move each explanation from the code into that docs.
- [ ] 55. Implement deep feature-parity and easy-migration compatibility with Reliverse.
- [ ] 56. Implement cooperation possibilities by using things like [liveblocks](https://liveblocks.io).
- [ ] 57. Implement CLI to quickly get Relivator with selected options only; try to use [Charm](https://charm.sh) things to build the Reliverse CLI.
- [ ] 58. Implement AI like GPT chat features by using [Vercel AI SDK](https://sdk.vercel.ai/docs) (see: [Introducing the Vercel AI SDK](https://vercel.com/blog/introducing-the-vercel-ai-sdk)).
- [ ] 59. Implement advanced theme switching without flashing, utilizing Tailwind Dark Mode with [React Server Side support](https://michaelangelo.io/blog/darkmode-rsc) and dynamic cookies.
- [ ] 60. Implement [Jest](https://jestjs.io) testing, optimized for Next.js.
- [ ] 61. Guarantee that every possible page is enveloped using predefined shell wrappers.
- [ ] 62. Generously write comment only if it really is needed. Rewrite all code in the way to eliminate need in describing code in comments (read more in "Clean Code" book by Robert Cecil Martin). Consider using `/** block comment */` only in the `.mjs` and `.js` files.
- [ ] 63. Fully develop advanced sign-up and sign-in pages, integrating both social media and classic form methods.
- [ ] 64. Follow the best practices from the articles and videos like "[10 React Antipatterns to Avoid](https://youtube.com/watch?v=b0IZo2Aho9Y)" (check theirs comment section as well).
- [ ] 65. Follow recommendations from [Material Design 3](https://m3.material.io) and other design systems when relevant.
- [ ] 66. Establish, document, and adhere to conventions, such as maintaining a single naming case style for files and variables.
- [ ] 67. Establish a comprehensive i18n, using country and locale codes, and support even more languages. Ensure native speakers verify each language following machine translation. Consider to use the [next-international](https://github.com/QuiiBz/next-international) library.
- [ ] 68. Ensure ultimate type-safety using strict mode in [TypeScript](https://typescriptlang.org) including ["Do's and Don'ts"](https://typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html) recommendations (without using [dangerous type assertions](https://youtube.com/watch?v=K9pMxqb5IAk), and with [optional types correct usage](https://youtube.com/watch?v=qy6IBZggXSQ), by also using `pnpm typestat` — once you run that, [TypeStat](https://github.com/JoshuaKGoldberg/TypeStat) will start auto-fixing TS typings); And also ensure type-safety with typedRoutes, zod, middleware, etc.
- [ ] 69. Ensure the project lacks any unused items, such as packages, libraries, and variables. Also, make sure the project's code adheres to the [Never Nester principles](https://youtube.com/watch?v=CFRhGnuXG-4). Because, as Linus Torvalds once said, *If you need more than 3 levels of indentation, you're screwed anyway, and should fix the program*.
- [ ] 70. Ensure project has full support for [GSAP](https://gsap.com) (GreenSock Animation Platform) library, with convenient ways to use @gsap/react [useGSAP() hook](https://gsap.com/docs/v3/React/tools/useGSAP).
- [ ] 71. Ensure full Next.js Edge support and compatibility.
- [ ] 72. Ensure full [Biome](https://biomejs.dev), [Bun](https://bun.sh), and [Docker](https://docker.com) support and compatibility.
- [ ] 73. Ensure all website languages are grammatically correct and adhere to the latest rules for each language.
- [ ] 74. Ensure all items in the project are sorted in ascending order unless different sorting is required elsewhere.
- [ ] 75. Ensure the project avoids using redundant imports, such as importing everything from React, when it's sufficient to import only the necessary hooks, for example. The project doesn't use things that are automatically handled by the React Compiler (only where it fails), making the code much more readable. Million Lint must work seamlessly with React Compiler.
- [ ] 76. Ensure accessibility for **users**, **developers** (both beginners and experts), **bots** (like [Googlebot](https://developers.google.com/search/docs/crawling-indexing/googlebot) or [PageSpeed Insights Crawler](https://pagespeed.web.dev)), for **everyone**.
- [ ] 77. Enhance `middleware.ts` configuration with multi-middleware implementation.
- [ ] 78. Employ all relevant [TanStack](https://tanstack.com) libraries.
- [ ] 79. Eliminate each disabling in the `eslint.config.js` file, configure config to strict, but to be still beginner-friendly.
- [ ] 80. Elegantly configure `app.ts`, offering a single config to replace all possible others.
- [ ] 81. Develop workflows for both sellers and customers.
- [ ] 82. Develop an even more sophisticated implementation of user subscriptions and the checkout system via Stripe; and also write Jest/Ava tests for Stripe and use `.thing/hooks/stripe_*.json` [webhookthing](https://docs.webhookthing.com) data files for these tests.
- [ ] 83. Develop an advanced storefront featuring products, categories, and subcategories.
- [ ] 84. Develop an advanced 404 Not Found page with full internationalization support.
- [ ] 85. Develop advanced sign-up, sign-in, and restoration using email-password and magic links.
- [ ] 86. Decrease file count by merging similar items, etc.
- [ ] 87. Create the most beginner-friendly and aesthetically pleasing starter possible.
- [ ] 88. Create an advanced notification system, inclusive of toasters, pop-ups, and pages.
- [ ] 89. Create a new landing page with a distinctive design and update components, plus fully redesign all other pages and components.
- [ ] 90. Consider adding Facebook's [StyleX](https://stylexjs.com/blog/introducing-stylex). However, StyleX currently requires setting up Babel/Webpack in the project, which we avoid to maintain full Turbopack support. As a suitable alternative, consider jjenzz's [Tokenami](https://github.com/tokenami/tokenami#readme) or [Panda CSS](https://panda-css.com) by Chakra. Possibly, we can make a choice between them all while bootstrapping the project with Reliverse CLI. These libraries help with avoiding the deprecated [initial idea](https://stylexjs.com/blog/introducing-stylex/#the-origins-of-stylex) for [CSS-in-JS](https://medium.com/dailyjs/what-is-actually-css-in-js-f2f529a2757). Learn more [here](https://github.com/reactwg/react-18/discussions/110) and in [Next.js docs](https://nextjs.org/docs/app/building-the-application/styling/css-in-js).
- [ ] 91. Confirm the project is free from duplicates, like files, components, etc.
- [ ] 92. Conduct useful tests, including possible stress tests, to simulate and assess app performance under high-traffic conditions.
- [ ] 93. Comprehensively configure RSCs and all other new Next.js 13-15 features. Seamlessly move data fetching between both client-side and server-side by using [useSWR](https://twitter.com/shuding_/status/1794461568505352693).
- [ ] 94. Complete the BA11YC (Bleverse Accessibility Convention) checklist; which may relay on the following principle in the future: [DesignPrototype](https://uiprep.com/blog/ultimate-guide-to-prototyping-in-figma)-[CodePrototype](https://medium.com/@joomiguelcunha/the-power-of-prototyping-code-55f4ed485a30)-CodeTests-HqDesign-[TDD](https://en.wikipedia.org/wiki/Test-driven_development)-HqCode-[CI](https://en.wikipedia.org/wiki/CI/CD).
- [ ] 95. Complete parts of the [BA11YC (Bleverse Accessibility Convention) checklist](https://github.com/bs-oss/BA11YC). This includes using software [Design Patterns](https://refactoring.guru/design-patterns/what-is-pattern) for code refactoring.
- [ ] 96. Check all components with side-effects for re-rendering, it is recommended to re-render each component a maximum of 2 times ([good video about it (in Ukrainian)](https://youtu.be/uH9uMH2e5Ts)).
- [ ] 97. Boost app performance scores on platforms like Google PageSpeed Insights. Ensure the app passes all rigorous tests.
- [ ] 98. Apply the [nuqs](https://nuqs.47ng.com) library where appropriate; for older "next-usequerystate" (the old package's name) versions [read the article](https://francoisbest.com/posts/2023/storing-react-state-in-the-url-with-nextjs).
- [ ] 99. All third-party libraries and React components should be appropriately isolated. This includes verifying data from these libraries, such as Clerk, and wrapping the components with the "use client" directive as necessary.
- [ ] 100. Add a reviews section to the landing page. Obtain feedback on Relivator from five widely recognized individuals on the web.
- [ ] 101. Add an admin dashboard that includes stores, products, orders, subscriptions, and payments.
- [ ] 102. Add global color variables to all places where they are applied, instead of having hardcoded colors.
- [ ] 103. Add pop-ups for cookies/GDPR notifications (with a respective management settings page), and Google floating notifications for quick login, etc.
- [ ] 104. Add some interesting and useful types to the project, for example, using the [type-fest](https://github.com/sindresorhus/type-fest) library.
- [ ] 105. Add the integration of a smart git-hooks system with various additional useful functionality.
- [ ] 106. Add the most valuable and useful ESLint things from [awesome-eslint](https://github.com/dustinspecker/awesome-eslint) collection.

[![Join the Relivator Discord](https://discordapp.com/api/guilds/1075533942096150598/widget.png?style=banner2)][badge-discord]

[badge-discord]: https://badgen.net/discord/members/Pb8uKbwpsJ?icon=discord&label=discord&color=purple
