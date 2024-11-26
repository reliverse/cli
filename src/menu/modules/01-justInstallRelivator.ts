import { REPO_SHORT_URLS } from "~/app.js";

import { askProjectDetails } from "./04-askProjectDetails.js";

export async function justInstallRelivator() {
  const template = REPO_SHORT_URLS.relivatorGithubLink;

  const message = `Let's create your brand-new web app using the ${template} starter! After that, you can customize everything however you like.`;

  await askProjectDetails(template, message, "justInstallRelivator", false);
}
