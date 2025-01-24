import { execa } from "execa";
import ora, { type Ora } from "ora";

type SpinnerOptions = {
  args?: string[];
  stdout?: "pipe" | "ignore" | "inherit";
  onDataHandle?: (spinner: Ora) => (data: Buffer) => void;
  spinnerText?: string;
  successText?: string;
  errorText?: string;
};

export const execaSpinner = async (
  projectDir: string,
  command: string,
  options: SpinnerOptions,
) => {
  const {
    args = ["install"],
    stdout = "pipe",
    spinnerText = `Running ${command} ${args.join(" ")}...`,
    successText,
    errorText,
    onDataHandle,
  } = options;

  const spinner = ora(spinnerText).start();

  try {
    const subprocess = execa(command, args, { cwd: projectDir, stdout });

    await new Promise<void>((resolve, reject) => {
      if (onDataHandle) {
        subprocess.stdout?.on("data", onDataHandle(spinner));
      }

      void subprocess.on("error", (error) => {
        spinner.fail(errorText ?? `Failed to run ${command}: ${error.message}`);
        reject(error);
      });

      void subprocess.on("close", (code) => {
        if (code === 0) {
          if (successText) spinner.succeed(successText);
          resolve();
        } else {
          spinner.fail(
            errorText ?? `Command ${command} failed with code ${code}`,
          );
          reject(new Error(`Process exited with code ${code}`));
        }
      });
    });

    return spinner;
  } catch (error) {
    spinner.fail(errorText ?? `Failed to run ${command}: ${error}`);
    throw error;
  }
};
