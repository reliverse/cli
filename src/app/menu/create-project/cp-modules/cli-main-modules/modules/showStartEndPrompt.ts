import { endPrompt, startPrompt } from "@reliverse/prompts";
import { getTerminalWidth } from "@reliverse/prompts";
import { isBun, isBunPM, isBunRuntime } from "@reliverse/runtime";

import { cliName, cliVersion } from "~/libs/sdk/constants.js";

export async function showStartPrompt(
  isDev: boolean,
  showRuntimeInfo: boolean,
) {
  await startPrompt({
    titleColor: "inverse",
    clearConsole: true,
    packageName: cliName,
    packageVersion: cliVersion,
    isDev,
  });

  if (showRuntimeInfo) {
    console.log("isBunRuntime:", isBunRuntime());
    console.log("isBunPM:", await isBunPM());
    console.log("isBun:", isBun);
  }
}

export async function showEndPrompt() {
  const width = getTerminalWidth();
  await endPrompt({
    title:
      width < 100
        ? "│  Please support the CLI: https://patreon.com/c/blefnk/membership"
        : "│  ❤️  Please consider supporting @reliverse/cli development: https://patreon.com/c/blefnk/membership",
    titleAnimation: "glitch",
    titleColor: "dim",
    titleTypography: "bold",
    titleAnimationDelay: 800,
  });
}
