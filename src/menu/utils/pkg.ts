import { detect, getNpmVersion } from "detect-package-manager";

export const pm = await detect();
export const pmv = await getNpmVersion(pm);
