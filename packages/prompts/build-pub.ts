import { rm } from "node:fs/promises";
import { version } from "./package.json";
import { execaCommand } from "execa";

let didPublish = false;

async function main() {
  const args = process.argv.slice(2);
  const isBuildOnly = args.includes("--build-only");
  const isBundlerTsup = args.includes("--bundler-tsup");
  const isBundlerBun = args.includes("--bundler-bun");

  if (isBuildOnly) {
    await build(isBundlerTsup, isBundlerBun);
    return;
  }

  try {
    await build(isBundlerTsup, isBundlerBun);
    await publishPackage();
    await postPublish();
  } catch (error) {
    console.error("An error occurred during execution:", error);
    process.exit(1);
  }
}

async function cleanDistFolder() {
  try {
    await rm("./dist", { recursive: true, force: true });
  } catch (error) {
    console.error("❌ Error cleaning the dist folder:", error);
  }
}

async function build(useTsup: boolean, useBun: boolean) {
  try {
    if (useTsup) {
      await execaCommand("tsup", { stdio: "inherit" });
      console.log("✅ Build completed using tsup\n");
    } else if (useBun) {
      await cleanDistFolder();
      await Bun.build({
        entrypoints: ["./src/main.ts"],
        outdir: "./dist",
        minify: true,
        target: "node",
      });
      console.log("✅ Build completed using bun\n");
    } else {
      throw new Error(
        "Please specify a bundler with --bundler-tsup or --bundler-bun",
      );
    }
  } catch (error) {
    console.error("❌ Error during build:", error);
    throw error;
  }
}

async function publishPackage() {
  try {
    const proc = Bun.spawn(["bun", "publish", "--access", "public"], {
      stdout: "inherit",
      stderr: "pipe",
    });

    const stderr = await new Response(proc.stderr).text();

    await proc.exited;

    // TODO: Display only the error message in the console, without the source code snippet.
    if (proc.exitCode !== 0) {
      if (
        stderr.includes("403 Forbidden") &&
        stderr.includes(
          "You cannot publish over the previously published versions",
        )
      ) {
        console.log(
          `${"⚠️".padEnd(3)} Version ${version} already exists on npm. Skipping publishing.`,
        );
      } else {
        console.error("❌ Error during publishing:", stderr);
        throw new Error("Publishing failed");
      }
    } else {
      didPublish = true;
    }
  } catch (error) {
    console.error("❌ An error occurred during publishing:", error);
    throw error;
  }
}

async function postPublish() {
  if (didPublish) {
    console.log("\n│ https://npmjs.com/package/@reliverse/prompts");
  }
}

main().catch((error) => {
  console.error("❌ An error occurred:", error);
  process.exit(1);
});
