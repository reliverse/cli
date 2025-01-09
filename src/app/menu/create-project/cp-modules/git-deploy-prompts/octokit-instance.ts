import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { Octokit } from "@octokit/rest";

export const OctokitWithRest = Octokit.plugin(restEndpointMethods);
export const octokitUserAgent = "reliverse-cli/1.4.16";

// https://github.com/octokit/octokit.js/#readme
export function createOctokitInstance(
  githubKey: string,
): InstanceType<typeof OctokitWithRest> {
  return new OctokitWithRest({
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
        octokit: InstanceType<typeof OctokitWithRest>,
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
        octokit: InstanceType<typeof OctokitWithRest>,
      ) => {
        octokit.log.warn(
          `Secondary rate limit for ${options.method} ${options.url}`,
        );
        return options.request.retryCount === 0; // retry once
      },
    },
  });
}
