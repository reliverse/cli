import { relinka } from "@reliverse/relinka";
import { ofetch } from "ofetch";

export async function fetchEnvExampleContent(
  urlResource: string,
): Promise<string | null> {
  try {
    const response = await ofetch<Response>(urlResource);
    if (!response.ok) {
      throw new Error(`Failed to fetch .env.example from ${urlResource}`);
    }
    const text = await response.text();
    return typeof text === "string" ? text : null;
  } catch (error) {
    relinka(
      "error",
      `Error fetching .env.example: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}
