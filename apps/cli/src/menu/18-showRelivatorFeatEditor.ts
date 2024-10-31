import { consola } from "consola";

export async function showRelivatorFeatEditor() {
  consola.info("Relivator feature editor");
  consola.info("--------------------------------");
  consola.info("This feature is not yet implemented.");
  consola.info("Note: This is an advanced feature. Use with caution.");
  const option = await consola.prompt("What would you like to do?", {
    type: "select",
    options: [
      "1. Add a new feature",
      "2. Remove a feature",
      "3. Replace a feature",
    ],
  });

  if (option === "1. Add a new feature") {
    await addNewRelivatorFeature();
  } else if (option === "2. Remove a feature") {
    await removeRelivatorFeature();
  } else if (option === "3. Replace a feature") {
    await replaceRelivatorFeature();
  }
}

async function addNewRelivatorFeature() {
  consola.info("Add a new feature");
}

async function removeRelivatorFeature() {
  consola.info("Remove a feature");
}

async function replaceRelivatorFeature() {
  consola.info("Replace a feature");
}
