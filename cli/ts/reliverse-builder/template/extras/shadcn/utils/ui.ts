import { cx } from "class-variance-authority";
import { twMerge } from "tailwind-merge";

// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
const cn = (...inputs: Parameters<typeof cx>) => twMerge(cx(inputs));

export { cn };
