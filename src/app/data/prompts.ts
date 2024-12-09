import { msg } from "@reliverse/prompts";
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
import { task } from "@reliverse/prompts";
import { emojify } from "node-emoji";
import pc from "picocolors";

import { pm } from "~/utils/pkg.js";

import {
  calculateAge,
  createColorChoices,
  displayUserInputs,
  hashPassword,
  validateAge,
} from "./utils.js";

// import { pkg } from "~/utils/pkg.js";

export async function showStartPrompt() {
  await startPrompt({
    titleColor: "inverse",
    clearConsole: true,
    packageName: "@reliverse/cli",
    packageVersion: "1.3.8",
    // packageName: pkg.name,
    // packageVersion: pkg.version,
  });
}

export async function showAnykeyPrompt(
  kind: "welcome" | "pm" | "privacy",
  username?: string,
) {
  let notification = pc.bold("Press any key to continue...");

  if (kind === "welcome") {
    notification = `👋 Hello, my name is Reliverse!\n│  🤖 I'm your assistant for creating new web projects and making advanced codebase modifications automatically.\n│  ✨ I'm constantly evolving, with more features on the way.\n│  ============================\n│  ${notification}`;
  }

  if (kind === "privacy") {
    notification = `🤖 Before we proceed, let me share something important:\n│  I may collect minimal data about your projects, such as their name, to help me remember your preferences and provide smarter, more personalized suggestions.\n│  Rest assured, your data will be used solely to enhance your experience with me, and I won't share it with anyone. If you wish, you can choose to share some data with other users.\n│  If you'd prefer not to allow any data collection, you can always run me with the '--nodata' option (please note that authentication is still required). Keep in mind that this may limit my capabilities.\n│  ============================\n│  ${notification}`;
  }

  if (kind === "pm" && pm === "bun" && username) {
    notification += `\n│  ============================\n│  Hey ${username}, a quick tip from me: Bun might crash if you press Enter while setTimeout\n│  is running. Please avoid doing that in the upcoming prompts! 😅`;
  }

  await anykeyPrompt(notification);
}

// export async function askDir(username: string): Promise<UserInput["dir"]> {
export async function askDir(username: string) {
  const dir = await inputPrompt({
    title: `Great! Nice to meet you, ${username}!`,
    content: "Where should we create your project?",
    titleVariant: "doubleBox",
    hint: "Default: ./prefilled-default-value",
    defaultValue: "./prefilled-default-value",
  });
  return dir ?? "./prefilled-default-value";
}

export async function showNumberPrompt() {
  const age = await numberPrompt({
    title: "Enter your age",
    hint: "Try: 42 | Default: 36",
    defaultValue: "36",
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

export async function showPasswordPrompt() {
  let password = "silverHand2077";

  try {
    password = await passwordPrompt({
      title: "Imagine a password",
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

export async function showDatePrompt() {
  const birthdayDate = await datePrompt({
    dateKind: "birthday",
    dateFormat: "DD.MM.YYYY",
    title: "Enter your birthday",
    hint: "Default: 16.11.1988",

    defaultValue: "16.11.1988",
  });
  return birthdayDate ?? "16.11.1988";
}

export async function showSelectPrompt() {
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

export async function showMultiselectPrompt() {
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

  return selectedOptions;
}

export async function showNumSelectPrompt() {
  const choices = createColorChoices();

  const color = await numSelectPrompt({
    title: "Choose your favorite color",
    content:
      "You are free to customize everything in your prompts using the following color palette.",
    choices,
    defaultValue: "17",
    hint: "Default: 17",
  });

  return color.toString() ?? "red";
}

export async function showNumMultiselectPrompt() {
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
  });
  return features ?? ["react", "typescript"];
}

export async function showTogglePrompt() {
  const result = await togglePrompt({
    title: "Do you like @reliverse/relinka library?",
    options: ["Yes", "No"],
  });

  msg({
    type: "M_INFO",
    title: "Your response:",
    content: result ? "You like it! 🥰" : "You don't like it... 😔",
  });

  return result;
}

export async function showConfirmPrompt(username: string) {
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
  await task({
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

// export async function showResults(userInput: UserInput) {
export async function showResults(userInput) {
  await promptsDisplayResults({
    results: userInput,
    inline: true,
  });
}

// export async function doSomeFunStuff(userInput: UserInput) {
export async function doSomeFunStuff(userInput) {
  const calculatedAge = calculateAge(userInput.birthday);
  validateAge(calculatedAge, userInput.age, userInput.birthday);

  userInput.password = hashPassword(userInput.password);

  displayUserInputs(userInput);
}

export async function showNextStepsPrompt() {
  await nextStepsPrompt({
    title: "Next Steps",
    content: [
      "- Set up your profile",
      "- Review your dashboard",
      "- Add tasks",
    ],
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

// Want to learn more about how I work? Check out my documentation here: https://docs.reliverse.org/cli
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
