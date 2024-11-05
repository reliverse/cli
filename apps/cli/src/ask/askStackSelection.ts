import { selectWithConfig } from "~/utils/promptsUtils";
import { languages } from "~/prompts";
import { title } from "~/utils/generalUtils";

// export async function askStackSelection(): Promise<string | undefined> {
export async function askStackSelection(): Promise<void> {
  // const lang = await selectWithConfig(
  await selectWithConfig(
    title("Will you be using TypeScript or JavaScript?"),
    languages,
    2,
  );
  // return lang;
}
