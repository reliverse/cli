/*
 * The Module State: MVP | "Project Updater: CLI Edition" (UI Edition – coming soon...)
 *
 * This script is used to update the Reliverse CLI project with the latest version of the CLI.
 * It will prompt the user to select the files they want to update.
 * The script will then update the selected files with the latest version of the CLI.
 */

// updateProject.ts

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { prompt } from "enquirer";
// @ts-expect-error ...
import { execa } from "execa";

interface ReliConfig {
	version: string;
	// TODO: Add other configuration properties
}

async function getReliConfig(projectPath: string): Promise<ReliConfig> {
	const configPath = join(projectPath, "reli.config.ts");
	const configContent = await readFile(configPath, "utf-8");
	// biome-ignore lint/security/noGlobalEval: <explanation>
	const config = eval(configContent);
	return config;
}

async function bootstrapProject(
	// @ts-expect-error ...
	version: string,
	// @ts-expect-error ...
	config: ReliConfig,
): Promise<void> {
	// TODO: Implement the logic to bootstrap a temporary project with the specified version and configuration
	// TODO: We can use the `execa` function to execute Reliverse CLI commands
}

async function compareProjects(
	// @ts-expect-error ...
	oldProject: string,
	// @ts-expect-error ...
	newProject: string,
	// @ts-expect-error ...
): Promise<string[]> {
	// TODO: Implement the logic to compare the old and new project directories
	// TODO: And return an array of changed files
}

async function promptUserForFiles(changedFiles: string[]): Promise<string[]> {
	const { selectedFiles } = await prompt<{ selectedFiles: string[] }>({
		type: "multiselect",
		name: "selectedFiles",
		message: "Select the files you want to update:",
		choices: changedFiles,
	});
	return selectedFiles;
}

async function updateFiles(
	projectPath: string,
	filesToUpdate: string[],
): Promise<void> {
	for (const file of filesToUpdate) {
		// @ts-expect-error ...
		const oldFilePath = join("temp/old-project", file);
		const newFilePath = join("temp/new-project", file);
		const projectFilePath = join(projectPath, file);

		const newContent = await readFile(newFilePath, "utf-8");
		await writeFile(projectFilePath, newContent);
	}
}

async function updateProject(projectPath: string): Promise<void> {
	const config = await getReliConfig(projectPath);
	const oldVersion = config.version;
	const newVersion = "latest"; // Update with the latest version of Reliverse CLI

	await bootstrapProject(oldVersion, config);
	await bootstrapProject(newVersion, config);

	const changedFiles = await compareProjects(
		"temp/old-project",
		"temp/new-project",
	);
	const filesToUpdate = await promptUserForFiles(changedFiles);

	await updateFiles(projectPath, filesToUpdate);

	console.log("Project updated successfully!");
}

// Get the project path from command line arguments
const projectPath = process.argv[2];

if (!projectPath) {
	console.error("Please provide the path to the project you want to update.");
	process.exit(1);
}

updateProject(projectPath).catch((error) => {
	console.error("An error occurred during the update process:", error);
	process.exit(1);
});
