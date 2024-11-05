import color from "picocolors";
import { detectPackageManager } from "nypm";

export async function getPackageManagerName() {
  const cwd = process.cwd();
  const pm = await detectPackageManager(cwd);
  return pm?.name;
}

export function title(message: string): string {
  return color.cyanBright(color.bold(message));
}
