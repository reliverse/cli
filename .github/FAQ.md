# FAQ

**This is not only a Reliverse-specific FAQ but also a developers' FAQ for Next.js and the React ecosystem in general.**

- **RQ1:** How do I enable the brand new React 19's React Compiler? **RA1:** Please visit the `next.config.js` file, and inside the `experimental` section, find `reactCompiler` and set it to `true`. Additionally, it's recommended to install `pnpm -D babel-plugin-react-compiler`. There are great ESLint rules, but they are uninstalled by default because they enable Babel/Webpack, which may slow down the build. If you just installed this plugin, then open `eslint.config.js`, find, and uncomment things related to it (use `Cmd/Ctrl+F` and search for `compiler`).

- **RQ2:** How do I ensure my code is fully auto-fixed? **RA2:** Please note that you may need to press Cmd/Ctrl+S a few times to have the code fully fixed by various tools.

- **RQ3:** How can I check the project's health? **RA3:** Run `pnpm appts` or `pnpm turbo:appts` (unstable but interactive and faster) to check the project's health.

- **RQ4:** How can I update all packages to the latest version? **RA4:** For experienced developers, run `pnpm latest` to update all packages to the latest version. Alternatively, use 'pnpm reli:prepare' to update all dependencies and check if the code requires any adjustments.

