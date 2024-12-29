import { detect, getNpmVersion } from "detect-package-manager";

export const pm = await detect();
export const pmv = await getNpmVersion(pm);

let pmx: string;
switch (pm) {
  case "bun":
    pmx = "bunx";
    break;
  case "pnpm":
    pmx = "pnpx";
    break;
  default:
    pmx = "npx";
}
export { pmx };
