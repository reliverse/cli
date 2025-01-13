import type { CoreMessage } from "ai";

import { openai } from "@ai-sdk/openai";
import { inputPrompt } from "@reliverse/prompts";
import { streamText } from "ai";
import dotenv from "dotenv";
import pc from "picocolors";

dotenv.config();

const messages: CoreMessage[] = [];

/**
 * Prints:  "│  <text>"  (two spaces after the bar).
 * If text is empty, it just prints "│".
 * If indent is 1, it prints "│ <text>" (one space).
 * If indent is 2, it prints "│  <text>" (two spaces), etc.
 */
function printLineBar(text: string, indent = 2) {
  if (text === "") {
    // Just print a single bar
    console.log(pc.dim("│"));
  } else {
    console.log(`${pc.dim("│")}${" ".repeat(indent)}${text}`);
  }
}

export async function aiChatHandler() {
  while (true) {
    //
    // 1) USER PROMPT
    //
    const userInput = (
      await inputPrompt({ title: "You:", symbol: "info" })
    ).trim();

    // Save user message
    messages.push({ role: "user", content: userInput });

    //
    // 2) ASSISTANT RESPONSE
    //
    console.log(`${pc.dim("ℹ")}  ${pc.bold("Reliverse:")}`);

    // Stream the assistant response
    const result = streamText({
      model: openai("gpt-3.5-turbo"),
      messages,
    });

    let assistantResponse = "";
    process.stdout.write(pc.dim("│  ")); // Initial bar with indent

    for await (const delta of result.textStream) {
      // Handle newlines by adding the bar prefix
      const lines = delta.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? ""; // Ensure line is never undefined
        if (i > 0) {
          console.log(); // New line
          process.stdout.write(pc.dim("│  ")); // Bar prefix for new line
        }
        process.stdout.write(line);
      }
      assistantResponse += delta;
    }

    console.log(); // New line after response is complete
    printLineBar(""); // Blank bar line after response

    // Save assistant message
    messages.push({ role: "assistant", content: assistantResponse });

    if (
      userInput.toLowerCase() === "exit" ||
      userInput.toLowerCase() === "bye"
    ) {
      break;
    }
  }
}
