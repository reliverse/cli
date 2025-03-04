import { relinka } from "@reliverse/prompts";
import { projectsGetProjectDomains } from "@vercel/sdk/funcs/projectsGetProjectDomains.js";

import type { InstanceVercel } from "~/utils/instanceVercel.js";

export async function getVercelProjectDomain(
  vercelInstance: InstanceVercel,
  vercelToken: string,
  projectName: string,
): Promise<{ domains: string[]; primary: string }> {
  try {
    if (!vercelToken) {
      throw new Error("No Vercel token provided");
    }

    const res = await projectsGetProjectDomains(vercelInstance, {
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
