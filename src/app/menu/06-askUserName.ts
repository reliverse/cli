import { inputPrompt } from "@reliverse/prompts";

export async function askUserName(): Promise<string> {
  // TODO: fetch from GitHub after login
  const placeholder = "johnny911";

  const username = await inputPrompt({
    title:
      "Your app will feature a handle (e.g., in the footer section). What should it be?",
    defaultValue: placeholder,
    hint: `Press <Enter> to use the default value. [Default: ${placeholder}]`,
    content: `I recommend using your or your org's GitHub handle (username).\nIf you don't have one yet, you can create an account here: https://github.com/signup \nDon't worry about adding the @ symbol—I’ll take care of that for you.`,
    contentColor: "dim",
    // schema: schema.properties.username,
  });

  return username;
}
