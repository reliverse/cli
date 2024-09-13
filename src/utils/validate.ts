import consola from "consola";

function handlePromptCancellation(input: unknown, exitMessage: string): void {
  if (typeof input === "symbol" && String(input) === "Symbol(clack:cancel)") {
    consola.info(exitMessage);
    process.exit(0);
  }
}

export function validate(
  input: unknown,
  type:
    | "string"
    | "number"
    | "boolean"
    | "object"
    | "function"
    | "undefined"
    | "symbol"
    | "bigint",
  exitMessage = `Invalid input: Expected a ${type}, but got ${String(input)}`,
): void {
  handlePromptCancellation(input, exitMessage);

  if (
    // biome-ignore lint/suspicious/useValidTypeof: <explanation>
    typeof input !== type ||
    input === undefined ||
    input === null ||
    (type === "string" && input === "")
  ) {
    consola.error(exitMessage);
    process.exit(0);
  }
}
