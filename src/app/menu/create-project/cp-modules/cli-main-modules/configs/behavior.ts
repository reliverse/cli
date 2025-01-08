import type { Behavior } from "~/types.js";

export function decideBehavior(behavior: Behavior) {
  if (behavior === "autoYes") {
    return true; // Yes, do it automatically
  } else if (behavior === "autoNo") {
    return false; // No, skip it automatically
  } else {
    return null; // Show prompt
  }
}
