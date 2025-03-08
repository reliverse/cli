import fs from "fs-extra";
import os from "node:os";

import { homeDir } from "~/libs/sdk/constants.js";

type Platform = "darwin" | "linux" | "win32";

export function isVSCodeInstalled(): boolean {
  const platform = os.platform() as Platform;

  const commonVSCodeInstallPaths = {
    darwin: [
      "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code",
    ],
    linux: ["/usr/bin/code", "/snap/bin/code"],
    win32: [
      `${homeDir}\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe`,
      "C:/Program Files/Microsoft VS Code/Code.exe",
      "C:/Program Files (x86)/Microsoft VS Code/Code.exe",
    ],
  };

  const pathsToCheck = commonVSCodeInstallPaths[platform] ?? [];

  return pathsToCheck.some((vsCodePath: string) =>
    fs.pathExistsSync(vsCodePath),
  );
}
