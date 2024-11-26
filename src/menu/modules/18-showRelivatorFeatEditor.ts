import { selectPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/relinka";

export async function showRelivatorFeatEditor() {
  relinka.info("Relivator feature editor");
  relinka.info("--------------------------------");
  relinka.info("This feature is not yet implemented.");
  relinka.info("Note: This is an advanced feature. Use with caution.");
  const option = await selectPrompt({
    title: "What would you like to do?",
    options: [
      { label: "1. Add a new feature", value: "addNewFeature" },
      { label: "2. Remove a feature", value: "removeFeature" },
      { label: "3. Replace a feature", value: "replaceFeature" },
    ],
  });

  if (option === "addNewFeature") {
    await addNewRelivatorFeature();
  } else if (option === "removeFeature") {
    await removeRelivatorFeature();
  } else if (option === "replaceFeature") {
    await replaceRelivatorFeature();
  }
}

async function addNewRelivatorFeature() {
  relinka.info("Add a new feature");
}

async function removeRelivatorFeature() {
  relinka.info("Remove a feature");
}

async function replaceRelivatorFeature() {
  relinka.info("Replace a feature");
}
