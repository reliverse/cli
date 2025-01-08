/* eslint-disable @typescript-eslint/no-useless-constructor */
export class IsTTYError extends Error {
  // biome-ignore lint/complexity/noUselessConstructor: <explanation>
  constructor(msg: string) {
    super(msg);
  }
}
