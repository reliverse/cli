import { endPrompt, startPrompt } from "@reliverse/prompts";
import { emojify } from "node-emoji";

export async function showStartPrompt() {
  await startPrompt({
    titleColor: "inverse",
    clearConsole: true,
    packageName: "@reliverse/cli",
    packageVersion: "1.3.25",
    terminalSizeOptions: {
      minWidth: 100,
      minHeight: 16,
    },
  });
}

export async function showEndPrompt() {
  await endPrompt({
    title: emojify("ℹ  :books: https://docs.reliverse.org/reliverse/cli"),
    titleAnimation: "glitch",
    titleColor: "retroGradient",
    titleTypography: "bold",
    titleAnimationDelay: 500,
  });
}
