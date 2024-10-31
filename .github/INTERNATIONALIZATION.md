# Internationalization

*Stay tuned for further expansions to this section in the future.*

*The instructions below may be outdated, so please double-check them! We will fully update this README.md with the Relivator 1.3.0 release.*

Multilingualism at Bleverse Reliverse vision is revered. We adore discussing it and plan to delve into the topic of Next.js 15 App Router internationalization in future writings.

Presently, all languages are machine-translated. Future revisions by native speakers are planned.

useTranslations works both on the server and client; we only need the getTranslations on async components.

*Currently not available.* Use `pnpm lint:i18n` to verify the i18n files. The tool attempts to rectify issues when possible, offering features like ascending sort. No output means everything is in order.

We are using *next-intl* for internationalization. Sometime we can use beta/rc versions as needed. Find more information about it [here](https://next-intl-docs.vercel.app/blog/next-intl-3-0) and [here](https://github.com/amannn/next-intl/pull/149).

## How to add a new language

*The process described below will be simplified and automated in the future. Please let us know if you have any further questions regarding the current process for adding languages.*

1. We will need an [i18n code](https://saimana.com/list-of-country-locale-code/) (in the format `language-country`; the language code alone is sufficient, but it's not optimal for SEO). For example, let's take Chinese, for which I know the codes *zh-cn/zh-tw/zh-hk* are used.
2. Open the `messages` folder and create a `zh-cn.json` file with the example content: `{ "metadata": { "description": "建立更高效、更吸引人且更有利可图的在线商店：使用 Relivator" } }`.
3. Now open `src/i18n.ts` and add `"zh-cn": zh_cn` with the appropriate `import` at the top.
4. In the file `src/navigation.ts`, add the corresponding values to `locales` and `labels`.
5. Run `pnpm dev` and review the landing page header. If it appears correctly, you're ready to go.
6. Optionally, I recommend using the VSCode extension [i18n Ally](https://marketplace.visualstudio.com/items?itemName=Lokalise.i18n-ally), which makes machine translation easy.
7. Also optionally, install [specific CSpell language](https://github.com/streetsidesoftware/cspell-dicts#language-dictionaries) for full support of this language in VSCode (when using the "[Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker)" extension). If the language is not available, try to find a word dictionary file on the web or make a new one (see CSpell docs).

By the way, **if the country flag is not displayed**: open `src/localization-main.tsx`, go to *LocaleFlagIcon* and add the `else if`. Please visit the [flag-icons library website](https://flagicons.lipis.dev/) to see the code for the missing icon. The example for *zh-cn* will be: `} else if (baseLocale === "zh") { return <span aria-hidden="true" className="fi fi-cn mr-2" />; }`

Please be aware that both the "i18n Ally" VSCode extension and manual systems like "Google Translate" may incorrectly translate variables. If you encounter an error like this:
Original Message: 'The intl string context variable "类别" was not provided to the string "购买最好的{类别}"'.
This error occurs because we have {类别}, but it should be {category}. To verify the correct variable, refer to the en-us.json file.Certainly! So the correct version for this specific case will be:

```json
{
  "categories": {
    "buyFromCategories": "从最好的商店购买 {category}",
    "buyProducts": "购买 ${category} 类别的产品",
    "buyTheBest": "购买最好的 {category}"
  }
}
```

**Currently supported locales (you can add the own manually):**

- de, en, es, ms, fr, hi, it, pl, tr, uk, zh.
- de-DE, en-US, es-ES, ms-MY, fr-FR, hi-IN, it-IT, pl-PL, tr-TR, uk-UA, zh-CN.
