import { inputPrompt, msg } from "@reliverse/prompts";
import { generate } from "random-words";

export async function askUserName(): Promise<string> {
  msg({
    type: "M_MIDDLE",
  });

  // const placeholder = generate({ exactly: 2, join: "" });
  const placeholder = "johnny911";

  const username = await inputPrompt({
    title:
      "Your app will contain @handle e.g. in the footer section. What should it be?",
    defaultValue: placeholder,
    hint: `Press <Enter> to use the default value. [Default: ${placeholder}]`,
    content: `Generally it's recommended to use your/org's GitHub @handle (username).
If you don't have one, you can create a new account here: https://github.com/signup`,
    contentColor: "dim",
    // schema: schema.properties.username,
  });

  return username;
}
