import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateJSConfig() {
	const jsConfigPath = path.join(__dirname, "./dist/jsconfig.json");
	const jsConfigContent = {
		extends: "@tools/javascript/base.json",
		include: ["."],
	};

	await fs.writeFile(jsConfigPath, JSON.stringify(jsConfigContent, null, 2));
	console.log("✅ @tools/environment");
}

generateJSConfig();
