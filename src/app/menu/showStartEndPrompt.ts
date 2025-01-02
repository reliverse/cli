import { endPrompt, startPrompt } from "@reliverse/prompts";
import { emojify } from "node-emoji";

export async function showStartPrompt(args: { dev: boolean }) {
  await startPrompt({
    titleColor: "inverse",
    clearConsole: true,
    packageName: "@reliverse/cli",
    packageVersion: "1.4.11",
    isDev: args.dev,
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
