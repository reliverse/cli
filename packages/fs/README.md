# @reliverse/fs: File System Utilities

[@reliverse/fs](https://npmjs.com/package/@reliverse/fs) is a utility library that wraps the [Node.js native `fs`](https://nodejs.org/api/fs.html) module and [fs-extra](https://npmjs.com/package/fs-extra) package, providing enhanced file system functionalities. This package is part of the broader `@reliverse/addons` ecosystem.

**Note:** This project currently focuses on adding custom utilities (which use `fs-extra` and `pathe`), rather than re-exporting or modifying existing functionality from `fs` or `fs-extra`.

For more detailed usage instructions, API documentation, and examples, please visit the [Reliverse Docs](https://reliverse.org) website. If you find that the page for this library is missing, please notify us or consider contributing to add it.

## Installation

To install this package, run:

```bash
bun add @reliverse/fs@latest
```

or with bun:

```bash
bun add @reliverse/fs@latest
```

## How to Use This Library

To use `@reliverse/fs`, ensure that your project is set up as an ES module by including `"type": "module"` in your `package.json` file. Since this package is structured as an ES module, you'll need to use `import` statements instead of `require`.

The library primarily relies on the async versions of `fs` functions, so you need to add the `await` keyword before the utils from our library.

Here's an example of how to import and use a function from this package:

```ts
import { fileExists } from "@reliverse/fs";

const someFile = "path/to/file.ts";

export async function checkFile() {
  await fileExists(someFile);
}
```

Please refer to the source files located in the [`src` folder](https://github.com/reliverse/fs/blob/main/src) to learn about the currently implemented functions.

This package adopts the ES module format, with files compiled to `dist/.js` (formerly known as `dist/.mjs`). This approach aligns with the Node.js team's recent recommendations, encouraging the JavaScript/TypeScript community to transition to the ES module standard. If your project still requires CommonJS (CJS) support, you may fork this repository and modify the build process to generate `dist/.cjs` files. For guidance or community support, join the [Reliverse Discord community](https://discord.gg/C4Z46fHKQ8).

## Documentation and Support

If you encounter any issues, need help, or want to contribute, you can:

- Join the [Reliverse Discord community](https://discord.gg/C4Z46fHKQ8) to ask questions and engage with other users and developers.
- For usage instructions, API documentation, and examples, please visit the [Reliverse Docs](https://reliverse.org) website.
- Report bugs or suggest features by opening an issue on our [GitHub repository](https://github.com/reliverse/fs/issues).

## Sponsors

*Love using this project? If you find it useful, I’d greatly appreciate a cup of coffee! By supporting this project, you'll gain access to Reliverse Pro, exclusive access to @reliverse/addons-pro, private repositories, pre-release downloads, and even the ability to influence projects planning. Click on the donation platforms below to learn more. Thank you all for your support!*

**[We're Growing Fast! A Huge Thanks to All Our Supporters!](https://github.com/blefnk/relivator/stargazers)**

Developing something as ambitious as [@reliverse/addons](https://github.com/reliverse/addons) takes a huge amount of time, especially since the project is primarily developed by one person. The development could be significantly accelerated by bringing on additional developers. Therefore, @blefnk (Nazar Kornienko), the author of this project, would be immensely grateful to anyone who can contribute financially in any amount. A big thank you in advance to everyone who supports this effort!

**[Visit the "Donate to Relivator" page to see our current donors and learn more.](https://relivator.reliverse.org/donate)**

### 💚 [GitHub Sponsors](https://github.com/sponsors/blefnk) 🩵 [PayPal](https://paypal.me/blefony) 🧡 [Patreon](https://patreon.com/blefnk) 💛 [Buy Me a Coffee](https://buymeacoffee.com/blefnk) 🩷 [Ko-fi](https://ko-fi.com/blefnk)

## Contributing

We welcome contributions! If you’d like to contribute to the development of this package, please follow these steps:

1. **If you are a beginner:** Familiarize yourself with Git by following [The Detailed Git Guide](https://github.com/blefnk/relivator/blob/main/.github/GITGUIDE.md) created by @blefnk and @reliverse.
2. Fork this repository.
3. Create a new branch for your feature (e.g. `git checkout -b feature-branch`).
4. Make your changes in the new branch.
5. Commit your changes with a descriptive message (e.g. `git commit -m 'Add new feature'`).
6. Push your changes to your branch (e.g. `git push origin feature-branch`).
7. Open a [pull request](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-pull-requests) for our review.

Please ensure that your code follows the existing code style and includes appropriate tests. Your code should successfully pass the `bun appts` command.

## License

This project is developed by [Reliverse](https://github.com/orgs/reliverse/repositories) and [@blefnk (Nazar Kornienko)](https://github.com/blefnk) and is licensed under the MIT License. For more information, please refer to the [LICENSE](./LICENSE) file.
