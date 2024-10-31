# Introduction

[**👉 Read the Detailed Blog Post About 1.2.6 & 1.3.0@canary Update 👈**](https://reliverse.org/relivator/v126)

**🙏 Please help us reach 1,000 stars on GitHub**: Once this project reaches this goal, I, @blefnk, the author of this project, will start my video course on the basics of web development (HTML, CSS, JS), React, Next.js, TypeScript, related libraries, and many other topics. This milestone will also affirm that Relivator and [Reliverse](https://github.com/blefnk/reliverse-website-builder) truly make sense to exist, leading to more frequent updates and further dedication to these projects.

**⭐ Bookmark this page in your browser**: This project will only get better in the future. You can also click the star at the top of the page and add the repo to your collection to keep it easily accessible.

We are currently migrating the documentation from the existing Relivator README.md to the official, newly launched [Relivator & Reliverse Docs website (https://reliverse.org)](https://reliverse.org). The content will be organized into appropriate sections on the new site. During the migration, some elements might not function properly. The current README.md will contain only minimal information. Please let us know if you encounter any issues.

---

<!--
For those who are viewing the current markdown file using:
 – VSCode: Press F1 or Cmd/Ctrl+Shift+P and enter ">Markdown: Open Preview". Please install the "markdownlint" and "Markdown All in One" extensions.
 – GitHub: Does this .md file appear different from what you are used to seeing on GitHub? Ensure the URL does not end with "?plain=1".
-->

<div align="center">

[🌐 Demo](https://relivator.com) | [👋 Introduction](./INTRODUCTION.md) | [🏗️ Installation](./INSTALLATION.md) | [🩷 Sponsors](./SPONSORS.md)

[⚙️ Scripts](./SCRIPTS.md) | [🤔 FAQ](./FAQ.md) | [🔍 Details](./DETAILS.md) | [✅ Roadmap](./ROADMAP.md) | [📖 Changelog](./CHANGELOG.md)

</div>

<!-- 🚀 Yay! Thanks for the installation and welcome! If you like it, please consider giving us a star! ⭐ -->

<!-- 👉 https://github.com/blefnk/relivator-nextjs-template 🙏 -->

Stop jumping from one starter to the next. With [Relivator](https://github.com/blefnk/relivator-nextjs-template#readme), your possibilities are endless! You can create anything you want; all the tools are ready and waiting for you.

The entire Relivator project was developed by one person, [Nazar Kornienko (blefnk)](https://github.com/blefnk)! Some people have already contributed, and you’re welcome to do the same—any contributions at all are appreciated! Your contributions will not be forgotten; [our awesome community](https://discord.gg/Pb8uKbwpsJ) value them highly, and you might even receive financial gratitude from the project's creator in the future. Let's come together to create the most coolest Next.js template in the world! This will be a joint effort and a shared victory, a true win-win. Thank you all for your contributions and [financial support](./SPONSORS.md)!

Please take a moment to read through the information below. You'll find helpful details about how everything works in the project, as well as an extensive list of features.

<div align="center">

<p>
    <span>
      <a href="https://relivator.com">
        <picture>
            <source media="(prefers-color-scheme: dark)" srcset="public/screenshot-dark.png" />
            <source media="(prefers-color-scheme: light)" srcset="public/screenshot-light.png" />
            <img alt="Shows the landing page of Relivator Next.js template, with its logo and the phrase 'Relivator Empowers Your eCommerce with the Power of Next.js'." src="/public/screenshot-light.png" width="40%" />
        </picture>
      </a>
    </span>
    <span>
      <a href="https://github.com/blefnk/relivator-nextjs-template/blob/main/public/og.png">
        <picture>
            <source media="(prefers-color-scheme: dark)" srcset="public/og.png" />
            <source media="(prefers-color-scheme: light)" srcset="public/og.png" />
            <img alt="Dark-themed image displaying various technologies and tools used in the Relivator project. The heading highlights Next.js 15, React 19, shadcn, and Tailwind Template. The image is divided into multiple sections listing technologies like shadcn, tailwind, next 15, react 19, clerk, authjs, drizzle, neon, ts 5.6, python, eslint 9, ts-eslint 8, knip, biome, unjs, and reliverse. The background features a grid layout with a minimalistic design, inspired by the Figma and Loading UI style." src="/public/og.png" width="45%" />
        </picture>
      </a>
    </span>
</p>

[![Discord chat][badge-discord]][link-discord]
[![npm version][badge-npm]][link-npm]
[![MIT License](https://img.shields.io/github/license/blefnk/relivator-nextjs-template.svg?color=blue)](LICENSE)

[𝕏](https://x.com/blefnk) | [GitHub](https://github.com/blefnk) | [Slack](https://join.slack.com/t/reliverse/shared_invite/zt-2mq703yro-hKnLmsgbIQul0wX~gLxRPA) | [LinkedIn](https://linkedin.com/in/blefnk) | [Facebook](https://facebook.com/blefnk) | [Discord](https://discord.gg/Pb8uKbwpsJ) | [Fiverr](https://fiverr.com/blefnk)

</div>

> *«I couldn't find the ~~sports car~~ Next.js starter of my dreams, so I built it myself.»* © ~~Ferdinand Porsche~~ [@blefnk](https://github.com/blefnk)

Our goal is to create the world's most feature-rich and globally accessible Next.js starter. It offers more than just code—it's an experience. Scroll down to see the impressive list of project features, including the ability to switch between Clerk/Auth.js (next-auth@beta/NextAuth.js) and Drizzle's MySQL/PostgreSQL on the fly. Welcome to the Relivator starter and the Reliverse community!

<!-- <p align="center">
    <span>
      <a href="https://relivator.com">
        <picture>
            <source media="(prefers-color-scheme: dark)" srcset="public/screenshot-dark.png" />
            <source media="(prefers-color-scheme: light)" srcset="public/screenshot-light.png" />
            <img alt="Shows the landing page of Relivator Next.js template, with its logo and the phrase 'Relivator Empowers Your eCommerce with the Power of Next.js'." src="/public/screenshot-light.png" width="50%" />
        </picture>
      </a>
    </span>
    <span>
      <a href="https://star-history.com/#blefnk/relivator-nextjs-template&Timeline">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=blefnk/relivator-nextjs-template&type=Timeline&theme=dark" />
        <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=blefnk/relivator-nextjs-template&type=Timeline" />
        <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=blefnk/relivator-nextjs-template&type=Timeline" width="50%" />
      </picture>
      </a>
    </span>
</p> -->

[![Discord chat][badge-discord]][link-discord]

[badge-discord]: https://badgen.net/discord/members/Pb8uKbwpsJ?icon=discord&label=discord&color=purple
[badge-npm]: https://badgen.net/npm/v/reliverse?icon=npm&color=green&label=%40blefnk%2Freliverse
[link-discord]: https://discord.gg/Pb8uKbwpsJ
[link-npm]: https://npmjs.com/package/reliverse/v/latest
