import { getCurrentTerminalName, msg, pmv } from "@reliverse/prompts";
import { anykeyPrompt } from "@reliverse/prompts";
import { multiselectPrompt } from "@reliverse/prompts";
import { progressbar } from "@reliverse/prompts";
import {
  animateText,
  confirmPrompt,
  datePrompt,
  endPrompt,
  numMultiSelectPrompt,
  nextStepsPrompt,
  numberPrompt,
  passwordPrompt,
  startPrompt,
  inputPrompt,
  togglePrompt,
} from "@reliverse/prompts";
import { promptsDisplayResults } from "@reliverse/prompts";
import { numSelectPrompt } from "@reliverse/prompts";
import { selectPrompt } from "@reliverse/prompts";
import { spinner } from "@reliverse/prompts";
import { emojify } from "node-emoji";
import { bold } from "picocolors";

import { pkg, pm } from "~/utils/pkg.js";

import { schema, type UserInput } from "./schema.js";
import {
  calculateAge,
  createColorChoices,
  displayUserInputs,
  hashPassword,
  validateAge,
} from "./utils.js";

export async function showStartPrompt() {
  await startPrompt({
    title: `@reliverse/cli v${pkg.version} | ${pm} v${pmv} | ${getCurrentTerminalName()}`,
    titleColor: "inverse",
    clearConsole: true,
  });
}

export async function showAnykeyPrompt(
  kind: "welcome" | "pm" | "privacy",
  username?: string,
) {
  let notification = bold("Press any key to continue...");
  if (kind === "welcome") {
    notification = `Welcome to @reliverse/cli!\n│  This tool can help you easily create new web projects and automatically make advanced codebase modifications, with more features coming soon.\n│  ============================\n│  ${notification}`;
  }
  if (kind === "privacy") {
    notification = `Before you continue, please note that you are only testing an example CLI app.\n│  None of your responses will be sent anywhere. No actions, such as installing dependencies, will actually take place;\n│  this is simply a simulation with a sleep timer and spinner. You can always review the source code to learn more.\n│  ============================\n│  ${notification}`;
  }
  if (kind === "pm" && pm === "bun" && username) {
    notification += `\n│  ============================\n│  ${username}, did you know? Bun currently may crash if you press Enter while setTimeout\n│  is running. So please avoid doing that in the prompts after this one! 😅`;
  }
  await anykeyPrompt(notification);
}

export async function askDir(username: string): Promise<UserInput["dir"]> {
  const dir = await inputPrompt({
    title: `Great! Nice to meet you, ${username}!`,
    content: "Where should we create your project?",
    schema: schema.properties.dir,
    titleVariant: "doubleBox",
    hint: "Default: ./prefilled-default-value",
    defaultValue: "./prefilled-default-value",
  });
  return dir ?? "./prefilled-default-value";
}

export async function showNumberPrompt(): Promise<UserInput["age"]> {
  const age = await numberPrompt({
    title: "Enter your age",
    hint: "Try: 42 | Default: 36",
    defaultValue: "36",
    schema: schema.properties.age,
    validate: (value) => {
      const num = Number(value);
      if (num === 42) {
        return "42 is the answer to the ultimate question of life, the universe, and everything. Try a different number.";
      }
      return true;
    },
  });
  return age ?? 34;
}

export async function showPasswordPrompt(): Promise<UserInput["password"]> {
  let password = "silverHand2077";

  try {
    password = await passwordPrompt({
      title: "Imagine a password",
      schema: schema.properties.password,
      defaultValue: "silverHand2077",
      hint: "Default: silverHand2077",
      validate: (input) => {
        if (!/[A-Z]/.test(input)) {
          return "Password must be latin letters and contain at least one uppercase letter.";
        }
        return true;
      },
    });
  } catch (error) {
    msg({
      type: "M_ERROR",
      title: "Password prompt was aborted or something went wrong.",
    });
  }

  return password ?? "silverHand2077";
}

