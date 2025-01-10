import fs from "fs-extra";
import path from "pathe";

import { relinka } from "~/utils/loggerRelinka.js";

export async function setupI18nFiles(projectPath: string): Promise<void> {
  try {
    // Ensure target directory exists
    await fs.ensureDir(projectPath);

    // Generate i18n layout file
    const layoutPath = path.join(projectPath, "src/app/layout.tsx");
    await fs.ensureDir(path.dirname(layoutPath));
    const layoutContent = `
import { dir } from "i18next";
import { languages } from "~/config/i18n";
import { type Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Internationalized App",
    description: "App with i18n support",
  };
}

export default function RootLayout({
  children,
  params: { lang },
}: {
  children: React.ReactNode;
  params: { lang: string };
}) {
  return (
    <html lang={lang} dir={dir(lang)}>
      <body>{children}</body>
    </html>
  );
}

export function generateStaticParams() {
  return languages.map((lang) => ({ lang }));
}`;
    await fs.writeFile(layoutPath, layoutContent);
    relinka("success", "Generated i18n layout file");

    // Generate i18n page file
    const pagePath = path.join(projectPath, "src/app/page.tsx");
    const pageContent = `
import { useTranslation } from "~/utils/i18n";

export default async function Home() {
  const { t } = await useTranslation();
  
  return (
    <main>
      <h1>{t("welcome")}</h1>
    </main>
  );
}`;
    await fs.writeFile(pagePath, pageContent);
    relinka("success", "Generated i18n page file");

    // Generate i18n config
    const i18nConfigPath = path.join(projectPath, "src/config/i18n.ts");
    await fs.ensureDir(path.dirname(i18nConfigPath));
    const i18nConfigContent = `
export const languages = ["en", "es", "fr"];
export const defaultLanguage = "en";

export const languageNames = {
  en: "English",
  es: "Español",
  fr: "Français",
} as const;`;
    await fs.writeFile(i18nConfigPath, i18nConfigContent);
    relinka("success", "Generated i18n configuration");

    relinka("success", "Internationalization was successfully integrated.");
  } catch (error) {
    relinka(
      "error",
      `Error during i18n setup: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}
