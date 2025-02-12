import { Type, type Static } from "@sinclair/typebox";

export const hardcodedSchema = Type.Object({
  RelivatorTitle: Type.Literal(
    "Relivator template is the foundation of your eCommerce platform: Build More Efficient, Engaging, and Profitable Online Stores",
  ),
  RelivatorShort: Type.Literal("Relivator"),
  RelivatorLower: Type.Literal("relivator"),
  RelivatorDomain: Type.Literal("relivator.com"),
  DefaultAuthor: Type.Literal("blefnk"),
  DefaultEmail: Type.Literal("onboarding@resend.dev"),
  GeneralTemplate: Type.Literal("template"),
});

export const urlPatternsSchema = Type.Object({
  githubUrl: Type.Function([Type.String(), Type.String()], Type.String()),
  vercelUrl: Type.Function([Type.String()], Type.String()),
  packageName: Type.Function([Type.String()], Type.String()),
});

export type Hardcoded = Static<typeof hardcodedSchema>;
export type UrlPatterns = Static<typeof urlPatternsSchema>;

export const HardcodedStrings: Hardcoded = {
  RelivatorTitle:
    "Relivator template is the foundation of your eCommerce platform: Build More Efficient, Engaging, and Profitable Online Stores",
  RelivatorShort: "Relivator",
  RelivatorLower: "relivator",
  RelivatorDomain: "relivator.com",
  DefaultAuthor: "blefnk",
  DefaultEmail: "onboarding@resend.dev",
  GeneralTemplate: "template",
} as const;

export const CommonPatterns: UrlPatterns = {
  githubUrl: (author: string, repo: string) =>
    `https://github.com/${author}/${repo}`,
  vercelUrl: (project: string) => `${project}.vercel.app`,
  packageName: (name: string) => `@${name}/app`,
} as const;
