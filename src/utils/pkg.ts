import { detect, getNpmVersion } from "detect-package-manager";

// import packageJson from "~/../package.json" with { type: "json" };

export const pm = await detect();
export const pmv = await getNpmVersion(pm);
// export const pkg = packageJson;
