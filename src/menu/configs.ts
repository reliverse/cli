import type { OptionalPromptOptions } from "@reliverse/relinka";

import { emojify } from "node-emoji";

export const basicConfig = {
  titleColor: "cyanBright",
  titleTypography: "bold",
  borderColor: "viceGradient",
} satisfies OptionalPromptOptions;

export const extendedConfig = {
  ...basicConfig,
  contentTypography: "italic",
  contentColor: "dim",
  answerColor: "none",
} satisfies OptionalPromptOptions;

export const experimentalConfig = {
  titleColor: "cyanBright",
  titleTypography: "bold",
  endTitle: emojify(
    ":books: Learn the docs here: https://docs.reliverse.org/reliverse",
  ),
  endTitleColor: "retroGradient",
} satisfies OptionalPromptOptions;
