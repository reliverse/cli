import packageJson from "../../package.json";

function getReliverseVersion() {
  return packageJson.version;
}

export const reliverseVersion = getReliverseVersion();
