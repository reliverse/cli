import { relinka } from "@reliverse/prompts";
import fs from "fs-extra";
import path from "pathe";
import { glob } from "tinyglobby";

export async function convertTypeDefinitions(
  projectPath: string,
  targetStyle: "type" | "interface",
) {
  relinka(
    "info",
    `Converting type definitions to ${targetStyle} style in ${projectPath}`,
  );

  const files = await glob("**/*.{ts,tsx}", {
    cwd: path.resolve(projectPath),
  });

  for (const file of files) {
    const filePath = path.join(projectPath, file);
    const content = await fs.readFile(filePath, "utf-8");
    let updatedContent = content;

    if (targetStyle === "type") {
      // Convert interface to type
      updatedContent = content.replace(
        /interface\s+(\w+)(\s*extends\s*[^{]+)?\s*{([^}]*)}/g,
        (
          _match: string,
          name: string,
          extends_: string | undefined,
          body: string,
        ) => {
          const extendsClause = extends_
            ? extends_.replace("extends", "&")
            : "";
          return `type ${name} = ${extendsClause}{${body}}`;
        },
      );
    } else {
      // Convert type to interface
      updatedContent = content.replace(
        /type\s+(\w+)\s*=\s*(?:{([^}]*)}|(\w+))/g,
        (
          match: string,
          name: string,
          objectBody: string | undefined,
          simpleType: string | undefined,
        ) => {
          if (simpleType) {
            // For simple type aliases, keep as type
            return match;
          }
          return `interface ${name} {${objectBody}}`;
        },
      );

      // Convert intersection types to extends
      updatedContent = updatedContent.replace(
        /interface\s+(\w+)\s*{\s*}\s*&\s*(\w+)/g,
        "interface $1 extends $2",
      );
    }

    if (content !== updatedContent) {
      await fs.writeFile(filePath, updatedContent, "utf-8");
      relinka("info", `Updated type definitions in ${filePath}`);
    }
  }
}
