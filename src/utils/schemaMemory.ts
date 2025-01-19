import { Type, type Static } from "@sinclair/typebox";

const encryptedDataSchema = Type.Object({
  code: Type.String(),
  key: Type.String(),
  githubKey: Type.Optional(Type.String()),
  vercelKey: Type.Optional(Type.String()),
  openaiKey: Type.Optional(Type.String()),
});

const userDataSchema = Type.Object({
  name: Type.Optional(Type.String()),
  email: Type.Optional(Type.String()),
  githubUsername: Type.Optional(Type.String()),
  vercelUsername: Type.Optional(Type.String()),
  vercelTeamId: Type.Optional(Type.String()),
  vercelTeamSlug: Type.Optional(Type.String()),
});

export const memorySchema = Type.Composite([
  encryptedDataSchema,
  userDataSchema,
]);

export type ReliverseMemory = Static<typeof memorySchema>;
export type EncryptedDataMemory = keyof Static<typeof encryptedDataSchema>;
export type UserDataMemory = keyof Static<typeof userDataSchema>;
