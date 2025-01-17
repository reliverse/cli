import { relinka } from "@reliverse/relinka";
import { projectsGetProjectDomain } from "@vercel/sdk/funcs/projectsGetProjectDomain.js";
import { projectsGetProjectDomains } from "@vercel/sdk/funcs/projectsGetProjectDomains.js";

import type { ReliverseMemory } from "~/utils/schemaMemory.js";

import { createVercelCoreInstance } from "./vercel-instance.js";

export async function getVercelProjectDomain(
  projectName: string,
  memory: ReliverseMemory,
): Promise<{ domains: string[]; primary: string }> {
  try {
    if (!memory?.vercelKey) {
      throw new Error("Vercel token not found");
    }

    const vercel = createVercelCoreInstance(memory.vercelKey);

    const res = await projectsGetProjectDomains(vercel, {
      idOrName: projectName,
    });

    if (!res.ok) {
      throw res.error;
    }

    const { domains } = res.value;
    const defaultDomain = `${projectName}.vercel.app`;

    if (!Array.isArray(domains) || domains.length === 0) {
      return { domains: [defaultDomain], primary: defaultDomain };
    }

    // Filter valid domains and handle www subdomains
    const validDomains = domains
      .filter((domain) => domain?.name)
      .map((domain) => domain.name);

    // Group domains by their base name (without www)
    const domainMap = new Map<string, string[]>();
    validDomains.forEach((domain) => {
      const baseDomain = domain.startsWith("www.") ? domain.slice(4) : domain;
      const group = domainMap.get(baseDomain) ?? [];
      group.push(domain);
      domainMap.set(baseDomain, group);
    });

    // For each group, prefer non-www version unless only www exists
    const effectiveDomains = Array.from(domainMap.values())
      .map((group) => {
        const nonWww = group.find((d) => !d.startsWith("www."));
        return nonWww ?? group[0];
      })
      .filter((domain): domain is string => domain !== undefined);

    return {
      domains: effectiveDomains,
      primary: effectiveDomains[0] ?? defaultDomain,
    };
  } catch (error) {
    relinka(
      "warn",
      "Failed to get Vercel domain:",
      error instanceof Error ? error.message : String(error),
    );
    const defaultDomain = `${projectName}.vercel.app`;
    return { domains: [defaultDomain], primary: defaultDomain };
  }
}

export async function getVercelProjectDomainByName(
  projectName: string,
  domainName: string,
  memory: ReliverseMemory,
): Promise<string | null> {
  try {
    if (!memory?.vercelKey) {
      throw new Error("Vercel token not found");
    }

    const vercel = createVercelCoreInstance(memory.vercelKey);

    const res = await projectsGetProjectDomain(vercel, {
      idOrName: projectName,
      domain: domainName,
    });

    if (!res.ok) {
      throw res.error;
    }

    return res.value.name;
  } catch (error) {
    relinka(
      "warn",
      "Failed to get specific Vercel domain:",
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
}
