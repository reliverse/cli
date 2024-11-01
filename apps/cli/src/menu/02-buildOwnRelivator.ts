import { askProjectDetails } from "~/menu/04-askProjectDetails";
import { REPO_SHORT_URLS } from "~/app";

export async function buildOwnRelivator() {
  const template = REPO_SHORT_URLS.versatorGithubLink;

  const message = `Let's build your own Relivator from scratch! We'll use the ${template} as a starting point.`;

  await askProjectDetails(template, message, "buildOwnRelivator", true);
}
