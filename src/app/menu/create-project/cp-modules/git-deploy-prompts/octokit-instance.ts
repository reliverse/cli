import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { Octokit } from "@octokit/rest";

export const OctokitWithRest = Octokit.plugin(restEndpointMethods);
export const octokitUserAgent = "reliverse-cli/1.4.16";

export function createOctokitInstance(githubKey: string): Octokit {
  return new Octokit({
    auth: githubKey,
    userAgent: octokitUserAgent,
    throttle: {
      onRateLimit: (
        _retryAfter: number,
        options: {
          method: string;
          url: string;
          request: { retryCount: number };
        },
        octokit: InstanceType<typeof Octokit>,
      ) => {
        octokit.log.warn(
          `Request quota exhausted for ${options.method} ${options.url}`,
        );
        return options.request.retryCount === 0; // retry once
      },
      onSecondaryRateLimit: (
        _retryAfter: number,
        options: {
          method: string;
          url: string;
          request: { retryCount: number };
        },
        octokit: InstanceType<typeof Octokit>,
      ) => {
        octokit.log.warn(
          `Secondary rate limit for ${options.method} ${options.url}`,
        );
        return options.request.retryCount === 0; // retry once
      },
    },
  });
}
