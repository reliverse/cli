import fs from "node:fs";
import path from "node:path";

import { PKG_ROOT } from "../consts.js";
import type { Installer } from "../installers/index.js";

export const dbContainerInstaller: Installer = ({
	projectDir,
	databaseProvider,
	projectName,
}) => {
	const scriptSrc = path.join(
		PKG_ROOT,
		`template/extras/scripts/${databaseProvider}.sh`,
	);
	const scriptText = fs.readFileSync(scriptSrc, "utf-8");
	const scriptDest = path.join(projectDir, `${databaseProvider}.sh`);
	fs.writeFileSync(scriptDest, scriptText.replaceAll("project1", projectName));
	fs.chmodSync(scriptDest, "755");
};
