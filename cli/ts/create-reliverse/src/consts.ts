import path from "node:path";
import { fileURLToPath } from "node:url";

// With the move to TSUP as a build tool, this keeps path routes in other files (installers, loaders, etc) in check more easily.
// Path is in relation to a single index.js file inside ./dist
const __filename = fileURLToPath(import.meta.url);
const distPath = path.dirname(__filename);
export const PKG_ROOT = path.join(distPath, "../");

//export const PKG_ROOT = path.dirname(require.main.filename);

export const TITLE_TEXT = `  ____  _____ _    _____      _____ ____  ____  _____
 |  _ \\| ____| |   |_ _| |  | | ____|  _ \\/ ___|| ____|
 | |_) |  _| | |    | |  |  | |  _| | |_) \\___ \\|  _|  
 |  _ <| |___| |____| |  \\  / | |___| _ <  ___) | |___ 
 |_| \\_\\_____|______|_|___\\/__|_____|_| \\_\\____/|_____|
`;
export const DEFAULT_APP_NAME = "my-reliverse-app";
export const CREATE_RELIVERSE = "create-reliverse";
