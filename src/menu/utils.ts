import type { ChoiceOptions, ColorName } from "@reliverse/prompts";

import { msg } from "@reliverse/prompts";
import { colorMap } from "@reliverse/prompts";

import type { UserInput } from "./schema.js";

export function createColorChoices(): ChoiceOptions[] {
  return Object.keys(colorMap).map((key) => ({
    title: colorMap[key](key.charAt(0).toUpperCase() + key.slice(1)),
    id: key,
  }));
}

export function calculateAge(birthday: string): number {
  const today = new Date();
  const [day, month, year] = birthday.split(".").map(Number);
  const birthDate = new Date(year, month - 1, day);

  let age = today.getFullYear() - birthDate.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() &&
      today.getDate() >= birthDate.getDate());

  if (!hasHadBirthdayThisYear) {
    age--;
  }

  return age;
}

export function validateAge(
  calculatedAge: number,
  userAge: number,
  birthday: string,
) {
  const ageMessage = `Based on your birthday date (${birthday}), you're ${calculatedAge} years old.`;

  if (calculatedAge === userAge) {
    msg({
      type: "M_INFO",
      title: `Your age and birthday correspond! ${ageMessage}`,
      titleColor: "green",
    });
  } else {
    msg({
      type: "M_ERROR",
      title: `Your age and birthday don't correspond! ${ageMessage}`,
      titleColor: "red",
    });
  }
}

export function hashPassword(password: string): string {
  return password.split("").reverse().join("");
}

export function displayUserInputs(userInput: UserInput) {
  const color = userInput.color as ColorName;
  if (color === "red" || color === "redBright") {
    userInput.color = "redBright" as ColorName;
    msg({
      type: "M_INFO",
      title: "User's favorite color is red. Johnny Silverhand approves.",
      titleColor: userInput.color as ColorName,
    });
  } else {
    msg({
      type: "M_INFO",
      title: `User's favorite color is: ${color}`,
      titleColor: color,
    });
  }
}
