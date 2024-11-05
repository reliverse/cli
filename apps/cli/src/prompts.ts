export const modes = {
  create: "create",
  modify: "modify",
  exit: "exit",
};

export const menuModes = [
  { value: modes.create, label: "Create a new web dev project" },
  { value: modes.modify, label: "Modify the existing project" },
  { value: modes.exit, label: "Exit" },
];

export const projectKinds = [
  { value: "app", label: "Web app with Next.js, Deno, Nuxt, Astro, etc" },
  {
    value: "site",
    label: "Classic site with WordPress, HTML/CSS/JS, etc",
    disabled: true,
  },
  {
    value: "native",
    label: "Native app with Electron, React Native, etc",
    disabled: true,
  },
  { value: "exit", label: "Exit" },
  {
    value: "cli",
    label: "CLI tool with Node.js, Deno, Python, Go, etc",
    disabled: true,
  },
  {
    value: "library",
    label: "Library for Node.js, ESLint, Python, Rust, etc",
    disabled: true,
  },
  {
    value: "extension",
    label: "Extension for browser, VSCode, Reliverse, etc",
    disabled: true,
  },
  {
    value: "monorepo",
    label: "Monorepo with Turborepo, Moonrepo, Nx, etc",
    disabled: true,
  },
  {
    value: "game",
    label: "Game with web, Godot, UE5, Unity, Pawn, etc",
    disabled: true,
  },
  {
    value: "ci",
    label: "CI/CD with GitHub Actions, package.json, etc",
    disabled: true,
  },
];

export const promptsConfig = {
  projectName: "relivator",
  userHandle: "blefnk",
  orgHandle: "reliverse",
  userName: "Nazar Kornienko",
  orgName: "Bleverse Reliverse",
};

export const languages = [
  { value: "ts", label: "TypeScript" },
  { value: "js", label: "JavaScript" },
];
