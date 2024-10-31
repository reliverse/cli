# Roadmap: Reliverse & Relivator

[![Join the Reliverse and Relivator Discord server](https://discordapp.com/api/guilds/1075533942096150598/widget.png?style=banner2)][badge-discord]

*The roadmap below may be outdated. We will fully update this README.md with the Reliverse 1.0.0 and Relivator 1.3.0 stable releases.*

*The roadmap below outlines the key features and improvements planned for this Next.js Reliverse starter and for Reliverse CLI. `Items not marked may already be configured` but might not have been thoroughly tested. If you spot any issues, please open an issue.*

- [ ] is set up in the most convenient and correct way.
- [ ] migrate the monorepo from pnpm to bun.
- [x] Build on [Next.js 15](https://nextjs.org) [App Router](https://nextjs.org/docs/app) & [Route Handlers](https://nextjs.org/docs/app/building-the-application/routing/route-handlers), with [Million Lint](https://million.dev) and [Turbopack](https://turbo.build/pack) support (with optional [Turborepo v2](https://turbo.build/blog/turbo-2-0) for faster builds). Utilize [React 19](https://react.dev) (with the new [React Compiler](https://react.dev/learn/react-compiler) and [eslint-plugin-react-compiler](https://react.dev/learn/react-compiler#installing-eslint-plugin-react-compiler)), [TailwindCSS](https://tailwindcss.com), and [TypeScript 5](https://typescriptlang.org) as core technologies.
- [x] Implement [Drizzle ORM](https://orm.drizzle.team) to support **both MySQL and PostgreSQL** databases, and integrate with [Neon](https://neon.tech), [Railway](https://railway.app?referralCode=sATgpf), [PlanetScale](https://planetscale.com), and [Vercel](https://vercel.com) services.
- [x] Configure `next.config.js` with i18n, MDX, with both [Million.js Compiler & Million Lint](https://million.dev/blog/lint-rc) support. Enable these cool experiments: after, forceSwcTransforms, instrumentationHook (disabled by default), mdxRs, optimisticClientCache, [optimizePackageImports](https://nextjs.org/docs/app/api-reference/next-config-js/optimizePackageImports), optimizeServerReact, [ppr (Partial Prerendering)](https://nextjs.org/docs/app/api-reference/next-config-js/partial-prerendering), reactCompiler (disabled by default), serverMinification, turbo.
- [x] Aim for thorough documentation and a beginner-friendly approach throughout the project.
- [x] Configure and comment on `middleware.ts` for i18n and next-auth.
- [x] Set up a Content-Security-Policy (CSP) system to prevent XSS attacks (disabled by default).
- [x] Provide well-configured VSCode settings and recommended extensions (set `"extensions.ignoreRecommendations"` to `true` if you don't want to see the recommendations).
- [x] Optimize the [Next.js Metadata API](https://nextjs.org/docs/app/building-the-application/optimizing/metadata) for SEO, integrating file-system handlers.
- [x] Integrate a TailwindCSS screen size indicator for local project runs.
- [x] Implement extensive internationalization in 11 languages (English, German, Spanish, Persian, French, Hindi, Italian, Polish, Turkish, Ukrainian, Chinese) using the [next-intl](https://next-intl-docs.vercel.app) library, which works on both server and client, and include support for `next dev --turbo`.
- [x] Implement authentication through **both [Clerk](https://clerk.com) and [Auth.js (next-auth@beta/NextAuth.js)](https://authjs.dev)**.
- [x] Implement [tRPC](https://trpc.io) and [TanStack Query](https://tanstack.com/query) (with [React Normy](https://github.com/klis87/normy#readme)) for advanced server and client data fetching.
- [x] Establish a user subscription and checkout system using [Stripe](https://github.com/stripe/stripe-node#readme).
- [x] Ensure type-safety validations for project schemas and UI fields using the [zod](https://zod.dev) library.
- [x] Employ [ESLint v9](https://eslint.org) with [TypeScript-ESLint v8](https://typescript-eslint.io) and configure `eslint.config.js` (**Linting can take some time, so please be patient**) to work with both [Biome](https://biomejs.dev) ~~and [Prettier](https://prettier.io) (including the Sort Imports Prettier plugin)~~ for readable, clean, and safe code. **Currently not available | TODO:** use `pnpm ui:eslint` to open the [ESLint Flat Config Viewer](https://github.com/antfu/eslint-flat-config-viewer#eslint-flat-config-viewer) UI tool. **Note:** Starting Relivator 1.3.0 Prettier can be added manually by running `reliverse` command (read [the announcement](https://github.com/blefnk/relivator-nextjs-starter/issues/36)).
- [x] Elegantly implement the font system, utilizing [Inter](https://rsms.me/inter) and additional typefaces.
- [x] Develop a storefront, incorporating product, category, and subcategory functionality.
- [x] Design a modern, cleanly composed UI using [Radix](https://radix-ui.com), with attractive UI components from [shadcn/ui](https://ui.shadcn.com).
- [x] Compose a comprehensive, beginner-friendly `README.md`, including descriptions of [environment variables](https://nextjs.org/docs/basic-features/environment-variables).
- [ ] Implement blog functionality through the use of MDX files.
- [ ] Use absolute paths everywhere where applied in the project. The project has a predictable and consistent import logic, no unnecessary use of things like `import * as React`.
- [ ] Use [Kysely](https://kysely.dev) with Drizzle to achieve full TypeScript SQL query builder type-safety.
- [ ] Translate README.md and related files into more languages.
- [ ] Transform beyond a simple e-commerce store to become a universal website starter.
- [ ] Tidy up `package.json` with correctly installed and orderly sorted packages in `dependencies` and `devDependencies`.
- [ ] The project author should publish a series of detailed videos on how to use this project. There should also be some enthusiasts willing to publish their own videos about the project on their resources.
- [ ] Reduce the number of project packages, config files, and etc., as much as possible.
- [ ] Reduce HTML tag nesting and ensure correct usage of HTML tags whenever possible.
- [ ] Prioritize accessibility throughout, for both app user UI (User Interface) and UX (User Experience), as well as developers' DX (Developer Experience). Maintain usability without compromising aesthetics.
- [ ] Prefer using [const-arrow](https://freecodecamp.org/news/when-and-why-you-should-use-es6-arrow-functions-and-when-you-shouldnt-3d851d7f0b26) and [type](https://million.dev/docs/manual-mode/block) over [function](https://freecodecamp.org/news/the-difference-between-arrow-functions-and-normal-functions) and [interface](https://totaltypescript.com/type-vs-interface-which-should-you-use) where applicable, and vice versa where applicable correspondingly, with using helpful ESLint [arrow-functions](https://github.com/JamieMason/eslint-plugin-prefer-arrow-functions#readme) plugin, to maintain readable and clean code by adhering to specific [recommendations](https://youtu.be/nuML9SmdbJ4) for [functional programming](https://toptal.com/javascript/functional-programming-javascript).
- [ ] Optimize all app elements to improve dev cold start and build speeds.
- [ ] Move each related system to its special folder (into the `src/core` folder), so any system can be easily removed from the project as needed.
- [ ] Move component styles to .css or .scss files, or use packages that provide "syntactic sugar" for styles in .tsx files by using [tokenami](https://github.com/tokenami/tokenami#readme) CSS library. Implement possibility to implement [Figma Tokens System](https://blog.devgenius.io/link-figma-and-react-using-figma-tokens-89e6cc874b4d) to work seamlessly with the project. Tip: go to point #90 of this roadmap to learn more about new ways to use CSS-in-JS.
- [ ] Migrate to Auth.js (next-auth@beta/NextAuth.js)' [next-auth@beta](https://npmjs.com/package/next-auth?activeTab=versions) ([discussions](https://github.com/nextauthjs/next-auth/releases/tag/next-auth%405.0.0-beta.4)), and to [React 19](https://19.react.dev/blog/2024/04/25/react-19).
- [ ] Manage email verification, newsletter sign-ups, and email marketing via [Resend](https://resend.com) and [React Email](https://react.email).
- [ ] Make sure each page and the middleware are green or yellow, but not red, upon build in the development terminal.
- [ ] Make each environment variable optional, allowing the app to operate without anything configured, simply omitting specific code sections as necessary.
- [ ] Keep the project on the best possible way of writing good and clean code, by following guidelines like [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript/tree/master/react) / [Airbnb React/JSX Style Guide](https://github.com/airbnb/javascript/tree/master/react). Use `??` (nullish coalescing) everywhere instead of `||` (logical OR) (unless there's a good reason to use it in the specific cases) – [why we should use nullish coalescing](https://stackoverflow.com/questions/61480993/when-should-i-use-nullish-coalescing-vs-logical-or); (Is there any ESLint rule/plugin for that?).
- [ ] Keep the project free from things like `@ts-expect-error`, `eslint-disable`, `biome-ignore`, and others related not very safety things.
- [ ] Keep the cookie count as low as possible, prepare for a cookie-free future, implement cookie management and notifications.
- [ ] Introduce a comment system for products, including Review and Question types.
- [ ] Integrate valuable things from [Next.js' Examples](https://github.com/vercel/next.js/tree/canary/examples) into this project.
- [ ] Integrate valuable insights from [Next.js Weekly](https://nextjsweekly.com/issues) into this starter.
- [ ] Implement type-safe [GraphQL](https://hygraph.com/learn/graphql) support by using [Fuse.js](https://fusejs.org) framework.
- [ ] Implement the best things from [Payload CMS](https://github.com/payloadcms/payload) with Relivator's improvements.
- [ ] Implement Storybook 8.x support (read the "[Storybook for React Server Components](https://storybook.js.org/blog/storybook-react-server-components)" announcement).
- [ ] Implement smart and unified log system, both for development and production, both for console and writing to specific files.
- [ ] Implement Sentry to handle errors and CSP reports for the application.
- [ ] Implement Relivator's/Reliverse's own version of [Saas UI](https://saas-ui.dev) to be fully compatible with our project with only needed functionality, with using Tailwind and Shadcn instead of Chakra.
- [ ] Implement our own fork of [Radix Themes](https://radix-ui.com) library with set up `<main>` as wrapper instead of its current `<section>`; OR implement our very own solution which generates Tailwind instead of Radix's classes.
- [ ] Implement full [Million.js](https://million.dev) support (read [Million 3.0 Announcement](https://million.dev/blog/million-3) to learn more).
- [ ] Implement file uploads using [UploadThing](https://uploadthing.com) and [Cloudinary](https://cloudinary.com) (NOTE: "res.cloudinary.com" and "utfs.io" should be added to `nextConfig.images.remotePatterns`).
- [ ] Implement dynamic switching between app features, like database provider, by making corresponding checks for environment variables.
- [ ] Implement docs to the project and move each explanation from the code into that docs.
- [ ] Implement deep feature-parity and easy-migration compatibility with Reliverse.
- [ ] Implement cooperation possibilities by using things like [liveblocks](https://liveblocks.io).
- [ ] Implement CLI to quickly get Relivator with selected options only; try to use [Charm](https://charm.sh) things to build the Reliverse CLI.
- [ ] Implement AI like GPT chat features by using [Vercel AI SDK](https://sdk.vercel.ai/docs) (see: [Introducing the Vercel AI SDK](https://vercel.com/blog/introducing-the-vercel-ai-sdk)).
- [ ] Implement advanced theme switching without flashing, utilizing Tailwind Dark Mode with [React Server Side support](https://michaelangelo.io/blog/darkmode-rsc) and dynamic cookies.
- [ ] Implement [Jest](https://jestjs.io) testing, optimized for Next.js.
- [ ] Guarantee that every possible page is enveloped using predefined shell wrappers.
- [ ] Generously write comment only if it really is needed. Rewrite all code in the way to eliminate need in describing code in comments (read more in "Clean Code" book by Robert Cecil Martin). Consider using `/** block comment */` only in the `.mjs` and `.js` files.
- [ ] Fully develop advanced sign-up and sign-in pages, integrating both social media and classic form methods.
- [ ] Follow the best practices from the articles and videos like "[10 React Antipatterns to Avoid](https://youtube.com/watch?v=b0IZo2Aho9Y)" (check theirs comment section as well).
- [ ] Follow recommendations from [Material Design 3](https://m3.material.io) and other design systems when relevant.
- [ ] Establish, document, and adhere to conventions, such as maintaining a single naming case style for files and variables.
- [ ] Establish a comprehensive i18n, using country and locale codes, and support even more languages. Ensure native speakers verify each language following machine translation. Consider to use the [next-international](https://github.com/QuiiBz/next-international) library.
- [ ] Ensure ultimate type-safety using strict mode in [TypeScript](https://typescriptlang.org) including ["Do's and Don'ts"](https://typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html) recommendations (without using [dangerous type assertions](https://youtube.com/watch?v=K9pMxqb5IAk), and with [optional types correct usage](https://youtube.com/watch?v=qy6IBZggXSQ), by also using `pnpm typestat` — once you run that, [TypeStat](https://github.com/JoshuaKGoldberg/TypeStat) will start auto-fixing TS typings); And also ensure type-safety with typedRoutes, zod, middleware, etc.
- [ ] Ensure the project lacks any unused items, such as packages, libraries, and variables. Also, make sure the project's code adheres to the [Never Nester principles](https://youtube.com/watch?v=CFRhGnuXG-4). Because, as Linus Torvalds once said, *If you need more than 3 levels of indentation, you're screwed anyway, and should fix the program*.
- [ ] Ensure project has full support for [GSAP](https://gsap.com) (GreenSock Animation Platform) library, with convenient ways to use @gsap/react [useGSAP() hook](https://gsap.com/docs/v3/React/tools/useGSAP).
- [ ] Ensure full Next.js Edge support and compatibility.
- [ ] Ensure full [Biome](https://biomejs.dev), [Bun](https://bun.sh), and [Docker](https://docker.com) support and compatibility.
- [ ] Ensure all website languages are grammatically correct and adhere to the latest rules for each language.
- [ ] Ensure all items in the project are sorted in ascending order unless different sorting is required elsewhere.
- [ ] Ensure the project avoids using redundant imports, such as importing everything from React, when it's sufficient to import only the necessary hooks, for example. The project doesn't use things that are automatically handled by the React Compiler (only where it fails), making the code much more readable. Million Lint must work seamlessly with React Compiler.
- [ ] Ensure accessibility for **users**, **developers** (both beginners and experts), **bots** (like [Googlebot](https://developers.google.com/search/docs/crawling-indexing/googlebot) or [PageSpeed Insights Crawler](https://pagespeed.web.dev)), for **everyone**.
- [ ] Enhance `middleware.ts` configuration with multi-middleware implementation.
- [ ] Employ all relevant [TanStack](https://tanstack.com) libraries.
- [ ] Eliminate each disabling in the `eslint.config.js` file, configure config to strict, but to be still beginner-friendly.
- [ ] Elegantly configure `app.ts`, offering a single config to replace all possible others.
- [ ] Develop workflows for both sellers and customers.
- [ ] Develop an even more sophisticated implementation of user subscriptions and the checkout system via Stripe; and also write Jest/Ava tests for Stripe and use `.thing/hooks/stripe_*.json` [webhookthing](https://docs.webhookthing.com) data files for these tests.
- [ ] Develop an advanced storefront featuring products, categories, and subcategories.
- [ ] Develop an advanced 404 Not Found page with full internationalization support.
- [ ] Develop advanced sign-up, sign-in, and restoration using email-password and magic links.
- [ ] Decrease file count by merging similar items, etc.
- [ ] Create the most beginner-friendly and aesthetically pleasing starter possible.
- [ ] Create an advanced notification system, inclusive of toasters, pop-ups, and pages.
- [ ] Create a new landing page with a distinctive design and update components, plus fully redesign all other pages and components.
- [ ] Consider adding Facebook's [StyleX](https://stylexjs.com/blog/introducing-stylex). However, StyleX currently requires setting up Babel/Webpack in the project, which we avoid to maintain full Turbopack support. As a suitable alternative, consider jjenzz's [Tokenami](https://github.com/tokenami/tokenami#readme) or [Panda CSS](https://panda-css.com) by Chakra. Possibly, we can make a choice between them all while bootstrapping the project with Reliverse CLI. These libraries help with avoiding the deprecated [initial idea](https://stylexjs.com/blog/introducing-stylex/#the-origins-of-stylex) for [CSS-in-JS](https://medium.com/dailyjs/what-is-actually-css-in-js-f2f529a2757). Learn more [here](https://github.com/reactwg/react-18/discussions/110) and in [Next.js docs](https://nextjs.org/docs/app/building-the-application/styling/css-in-js).
- [ ] Confirm the project is free from duplicates, like files, components, etc.
- [ ] Conduct useful tests, including possible stress tests, to simulate and assess app performance under high-traffic conditions.
- [ ] Comprehensively configure RSCs and all other new Next.js 13-15 features. Seamlessly move data fetching between both client-side and server-side by using [useSWR](https://x.com/shuding_/status/1794461568505352693).
- [ ] Complete the BA11YC (Bleverse Accessibility Convention) checklist; which may relay on the following principle in the future: [DesignPrototype](https://uiprep.com/blog/ultimate-guide-to-prototyping-in-figma)-[CodePrototype](https://medium.com/@joomiguelcunha/the-power-of-prototyping-code-55f4ed485a30)-CodeTests-HqDesign-[TDD](https://en.wikipedia.org/wiki/Test-driven_development)-HqCode-[CI](https://en.wikipedia.org/wiki/CI/CD).
- [ ] Complete parts of the [BA11YC (Bleverse Accessibility Convention) checklist](https://github.com/bs-oss/BA11YC). This includes using software [Design Patterns](https://refactoring.guru/design-patterns/what-is-pattern) for code refactoring.
- [ ] Check all components with side-effects for re-rendering, it is recommended to re-render each component a maximum of 2 times ([good video about it (in Ukrainian)](https://youtu.be/uH9uMH2e5Ts)).
- [ ] Boost app performance scores on platforms like Google PageSpeed Insights. Ensure the app passes all rigorous tests.
- [ ] Apply the [nuqs](https://nuqs.47ng.com) library where appropriate; for older "next-usequerystate" (the old package's name) versions [read the article](https://francoisbest.com/posts/2023/storing-react-state-in-the-url-with-nextjs).
- [ ] All third-party libraries and React components should be appropriately isolated. This includes verifying data from these libraries, such as Clerk, and wrapping the components with the "use client" directive as necessary.
- [ ] Add a reviews section to the landing page. Obtain feedback on Relivator from five widely recognized individuals on the web.
- [ ] Add an admin dashboard that includes stores, products, orders, subscriptions, and payments.
- [ ] Add global color variables to all places where they are applied, instead of having hardcoded colors.
- [ ] Add pop-ups for cookies/GDPR notifications (with a respective management settings page), and Google floating notifications for quick login, etc.
- [ ] Add some interesting and useful types to the project, for example, using the [type-fest](https://github.com/sindresorhus/type-fest) library.
- [ ] Add the integration of a smart git-hooks system with various additional useful functionality.
- [ ] Add the most valuable and useful ESLint things from [awesome-eslint](https://github.com/dustinspecker/awesome-eslint) collection.

[![Discord chat][badge-discord]][link-discord]

[badge-discord]: https://badgen.net/discord/members/Pb8uKbwpsJ?icon=discord&label=discord&color=purple
[link-discord]: https://discord.gg/Pb8uKbwpsJ
