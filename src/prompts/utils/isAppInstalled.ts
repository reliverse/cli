import fs from "fs-extra";
import os from "os";

// Function to check if VSCode is installed by checking common paths
export function isVSCodeInstalled(): boolean {
  const platform = os.platform();

  // Get the current user's home directory
  const homeDir = os.homedir();

  // Common install paths for VSCode
  const commonPaths = {
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

  const pathsToCheck =
    commonPaths[platform as "darwin" | "linux" | "win32"] || [];

  return pathsToCheck.some((vsCodePath: string) =>
    fs.pathExistsSync(vsCodePath),
  );
}
