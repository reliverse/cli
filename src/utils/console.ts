import { msg } from "@reliverse/prompts";

import type { MessageConfig } from "~/types.js";
import type { MessageKind } from "~/types.js";
import type { AllKinds } from "~/types.js";

const verboseLogging = false;

const MESSAGE_CONFIGS: Record<MessageKind, MessageConfig> = {
  log: {
    type: "M_INFO",
    titleColor: "retroGradient",
    titleTypography: "bold",
  },
  info: {
    type: "M_INFO",
    titleColor: "retroGradient",
    titleTypography: "bold",
  },
  success: {
    type: "M_INFO",
    titleColor: "viceGradient",
    titleTypography: "bold",
  },
  warn: {
    type: "M_ERROR",
    titleColor: "yellowBright",
    titleTypography: "bold",
  },
  error: {
    type: "M_ERROR",
    titleColor: "yellowBright",
    titleTypography: "bold",
  },
};

export const relinka = (
  kind: AllKinds,
  title: string,
  content?: string,
  hint?: string,
): void => {
  const isVerbose = kind.endsWith("-verbose");
  const baseKind = (
    isVerbose ? kind.replace("-verbose", "") : kind
  ) as MessageKind;

  if (isVerbose && !verboseLogging) {
    return;
  }

  const config = MESSAGE_CONFIGS[baseKind];
  msg({
    ...config,
    title: isVerbose ? `[debug] ${title}` : title,
    content,
    contentColor: "dim",
    contentTypography: "italic",
    hint,
  });
};

export const throwError = (error: unknown): never => {
  msg({
    type: "M_ERROR",
    title:
      error instanceof Error
        ? `🤔 Failed to set up the project: ${error.message}`
        : "🤔 An unknown error occurred.",
  });

  process.exit(1);
};
