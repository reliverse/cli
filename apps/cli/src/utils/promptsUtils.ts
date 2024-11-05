import { select, text, isCancel, cancel } from "@clack/prompts";
import color from "picocolors";
import { promptsConfig } from "~/prompts";

export function validateText(
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

export async function promptWithConfig(
  key: keyof typeof promptsConfig,
  title: string,
) {
  const placeholder = promptsConfig[key];
  const response = await text({
    message: title,
    placeholder,
    defaultValue: placeholder,
    validate: (value) => validateText(value, false),
  });

  if (isCancel(response)) {
    cancelOperation();
  }

  return response;
}

export async function selectWithConfig(
  message: string,
  options: Array<{ value: string; label: string; disabled?: boolean }>,
  maxItems?: number,
): Promise<string | undefined> {
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

  return response as string | undefined;
}

export function cancelOperation() {
  cancel("https://discord.gg/Pb8uKbwpsJ");
  process.exit(0);
}
