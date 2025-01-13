import { relinka } from "@reliverse/relinka";

function handlePromptCancellation(input: unknown, exitMessage: string): void {
  if (typeof input === "symbol" && String(input) === "Symbol(clack:cancel)") {
    relinka("info", exitMessage);
    process.exit(0);
  }
}

export function validate(
  input: unknown,
  type:
    | "bigint"
    | "boolean"
    | "function"
    | "number"
    | "object"
    | "string"
    | "symbol"
    | "undefined",
  exitMessage = `Invalid input: Expected a ${type}, but got ${String(input)}`,
): void {
  handlePromptCancellation(input, exitMessage);

  if (
    typeof input !== type ||
    input === undefined ||
    input === null ||
    (type === "string" && input === "")
  ) {
    relinka("error", exitMessage);
    process.exit(0);
  }
}
