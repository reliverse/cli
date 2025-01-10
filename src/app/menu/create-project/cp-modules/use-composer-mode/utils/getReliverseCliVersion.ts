import type { PackageJson } from "type-fest";

import fs from "fs-extra";
import path from "pathe";

import { PKG_ROOT } from "~/app/constants.js";

export const getVersion = () => {
  const packageJsonPath = path.join(PKG_ROOT, "package.json");

  const packageJsonContent = fs.readJSONSync(packageJsonPath) as PackageJson;

  return packageJsonContent.version ?? "1.0.0";
};
