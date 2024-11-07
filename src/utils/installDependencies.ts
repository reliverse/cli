import { createSpinner } from "@reliverse/prompts";

const spinner = createSpinner("Installing dependencies...");

export async function installDependencies() {
  spinner.start();

  try {
    // Simulate a long-running task
    await new Promise((resolve) => setTimeout(resolve, 3000));
    spinner.updateMessage("Finishing up...");
    await new Promise((resolve) => setTimeout(resolve, 2000));
  } finally {
    spinner.stop("Dependencies installed successfully.");
  }
}