export async function showDatePrompt(): Promise<UserInput["birthday"]> {
  const birthdayDate = await datePrompt({
    dateKind: "birthday",
    dateFormat: "DD.MM.YYYY",
    title: "Enter your birthday",
    hint: "Default: 16.11.1988",

    defaultValue: "16.11.1988",
    schema: schema.properties.birthday,
  });
  return birthdayDate ?? "16.11.1988";
}

export async function showSelectPrompt(): Promise<UserInput["lang"]> {
  const lang = await selectPrompt({
    title: "Choose your language",
    options: [
      { label: "English", value: "en", hint: "English" },
      { label: "Ukrainian", value: "uk", hint: "Українська" },
      { label: "Polish", value: "pl", hint: "Polski" },
      { label: "French", value: "fr", hint: "Français" },
      { label: "German", value: "de", hint: "Deutsch" },
      { label: "Other", value: "else", hint: "Other" },
    ],
    defaultValue: "en",
  });

  switch (lang) {
    case "en":
      msg({ type: "M_INFO", title: "You selected English" });
      break;
    case "uk":
      msg({ type: "M_INFO", title: "Ви обрали українську" });
      break;
    case "pl":
      msg({ type: "M_INFO", title: "Wybrałeś język polski" });
      break;
    case "fr":
      msg({ type: "M_INFO", title: "Vous avez choisi le français" });
      break;
    case "de":
      msg({
        type: "M_INFO",
        title: "Sie haben die deutsche Sprache ausgewählt",
      });
      break;
    case "else":
      msg({ type: "M_INFO", title: "You selected Other" });
      break;
  }

  return lang;
}

export async function showMultiselectPrompt(): Promise<UserInput["langs"]> {
  const jokes: Record<string, string> = {
    TypeScript:
      "- Why did TypeScript bring a type-checker to the party? Because it couldn't handle any loose ends!",
    JavaScript:
      "- Why was the JavaScript developer sad? Because he didn't Node how to Express himself.",
    CoffeeScript:
      "- Why do CoffeeScript developers always seem calm? Because they never have to deal with too much Java!",
    Python:
      "- Why do Python programmers prefer dark mode? Because light attracts bugs!",
    Java: "- Why do Java developers wear glasses? Because they don't C#.",
    CSharp:
      "- Why did the C# developer go broke? Because he used up all his cache.",
    Go: "- Why do Go programmers prefer the beach? Because they love to handle their goroutines!",
    Rust: "- Why did the Rust programmer never get lost? Because he always borrowed the right path.",
    Swift:
      "- Why did the Swift developer quit his job? Because he didn't like being optional!",
  };

  const selectedOptions = await multiselectPrompt({
    title: "Select your favorite programming languages",
    options: [
      {
        value: "ts",
        label: "TypeScript",
        hint: "💙 Type-safe and scalable",
      },
      {
        value: "js",
        label: "JavaScript",
        hint: "💛 Versatile and widely-used",
      },
      {
        value: "cs",
        label: "CoffeeScript",
        hint: "☕ Elegant and concise",
      },
      {
        value: "py",
        label: "Python",
        hint: "🐍 Powerful and easy to learn",
      },
      { value: "java", label: "Java", hint: "☕ Robust and portable" },
      {
        value: "csharp",
        label: "CSharp",
        hint: "🟣 Modern and object-oriented",
      },
      { value: "go", label: "Go", hint: "🐟 Simple and efficient" },
      { value: "rust", label: "Rust", hint: "🦀 Fast and memory-safe" },
      { value: "swift", label: "Swift", hint: "🍎 Safe and performant" },
    ],
    required: true,
  });

  if (!Array.isArray(selectedOptions)) {
    process.exit(0);
  }

  msg({
    type: "M_INFO",
    title: "Here are some dumb jokes for you:",
    titleTypography: "bold",
    titleColor: "viceGradient",
    addNewLineBefore: false,
    addNewLineAfter: false,
  });

  selectedOptions.forEach((option) => {
    const joke = jokes[option];
    msg({
      type: "M_INFO_NULL",
      title: joke ? joke : `${option} selected.`,
      addNewLineBefore: false,
      addNewLineAfter: false,
    });
  });

  msg({
    type: "M_NEWLINE",
  });

  return selectedOptions;
}

