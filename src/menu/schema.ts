import { colorMap } from "@reliverse/prompts";
import { Type, type Static } from "@sinclair/typebox";

export const IDs = {
  start: "start",
  username: "username",
  dir: "dir",
  spinner: "spinner",
  password: "password",
  age: "age",
  lang: "lang",
  color: "color",
  birthday: "birthday",
  features: "features",
};

const colorSchema = Type.Enum(
  Object.keys(colorMap).reduce(
    (acc, key) => {
      acc[key] = key;
      return acc;
    },
    // eslint-disable-next-line @typescript-eslint/prefer-reduce-type-parameter
    {} as Record<keyof typeof colorMap, string>,
  ),
);

export const schema = Type.Object({
  username: Type.String({
    minLength: 2,
    maxLength: 20,
    pattern: "^[a-zA-Z0-9\u0400-\u04FF]+$",
  }),
  dir: Type.String({ minLength: 1 }),
  spinner: Type.Boolean(),
  password: Type.String({ minLength: 4 }),
  age: Type.Number({ minimum: 18, maximum: 99 }),
  lang: Type.String(),
  color: colorSchema,
  birthday: Type.String({ minLength: 10, maxLength: 10 }),
  langs: Type.Array(Type.String()),
  features: Type.Array(Type.String()),
  toggle: Type.Boolean(),
});

export type UserInput = Static<typeof schema>;
