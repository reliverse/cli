import { confirmPrompt, selectPrompt } from "@reliverse/prompts";

import type { IntegrationCategory, IntegrationOptions } from "~/types.js";

import {
  installIntegration,
  removeIntegration,
} from "../integrations/integrations.js";
import { INTEGRATION_CONFIGS } from "../integrations/integrationsIntegrConfig.js";
import { REMOVAL_CONFIGS } from "../integrations/integrationsRemovalConfig.js";
import { relinka } from "./logger.js";

export async function handleIntegrations(cwd: string, isDev: boolean) {
  const integrationOptions: IntegrationOptions = {
    database: [
      {
        label: "Drizzle",
        value: "drizzle",
        subOptions: [
          {
            label: "PostgreSQL",
            value: "postgres",
            providers: ["neon", "railway"],
          },
          { label: "SQLite", value: "sqlite" },
          { label: "MySQL", value: "mysql" },
        ],
      },
      { label: "Prisma", value: "prisma" },
      { label: "Supabase", value: "supabase" },
      { label: "None (Remove existing)", value: "none" },
    ],
    payments: [
      { label: "Stripe", value: "stripe" },
      { label: "Polar", value: "polar" },
      { label: "None (Remove existing)", value: "none" },
    ],
    auth: [
      { label: "NextAuth.js", value: "next-auth" },
      { label: "Clerk", value: "clerk" },
      { label: "Better-Auth", value: "better-auth" },
      { label: "None (Remove existing)", value: "none" },
    ],
    email: [
      { label: "Resend", value: "resend" },
      { label: "None (Remove existing)", value: "none" },
    ],
    styling: [
      { label: "Tailwind CSS", value: "tailwind" },
      { label: "shadcn/ui", value: "shadcn" },
      { label: "None (Remove existing)", value: "none" },
    ],
    testing: [
      { label: "Bun Test", value: "bun-test" },
      { label: "Vitest", value: "vitest" },
      { label: "Jest", value: "jest" },
      { label: "None (Remove existing)", value: "none" },
    ],
    i18n: [
      { label: "next-intl", value: "next-intl" },
      { label: "next-international", value: "next-international" },
      { label: "Lingui", value: "lingui" },
      { label: "None (Remove existing)", value: "none" },
    ],
  };

  const category = await selectPrompt<IntegrationCategory>({
    title: "Which kind of integration would you like to add?",
    options: [
      { label: "Database", value: "database" },
      { label: "Payments", value: "payments" },
      { label: "Authentication", value: "auth" },
      { label: "Email", value: "email" },
      { label: "Styling", value: "styling" },
      { label: "Testing", value: "testing" },
      { label: "Internationalization", value: "i18n" },
    ],
  });

  const options = integrationOptions[category]!;
  const selectedIntegration = await selectPrompt({
    title: `Select ${category} integration:`,
    options: options.map((opt) => ({
      label: opt.label,
      value: opt.value,
    })),
  });

  // Handle removal case
  if (selectedIntegration === "none") {
    const shouldRemove = await confirmPrompt({
      title: `Are you sure you want to remove all ${category} integrations?`,
      content: `This will remove all ${category}-related files and dependencies`,
      defaultValue: false,
    });
    if (shouldRemove && REMOVAL_CONFIGS[category]) {
      await removeIntegration(cwd, REMOVAL_CONFIGS[category]);
      return;
    }
  }

  // Handle database-specific sub-options
  if (category === "database" && selectedIntegration === "drizzle") {
    const option = options.find((opt) => opt.value === "drizzle");
    if (!option?.subOptions) {
      throw new Error("Database configuration not found");
    }
    const dbType = await selectPrompt({
      title: "Select database type:",
      options: option.subOptions.map((sub) => ({
        label: sub.label,
        value: sub.value,
      })),
    });

    // Handle provider selection for PostgreSQL
    if (dbType === "postgres") {
      const postgresOption = option.subOptions.find(
        (sub) => sub.value === "postgres",
      );
      if (!postgresOption?.providers) {
        throw new Error("PostgreSQL providers not found");
      }
      const provider = await selectPrompt({
        title: "Select database provider:",
        options: postgresOption.providers.map((p) => ({
          label: p,
          value: p.toLowerCase(),
        })),
      });

      const config = {
        ...INTEGRATION_CONFIGS["drizzle"],
        name: "drizzle",
        dependencies: [
          ...INTEGRATION_CONFIGS["drizzle"]!.dependencies,
          provider === "neon" ? "@neondatabase/serverless" : "postgres",
        ],
        files: [],
        devDependencies: [],
        scripts: {},
        envVars: {},
      };

      await installIntegration(cwd, config, isDev);
      return;
    }

    await installIntegration(cwd, INTEGRATION_CONFIGS["drizzle"]!, isDev);
    return;
  }

  // Handle other integrations
  const integrationKey = selectedIntegration;
  if (INTEGRATION_CONFIGS[integrationKey]) {
    await installIntegration(cwd, INTEGRATION_CONFIGS[integrationKey], isDev);
    return;
  }

  relinka(
    "info",
    `Selected ${selectedIntegration} for ${category} - Implementation coming soon!`,
  );
}