export async function showNumSelectPrompt(): Promise<UserInput["color"]> {
  const choices = createColorChoices();

  const color = await numSelectPrompt({
    title: "Choose your favorite color",
    content:
      "You are free to customize everything in your prompts using the following color palette.",
    choices,
    defaultValue: "17",
    hint: "Default: 17",
    schema: schema.properties.color,
  });

  return color.toString() ?? "red";
}

export async function showNumMultiselectPrompt(): Promise<
  UserInput["features"]
> {
  const features = await numMultiSelectPrompt({
    title: "What web technologies do you like?",
    defaultValue: ["react", "typescript"],
    choices: [
      {
        title: "React",
        id: "react",

        description: "A library for building user interfaces.",
      },
      {
        title: "TypeScript",
        id: "typescript",
        description:
          "A programming language that adds static typing to JavaScript.",
      },
      {
        title: "ESLint",
        id: "eslint",
        description: "A tool for identifying patterns in JavaScript code.",
      },
    ] as const,
    schema: schema.properties.features,
  });
  return features ?? ["react", "typescript"];
}

export async function showTogglePrompt(): Promise<UserInput["toggle"]> {
  const result = await togglePrompt({
    title: "Do you like @reliverse/relinka library?",
    options: ["Yes", "No"],
    initial: "Yes",
  });

  const agree = result === "Yes";
  msg({
    type: "M_INFO",
    title: "Your response:",
    content: agree ? "You like it! 🥰" : "You don't like it... 😔",
  });

  return agree;
}

export async function showConfirmPrompt(
  username: string,
): Promise<UserInput["spinner"]> {
  await showAnykeyPrompt("pm", username);

  const spinner = await confirmPrompt({
    title: "Do you want to see spinner in action?",
    titleColor: "red",
    titleVariant: "doubleBox",
    content: "Spinners are helpful for long-running tasks.",
    defaultValue: true,
  });

  if (spinner) {
    await showSpinner();
  }

  return spinner ?? false;
}

export async function showSpinner() {
  await spinner({
    initialMessage: "Installing dependencies...",
    successMessage: "Hooray! Dependencies installed successfully!",
    errorMessage: "An error occurred while installing dependencies!",
    spinnerSolution: "ora",
    spinnerType: "arc",
    action: async (updateMessage) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      updateMessage("Finalizing installation...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    },
  });
}

export async function showProgressBar() {
  await progressbar({
    total: 100,
    width: 10,
    format:
      "[progressbar] [:bar] :percent% | Elapsed: :elapsed s | ETA: :eta s",
    completeChar: "#",
    incompleteChar: "-",
    colorize: true,
    increment: 5,
    desiredTotalTime: 3000,
  });
}

export async function showResults(userInput: UserInput) {
  await promptsDisplayResults({
    results: userInput,
    inline: true,
  });
}

export async function doSomeFunStuff(userInput: UserInput) {
  const calculatedAge = calculateAge(userInput.birthday);
  validateAge(calculatedAge, userInput.age, userInput.birthday);

  userInput.password = hashPassword(userInput.password);

  displayUserInputs(userInput);
}

export async function showNextStepsPrompt() {
  await nextStepsPrompt({
    title: "Next Steps",
    content: "- Set up your profile\n- Review your dashboard\n- Add tasks",
  });
}

export async function showAnimatedText() {
  await animateText({
    title: emojify(
      "ℹ  :exploding_head: Our library even supports animated messages and emojis!",
    ),
    anim: "neon",
    delay: 2000,

    titleColor: "passionGradient",
    titleTypography: "bold",
  });
}

export async function showEndPrompt() {
  await endPrompt({
    title: emojify(
      "ℹ  :books: Learn the docs here: https://docs.reliverse.org/cli",
    ),
    titleAnimation: "glitch",

    titleColor: "retroGradient",
    titleTypography: "bold",
    titleAnimationDelay: 2000,
  });
}
