# Principles, Design Decisions, Code Insights, Recommendations

> «There are a lot of impractical things about owning a ~~Porsche~~ Relivator. But they're all offset by the driving experience. It really is unique. ~~Lamborghinis~~ create-t3-app and ~~Ferraris~~ Vercel Store come close. And they are more powerful in specific cases, but they don't handle like a ~~Porsche~~ Relivator.» © ~~Kevin O'Leary~~ [@blefnk](https://github.com/blefnk)

*We're continuously improving this section. Contributions are welcomed!*

Our starter aims to be a rich resource for developers at all stages of their journey. Within the comment blocks and dedicated sections at the end of select files, you'll find valuable insights and clarifications on a wide array of topics. Contributions to enhancing these educational nuggets are highly encouraged!

**Principles (W.I.P):**

- [ ] Prettier's principle over linters related to developer experience ([source](https://prettier.io/docs/en/integrating-with-linters.html#notes)): "You end up with a lot of red squiggly lines in the editor, which gets annoying. Prettier is supposed to make you forget about formatting – and not be in the face about it!"
- [ ] Every file and component should be built consciously, using [KISS/DRY/SOLID/YAGNI principles](https://blog.openreplay.com/applying-design-principles-in-react) with a certain sense of intelligence, and with performance in mind.
- [ ] We need to think of the project as if it were a planet with its own continents, countries, cities, rooms, individuals, entities, etc.

**Advanced Environment Variables:**

The `.env.example` file covers all the essential variables for a fully functional website, tailored for beginners. However, if you require advanced configurations, you can modify any value in the `.env` file as needed.

**About the Plugins Folder:**

This folder contains optional plugins for Relivator. Developed by @blefnk and other contributors, these plugins extend functionality and provide additional features. If you find that certain plugins are not beneficial for the project, feel free to remove their corresponding folders.

**Function Over Const for Components:**

We advocate the use of the `function` keyword instead of `const` when defining React components. Using `function` often improves stack traces, making debugging easier. Additionally, it makes code semantics more explicit, thereby making it easier for other developers to understand the intentions.

**Personal Recommendations:**

We advise regularly clearing the browser cache and deleting the `.next` folder to ensure optimal performance and functionality.

Currently, we don’t utilize Contentlayer due to its instability with Windows. Therefore, we're exploring options for its usage in the `.env` configuration file. Future plans might involve developing our own solution for content writing. Integration with external providers, such as Sanity, may also be a future feature, with corresponding enable/disable options.

NOTE from the [Contentlayer Issues Page](https://github.com/contentlayerdev/contentlayer/issues/313#issuecomment-1305424923): Contentlayer doesn't work well with `next.config.mjs`, so you need to have `next.config.js`. Other libraries may also require this. If you're sure you need `.mjs` and don't plan to use Contentlayer, rename it.

**Project Configuration:**

The `src/app.ts` file hosts main configurations to modify website contents and settings, enabling you to:

- Control the content presented on the website.
- Adjust various settings, such as deactivating the theme toggle.
- Manage generic site-wide information.

Customize this file as per the requirements.

**Authentication:**

Setting up authentication is straightforward.

You can configure available sign-in providers for Clerk in the `src/app.ts` file.

Please remember that Clerk fully works with third-party services like "Google PageSpeed Insight" only when domain and live keys are used.

*This section will be implemented soon.*

**TypeScript Config:**

In the `tsconfig.json` file you can set the options for the TypeScript compiler. You can hover over on each option to get more information about. Hint: You can also press Shift+Space to get auto-completion. Learn more by checking the official TypeScript documentation: @see <https://typescriptlang.org/docs/handbook/tsconfig-json> @see <https://totaltypescript.com/tsconfig-cheat-sheet>.

Next.js has built-in support for TypeScript, using plugin below. But while you use `bun run build`, it stops on the first type errors. So you can use `bun typecheck` to check all type warns/errors at once.

Config includes Atomic CSS plugin in the style attribute. Type-safe static styles with theming, responsive variant support, and no bundler integration. @see <https://github.com/tokenami/tokenami#readme>.

You can enable strict type checking in MDX files by setting `mdx.checkMdx` to true.

These options below can be dangerously set to false, while you're incrementally move to full type-safety.

```json
{
  "alwaysStrict": true,
  "noImplicitAny": false,
  "strict": true,
  "strictNullChecks": true,
  "strictPropertyInitialization": true,
  "verbatimModuleSyntax": true
}
```

**How to Deploy the Project:**

Please check the *How to Install and Get Started* section before making the initial deployment.

Consult the deployment guides for [Vercel](https://create.t3.gg/en/deployment/vercel), [Netlify](https://create.t3.gg/en/deployment/netlify), and [Docker](https://create.t3.gg/en/deployment/docker) for further details. The project has only been tested on Vercel; please inform us if you encounter issues with other deployment services.

**Styling, Design System, UI Components:**

TODO: Implement design system and style guide.

By default, this project includes components from various libraries, as well as unstyled [shadcn/ui](https://ui.shadcn.com) components. Shadcn/ui even allows you to generate new UI components using its CLI (where "button" can be any Shadcn UI element): `bunx shadcn-ui@latest add button`.

W.I.P. — Use `bun css` to watch for [CSS tokens](https://blog.devgenius.io/link-figma-and-react-using-figma-tokens-89e6cc874b4d) in accordance with the project's design system. [Tokenami](https://github.com/tokenami/tokenami#readme) and Figma are anticipated to be utilized for this concept. For additional information, refer to points #33 and #90 in the Relivator's Roadmap.

**Package Manager Compatibility:**

`Relivator` can already harness some fantastic **[`bun`](<https://bun> .sh)** features. For this starter, we currently recommend using `pnpm`. Full bun support and compatibility will be shipped as soon as [Reliverse](https://github.com/blefnk/reliverse)'s [Relivator](https://github.com/blefnk/relivator) achieves full similarity with Relivator. *Section expansion coming soon.*

**Recommended Things to Learn:**

1. [The Detailed Git Guide](https://github.com/blefnk/relivator-nextjs-template/blob/main/.github/GITGUIDE.md) by [Nazar Kornienko @Blefnk](https://github.com/blefnk)
2. [Introduction to Next.js and React](https://youtube.com/watch?v=h2BcitZPMn4) by [Lee Robinson](https://x.com/leeerob)
3. [Relivator: Next.js 15 Starter (Release Announce of Relivator on Medium)](https://cutt.ly/awf6fScS) by [Nazar Kornienko @Blefnk](https://github.com/blefnk)
4. [Welcome to the Wild World of TypeScript, Mate! Is it scary?](https://cutt.ly/CwjVPUNu) by [Nazar Kornienko @Blefnk](https://github.com/blefnk)
5. [React: Common Mistakes in 2023](https://docs.google.com/presentation/d/1kuBeSh-yTrL031IlmuwrZ8LvavOGzSbo) by [Cory House](https://x.com/housecor)
6. [Thoughts on Next.js 13, Server Actions, Drizzle, Neon, Clerk, and More](https://github.com/Apestein/nextflix/blob/main/README.md#overall-thoughts) by [@Apestein](https://github.com/Apestein)
7. [Huge Next-Multilingual Readme About i18n](https://github.com/Avansai/next-multilingual#readme) by [@Avansai](https://github.com/Avansai)
8. [Applying Design Principles in React](https://blog.openreplay.com/applying-design-principles-in-react) by [Jeremiah (Jerry) Ezekwu](https://blog.openreplay.com/authors/jeremiah-\(jerry\)-ezekwu/)
9. [The Power of Prototyping Code](https://medium.com/@joomiguelcunha/the-power-of-prototyping-code-55f4ed485a30) by [João Miguel Cunha](https://medium.com/@joomiguelcunha)
10. [Software Prototyping](https://en.wikipedia.org/wiki/Software_prototyping) on Wikipedia
11. [TDD: Test-driven development](https://en.wikipedia.org/wiki/Test-driven_development) on Wikipedia
12. [React 19 RC Announcement](https://react.dev/blog/2024/04/25/react-19) by [React](https://react.dev)

*More learning resources can be found within the files of this repository.*
