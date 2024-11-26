import type { Command } from "commander";

import { relinka } from "@reliverse/relinka";

// import { add } from "~/utils/cmds/add";
// import { diff } from "~/utils/cmds/diff";
// import { init } from "~/utils/cmds/init";

export async function shadcnComponents(program: Command) {
  relinka.success(
    "✨ Using: shadcn@2.1.3, shadcn-vue@0.11.0, shadcn-svelte@0.14.0",
  );

  // program.addCommand(init).addCommand(add).addCommand(diff);
}
