import fs from "node:fs";
import path from "node:path";

const removeExpectErrors = (projectDir: string) => {
	const removeExpectErrorComments = (file: string) => {
		const content = fs.readFileSync(file, "utf-8");
		const updatedContent = content.replace(/^.*@ts-expect-error.*\r?\n/gm, "");
		fs.writeFileSync(file, updatedContent);
	};

	const traverseDirectory = (dir: string) => {
		const items = fs.readdirSync(dir);
		for (const item of items) {
			const itemPath = path.join(dir, item);
			if (fs.statSync(itemPath).isDirectory()) {
				traverseDirectory(itemPath);
			} else if (
				path.extname(itemPath) === ".ts" ||
				path.extname(itemPath) === ".tsx"
			) {
				removeExpectErrorComments(itemPath);
			}
		}
	};

	traverseDirectory(projectDir);
};

export default removeExpectErrors;
