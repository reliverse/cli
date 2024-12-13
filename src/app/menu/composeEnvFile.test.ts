import {
  inputPrompt,
  multiselectPrompt,
  selectPrompt,
} from "@reliverse/prompts";
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import fs from "fs-extra";
import path from "pathe";

import { composeEnvFile } from "./composeEnvFile.js";

// Mock the prompts
const mockSelectPrompt = mock(selectPrompt);
const mockMultiselectPrompt = mock(multiselectPrompt);
const mockInputPrompt = mock(inputPrompt);

// Mock fs-extra module
await mock.module("fs-extra", () => ({
  default: {
    pathExists: mock(() => Promise.resolve(true)),
    stat: mock(() => Promise.resolve({ size: 100 })),
  },
}));

// Mock open module
await mock.module("open", () => ({
  default: mock(() => Promise.resolve()),
}));

describe("composeEnvFile", () => {
  const TEST_DIR = "/test/project";
  const ENV_PATH = path.join(TEST_DIR, ".env");
  const ENV_EXAMPLE_PATH = path.join(TEST_DIR, ".env.example");
  let envContent: string[] = [];

  beforeEach(() => {
    // Reset mocks
    mock.restore();
    envContent = [];

    // Setup default mock implementations
    const fsModule = (fs as any).default;
    fsModule.pathExists.mockImplementation(() => Promise.resolve(true));
    fsModule.readFile.mockImplementation(() =>
      Promise.resolve(envContent.join("\n")),
    );
    fsModule.writeFile.mockImplementation((_, content) => {
      envContent = content.split("\n");
      return Promise.resolve();
    });
    fsModule.stat.mockImplementation(() => Promise.resolve({ size: 100 }));

    // Setup prompt mocks
    // @ts-expect-error TODO: fix ts
    mockSelectPrompt.mockImplementation(() => Promise.resolve("auto"));
    mockMultiselectPrompt.mockImplementation(() =>
      // @ts-expect-error TODO: fix ts
      Promise.resolve(["DATABASE"] as const),
    );
  });

  describe("value formatting", () => {
    test("should handle plain value", async () => {
      mockInputPrompt.mockImplementation(() => Promise.resolve("simple-value"));

      await composeEnvFile(TEST_DIR, "");
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('DATABASE_URL="simple-value"'),
      );
    });

    test("should handle value with equals sign", async () => {
      mockInputPrompt.mockImplementation(() =>
        Promise.resolve("value=with=equals"),
      );

      await composeEnvFile(TEST_DIR, "");
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('DATABASE_URL="value=with=equals"'),
      );
    });

    test("should handle value with single quotes", async () => {
      mockInputPrompt.mockImplementation(() =>
        Promise.resolve("'quoted-value'"),
      );

      await composeEnvFile(TEST_DIR, "");
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('DATABASE_URL="quoted-value"'),
      );
    });

    test("should handle value with double quotes", async () => {
      mockInputPrompt.mockImplementation(() =>
        Promise.resolve('"quoted-value"'),
      );

      await composeEnvFile(TEST_DIR, "");
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('DATABASE_URL="quoted-value"'),
      );
    });

    test("should handle database URL with query parameters", async () => {
      mockInputPrompt.mockImplementation(() =>
        Promise.resolve("postgresql://user:pass@host:5432/db?sslmode=require"),
      );

      await composeEnvFile(TEST_DIR, "");
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining(
          'DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"',
        ),
      );
    });

    test("should handle key=value format input", async () => {
      mockInputPrompt.mockImplementation(() =>
        Promise.resolve('DATABASE_URL="some-value"'),
      );

      await composeEnvFile(TEST_DIR, "");
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('DATABASE_URL="some-value"'),
      );
    });

    test("should handle empty or whitespace value", async () => {
      mockInputPrompt.mockImplementation(() => Promise.resolve("   "));

      await composeEnvFile(TEST_DIR, "");
      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    test("should handle values with spaces", async () => {
      mockInputPrompt.mockImplementation(() =>
        Promise.resolve("value with spaces"),
      );

      await composeEnvFile(TEST_DIR, "");
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('DATABASE_URL="value with spaces"'),
      );
    });

    test("should handle values with special characters", async () => {
      mockInputPrompt.mockImplementation(() =>
        Promise.resolve("special!@#$%^&*()_+-=[]{}|;:,.<>?"),
      );

      await composeEnvFile(TEST_DIR, "");
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining(
          'DATABASE_URL="special!@#$%^&*()_+-=[]{}|;:,.<>?"',
        ),
      );
    });

    test("should handle multiline values", async () => {
      mockInputPrompt.mockImplementation(() =>
        Promise.resolve("line1\nline2\nline3"),
      );

      await composeEnvFile(TEST_DIR, "");
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('DATABASE_URL="line1\nline2\nline3"'),
      );
    });
  });

  describe("file operations", () => {
    test("should create .env file if it doesn't exist", async () => {
      const fsModule = (fs as any).default;
      fsModule.pathExists.mockImplementation(() => Promise.resolve(false));

      await composeEnvFile(TEST_DIR, "");
      expect(fsModule.copy).toHaveBeenCalledWith(ENV_EXAMPLE_PATH, ENV_PATH);
    });

    test("should update existing value in .env file", async () => {
      envContent = ['DATABASE_URL="old-value"'];
      mockInputPrompt.mockImplementation(() => Promise.resolve("new-value"));

      await composeEnvFile(TEST_DIR, "");
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('DATABASE_URL="new-value"'),
      );
    });

    test("should append new value to .env file", async () => {
      envContent = ['SOME_OTHER_KEY="some-value"'];
      mockInputPrompt.mockImplementation(() => Promise.resolve("new-value"));

      await composeEnvFile(TEST_DIR, "");
      // @ts-expect-error TODO: fix ts
      const calls = fs.writeFile.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[1]).toContain('SOME_OTHER_KEY="some-value"');
      expect(lastCall[1]).toContain('DATABASE_URL="new-value"');
    });

    test("should handle multiple values in sequence", async () => {
      mockMultiselectPrompt.mockImplementation(() =>
        // @ts-expect-error TODO: fix ts
        Promise.resolve(["DATABASE", "CLERK"]),
      );
      mockInputPrompt
        .mockImplementationOnce(() => Promise.resolve("db-value"))
        .mockImplementationOnce(() => Promise.resolve("clerk-key"))
        .mockImplementationOnce(() => Promise.resolve("clerk-secret"));

      await composeEnvFile(TEST_DIR, "");
      // @ts-expect-error TODO: fix ts
      const calls = fs.writeFile.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[1]).toContain('DATABASE_URL="db-value"');
      expect(lastCall[1]).toContain(
        'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="clerk-key"',
      );
      expect(lastCall[1]).toContain('CLERK_SECRET_KEY="clerk-secret"');
    });
  });

  // Clean up after tests
  afterEach(() => {
    mock.restore();
  });
});
