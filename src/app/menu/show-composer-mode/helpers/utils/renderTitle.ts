import gradient from "gradient-string";

import { TITLE_TEXT } from "~/app/db/constants.js";
import { getUserPkgManager } from "~/app/menu/show-composer-mode/helpers/utils/getUserPkgManager.js";

const gradientTheme = {
  blue: "#add7ff",
  cyan: "#89ddff",
  green: "#5de4c7",
  magenta: "#fae4fc",
  red: "#d0679d",
  yellow: "#fffac2",
};

export const renderTitle = () => {
  const titleGradient = gradient(Object.values(gradientTheme));

  // resolves weird behavior where the ascii is offset
  const pkgManager = getUserPkgManager();
  if (pkgManager === "yarn" || pkgManager === "pnpm") {
    console.log("");
  }
  console.log(titleGradient.multiline(TITLE_TEXT));
};
