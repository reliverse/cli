import type { Vercel } from "@vercel/sdk";

import { confirmPrompt } from "@reliverse/prompts";
import { re } from "@reliverse/relico";
import { relinka } from "@reliverse/relinka";

import type { DeploymentOptions, EnvVar } from "./vercel-types.js";

import { getVercelEnvVar, withRateLimit } from "./vercel-api.js";

export async function handleEnvironmentVariables(
  vercel: Vercel,
  projectName: string,
  envVars: EnvVar[],
  selectedOptions: DeploymentOptions,
): Promise<void> {
  if (selectedOptions.useSharedEnvVars) {
    const shouldUseShared = await confirmPrompt({
      title: `Would you like to use shared environment variables from Vercel.com? ${re.red("[🚨 Experimental]")}`,
      content:
        "Only missing variables will be uploaded from your local .env file",
      defaultValue: false,
    });

    if (shouldUseShared) {
      const existingEnvVars = await getVercelEnvVar(
        vercel,
        projectName,
        envVars[0]?.key ?? "",
      );
      const newEnvVars = envVars.filter(
        (env) => !existingEnvVars?.key.includes(env.key),
      );

      if (newEnvVars.length > 0) {
        await uploadEnvVars(vercel, projectName, newEnvVars);
        relinka(
          "success",
          `Added ${newEnvVars.length} new environment variables`,
        );
        if (existingEnvVars) {
          relinka(
            "info",
            `Kept ${existingEnvVars.key} existing shared variables`,
          );
        }
      } else {
        relinka(
          "info",
          "All required environment variables are already set in Vercel",
        );
      }
    } else {
      await uploadEnvVars(vercel, projectName, envVars);
      console.log("");
      relinka("success", "Environment variables added successfully");
    }
  } else {
    await uploadEnvVars(vercel, projectName, envVars);
    console.log("");
    relinka("success", "Environment variables added successfully");
  }
}

async function uploadEnvVars(
  vercel: Vercel,
  projectName: string,
  envVars: EnvVar[],
): Promise<void> {
  await withRateLimit(async () => {
    await vercel.projects.createProjectEnv({
      idOrName: projectName,
      upsert: "true",
      requestBody: envVars.map((env) => ({
        ...env,
        target: env.target ?? ["production", "preview", "development"],
      })),
    });
  });
}
