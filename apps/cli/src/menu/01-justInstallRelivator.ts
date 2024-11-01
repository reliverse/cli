import { askProjectDetails } from "~/menu/04-askProjectDetails";
import { REPO_SHORT_URLS } from "~/app";

export async function justInstallRelivator() {
  const template = REPO_SHORT_URLS.relivatorGithubLink;

  const message = `Let's create your brand-new web app using the ${template} starter! After that, you can customize everything however you like.`;

  await askProjectDetails(template, message, "justInstallRelivator", false);
}
