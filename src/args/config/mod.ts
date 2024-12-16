import { defineCommand } from "@reliverse/prompts";
import fs from "fs-extra";
import path from "pathe";

import { DEFAULT_CONFIG, type ReliverseConfig } from "~/types/config.js";
import { relinka } from "~/utils/console.js";
import { getCurrentWorkingDirectory } from "~/utils/fs.js";
import { getDefaultRules } from "~/utils/rules.js";

export default defineCommand({
  meta: {
    name: "config",
    description: "Generate configuration files in the current directory",
  },
  args: {
    defaults: {
      type: "boolean",
      description: "Generate config with default values",
    },
    rules: {
      type: "boolean",
      description: "Generate .reliverserules file with all codemods",
    },
  },
  run: async ({ args }) => {
    const cwd = getCurrentWorkingDirectory();

    if (args.rules) {
      const rulesPath = path.join(cwd, ".reliverserules");
      if (await fs.pathExists(rulesPath)) {
        relinka(
          "error",
          ".reliverserules already exists in the current directory",
        );
        process.exit(1);
      }

      const rules = await getDefaultRules("my-app", "user");
      // Inject all codemod configurations
      rules.codeStyle = {
        ...rules.codeStyle,
        cjsToEsm: true,
        modernize: {
          replaceFs: true,
          replacePath: true,
          replaceHttp: true,
          replaceProcess: true,
          replaceConsole: true,
          replaceEvents: true,
        },
        importSymbol: [
          {
            from: "~/utils/console",
            to: "@/utils/console",
            description: "Update import path to use @/ instead of ~/",
          },
        ],
      };

      try {
        await fs.writeFile(rulesPath, JSON.stringify(rules, null, 2), "utf-8");
        relinka("success", "Generated .reliverserules successfully!");
        process.exit(0);
      } catch (error) {
        relinka("error", "Failed to generate rules file:", error.toString());
        process.exit(1);
      }
      return;
    }

    const configPath = path.join(cwd, "reliverse.json");
    if (await fs.pathExists(configPath)) {
      relinka(
        "error",
        "reliverse.json already exists in the current directory",
      );
      process.exit(1);
    }

    const config: ReliverseConfig = args.defaults ? DEFAULT_CONFIG : {};

    try {
      await fs.writeFile(configPath, JSON.stringify(config, null, 2), "utf-8");
      relinka("success", "Generated reliverse.json successfully!");
      process.exit(0);
    } catch (error) {
      relinka("error", "Failed to generate config file:", error.toString());
      process.exit(1);
    }
  },
});
