import { detect } from "detect-package-manager";

export const pm = await detect();

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
