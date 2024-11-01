import fs from "fs-extra";

const [, , command] = process.argv;
const validCommands = ["prepub", "postpub"];

// Usage: bun publish.ts prepub && bun pub:cli && bun publish.ts postpub
async function main() {
  if (!validCommands.includes(command)) {
    console.error("❌ Invalid command. Use 'prepub' or 'postpub' argument.");
    process.exit(1);
  }

  try {
    if (command === "prepub") {
      await prePublish();
    } else if (command === "postpub") {
      await postPublish();
    }
  } catch (error) {
    console.error("An error occurred during execution:", error);
    process.exit(1);
  }
}

// Copies necessary files before publishing
async function prePublish() {
  try {
    await Promise.all([
      fs.copy("README.md", "apps/cli/README.md"),
      fs.copy("LICENSE.md", "apps/cli/LICENSE.md"),
    ]);
    console.log("🔄 Files copied successfully for pre-publish.");
  } catch (error) {
    console.error("❌ Error copying README.md and/or LICENSE.md:", error);
    throw error;
  }
}

// Removes files after publishing
async function postPublish() {
  try {
    await Promise.all([
      fs.remove("apps/cli/README.md"),
      fs.remove("apps/cli/LICENSE.md"),
    ]);
    console.log("🧼 Files removed successfully after post-publish.");
    console.log("✅ The new version of reliverse is published!");
    console.log("👉 https://www.npmjs.com/package/reliverse");
    console.log("✨ Wait a moment and test it: bunx reliverse");
  } catch (error) {
    console.error("❌ Error removing README.md and/or LICENSE.md:", error);
    throw error;
  }
}

// Run main and handle uncaught promise rejections
main().catch((error) => {
  console.error("❌ An error occurred:", error);
  process.exit(1);
});
