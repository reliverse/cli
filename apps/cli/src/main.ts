import { intro, outro, select, text, isCancel, cancel } from "@clack/prompts";
import color from "picocolors";
import { version } from "../package.json";
import { detectPackageManager } from "nypm";

const modes = {
  create: "create",
  modify: "modify",
  exit: "exit",
};

const menuModes = [
  { value: modes.create, label: "Create a new web dev project" },
  { value: modes.modify, label: "Modify the existing project" },
  { value: modes.exit, label: "Exit" },
];

const projectKinds = [
  { value: "app", label: "Web app with Next.js, Deno, Nuxt, Astro, etc" },
  {
    value: "site",
    label: "Classic site with WordPress, HTML/CSS/JS, etc",
    disabled: true,
  },
  {
    value: "native",
    label: "Native app with Electron, React Native, etc",
    disabled: true,
  },
  { value: "exit", label: "Exit" },
  {
    value: "cli",
    label: "CLI tool with Node.js, Deno, Python, Go, etc",
    disabled: true,
  },
  {
    value: "library",
    label: "Library for Node.js, ESLint, Python, Rust, etc",
    disabled: true,
  },
  {
    value: "extension",
    label: "Extension for browser, VSCode, Reliverse, etc",
    disabled: true,
  },
  {
    value: "monorepo",
    label: "Monorepo with Turborepo, Moonrepo, Nx, etc",
    disabled: true,
  },
  {
    value: "game",
    label: "Game with web, Godot, UE5, Unity, Pawn, etc",
    disabled: true,
  },
  {
    value: "ci",
    label: "CI/CD with GitHub Actions, package.json, etc",
    disabled: true,
  },
];

const promptsConfig = {
  projectName: "relivator",
  userHandle: "blefnk",
  orgHandle: "reliverse",
  userName: "Nazar Kornienko",
  orgName: "Bleverse Reliverse",
};

function validateText(
  value: string,
  cannotBeEmpty: boolean,
): string | undefined {
  if (cannotBeEmpty && (!value || value.trim() === "")) {
    return "This field cannot be empty.";
  }
  if (value !== "" && !/^[a-z0-9-_]+$/.test(value)) {
    return "Use lowercase alphanumeric characters, with - or _ instead of spaces.";
  }
}

async function promptWithConfig(
  key: keyof typeof promptsConfig,
  message: string,
) {
  const placeholder = promptsConfig[key];
  const response = await text({
    message,
    placeholder,
    defaultValue: placeholder,
    validate: (value) => validateText(value, false),
  });

  if (isCancel(response)) {
    cancelOperation();
  }

  return response;
}

async function getPackageManagerName() {
  const cwd = process.cwd();
  const pm = await detectPackageManager(cwd);
  return pm?.name;
}

async function selectWithConfig(
  message: string,
  options: Array<{ value: string; label: string; disabled?: boolean }>,
  maxItems?: number,
) {
  const response = await select({
    message,
    options: options.map((option) => ({
      ...option,
      label: option.disabled ? color.gray(option.label) : option.label,
      disabled: option.disabled,
      hint: option.disabled ? "Coming soon" : undefined,
    })),
    maxItems,
  });

  if (isCancel(response)) {
    cancelOperation();
  }

  return response;
}

function formatPromptMessage(message: string): string {
  return color.cyanBright(color.bold(message));
}

function cancelOperation() {
  cancel("https://discord.gg/Pb8uKbwpsJ");
  process.exit(0);
}

async function main() {
  const pm = await getPackageManagerName();
  console.log();
  intro(color.inverse(color.bold(` Reliverse CLI v${version} via ${pm} `)));

  const mode = await selectWithConfig(
    color.cyanBright(color.bold("https://docs.reliverse.org")),
    menuModes,
  );

  if (mode === modes.exit) {
    outro(color.inverse(color.bold(" https://discord.gg/Pb8uKbwpsJ ")));
    return;
  }

  const kind = await selectWithConfig(
    color.cyanBright(color.bold("What would you like to work on today?")),
    projectKinds,
    5,
  );

  if (kind === "exit") {
    outro(color.inverse(color.bold(" https://discord.gg/Pb8uKbwpsJ ")));
    return;
  }

  if (projectKinds.some((pk) => pk.value === kind && pk.disabled)) {
    console.log(color.dim("│"));
    console.log(
      color.red(
        "│  This kind of project is still under development. Please check back later.\n│  At the moment, you can only create and modify Next.js web apps codebases.",
      ),
    );
    outro(color.inverse(color.bold(" https://discord.gg/Pb8uKbwpsJ ")));
    return;
  }

  for (const key of Object.keys(promptsConfig) as Array<
    keyof typeof promptsConfig
  >) {
    const value = await promptWithConfig(
      key,
      formatPromptMessage(
        `Enter your ${key.replace(/([A-Z])/g, " $1").toLowerCase()}:`,
      ),
    );

    if (!value) {
      console.log(color.red("Input cannot be empty."));
    }
  }

  outro(color.inverse(color.bold(" https://discord.gg/Pb8uKbwpsJ ")));
}

await main().catch((error) => {
  console.error("An error occurred:", error.message);
  console.error(
    "Please report this issue at https://github.com/blefnk/reliverse/issues",
  );
  process.exit(1);
});