- **RQ5:** Why do I sometimes see the notification `Invalid JSON. JSON5: invalid character '#'`? **RA5:** No worries, looks like you've `thinker.sort-json` VSCode extension installed, and it seems to be an incorrect error thrown by this extension. But it's not recommended to use external sort-json-like extensions, because we've configured `eslint-plugin-jsonc`, which already does sorting in the more predicted way. If you still need `thinker.sort-json`, looks like it can't sort JSON files in rare random cases, but it works fine on the next file save (if your file doesn't have issues, of course). If this error is causing significant problems, such as preventing you from adding a word to CSpell, you can set `source.fixAll.sort-json` to `never` in `editor.codeActionsOnSave` of `.vscode/settings.json`.

- **RQ6:** What should I do if I notice outdated information or other issues in the README.md or other files? **RA6:** In an effort to be as helpful as possible, this README contains a wealth of information. Some text may be outdated and will be updated as we grow. Please let us know on the [discussion page](https://github.com/blefnk/relivator-nextjs-template/discussions/6) if you notice any small issues like outdated info, broken links, or grammatical/spelling errors in README.md or other files.

- **RQ6:** What versions of React and Next.js does the project currently use? **RA6:** The project currently uses `react@canary`, `react-dom@canary`, and `next@canary`. If React 19 and/or Next.js 15 have already been fully released, please remove them from the `latest` script and run, for example, `npx nypm add react@latest react-dom@latest next@latest` in the terminal. You can do the same with any other rc-alpha-beta-next-canary-dev-experimental-etc dependencies, on your choice, if their stable version has already been released.

- **RQ7:** Where should I store project-specific files, and how do I handle ESLint issues? **RA7:** You can use the `src/cluster` folder to store project-specific files. This makes it easy to update Relivator to new versions. Learn more by visiting the Dashboard's main page on the development environment. After doing this, be prepared to see many issues pointed out by the ESLint config. Run `pnpm lint` to apply auto-fixes; **linting can take some time, so please be patient**. You may need to run `lint` or `lint:eslint` again if some issues are not fixed automatically. You can also open those files manually and press `Ctrl+S` multiple times until there are no issues in the VSCode "Problems" tab. Typically, by using the CLI, the issues will be resolved by the second or third run. Next, install the `Open Multiple Files` extension in VSCode; right-click on the `src/cluster` folder, select `Open Multiple Files`, and press Enter. Fix all issues. If you are proceeding incrementally, you can suppress certain ESLint/Biome rules (`// eslint-disable-next-line ...`, `// biome-ignore ...`, or completely disable the rule in the relevant config) or TypeScript errors (`@ts-expect-error`), though this is not recommended.

- **RQ8:** Weird things happening when formatting code? The code looks one way, and then the next second, it looks different? For example, you see the number of code lines increasing and then decreasing at the same time upon file saving? Without changing the code, does Biome notify you e.g. "Fixed 6 files" instead of "No fixes needed" when you rerun `pnpm appts`? **RA8:** Congrats! You've encountered a conflict between linters or formatters. First, we recommend opening the `.vscode/settings.json` file, finding the `eslint.rules.customizations` section, and changing the `severity` from `"off"` to `"info"` (if `"off"` is present). Setting it to `"info"` will help you realize that one of the conflicting parties is potentially a rule in that `eslint.rules.customizations`. Next, you can try to correct files like `eslint.config.js` (e.g., disable that conflicting rule), `biome.json`, `.vscode/settings.json`, etc. You can also try to disable Biome or ESLint formatters completely, by setting `biome.enabled` or `eslint.enable` (or `eslint.format.enable`) to "false" in the `.vscode/settings.json` file. What about that "Fixed 6 files" example? It means Biome changed code in some files in the way which is different from ESLint.

- **RQ9:** What should I do if I get a Babel warning about code generator deoptimization? **RA9:** This is a known issue and can be ignored. One of the reason occurs because the React Compiler is not yet fully natively supported by Next.js, it temporarily enables Babel to make the Compiler work. Also, don't worry if you see warnings thrown by Clerk, next-auth, or others when running `pnpm build` (mainly on Windows and Node.js); it's okay, this is a known issue not related to Relivator. It is also okay if pnpm tells you `Issues with peer dependencies found`; you can hide this warning by editing `pnpm.overrides` in the `package.json` file. **P.S.** Ignore the `Unexpected value or character.` error from Biome if you see it in the `globals.css` file. This is a false error, which you can hide by filtering `!globals.css` or just `!**.css` in the VSCode's Problems tab (use `!**.css, !**/node_modules/**` there if VSCode's Biome extension parses node_modules for some unknown reason).

- **RQ10:** Can I open multiple files in my VSCode? **RA10:** We recommend the `Open Multiple Files` extension. Just right-click on the desired folder, e.g., `src`, and choose "Open Multiple Files".

- **RQ11:** I have a strange `Each child in a list should have a unique "key" prop`. Any tips? **RA11:** If you see something like `at meta / at head` below this error, or `<locals>, but the module factory is not available. It might have been deleted in an HMR update.`, first try disabling `experimental.instrumentationHook`, if you have it, in `next.config.js`. You can also try deleting the `.next` folder. Please contact us if the problem persists.

- **RQ12:** Million Lint reports `Attempted import error: '__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED' is not exported from 'react' (imported as 'L').` during the A12#12 What should I do? **RA12:** The easiest solution is to copy the path to the component file that appears under this error and add it to `filter.exclude` in the `next.config.js` file. Generally, the key word is `use`. Click on the component path below this error. It seems Million has not listed every possible external `useSomething`. Many `useSomething` hooks work fine, but some may cause issues. This error is also triggered if you use `"use client";` but no client-specific features are utilized. In this case, remove this directive. Additionally, Million.js sometimes doesn't recognize the `import * as React from "react";` statement – so you need to remove it and explicitly import each React hook, type, etc. This line was removed from over 80 files in Relivator v1.2.6 for this reason.

- **RQ13:** Why do I see a warning in the terminal containing the message `terminating connection due to immediate shutdown command`? **RA13:** This warning occurs because providers like Neon disconnect users from `localhost` if they are inactive for about 5 minutes. Simply refresh the page to restore the connection.

- **RQ14:** How do I remove unused keys from JSON files? **RA14:** Install the `i18n Ally` VSCode extension, open its tab, click on refresh in the `usage report`, right-click on the found unused keys, and select remove.

- **RQ15:** How can I grant admin rights to myself or another user? **RA15:** Run `pnpm db:studio`, navigate to the `${databasePrefix}_user` table, and set `role: admin` for the desired user. In the future, if you have admin rights, you will be able to change user privileges directly from the frontend admin page.

- **RQ16:** What does the `DEMO_NOTES_ENABLED` environment variable mean? **RA16:** Do not use it. It is only used on the official [Relivator demo website](https://relivator.com) to showcase certain features that are not needed in real-world applications.

- **RQ17:** I'm using PlanetScale as my database provider. After taking a break from the project, I'm now encountering an "unable to connect to branch" error. How can I fix this? **RA17:** Go to the PlanetScale dashboard and click on the `wake up` button. Please contact us if the database is not asleep and the problem persists.

- **RQ18:** I have build/runtime errors indicating that Node.js utilities like `net`, `tls`, `perf_hooks`, and `fs` are not found. What should I do? **RA18:** Do not install these utilities; it won't fix the issue. Remember, never keep code in the `utils` folder that *can only run on the server*. Otherwise, you will encounter anomalies during the project build. For example, an error like `node:` and `file:` not found, or the package `fs`, `crypto`, etc. not found. Want to see the error for yourself? Move the file `src/server/react.ts` to `src/utils`, import it in this file, run `pnpm build`, get scared, remove the import, and move the file back to its place. You may find on the web the solutions suggesting to add configurations like `"node": { "net": "empty", "tls": "empty", "perf_hooks": "empty", "fs": "empty" }` or `"browser": { "net": false, "tls": false, "perf_hooks": false, "fs": false }` into `package.json` or to the webpack config, but these may not help you. **The main issue likely lies in the following:** You've triggered client-side code. For example, you might have a hook file in the `utils` folder with a corresponding `useEffect` React hook. To debug, try using the global search functionality in the IDE. Note that commenting out the lines may not be the quickest solution in this case, unlike in other debugging scenarios.

- **RQ19:** I love all kinds of interesting things! Can you recommend any cool VSCode extensions? **RA19:** Of course! Just replace the current code in `.vscode/extensions.json` with the one from `addons/scripts/reliverse/presets/vscode/[default|minimal|ultimate]/extensions.json`. Remember, performance issues are possible, so you can just install what you want. Alternatively, you can just run the `pnpm reli:vscode` command to switch easily, and use `Cmd/Ctrl+Shift+P` ➞ `>Extensions: Show Recommended Extensions`.

  The best way to install this opinionated list of extensions, which are in the `ultimate` preset (although `default` is recommended by us), is to open the project folder in VSCode. Then, install them by using `Ctrl+Shift+P` (or just `F1`) and typing `>Extensions: Show Recommended Extensions`. Click on the cloud icon (`Install Workspace Recommended Extensions`). Wait for the completion. Click `File > Exit` (this will save all your open windows). Open VSCode again, and you are ready to go. The configuration for these extensions is already prepared for you. You can learn more about these extensions, which the `ultimate` preset contains, on the corresponding pages.

  *And, remember! If you have something broken, you always can find the default files content of `.vscode` folder in the `.vscode/presets/default` folder.*

  <details>
    <summary>[Reveal the spoiler]</summary>

  This list may be outdated, and will be updated in Relivator v1.3.x.

  1. [aaron-bond.better-comments](https://marketplace.visualstudio.com/items?itemName=aaron-bond.better-comments)
  2. [adpyke.codesnap](https://marketplace.visualstudio.com/items?itemName=adpyke.codesnap)
  3. [astro-build.houston](https://marketplace.visualstudio.com/items?itemName=astro-build.houston)
  4. [biomejs.biome](https://marketplace.visualstudio.com/items?itemName=biomejs.biome)
  5. [bradlc.vscode-tailwindcss](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss) // tw v3 == release version | tw v4 == pre-release version
  6. [chunsen.bracket-select](https://marketplace.visualstudio.com/items?itemName=chunsen.bracket-select)
  7. [davidanson.vscode-markdownlint](https://marketplace.visualstudio.com/items?itemName=davidanson.vscode-markdownlint)
  8. [dbaeumer.vscode-eslint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
  9. [evondev.indent-rainbow-palettes](https://marketplace.visualstudio.com/items?itemName=evondev.indent-rainbow-palettes)
  10. [fabiospampinato.vscode-open-multiple-files](https://marketplace.visualstudio.com/items?itemName=fabiospampinato.vscode-open-multiple-files)
  11. [github.copilot-chat](https://marketplace.visualstudio.com/items?itemName=github.copilot-chat)
  12. [github.github-vscode-theme](https://marketplace.visualstudio.com/items?itemName=github.github-vscode-theme)
  13. [lokalise.i18n-ally](https://marketplace.visualstudio.com/items?itemName=lokalise.i18n-ally)
  14. [mattpocock.ts-error-translator](https://marketplace.visualstudio.com/items?itemName=mattpocock.ts-error-translator)
  15. [mikekscholz.pop-icon-theme](https://marketplace.visualstudio.com/items?itemName=mikekscholz.pop-icon-theme)
  16. [mylesmurphy.prettify-ts](https://marketplace.visualstudio.com/items?itemName=mylesmurphy.prettify-ts)
  17. [neptunedesign.vs-sequential-number](https://marketplace.visualstudio.com/items?itemName=neptunedesign.vs-sequential-number)
  18. [oderwat.indent-rainbow](https://marketplace.visualstudio.com/items?itemName=oderwat.indent-rainbow)
  19. [streetsidesoftware.code-spell-checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker)
  20. [unifiedjs.vscode-mdx](https://marketplace.visualstudio.com/items?itemName=unifiedjs.vscode-mdx)
  21. [usernamehw.errorlens](https://marketplace.visualstudio.com/items?itemName=usernamehw.errorlens)
  22. [usernamehw.remove-empty-lines](https://marketplace.visualstudio.com/items?itemName=usernamehw.remove-empty-lines)
  23. [yoavbls.pretty-ts-errors](https://marketplace.visualstudio.com/items?itemName=yoavbls.pretty-ts-errors)
  24. [yzhang.markdown-all-in-one](https://marketplace.visualstudio.com/items?itemName=yzhang.markdown-all-in-one)
  25. [zardoy.ts-essential-plugins](https://marketplace.visualstudio.com/items?itemName=zardoy.ts-essential-plugins)

  **"TypeScript Essential Plugins" Extension Notes**: You can configure extension settings by opening VSCode Settings UI and searching for `@ext:zardoy.ts-essential-plugins` there. The quote from [VSCode Extension Repository](https://github.com/zardoy/typescript-vscode-plugins#readme): «Feature-complete TypeScript plugin that improves every single builtin feature such as completions, definitions, references and so on, and also adds even new TypeScript killer features, so you can work with large codebases faster! We make completions more informative. Definitions, references (and sometimes even completions) less noisy. And finally our main goal is to provide most customizable TypeScript experience for IDE features.»

  </details>

- **RQ20:** *[Related to the previous question]* How can I improve my visual experience with VSCode? **RA20:** The project already has a well-configured `.vscode/settings.json`, but we recommend using our very opinionated configs presets. You have choice to install `default` or `ultimate` (`default` is recommended). **To activate the preset run `pnpm reli:vscode`.** For `ultimate` preset don't forget to install the required stuff: the static, means not variable, versions of [JetBrains Mono](https://jetbrains.com/lp/mono) (recommended) and/or [Geist Mono](https://vercel.com/font) and/or [Monaspace](https://monaspace.githubnext.com) (small manual configuration not or may be needed if you don't want to use `JetBrains Mono` on `ultimate` preset). Next, for `ultimate`, install the recommended `pop-icon-theme` VSCode icons pack extension. Finally, make sure to install the extensions from `Q19`, especially, install the recommended by us `GitHub Light` and `Houston` (by Astro developers) themes. Please note that after installing the Houston theme, you will find a new corresponding tab on the sidebar (🧑‍🚀 there is your new friend, which reacts while you've code issues!), you can of course remove this tab by right-clicking, but we recommend simply dragging this panel to the bottom of the Folders tab.

  - TODO: Fix 'Geist Mono' and 'Monaspace Argon Var', which looks like use Medium/Bold variation instead of Regular (`"editor.fontWeight": "normal"` doesn't help here). 'JetBrains Mono' works fine.*
  - TODO: Do we really need to duplicate fonts for every single thing?* 🤔

<!--
  - **RQ??:** [Related to the previous question] Why did you switch the behavior of the `Cmd/Ctrl` and `alt/opt` keys?
    **RA??:** Please note that you may need to press Cmd/Ctrl+S a few times to have the code fully fixed by various tools.
-->

<!--
  - **RQ??:** [Relivator 1.3.0] How can I improve the experience with the CSpell (Code Spell Checker) extension?
    **RA??:** Install the [CSpell VSCode extension](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker), install the CSpell npm package as a dev dependency if it's not installed (check your `package.json` file), install the necessary packages using your package manager (by using `npx nypm add -D @cspell/dict-companies @cspell/dict-de-de @cspell/dict-es-es @cspell/dict-fr-fr @cspell/dict-fullstack @cspell/dict-it-it @cspell/dict-markdown @cspell/dict-npm @cspell/dict-pl_pl @cspell/dict-tr-tr @cspell/dict-typescript @cspell/dict-uk-ua cspell`), and add these lines to the `cspell.json` file:

    ```json
    {
      "import": [
        "@cspell/dict-typescript/cspell-ext.json",
        "@cspell/dict-companies/cspell-ext.json",
        "@cspell/dict-fullstack/cspell-ext.json",
        "@cspell/dict-markdown/cspell-ext.json",
        "@cspell/dict-npm/cspell-ext.json",
        "@cspell/dict-de-de/cspell-ext.json",
        "@cspell/dict-es-es/cspell-ext.json",
        "@cspell/dict-fr-fr/cspell-ext.json",
        "@cspell/dict-it-it/cspell-ext.json",
        "@cspell/dict-pl_pl/cspell-ext.json",
        "@cspell/dict-tr-tr/cspell-ext.json",
        "@cspell/dict-uk-ua/cspell-ext.json"
      ]
    }
    ```
-->

- **RQ21:** How do I switch the package manager from `pnpm` to bun, yarn, or npm? **RA21:** Here's a variant of `scripts` for `bun`, but it not tested too much by us. Scripts presets for other package managers coming with Relivator 1.3.0. Just replace it in `package.json` (and make sure it don't miss anything).

  <details>
    <summary>[Reveal the spoiler]</summary>

  Just find and remove `packageManager` key, if present, and then replace only these specific lines by bun's alternatives:

  ```json
  {
    "scripts": {
      "check:compiler": "bunx react-compiler-healthcheck@latest",
      "fix:codemod-next-community": "bunx @next/codemod --dry --print",
      "fix:codemod-react": "bunx codemod react/19/replace-use-form-state --target src",
      "install:global": "bun add -g vercel@latest codemod@latest eslint_d@latest",
      "latest:all": "bun update --latest",
      "putout:dont-run-manually": "bun lint:putout . --fix",
      "reli:prepare": "bun install && bun latest && bun appts",
      "rm:other": "bun fse remove .million && bun fse remove .eslintcache && bun fse remove tsconfig.tsbuildinfo"
    }
  }
  ```

  </details>

  After you have replaced the scripts, open the project folder and close VSCode. Delete `node_modules` and `pnpm-lock.yaml`. Open the project in a terminal and run `npx nypm install`. After that, you can reopen VSCode. You're done!

- **RQ22:** I applied the `default`/`ultimate` preset settings in VSCode, and now my IDE is slow when I save a file. **RA22:** Go to the keybindings in VSCode, set `Save without Formatting` to `Ctrl+S` (`Cmd+S`), and `File: Save` to `Ctrl+Shift+S` (`Cmd+Shift+S`). Don't worry if the code might be messy when saving without formatting. Just run pnpm appts and everything will be improved and formatted. You're welcome! P.S. You can also read the VSCode's [Performance Issues](https://github.com/microsoft/vscode/wiki/Performance-Issues) article.

  <details>
    <summary>[Reveal the spoiler]</summary>

  **keybindings.json** (`F1`->`>Preferences: Open Keyboard Shortcuts (JSON)`):

  ```json
  [{
    "command": "workbench.action.files.save",
    "key": "ctrl+shift+s"
  }, {
    "command": "workbench.action.files.saveWithoutFormatting",
    "key": "ctrl+s"
  }, {
    "command": "workbench.action.nextEditor",
    "key": "ctrl+tab"
  }, {
    "command": "workbench.action.previousEditor",
    "key": "ctrl+shift+tab"
  }]
  ```

  </details>

- **RQ23:** What does index.ts do in the server and utils folders? **RA23:** These are called barrel files. You can make imports more convenient in your project by using the barrel approach. To do this, use index.ts files to re-export items from other files. Please note: keep code that can only run on the server in the server folder. Code that can run on both the server and client sides should be kept in the utils folder. Relivator 1.2.6 currently violates this description, so we should fix it in v1.3.0. Typically, server functions look like getDoSomething. Additionally, do not import code from the server folder into .tsx files that use React Hooks (useHookName), except when the component has useTransition or similar, which allows you to perform a server action from within the client component.

- **RQ24:** Why do I see console.[log|info|warn|error|...] only in the browser console and not in the terminal from which the application was launched? **RA24:** If I (@blefnk) researched correctly, it is because you are calling console() in a client-side component (which has the "use client" directive at the top of the file or uses React Hooks). It looks like the terminal works as a server environment. Try calling console() in a file that does not have that directive and hooks. Or just use toasts which works nice with both on the client and the server side.

- **RQ25:** I'm getting strange VSCode extension errors, what should I do? **RA25:** Don't worry, these are just editor anomalies. **Just restart your VSCode, and you're done.** Sometimes, due to insufficient RAM, internal extension failures, or other reasons, a particular extension might crash. Especially anomalous is the notification from TypeScript ESLint stating that it can have no more than 8 entry files (we will try to fix this in 1.3.0). Or Biome might start linting `node_modules` for some reason, which is also strange to us; our attempts to fix this so far have been unsuccessful, but we will try again in 13.0. Besides this, an extension crash might also happen if you just used `pnpm reli:setup` and didn't restart the editor. Or if you manually edited a configuration file and since autosave was enabled, the editor managed to send the configuration with syntax errors to the extension, causing everything to crash. So, restart VSCode, and everything will be fixed! If that doesn't help, check if your configuration files have any issues.

- **RQ26:** How do I change VSCode's panel position? **RA26:** Just right-click on the panel, select `Panel Position`, and choose the desired position, e.g., `Bottom`.

- **RQ27:** I have the correct data (key-value) specified in the `.env` file, but a certain library, for example, Clerk, does not see this data or sees outdated data. What can I do? **RA27:** The simplest solution is to just rename your project folder, run `pnpm install`, and check if the issue is resolved. Otherwise, contact the technical support and community of the respective library.

- **RQ28:** How can I configure `pnpm` or `bun` (as package manager) for my needs? **RA28:** You can visit [this `pnpm` page](https://pnpm.io/package_json) or [this `bun` page](https://bun.sh/docs/runtime/bunfig#package-manager) in the official docs to learn more.

**RQ29:** Should I modify the components by [shadcn/ui](https://ui.shadcn.com) (as of Relivator 1.2.6, they are located in the `"addons/components/ui"` folder)? **RA29:** You may lose your changes if @shadcn or [Reliverse](https://github.com/orgs/reliverse/repositories) updates any of these components in the release of Relivator 1.3.x+. Therefore, the best option currently is to use, for example, the `"addons/cluster/reliverse/shadcn/ui"` folder, where you can have files that you can safely overwrite the original files with, ensuring you do not lose your changes. As an example, this folder already contains a `cluster-readme.tsx` file, which only re-exports the original `button.tsx` file. So, you can create a `button.tsx` file here and copy and paste that line into your newly created file. Alternatively, you can duplicate the code from the original file and make any modifications you want. Use `Cmd/Ctrl+Shift+H` and simply replace `addons/components/ui` with `addons/cluster/reliverse/shadcn/ui` (the difference is only in the words `"browser"` and `"cluster"`). `addons/cluster` is your house; feel free to do anything you want here, mess it up or tidy it up as you wish. This is your own house, and no one has the right to take it away from you.

- **RQ30:** Which command allows me to easily manage the installation of dependencies in a project? **RA30:** `pnpm deps:install`. However, before running this script, you should manually install the essentials:

  - npx nypm add typescript tsx nypm @mnrendra/read-package @clack/prompts
  - npx nypm add fs-extra pathe fast-npm-meta semver @types/semver redrun axios
  - bun|yarn|pnpm dlx jsr add @reliverse/core (or: npx jsr add @reliverse/core)

- **RQ31:** I noticed a [Turborepo](https://turbo.build) file named `turbo.disabled.json`. How can I reactivate `turbo`? **RA31:** Simply remove the `.disabled` from the filename. You can also add the `"scripts"` from the `turbo.scripts.json` file to the `package.json` file (if they are not already there).

- **RQ32:** Where can I find out more details about the Relivator and Reliverse? **RA32:** Read the current README.md file to learn more about each specific aspect of the project. You can also find more information on the project's [Discord](https://discord.gg/Pb8uKbwpsJ) server and on the [GitHub Issues](https://github.com/blefnk/relivator-nextjs-template/issues) page.
