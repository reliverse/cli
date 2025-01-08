import { createAsciiArt } from "@reliverse/prompts";

export const renderTitle = async () => {
  await createAsciiArt({
    message: "Reliverse",
    font: "block",
  });
};
