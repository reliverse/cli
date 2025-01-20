import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import fs from "fs-extra";
import path from "pathe";

import { setHiddenAttributeOnWindows, isHidden } from "./filesysHelpers.js";

let TEST_DIR = path.join(process.cwd(), "test-hidden-dir");

const activateHardcodedPathCheck = false;

if (activateHardcodedPathCheck) {
  TEST_DIR = path.join(process.cwd(), "tests-runtime", "reliverse", ".git");
}

describe("filesystem helpers", () => {
  beforeEach(async () => {
    if (!activateHardcodedPathCheck) {
      await fs.ensureDir(TEST_DIR);
    }
  });

  afterEach(async () => {
    if (!activateHardcodedPathCheck) {
      await fs.remove(TEST_DIR);
    }
  });

  if (activateHardcodedPathCheck) {
    test("check and set hidden attribute on hardcoded path", async () => {
      const initialHiddenStatus = await isHidden(TEST_DIR);
      if (!initialHiddenStatus) {
        await setHiddenAttributeOnWindows(TEST_DIR);
      }
      // No assertion needed - this is a utility test
    });
  } else {
    test("setHiddenAttributeOnWindows sets hidden attribute on Windows", async () => {
      await setHiddenAttributeOnWindows(TEST_DIR);

      if (process.platform === "win32") {
        const isHiddenResult = await isHidden(TEST_DIR);
        expect(isHiddenResult).toBe(true);
      } else {
        // On non-Windows platforms, function should run without error
        expect(true).toBe(true);
      }
    });

    test("isHidden returns correct hidden status", async () => {
      // First check - should not be hidden
      let hiddenStatus = await isHidden(TEST_DIR);
      expect(hiddenStatus).toBe(false);

      // Set hidden and check again (Windows only)
      if (process.platform === "win32") {
        await setHiddenAttributeOnWindows(TEST_DIR);
        hiddenStatus = await isHidden(TEST_DIR);
        expect(hiddenStatus).toBe(true);
      }
    });

    test("handles non-existent paths gracefully", async () => {
      const nonExistentPath = path.join(TEST_DIR, "does-not-exist");
      await setHiddenAttributeOnWindows(nonExistentPath); // Should not throw
      const result = await isHidden(nonExistentPath);
      expect(result).toBe(false);
    });
  }
});
