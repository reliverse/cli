# @reliverse/prompts

A modern, type-safe, crash-resistant prompt library designed to be simple and beautiful. This library, developed in TypeScript and bundled with tsup and terser, provides an easy-to-use, flexible interface for creating interactive prompts in both Bun and other JavaScript environments.

## Installation

Install via your preferred package manager:

```sh
bun add @reliverse/prompts # instead of bun you can use: npm, pnpm, or yarn (deno support is planned)
```

## Key Features

- **Type Safety**: Built with TypeScript, ensuring robust types and preventing runtime errors.
- **Schema Validation**: Define and validate inputs using schemas for reliable data handling.
- **Flexibility**: Supports various prompt types including text, password, number, select, and multiselect.
- **Crash Resilience**: Structured to handle cancellations and errors gracefully, keeping your application stable.

## Prompt Types

- **Text**: Simple text input.
- **Password**: Secure, hidden input for passwords.
- **Number**: Numeric input with validation.
- **Confirm**: Yes/No prompt.
- **Select**: Dropdown selection from multiple choices.
- **Multiselect**: Multiple choice selection from a list.
  
## Validation

Each prompt can include custom validation logic to provide immediate feedback to the user.

## Usage Example

```ts
import { prompts } from "@reliverse/prompts";
import { Type, type Static } from "@sinclair/typebox";

async function main() {
  // Wrapping everything in a try-catch block for a single error handler
  // is optional and not recommended for every scenario.
  // try { ... } catch (error) { console.error("Prompt cancelled."); }

  // Define the schema once and reuse it for each prompt.
  const schema = Type.Object({
    username: Type.String({ minLength: 3, maxLength: 20 }),
    password: Type.String({ minLength: 8 }),
    age: Type.Number({ minimum: 18, maximum: 99 }),
    color: Type.Enum({ red: "red", green: "green", blue: "blue" }),
    // birthday: Type.String({ pattern: "^\\d{2}\\.\\d{2}\\.\\d{4}$" }), // DD.MM.YYYY
    features: Type.Array(Type.String()),
  });

  // Define the type to use in the result object, populated with results from the prompts.
  type UserInput = Static<typeof schema>;

  const usernameResult = await prompts({
    // 'id' is the key in the userInput result object.
    // Choose any name for it, but ensure it’s unique.
    id: "username",
    type: "text",
    title: "Enter your username",
    schema: schema.properties.username,
  });

  // Initialize `passwordResult` to avoid uninitialized variable errors.
  let passwordResult: { password?: string } = {};
  // Wrap password prompts with a try-catch block to handle cancellations,
  // which otherwise would terminate the process with an error.
  try {
    passwordResult = await prompts({
      id: "password",
      // Supported types: "text" | "number" | "confirm" | "select" | "multiselect" | "password" | "date"
      // Each type has its own validation and display logic.
      // More types are planned for future releases.
      type: "password",
      title: "Enter your password",
      schema: schema.properties.password,
    });
  } catch (error) {
    console.error(
      "Password prompt was aborted or something went wrong.",
      error,
    );
  }

  const ageResult = await prompts({
    id: "age",
    type: "number",
    // Adding a hint helps users understand the expected input format.
    hint: "Example: 25",
    title: "Enter your age",
    // Define a schema to validate the input.
    // Errors are automatically handled and displayed based on the type.
    schema: schema.properties.age,
    // Additional validation can be configured using the 'validate' option.
    validate: (value) => {
      const num = Number(value);
      if (num === 42) {
        return "42 is the answer to the ultimate question of life, the universe, and everything. Try a different number.";
      }
      return true;
    },
  });

  // const birthdayResult = await prompts({
  //   id: "birthday",
  //   type: "date",
  //   title: "Enter your birthday",
  //   hint: "Example: 14.09.1999",
  //   // Set a default value for the prompt if desired.
  //   default: "14.09.1999",
  //   schema: schema.properties.birthday, // example 1: DD.MM.YYYY
  //   // schema: Type.Date({ maximum: new Date().toISOString() }), // example 2: ...
  // });

  const colorResult = await prompts({
    id: "color",
    type: "select",
    title: "Choose a favorite color",
    choices: [
      { title: "Red", value: "red" },
      { title: "Green", value: "green" },
      { title: "Blue", value: "blue" },
    ] as const, // Define choices as const to make them literal types.
    schema: schema.properties.color, // Use schema-defined color enum.
  });

  const choice = await prompts({
    id: "features",
    type: "multiselect",
    title: "What features do you want to use?",
    choices: [
      {
        title: "React",
        value: "react",
        // Some properties, like 'choices.description', are optional.
        description: "A library for building user interfaces.",
      },
      {
        title: "TypeScript",
        value: "typescript",
        description:
          "A programming language that adds static typing to JavaScript.",
      },
      {
        title: "ESLint",
        value: "eslint",
        description: "A tool for identifying patterns in JavaScript code.",
      },
    ],
    schema: schema.properties.features,
  });

  // A variable is unnecessary for prompts when the result is not needed later.
  await prompts({
    id: "saveData",
    type: "confirm",
    title: "Do you want to save your data for future use?",
    // schema: ... // Schema is optional, but defining it is generally good practice.
  });

  // Gather the results
  const userInput: UserInput = {
    // Set default values for missing responses
    username: usernameResult.username ?? "johnny",
    password: passwordResult.password ?? "silverHand2077",
    age: ageResult.age ?? 34,
    // birthday: birthdayResult.birthday ?? "16.11.1988",
    color: colorResult.color ?? "red",
    features: choice.features ?? ["react", "typescript"],
  };

  // For fun, create an age calculator based on the birthday to verify age accuracy.
  // const calculatedAge =
  //   new Date().getFullYear() - new Date(userInput.birthday).getFullYear();
  // if (calculatedAge === userInput.age) {
  //   console.log("Your age and birthday correspond!");
  // } else {
  //   console.log("Your age and birthday don't correspond!");
  // }

  // Simulate password hashing and update the user input object
  userInput.password = userInput.password.split("").reverse().join("");

  // Access values by their keys
  console.log("✅ User successfully registered:", userInput.username);

  // Full intellisense is available when defining choices using an enum
  if (userInput.color === "red") {
    console.log("User's favorite color is red. Johnny Silverhand approves.");
  }

  // Display all user input values
  console.log("User Input:", userInput);

  // User Input: {
  //   username: "GeraltOfRivia",
  //   password: "21ytrewq",
  //   age: 98,
  //   color: "blue",
  //   features: [ "react", "typescript", "eslint" ],
  // }
}

await main().catch((error) => {
  console.error("│  An error occurred:\n", error.message);
  console.error(
    "└  Please report this issue at https://github.com/blefnk/reliverse/issues",
  );
  process.exit(1);
});
```
