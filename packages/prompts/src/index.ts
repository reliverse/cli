import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import type { Static, TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import color from "picocolors";

interface Choice {
  title: string;
  value: any;
  description?: string;
}

interface PromptOptions<T extends TSchema = any> {
  type:
    | "text"
    | "number"
    | "confirm"
    | "select"
    | "multiselect"
    | "password"
    | "date";
  id: string;
  title: string;
  hint?: string;
  validate?: (value: any) => boolean | string | Promise<boolean | string>;
  default?: any;
  choices?: Choice[];
  schema?: T;
}

export async function prompts<T extends TSchema>(
  options: PromptOptions<T>,
): Promise<{ [K in (typeof options)["id"]]: Static<T> }> {
  const { type, id } = options;
  let value: any;
  switch (type) {
    case "text":
      value = await textPrompt(options);
      break;
    case "number":
      value = await numberPrompt(options);
      break;
    case "confirm":
      value = await confirmPrompt(options);
      break;
    case "select":
      value = await selectPrompt(options);
      break;
    case "multiselect":
      value = await multiselectPrompt(options);
      break;
    case "password":
      value = await passwordPrompt(options);
      break;
    case "date":
      value = await datePrompt(options);
      break;
    default:
      throw new Error(`Unknown prompt type: ${type}`);
  }
  return { [id]: value } as any;
}

async function textPrompt<T extends TSchema>(
  options: PromptOptions<T>,
): Promise<Static<T>> {
  const { title, hint, validate, default: defaultValue, schema } = options;
  const rl = readline.createInterface({ input, output });

  const question = `${title}${
    hint ? " (" + hint + ")" : ""
  }${defaultValue ? ` [${defaultValue}]` : ""}: `;

  while (true) {
    const answer = (await rl.question(question)) || defaultValue || "";
    let isValid = true;
    let errorMessage = "Invalid input.";
    if (schema) {
      isValid = Value.Check(schema, answer);
      if (!isValid) {
        const errors = [...Value.Errors(schema, answer)];
        if (errors.length > 0) {
          errorMessage = errors[0]?.message ?? "Invalid input.";
        }
      }
    }
    if (validate && isValid) {
      const validation = await validate(answer);
      if (validation !== true) {
        isValid = false;
        errorMessage =
          typeof validation === "string" ? validation : "Invalid input.";
      }
    }
    if (isValid) {
      rl.close();
      return answer as Static<T>;
    } else {
      console.log(errorMessage);
    }
  }
}

async function numberPrompt<T extends TSchema>(
  options: PromptOptions<T>,
): Promise<Static<T>> {
  const { title, hint, validate, default: defaultValue, schema } = options;
  const rl = readline.createInterface({ input, output });

  const question = `${title}${
    hint ? " (" + hint + ")" : ""
  }${defaultValue !== undefined ? ` [${defaultValue}]` : ""}: `;

  while (true) {
    const answer = (await rl.question(question)) || defaultValue;
    const num = Number(answer);
    if (isNaN(num)) {
      console.log("Please enter a valid number.");
      continue;
    }
    let isValid = true;
    let errorMessage = "Invalid input.";
    if (schema) {
      isValid = Value.Check(schema, num);
      if (!isValid) {
        const errors = [...Value.Errors(schema, num)];
        if (errors.length > 0) {
          errorMessage = errors[0]?.message ?? "Invalid input.";
        }
      }
    }
    if (validate && isValid) {
      const validation = await validate(num);
      if (validation !== true) {
        isValid = false;
        errorMessage =
          typeof validation === "string" ? validation : "Invalid input.";
      }
    }
    if (isValid) {
      rl.close();
      return num as Static<T>;
    } else {
      console.log(errorMessage);
    }
  }
}

async function confirmPrompt<T extends TSchema>(
  options: PromptOptions<T>,
): Promise<Static<T>> {
  const { title, default: defaultValue, schema } = options;
  const rl = readline.createInterface({ input, output });

  let defaultHint = "";
  if (defaultValue === true) defaultHint = "[Y/n]";
  else if (defaultValue === false) defaultHint = "[y/N]";
  else defaultHint = "[y/n]";

  const question = `${title} ${defaultHint}: `;

  while (true) {
    const answer = (await rl.question(question)).toLowerCase();
    let value: boolean;
    if (!answer && defaultValue !== undefined) {
      value = defaultValue;
    } else if (answer === "y" || answer === "yes") {
      value = true;
    } else if (answer === "n" || answer === "no") {
      value = false;
    } else {
      console.log('Please answer with "y" or "n".');
      continue;
    }

    let isValid = true;
    let errorMessage = "Invalid input.";
    if (schema) {
      isValid = Value.Check(schema, value);
      if (!isValid) {
        const errors = [...Value.Errors(schema, value)];
        if (errors.length > 0) {
          errorMessage = errors[0]?.message ?? "Invalid input.";
        }
      }
    }
    if (isValid) {
      rl.close();
      return value as Static<T>;
    } else {
      console.log(errorMessage);
    }
  }
}

async function selectPrompt<T extends TSchema>(
  options: PromptOptions<T>,
): Promise<Static<T>> {
  const { title, choices, default: defaultValue, schema } = options;
  if (!choices || choices.length === 0) {
    throw new Error("Choices are required for select prompt.");
  }

  console.log(color.cyanBright(color.bold(title)));
  choices.forEach((choice, index) => {
    const isDefault =
      defaultValue === index + 1 || defaultValue === choice.value;
    console.log(
      `${index + 1}) ${choice.title} ${
        choice.description ? "- " + choice.description : ""
      }${isDefault ? " (default)" : ""}`,
    );
  });

  const rl = readline.createInterface({ input, output });

  const question = `Enter your choice (1-${choices.length})${
    defaultValue ? ` [${defaultValue}]` : ""
  }: `;

  while (true) {
    const answer = (await rl.question(question)) || defaultValue;
    const num = Number(answer);
    if (isNaN(num) || num < 1 || num > choices.length) {
      console.log(`Please enter a number between 1 and ${choices.length}.`);
      continue;
    }
    const selectedValue = choices[num - 1]?.value;

    let isValid = true;
    let errorMessage = "Invalid input.";
    if (schema) {
      isValid = Value.Check(schema, selectedValue);
      if (!isValid) {
        const errors = [...Value.Errors(schema, selectedValue)];
        if (errors.length > 0) {
          errorMessage = errors[0]?.message ?? "Invalid input.";
        }
      }
    }
    if (isValid) {
      rl.close();
      return selectedValue as Static<T>;
    } else {
      console.log(errorMessage);
    }
  }
}

async function multiselectPrompt<T extends TSchema>(
  options: PromptOptions<T>,
): Promise<Static<T>> {
  const { title, choices, schema } = options;
  if (!choices || choices.length === 0) {
    throw new Error("Choices are required for multiselect prompt.");
  }

  console.log(color.cyanBright(color.bold(title)));
  choices.forEach((choice, index) => {
    console.log(
      `${index + 1}) ${choice.title} ${
        choice.description ? "- " + choice.description : ""
      }`,
    );
  });

  const rl = readline.createInterface({ input, output });

  const question = `Enter your choices (comma-separated numbers between 1-${choices.length}): `;

  while (true) {
    const answer = await rl.question(question);
    const selections = answer.split(",").map((s) => s.trim());
    const invalidSelections = selections.filter((s) => {
      const num = Number(s);
      return isNaN(num) || num < 1 || num > choices.length;
    });
    if (invalidSelections.length > 0) {
      console.log(
        `Invalid selections: ${invalidSelections.join(
          ", ",
        )}. Please enter numbers between 1 and ${choices.length}.`,
      );
      continue;
    }
    const selectedValues = selections.map((s) => choices[Number(s) - 1]?.value);

    let isValid = true;
    let errorMessage = "Invalid input.";
    if (schema) {
      isValid = Value.Check(schema, selectedValues);
      if (!isValid) {
        const errors = [...Value.Errors(schema, selectedValues)];
        if (errors.length > 0) {
          errorMessage = errors[0]?.message ?? "Invalid input.";
        }
      }
    }
    if (isValid) {
      rl.close();
      return selectedValues as Static<T>;
    } else {
      console.log(errorMessage);
    }
  }
}

async function passwordPrompt<T extends TSchema>(
  options: PromptOptions<T>,
): Promise<Static<T>> {
  const { title, hint, validate, schema } = options;
  const question = `${title}${hint ? " (" + hint + ")" : ""}: `;

  process.stdout.write(question);

  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    const passwordChars: string[] = [];

    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    const onData = async (char: string) => {
      char = char.toString();

      if (char === "\n" || char === "\r" || char === "\u0004") {
        // Enter or Ctrl-D
        stdin.setRawMode(false);
        stdin.pause();
        process.stdout.write("\n");
        stdin.removeListener("data", onData); // Clean up listener
        const password = passwordChars.join("");

        let isValid = true;
        let errorMessage = "Invalid input.";
        if (schema) {
          isValid = Value.Check(schema, password);
          if (!isValid) {
            const errors = [...Value.Errors(schema, password)];
            if (errors.length > 0) {
              errorMessage = errors[0]?.message ?? "Invalid input.";
            }
          }
        }
        if (validate && isValid) {
          const validation = await validate(password);
          if (validation !== true) {
            isValid = false;
            errorMessage =
              typeof validation === "string" ? validation : "Invalid input.";
          }
        }
        if (isValid) {
          resolve(password as Static<T>);
        } else {
          console.log(errorMessage);
          // Retry
          resolve(await passwordPrompt(options));
        }
      } else if (char === "\u0003") {
        // Ctrl-C
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener("data", onData); // Clean up listener
        reject(new Error("User aborted."));
      } else if (
        char === "\u007F" ||
        char === "\b" ||
        char === "\x7f" ||
        char === "\x08"
      ) {
        // Backspace
        if (passwordChars.length > 0) {
          passwordChars.pop();
          process.stdout.write("\b \b");
        }
      } else {
        passwordChars.push(char);
        process.stdout.write("*");
      }
    };

    stdin.on("data", onData);
  });
}

async function datePrompt<T extends TSchema>(
  options: PromptOptions<T>,
): Promise<Static<T>> {
  const { title, hint, validate, default: defaultValue, schema } = options;
  const rl = readline.createInterface({ input, output });

  const question = `${title}${
    hint ? " (" + hint + ")" : ""
  }${defaultValue ? ` [${defaultValue}]` : ""}: `;

  while (true) {
    const answer = (await rl.question(question)) || defaultValue || "";
    const date = new Date(answer);
    if (isNaN(date.getTime())) {
      console.log("Please enter a valid date.");
      continue;
    }
    let isValid = true;
    let errorMessage = "Invalid input.";
    if (schema) {
      isValid = Value.Check(schema, date);
      if (!isValid) {
        const errors = [...Value.Errors(schema, date)];
        if (errors.length > 0) {
          errorMessage = errors[0]?.message ?? "Invalid input.";
        }
      }
    }
    if (validate && isValid) {
      const validation = await validate(date);
      if (validation !== true) {
        isValid = false;
        errorMessage =
          typeof validation === "string" ? validation : "Invalid input.";
      }
    }
    if (isValid) {
      rl.close();
      return date as Static<T>;
    } else {
      console.log(errorMessage);
    }
  }
}
